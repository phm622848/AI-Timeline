// timeline-v2.js
console.log('AI Timeline V2 Extension loaded.')

let currentAdapter = null
let timelineContainer = null
let timelineList = null
let tooltipElement = null
let allMessages = []
let currentUrl = location.href
let isTimelineReady = false // 标记时间轴是否准备就绪

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

// 创建侧边栏 UI (V2 极简版)
function createSidebar() {
  if (document.getElementById('ai-timeline-v2-container')) return

  // 1. 创建主容器（初始隐藏）
  timelineContainer = document.createElement('div')
  timelineContainer.id = 'ai-timeline-v2-container'
  timelineContainer.style.opacity = '0' // 初始不可见
  timelineContainer.style.pointerEvents = 'none' // 初始不响应鼠标事件

  // 2. 创建列表容器
  timelineList = document.createElement('ul')
  timelineList.id = 'ai-timeline-v2-list'

  // 3. 创建 Tooltip 气泡
  tooltipElement = document.createElement('div')
  tooltipElement.className = 'timeline-tooltip'
  document.body.appendChild(tooltipElement)

  timelineContainer.appendChild(timelineList)
  document.body.appendChild(timelineContainer)

  // 监听主容器的鼠标移出事件，隐藏 Tooltip
  timelineContainer.addEventListener('mouseleave', () => {
    hideTooltip()
  })
}

// 显示时间轴（内容加载完成后调用）
function showTimeline() {
  if (timelineContainer && !isTimelineReady) {
    isTimelineReady = true
    timelineContainer.style.transition = 'opacity 0.3s ease'
    timelineContainer.style.opacity = '1'
    timelineContainer.style.pointerEvents = 'auto'
  }
}

// 隐藏 Tooltip
function hideTooltip() {
  if (tooltipElement) {
    tooltipElement.classList.remove('show')
  }
}

// 显示 Tooltip
function showTooltip(text, targetElement) {
  if (!tooltipElement || !timelineContainer) return

  // 只有当主容器处于展开状态（hover）时，才显示 tooltip
  if (!timelineContainer.matches(':hover')) return

  tooltipElement.innerText = text
  tooltipElement.classList.add('show')

  // 计算位置：位于目标元素的左侧
  const targetRect = targetElement.getBoundingClientRect()
  const tooltipRect = tooltipElement.getBoundingClientRect()

  // 垂直居中对齐目标元素
  let top = targetRect.top + (targetRect.height - tooltipRect.height) / 2

  // 边界检查：防止超出屏幕顶部或底部
  if (top < 10) top = 10
  if (top + tooltipRect.height > window.innerHeight - 10) {
    top = window.innerHeight - tooltipRect.height - 10
  }

  // 位于时间轴容器左侧留出间距
  const left = targetRect.left - tooltipRect.width - 16

  tooltipElement.style.top = `${top}px`
  tooltipElement.style.left = `${left}px`
}

// 提取并更新时间轴
function updateTimeline() {
  if (!currentAdapter) return

  const elements = currentAdapter.getQuestionElements()
  if (elements.length === 0) return

  let hasNewMessages = false
  let newMessages = []
  let lastText = ''

  elements.forEach((element) => {
    // 过滤掉隐藏的元素
    if (element.offsetParent === null) return
    const rect = element.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return

    const text = currentAdapter.extractText(element)
    if (!text) return

    // 过滤连续重复的内容（同一个提问的副本）
    if (text === lastText) return
    lastText = text

    // 获取元素在文档中的绝对垂直位置（用于排序）
    const topPosition = rect.top + window.scrollY

    newMessages.push({ element, text, top: topPosition })
  })

  // 按照 DOM 在页面中的物理位置从上到下排序
  newMessages.sort((a, b) => a.top - b.top)

  // 如果消息数量发生变化，或者内容不一致，则重新渲染
  if (newMessages.length !== allMessages.length) {
    hasNewMessages = true
  } else {
    for (let i = 0; i < newMessages.length; i++) {
      if (newMessages[i].text !== allMessages[i].text || newMessages[i].element !== allMessages[i].element) {
        hasNewMessages = true
        break
      }
    }
  }

  if (hasNewMessages) {
    allMessages = newMessages
    renderTimeline()
  }
}

