/**
 * Gemini 适配器
 * 负责解析 Google Gemini 网页版的 DOM 结构
 * 基于 2025 年 6 月 Gemini 的 DOM 特征实现
 */
const GeminiAdapter = {
  // 匹配 Gemini 域名的规则
  match: () => location.hostname.includes('gemini.google.com'),

  // 获取所有用户提问的 DOM 节点
  getQuestionElements: () => {
    let foundElements = []

    console.log('Gemini: Starting DOM search for user messages...')

    // Gemini 的 DOM 结构特征（多级选择器策略）
    const SELECTORS = [
      'p.query-text-line', // 策略 1: 用户提问文本行（最新）
      'user-query', // 策略 2: 用户查询自定义元素
      '[data-message-role="user"]', // 策略 3: 消息角色属性
      '[data-testid^="conversation-turn-"]', // 策略 4: 对话轮次容器
      'user-query-node', // 策略 5: 用户查询节点
      'div.query-text', // 策略 6: 查询文本容器
    ]

    for (const selector of SELECTORS) {
      const elements = document.querySelectorAll(selector)
      console.log(`Gemini: Trying selector "${selector}" -> found ${elements.length} elements`)

      if (elements.length > 0) {
        // 策略 3 特殊处理：conversation-turn 包含整轮对话，需要找到其中的 user-query 子元素
        if (selector.includes('conversation-turn')) {
          elements.forEach((turn) => {
            const userQuery = turn.querySelector('user-query, [data-message-role="user"]')
            if (userQuery) {
              foundElements.push(userQuery)
            } else {
              // 如果没有 user-query 子元素，尝试找 user-query-node
              const userQueryNode = turn.querySelector('user-query-node')
              if (userQueryNode) {
                foundElements.push(userQueryNode)
              }
            }
          })
        } else {
          foundElements = Array.from(elements)
        }

        console.log(`Gemini: ✅ Successfully found ${foundElements.length} elements with selector: ${selector}`)
        break
      }
    }

    // 启发式回退策略：如果以上选择器都失败
    if (foundElements.length === 0) {
      console.log('Gemini: All selectors failed, trying heuristic fallback...')
      const allTurns = document.querySelectorAll('[data-testid^="conversation-turn-"]')
      allTurns.forEach((turn) => {
        // 检查是否包含用户消息特征
        const text = turn.innerText || ''
        if (text.trim().length > 0 && text.trim().length < 2000) {
          // 排除 AI 回复（通常包含特定类名或结构）
          if (!turn.querySelector('[class*="assistant"]') && !turn.querySelector('[class*="model-response"]')) {
            foundElements.push(turn)
          }
        }
      })
      console.log(`Gemini: Heuristic fallback found ${foundElements.length} elements`)
    }

    if (foundElements.length === 0) {
      console.warn('Gemini: ⚠️ No user message elements found!')
      console.log('Gemini: Current URL:', location.href)
      console.log('Gemini: Body classes:', document.body.className)
    }

    // 去重：移除嵌套的元素，只保留最内层的容器
    const uniqueElements = foundElements.filter((el, index, self) => {
      return !self.some((otherEl, otherIndex) => {
        if (index === otherIndex) return false
        return otherEl.contains(el) && otherEl !== el
      })
    })

    console.log(`Gemini: Total unique user messages: ${uniqueElements.length}`)
    return uniqueElements
  },

  // 从 DOM 节点中提取干净的纯文本
  extractText: (element) => {
    if (!element) return ''

    let text = ''

    // 尝试处理 Shadow DOM（Gemini 可能使用 Shadow DOM 封装）
    if (element.shadowRoot) {
      const shadowText = element.shadowRoot.innerText
      if (shadowText && shadowText.trim()) {
        text = shadowText.trim()
      }
    }

    // 如果 Shadow DOM 没有内容，使用常规提取
    if (!text) {
      // 对于 p.query-text-line 元素，直接提取文本
      // 对于外层容器，查找内部的 query-text-line 子元素
      if (element.tagName.toLowerCase() !== 'p' || !element.classList.contains('query-text-line')) {
        const childQuery = element.querySelector('p.query-text-line, user-query, user-query-node, div.query-text')
        if (childQuery && childQuery !== element) {
          // 如果找到更内层的用户消息元素，说明当前元素是外层容器，返回 null 跳过
          return null
        }
      }

      text = element.innerText || element.textContent || ''
      text = text.trim()
    }

    // 清理文本：移除 "You:" 或 "你：" 前缀
    text = text.replace(/^(You:\s*|你[说道]：\s*)/i, '').trim()

    // 清理多余空白和换行
    text = text.replace(/\s+/g, ' ').trim()

    // 如果文本为空或过短，返回 null
    if (text.length < 2) return null

    // 如果文本太长，截取前 200 个字符作为预览
    if (text.length > 200) {
      text = text.substring(0, 200) + '...'
    }

    return text
  },
}

// 注册适配器到全局对象
window.TimelineAdapters = window.TimelineAdapters || []
window.TimelineAdapters.push(GeminiAdapter)
