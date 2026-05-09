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
    console.log('Timeline: Checking', window.TimelineAdapters.length, 'adapters...')
    for (const adapter of window.TimelineAdapters) {
      const adapterName = adapter.constructor?.name || 'Unknown'
      const matchResult = adapter.match()
      console.log(`Timeline: Adapter "${adapterName}" match() =`, matchResult)
      if (matchResult) {
        currentAdapter = adapter
        console.log('Timeline: ✅ Matched adapter:', adapterName)
        return true
      }
    }
  }
  console.log('Timeline: ❌ No suitable adapter found for this website.')
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
    console.log('Timeline: Showing timeline container')
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

// 超集过滤：移除被其他消息包含的外层容器消息
// 解决多轮对话中 DOM 嵌套导致文本合并的问题
function removeSupersetMessages(messages) {
  if (messages.length <= 1) return messages

  const toRemove = new Set()

  for (let i = 0; i < messages.length; i++) {
    for (let j = 0; j < messages.length; j++) {
      if (i === j) continue

      const msgA = messages[i]
      const msgB = messages[j]

      // 检查 DOM 祖先-后代关系
      if (msgA.element.contains(msgB.element) && msgA.element !== msgB.element) {
        // msgA 是 msgB 的祖先，且文本更长，应该移除 msgA
        if (msgA.text.length > msgB.text.length && msgA.text.length >= 10) {
          // 额外检查：长文本是否以短文本开头（超集特征）
          if (
            msgA.text.startsWith(msgB.text) ||
            msgB.text.startsWith(msgA.text.substring(0, Math.min(50, msgB.text.length)))
          ) {
            const lengthDiff = Math.abs(msgA.text.length - msgB.text.length)
            if (lengthDiff > 5) {
              toRemove.add(i)
            }
          }
        }
      }
    }
  }

  if (toRemove.size > 0) {
    console.log(`Timeline: Filtered ${toRemove.size} superset message(s)`)
    return messages.filter((_, index) => !toRemove.has(index))
  }

  return messages
}

// 提取并更新时间轴
function updateTimeline() {
  if (!currentAdapter) {
    console.warn('Timeline: No adapter matched!')
    return
  }

  console.log('Timeline: Updating with adapter:', currentAdapter.constructor.name || 'Unknown')

  const elements = currentAdapter.getQuestionElements()
  console.log(`Timeline: Found ${elements.length} question elements`)

  if (elements.length === 0) {
    console.log('Timeline: No elements found, but showing container anyway for debugging')
    // 即使没有元素，也显示时间轴容器（用于调试）
    showTimeline()
    return
  }

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

  console.log(`Timeline: Before superset filter: ${newMessages.length} messages`)

  // 应用超集过滤，移除外层容器导致的合并消息
  newMessages = removeSupersetMessages(newMessages)

  console.log(`Timeline: After superset filter: ${newMessages.length} messages`)

  // 如果消息数量发生变化，或者内容不一致，则重新渲染
  if (newMessages.length !== allMessages.length) {
    hasNewMessages = true
    console.log(`Timeline: Message count changed (${allMessages.length} -> ${newMessages.length})`)
  } else {
    for (let i = 0; i < newMessages.length; i++) {
      if (newMessages[i].text !== allMessages[i].text || newMessages[i].element !== allMessages[i].element) {
        hasNewMessages = true
        console.log(`Timeline: Message content changed at index ${i}`)
        break
      }
    }
  }

  if (hasNewMessages) {
    allMessages = newMessages
    console.log(`Timeline: Rendering ${allMessages.length} messages`)
    renderTimeline()
  }
}

// 渲染时间轴列表
function renderTimeline() {
  console.log(`renderTimeline: Called with ${allMessages.length} messages`)

  if (!timelineList) {
    console.error('renderTimeline: timelineList is null!')
    return
  }

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

  // 首次渲染完成后，显示时间轴（即使没有消息也要显示，用于调试）
  if (!isTimelineReady) {
    console.log('renderTimeline: Calling showTimeline() for the first time')
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
  console.log('Timeline V2: Starting...')
  console.log('Timeline V2: Current hostname:', location.hostname)
  console.log('Timeline V2: Available adapters:', window.TimelineAdapters?.length || 0)

  if (!initAdapter()) {
    console.warn('Timeline V2: No adapter matched on first try, retrying in 3s...')
    // 如果没有匹配到，延迟一会再试，有些网站 DOM 加载较慢
    setTimeout(() => {
      console.log('Timeline V2: Retrying adapter match...')
      if (initAdapter()) {
        console.log('Timeline V2: Adapter matched on retry')
        createSidebar()
        setInterval(updateTimeline, 2000)
      } else {
        console.error('Timeline V2: Still no adapter matched after retry!')
      }
    }, 3000)
    return
  }

  console.log('Timeline V2: Creating sidebar...')
  createSidebar()

  // 初次提取
  setTimeout(() => {
    console.log('Timeline V2: Running initial update...')
    updateTimeline()
  }, 1000)

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