// 渲染时间轴列表
function renderTimeline() {
  if (!timelineList) return
  timelineList.innerHTML = ''

  allMessages.forEach((msg, index) => {
    const li = document.createElement('li')
    li.className = 'timeline-item'
    li.dataset.index = index

    // 文字标签
    const textSpan = document.createElement('span')
    textSpan.className = 'timeline-item-text'
    textSpan.innerText = msg.text

    // 横线 Dash
    const dashSpan = document.createElement('span')
    dashSpan.className = 'timeline-item-dash'

    li.appendChild(textSpan)
    li.appendChild(dashSpan)

    // 点击平滑跳转
    li.onclick = (e) => {
      e.stopPropagation() // 阻止事件冒泡
      msg.element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      highlightElement(msg.element)
    }

    // 鼠标悬停显示 Tooltip
    li.onmouseenter = (e) => {
      showTooltip(msg.text, li)
    }

    // 鼠标移出当前 li 不立刻隐藏 tooltip，由容器的 mouseleave 统一处理，或者切换到其他 li 时覆盖

    timelineList.appendChild(li)
  })

  // 渲染后立刻更新一次激活状态
  updateActiveItem()

  // 首次渲染完成后，显示时间轴
  if (!isTimelineReady && allMessages.length > 0) {
    showTimeline()
  }
}

// 网页正文高亮动画
function highlightElement(element) {
  // 移除旧的高亮
  document.querySelectorAll('.timeline-highlight').forEach((el) => {
    el.classList.remove('timeline-highlight')
  })
  element.classList.add('timeline-highlight')
  setTimeout(() => {
    element.classList.remove('timeline-highlight')
  }, 2000)
}

// 监听滚动，更新当前阅读的项 (Active 状态)
function updateActiveItem() {
  if (allMessages.length === 0) return

  let activeIndex = 0
  let minDistance = Infinity

  const viewportCenter = window.innerHeight / 2

  // 找到距离屏幕垂直中心最近的消息
  allMessages.forEach((msg, index) => {
    const rect = msg.element.getBoundingClientRect()
    // 计算元素中心到屏幕中心的距离
    const elementCenter = rect.top + rect.height / 2
    const distance = Math.abs(elementCenter - viewportCenter)

    if (distance < minDistance) {
      minDistance = distance
      activeIndex = index
    }
  })

  // 更新 UI 状态
  const items = timelineList.querySelectorAll('.timeline-item')
  items.forEach((item, index) => {
    if (index === activeIndex) {
      item.classList.add('active')
    } else {
      item.classList.remove('active')
    }
  })
}

// 轮询检查 URL 变化（处理单页应用路由切换）
function checkUrlChange() {
  if (location.href !== currentUrl) {
    currentUrl = location.href
    console.log('URL changed, reset timeline')
    allMessages = []
    isTimelineReady = false // 重置时间轴状态
    if (timelineList) timelineList.innerHTML = ''
    if (timelineContainer) {
      timelineContainer.style.opacity = '0'
      timelineContainer.style.pointerEvents = 'none'
    }
    hideTooltip()
    setTimeout(updateTimeline, 1000) // 等待新页面 DOM 渲染
  }
}

// 启动插件逻辑
function start() {
  if (!initAdapter()) {
    // 如果没有匹配到，延迟一会再试，有些网站 DOM 加载较慢
    setTimeout(() => {
      if (initAdapter()) {
        createSidebar()
        setInterval(updateTimeline, 2000)
      }
    }, 3000)
    return
  }

  createSidebar()

  // 初次提取
  setTimeout(updateTimeline, 1000)

  // 定时提取，适应动态加载的对话
  setInterval(updateTimeline, 2000)

  // 定时检查 URL 变化
  setInterval(checkUrlChange, 1000)

  // 监听滚动更新 Active 状态，使用 requestAnimationFrame 节流
  let ticking = false
  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        updateActiveItem()
        ticking = false
      })
      ticking = true
    }
  })
}

// 确保 DOM 加载完成后执行
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start)
} else {
  start()
}
