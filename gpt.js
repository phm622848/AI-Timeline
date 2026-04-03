/**
 * ChatGPT 适配器
 * 负责解析 ChatGPT 网页版的 DOM 结构
 */
const ChatGptAdapter = {
  // 匹配 ChatGPT 域名的规则
  match: () => location.hostname.includes('chatgpt.com'),

  // 获取所有用户提问的 DOM 节点
  getQuestionElements: () => {
    let foundElements = []

    // ChatGPT 当前的 DOM 结构通常使用 data-message-author-role="user"
    // 或者带有特定的类名（由于类名经常混淆，首选 data 属性）
    const SELECTORS = [
      '[data-message-author-role="user"]',
      'div.w-full.text-token-text-primary[data-testid^="conversation-turn-"] > div:first-child' // 备用特征
    ]

    for (const selector of SELECTORS) {
      const elements = document.querySelectorAll(selector)
      if (elements.length > 0) {
        foundElements = Array.from(elements)
        break
      }
    }

    return foundElements
  },

  // 从 DOM 节点中提取干净的纯文本
  extractText: (element) => {
    // 优先尝试获取内部的文本内容节点，避免获取到旁边的编辑/复制按钮的隐藏文本
    const contentNode = element.querySelector('.whitespace-pre-wrap') || element
    let text = contentNode.innerText || contentNode.textContent || ''
    text = text.trim()
    
    // ChatGPT 的用户消息中有时会带有一个 "You said:" 的隐藏前缀用于屏幕阅读器 (sr-only)
    // 我们可以尝试过滤掉它
    let cleanText = text.replace(/^(You said:\s*|你说：\s*)/i, '').trim()
    
    return cleanText
  },
}

// 注册适配器到全局对象
window.TimelineAdapters = window.TimelineAdapters || []
window.TimelineAdapters.push(ChatGptAdapter)
