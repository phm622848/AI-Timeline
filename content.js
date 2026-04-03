console.log('AI Timeline Extension loaded.')

// 存储当前匹配的适配器
let currentAdapter = null

let timelineContainer = null
let timelineContent = null
let floatingBtn = null
let currentUrl = location.href // 记录当前URL，用于检测会话切换
// 改为保存所有已抓取到的消息对象 { element: DOMNode, text: string, top: number }
let allMessages = []
let searchQuery = '' // 记录当前的搜索关键字

// 初始化匹配适配器
function initAdapter() {
  if (window.TimelineAdapters && window.TimelineAdapters.length > 0) {
    for (const adapter of window.TimelineAdapters) {
      if (adapter.match()) {
        currentAdapter = adapter
        console.log('Matched adapter:', adapter)
        return true
      }
    }
  }
  console.log('No suitable adapter found for this website.')
  return false
}

// 1. 创建侧边栏 UI
function createSidebar() {
  if (document.getElementById('gemini-timeline-sidebar')) return

  // 创建悬浮展开按钮
  floatingBtn = document.createElement('button')
  floatingBtn.id = 'gemini-timeline-floating-btn'
  floatingBtn.innerText = '📝'
  floatingBtn.title = '展开时间轴'
  floatingBtn.onclick = () => {
    timelineContainer.classList.remove('hidden')
    floatingBtn.style.display = 'none'
  }
  document.body.appendChild(floatingBtn)

  timelineContainer = document.createElement('div')
  timelineContainer.id = 'gemini-timeline-sidebar'

  const header = document.createElement('div')
  header.className = 'timeline-header'

  // 第一行：标题和按钮容器
  const topRow = document.createElement('div')
  topRow.className = 'timeline-header-top'

  const title = document.createElement('h3')
  title.innerText = '📝 对话时间轴'

  // 头部按钮容器
  const actionsDiv = document.createElement('div')
  actionsDiv.className = 'timeline-actions'

  // 主题切换按钮
  const themeBtn = document.createElement('button')
  themeBtn.className = 'timeline-theme-btn'
  // ... 其他代码不变
  const isDark =
    document.body.classList.contains('dark-theme') ||
    (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
  themeBtn.innerText = isDark ? '☀️' : '🌙'
  themeBtn.title = '切换时间轴主题'
  themeBtn.onclick = () => {
    const isCurrentlyDark =
      timelineContainer.classList.contains('force-dark') ||
      (window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches &&
        !timelineContainer.classList.contains('force-light'))

    if (isCurrentlyDark) {
      timelineContainer.classList.remove('force-dark')
      timelineContainer.classList.add('force-light')
      themeBtn.innerText = '🌙'
    } else {
      timelineContainer.classList.remove('force-light')
      timelineContainer.classList.add('force-dark')
      themeBtn.innerText = '☀️'
    }
  }

  const toggleBtn = document.createElement('button')
  toggleBtn.className = 'timeline-toggle-btn'
  toggleBtn.innerText = '收起'
  toggleBtn.onclick = () => {
    timelineContainer.classList.add('hidden')
    floatingBtn.style.display = 'block'
  }

  actionsDiv.appendChild(themeBtn)
  actionsDiv.appendChild(toggleBtn)

  topRow.appendChild(title)
  topRow.appendChild(actionsDiv)

  // 第二行：搜索输入框
  const searchRow = document.createElement('div')
  searchRow.className = 'timeline-search-row'

  const searchInput = document.createElement('input')
  searchInput.type = 'text'
  searchInput.className = 'timeline-search-input'
  searchInput.placeholder = '🔍 搜索话题...'

  // 监听输入框的回车和实时输入事件
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim().toLowerCase()
    renderTimeline() // 实时触发重新渲染
  })
  // 针对中文输入法，回车确认搜索（虽然 input 事件已经实时触发了，这里保留回车作为习惯支持）
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      searchQuery = e.target.value.trim().toLowerCase()
      renderTimeline()
    }
  })

  searchRow.appendChild(searchInput)

  header.appendChild(topRow)
  header.appendChild(searchRow)

  timelineContent = document.createElement('div')
  timelineContent.className = 'timeline-content'

  timelineContainer.appendChild(header)
  timelineContainer.appendChild(timelineContent)
  document.body.appendChild(timelineContainer)
}

// 2. 提取文本内容 (清理格式) -> 已移动到各适配器中
// function extractText(element) { ... }

// 3. 全局扫描并重新构建时间轴
function findAndProcessExistingMessages() {
  if (!currentAdapter) return

  // 通过当前适配器获取 DOM 节点
  const foundElements = currentAdapter.getQuestionElements()

  let newMessages = []
  let lastText = ''

  foundElements.forEach((element) => {
    // 过滤掉隐藏的元素
    if (element.offsetParent === null) return
    const rect = element.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return

    // 通过当前适配器提取清洗后的文本
    const cleanText = currentAdapter.extractText(element)
    if (!cleanText) return

    // 过滤连续重复的内容（同一个提问的副本）
    if (cleanText === lastText) return
    lastText = cleanText

    // 获取元素在文档中的绝对垂直位置（用于排序）
    const topPosition = rect.top + window.scrollY

    newMessages.push({
      element: element,
      text: cleanText,
      top: topPosition,
    })
  })

  // 如果抓取到的消息和当前保存的一致（数量和内容），说明没有变化，跳过重绘
  if (isSameMessages(allMessages, newMessages)) {
    return
  }

  // 更新全局状态并排序（按照 DOM 在页面中的物理位置从上到下排序）
  allMessages = newMessages.sort((a, b) => a.top - b.top)

  // 重新渲染侧边栏
  renderTimeline()
}

