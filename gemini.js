/**
 * Gemini 适配器
 * 负责解析 Gemini 网页版的 DOM 结构
 */
const GeminiAdapter = {
  // 匹配 Gemini 域名的规则
  match: () => location.hostname.includes('gemini.google.com'),

  // 获取所有用户提问的 DOM 节点
  getQuestionElements: () => {
    let foundElements = []

    // Gemini 常见的用户提问容器的选择器
    const SELECTORS = [
      'message-content[data-message-author-role="user"]',
      '.user-query-container',
      '[data-test-id="user-query"]',
      'user-message',
    ]

    // 策略 A: 尝试已知的选择器
    for (const selector of SELECTORS) {
      const elements = document.querySelectorAll(selector)
      if (elements.length > 0) {
        foundElements = Array.from(elements)
        break
      }
    }

    // 策略 B (回退机制)
    if (foundElements.length === 0) {
      const allDivs = document.querySelectorAll('div')
      allDivs.forEach((div) => {
        const className = div.className
        if (typeof className === 'string') {
          const lowerClass = className.toLowerCase()
          if (
            lowerClass.includes('user') &&
            (lowerClass.includes('query') || lowerClass.includes('message') || lowerClass.includes('prompt'))
          ) {
            if (div.children.length === 0 || div.innerText.length > 0) {
              foundElements.push(div)
            }
          }
        }
      })
    }

    return foundElements
  },

  // 从 DOM 节点中提取干净的纯文本，去除特有前缀
  extractText: (element) => {
    let text = element.innerText || element.textContent || ''
    text = text.trim()
    if (!text) return null

    // Gemini 特色处理：去掉开头的 "你说" 或 "You said" 等无用前缀（可能包含换行）
    let cleanText = text.replace(/^(你说|You said)[\s\S]*?\n/i, '').trim()
    if (!cleanText || cleanText === '你说' || cleanText === 'You said') return null

    return cleanText
  },
}

// 注册适配器到全局对象
window.TimelineAdapters = window.TimelineAdapters || []
window.TimelineAdapters.push(GeminiAdapter)
