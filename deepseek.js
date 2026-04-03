/**
 * DeepSeek 适配器
 * 负责解析 DeepSeek 网页版的 DOM 结构
 */
const DeepSeekAdapter = {
  // 匹配 DeepSeek 域名的规则
  match: () => location.hostname.includes('chat.deepseek.com'),

  // 获取所有用户提问的 DOM 节点
  getQuestionElements: () => {
    let foundElements = []

    // DeepSeek 的 DOM 结构通常会在用户消息块中包含特定的类名或结构
    // 比如：fbb737a4 (用户消息的特定类名，但这可能会混淆改变)
    // 更稳定的特征通常是寻找带有特定角色的包裹容器
    const SELECTORS = [
      // 根据常见的 DeepSeek DOM 结构特征，这部分可能需要根据实际页面微调
      'div.fbb737a4', // 这是一个常见的用户消息气泡类名特征（如果变化了需要更新）
      // 备用：寻找结构特征，比如 flex 布局且居右的元素
    ]

    for (const selector of SELECTORS) {
      const elements = document.querySelectorAll(selector)
      if (elements.length > 0) {
        foundElements = Array.from(elements)
        break
      }
    }

    // 启发式回退机制：DeepSeek 的用户消息通常是纯文本的，且没有复杂的 Markdown 渲染
    if (foundElements.length === 0) {
      const possibleContainers = document.querySelectorAll('div[dir="auto"]')
      possibleContainers.forEach((container) => {
        // 通常用户消息气泡具有特定的背景色和较小的 padding，且没有复杂的子结构
        if (container.closest('div[style*="max-width:"]')) {
          foundElements.push(container.parentElement)
        }
      })
    }

    // 如果还是没找到，尝试更通用的启发式查找 (根据背景色、布局等，这里尽量保持简单，实际可能需要更复杂的逻辑)
    // 这里为了演示和保证健壮性，提供一个基于常见类名的查找作为兜底
    if (foundElements.length === 0) {
      const allDivs = document.querySelectorAll('div')
      allDivs.forEach((div) => {
        if (div.className.includes('fbb737a4')) {
          foundElements.push(div)
        }
      })
    }

    return foundElements
  },

  // 从 DOM 节点中提取干净的纯文本
  extractText: (element) => {
    let text = element.innerText || element.textContent || ''
    return text.trim()
  },
}

// 注册适配器到全局对象
window.TimelineAdapters = window.TimelineAdapters || []
window.TimelineAdapters.push(DeepSeekAdapter)
