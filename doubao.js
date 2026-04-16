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
    // 用户消息通常没有 flow-markdown-body 和 theme-samantha-uDexJL 等 markdown 渲染的类名
    // 用户消息通常在特定的行容器中，且右对齐
    const SELECTORS = ['[data-message-role="user"]', 'div[class*="message-bubble-user"]', 'div[class*="UserMessage"]']

    for (const selector of SELECTORS) {
      const elements = document.querySelectorAll(selector)
      if (elements.length > 0) {
        foundElements = Array.from(elements)
        break
      }
    }

    // 启发式回退机制：通过过滤掉带有明显 AI 渲染特征的元素来定位用户消息
    if (foundElements.length === 0) {
      // 豆包的对话记录通常在特定的行或者气泡中
      // AI 回复通常带有 flow-markdown-body 和 theme-samantha-uDexJL
      const allPossibleBubbles = document.querySelectorAll(
        'div[class*="message"], div[class*="bubble"], div[dir="ltr"]',
      )

      allPossibleBubbles.forEach((bubble) => {
        // 排除掉包含 Markdown 渲染类的元素 (AI 的回复)
        if (bubble.className && typeof bubble.className === 'string') {
          if (
            bubble.className.includes('flow-markdown-body') ||
            bubble.className.includes('theme-samantha') ||
            bubble.className.includes('mdbox-theme')
          ) {
            return // 这是一个 AI 回复，跳过
          }
        }

        // 用户消息通常是没有复杂子结构的纯文本容器
        // 这里做一个简单的判断：如果它包含文本，且没有复杂的排版标签
        if (bubble.textContent && !bubble.querySelector('ul, ol, li, h1, h2, h3, h4, table, pre, hr')) {
          // 为了避免抓取到太多无用的小标签，我们可以检查它的父级或者它自身的特征
          // 真正的用户消息气泡通常会包含一定长度的文本，并且不应该是很小的 UI 组件
          if (bubble.innerText.trim().length > 0) {
            // 检查是否已经被包含
            if (!foundElements.some((el) => el.contains(bubble) || bubble.contains(el))) {
              // 再加一层保险：检查它的祖先节点中是否包含明确是 AI 的标志
              const isInsideAI = bubble.closest('.flow-markdown-body, [data-message-role="assistant"]')
              if (!isInsideAI) {
                foundElements.push(bubble)
              }
            }
          }
        }
      })
    }

    // 去重并返回最外层的合适节点
    return foundElements.filter((el, index, self) => {
      // 如果当前节点是另一个已找到节点的子节点，则保留父节点，丢弃子节点
      return !self.some((otherEl, otherIndex) => index !== otherIndex && otherEl.contains(el))
    })
  },

  // 从 DOM 节点中提取干净的纯文本
  extractText: (element) => {
    // 尽量获取最内层的文本容器，避免获取到其他操作按钮
    let text = element.innerText || element.textContent || ''
    return text.trim()
  },
}

// 注册适配器到全局对象
window.TimelineAdapters = window.TimelineAdapters || []
window.TimelineAdapters.push(DoubaoAdapter)