// 辅助函数：判断两次抓取的消息是否一致
function isSameMessages(oldMsgs, newMsgs) {
  if (oldMsgs.length !== newMsgs.length) return false
  for (let i = 0; i < oldMsgs.length; i++) {
    if (oldMsgs[i].text !== newMsgs[i].text || oldMsgs[i].element !== newMsgs[i].element) {
      return false
    }
  }
  return true
}

// 3.5 渲染时间轴 UI
function renderTimeline() {
  if (!timelineContent) return

  // 记录当前的滚动位置
  const currentScrollTop = timelineContent.scrollTop
  const isScrolledToBottom =
    timelineContent.scrollHeight - timelineContent.scrollTop <= timelineContent.clientHeight + 50

  timelineContent.innerHTML = ''

  // 根据 searchQuery 进行过滤
  const filteredMessages = allMessages.filter((msg) => {
    if (!searchQuery) return true
    return msg.text.toLowerCase().includes(searchQuery)
  })

  // 如果搜索后没有结果，给个提示
  if (filteredMessages.length === 0 && allMessages.length > 0) {
    const emptyTip = document.createElement('div')
    emptyTip.className = 'timeline-empty-tip'
    emptyTip.innerText = '没有找到相关话题'
    emptyTip.style.textAlign = 'center'
    emptyTip.style.color = '#80868b'
    emptyTip.style.marginTop = '20px'
    emptyTip.style.fontSize = '14px'
    timelineContent.appendChild(emptyTip)
    return
  }

  filteredMessages.forEach((msg) => {
    const item = document.createElement('div')
    item.className = 'timeline-item'

    const textDiv = document.createElement('div')
    textDiv.className = 'timeline-item-text'
    textDiv.innerText = msg.text

    item.appendChild(textDiv)

    // 点击事件：平滑滚动到原消息处
    item.onclick = () => {
      // ChatGPT 的滚动容器可能不是 body，而是内部的某个 div，scrollIntoView 依然有效
      msg.element.scrollIntoView({ behavior: 'smooth', block: 'center' })

      // 添加高亮动画效果
      // 有些网站的文本容器可能是透明的，高亮它的父级更明显
      const highlightTarget = location.hostname.includes('chatgpt.com')
        ? msg.element.querySelector('.whitespace-pre-wrap') || msg.element
        : msg.element

      const originalBg = highlightTarget.style.backgroundColor
      const originalTransition = highlightTarget.style.transition

      highlightTarget.style.transition = 'background-color 0.5s ease-out'
      const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      highlightTarget.style.backgroundColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 235, 59, 0.3)'

      setTimeout(() => {
        highlightTarget.style.backgroundColor = originalBg
        setTimeout(() => {
          highlightTarget.style.transition = originalTransition
        }, 500)
      }, 1500)
    }

    timelineContent.appendChild(item)
  })

  // 恢复滚动位置策略
  if (isScrolledToBottom) {
    // 如果本来就在最底部，则保持在最底部（适合新发消息场景）
    timelineContent.scrollTop = timelineContent.scrollHeight
  } else {
    // 否则尝试恢复之前的滚动位置（适合往上滚动加载历史记录的场景）
    timelineContent.scrollTop = currentScrollTop
  }
}

// 4.5 清理时间轴数据
function clearTimeline() {
  if (timelineContent) {
    timelineContent.innerHTML = ''
  }
  allMessages = []
}

// 5. 监听 DOM 变化以捕获新发送的消息和页面切换
function observeDOMChanges() {
  const observer = new MutationObserver((mutations) => {
    // 检查是否切换了会话 (URL 发生变化)
    if (location.href !== currentUrl) {
      currentUrl = location.href
      clearTimeline()
      // URL 变化后，DOM 可能还没完全渲染新会话，延迟扫描
      setTimeout(findAndProcessExistingMessages, 1000)
      return
    }

    let shouldScan = false
    for (let mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        shouldScan = true
        break
      }
    }
    // 当 DOM 发生插入时，延迟 800ms 扫描，等待 Gemini 渲染完毕
    if (shouldScan) {
      setTimeout(findAndProcessExistingMessages, 800)
    }
  })

  // 监听整个 body 的变化
  observer.observe(document.body, { childList: true, subtree: true })
}

// 启动入口
function init() {
  if (!initAdapter()) {
    return // 如果没有匹配的适配器，则不启动插件
  }

  createSidebar()
  // 延迟初始扫描，等待页面主要内容加载完成
  setTimeout(() => {
    findAndProcessExistingMessages()
    observeDOMChanges()
  }, 3000)
}

// 等待页面加载完成再执行
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
