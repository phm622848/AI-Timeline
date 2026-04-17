/**
 * 豆包 (Doubao) 适配器
 * 负责解析豆包网页版 (doubao.com) 的 DOM 结构
 */
const DoubaoAdapter = {
  // 匹配豆包域名的规则
  match: () => location.hostname.includes('doubao.com'),

  // 获取所有用户提问的 DOM 节点
  getQuestionElements: () => {
    let foundElements = []

    // 豆包网页版的用户消息特征：
    // 1. 使用 data 属性标记消息角色
    // 2. 用户消息通常有特定的类名
    // 3. 用户消息通常右对齐显示
    const SELECTORS = [
      '[data-message-role="user"]',
      '[data-role="user"]',
      'div[class*="user-message"]',
      'div[class*="message-user"]',
      'div[class*="bubble-user"]',
      'div[class*="user-bubble"]',
      // 尝试查找包含用户消息的通用容器
      'section[class*="message"] div[class*="user"]',
    ]

    // 策略 A: 尝试已知的选择器
    for (const selector of SELECTORS) {
      const elements = document.querySelectorAll(selector)
      if (elements.length > 0) {
        foundElements = Array.from(elements)
        console.log(`Doubao: Found ${foundElements.length} elements with selector: ${selector}`)
        break
      }
    }

    // 策略 B: 如果策略 A 失败，尝试更通用的方法
    if (foundElements.length === 0) {
      // 查找所有可能的消息容器
      const allMessageContainers = document.querySelectorAll(
        'div[class*="message"], div[class*="chat"], div[class*="conversation"]',
      )

      allMessageContainers.forEach((container) => {
        // 检查是否包含用户消息的特征
        const className = container.className || ''
        if (typeof className === 'string') {
          const lowerClass = className.toLowerCase()
          // 用户消息通常包含这些关键词
          if (
            (lowerClass.includes('user') || lowerClass.includes('human') || lowerClass.includes('prompt')) &&
            !lowerClass.includes('assistant') &&
            !lowerClass.includes('bot') &&
            !lowerClass.includes('ai') &&
            !lowerClass.includes('model')
          ) {
            // 确保不是 AI 回复的容器
            if (
              !container.querySelector('[class*="assistant"]') &&
              !container.querySelector('[class*="bot"]') &&
              !container.querySelector('[class*="ai-response"]')
            ) {
              // 检查是否有实际文本内容
              if (container.textContent && container.textContent.trim().length > 0) {
                foundElements.push(container)
              }
            }
          }
        }
      })
    }

    // 策略 C: 最后的回退方案 - 基于布局特征
    if (foundElements.length === 0) {
      // 豆包的用户消息通常是右对齐的，并且有特定的背景色
      const allDivs = document.querySelectorAll('div')
      allDivs.forEach((div) => {
        const style = window.getComputedStyle(div)
        const className = (div.className || '').toString().toLowerCase()

        // 检查是否是消息气泡（有背景色、有内边距）
        if (
          style.backgroundColor &&
          style.backgroundColor !== 'rgba(0, 0, 0, 0)' &&
          style.backgroundColor !== 'transparent' &&
          parseInt(style.padding) > 5 &&
          div.textContent &&
          div.textContent.trim().length > 10
        ) {
          // 检查是否包含用户消息的特征词
          if (className.includes('user') || className.includes('right') || className.includes('bubble')) {
            // 确保不是 AI 回复
            if (
              !className.includes('assistant') &&
              !className.includes('bot') &&
              !className.includes('ai') &&
              !className.includes('markdown')
            ) {
              foundElements.push(div)
            }
          }
        }
      })
    }

    // 去重：移除嵌套的元素，只保留最外层的容器
    const uniqueElements = foundElements.filter((el, index, self) => {
      return !self.some((otherEl, otherIndex) => {
        if (index === otherIndex) return false
        return otherEl.contains(el)
      })
    })

    console.log(`Doubao: Total unique user messages found: ${uniqueElements.length}`)
    return uniqueElements
  },

  // 从 DOM 节点中提取干净的纯文本
  extractText: (element) => {
    if (!element) return ''

    // 尝试获取最内层的文本内容，避免获取到按钮或其他 UI 元素
    let text = ''

    // 优先查找文本容器
    const textContainers = element.querySelectorAll('p, span, div:not([class*="button"]):not([class*="icon"])')
    if (textContainers.length > 0) {
      // 取第一个有文本内容的元素
      for (const container of textContainers) {
        const containerText = container.textContent?.trim()
        if (containerText && containerText.length > 0) {
          text = containerText
          break
        }
      }
    }

    // 如果没找到，使用整个元素的文本
    if (!text) {
      text = element.textContent || element.innerText || ''
      text = text.trim()
    }

    // 清理文本：移除多余的空格和换行
    text = text.replace(/\s+/g, ' ').trim()

    // 如果文本太长，截取前200个字符作为预览
    if (text.length > 200) {
      text = text.substring(0, 200) + '...'
    }

    return text || null
  },
}

// 注册适配器到全局对象
window.TimelineAdapters = window.TimelineAdapters || []
window.TimelineAdapters.push(DoubaoAdapter)
