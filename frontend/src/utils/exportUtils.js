import api from '../services/api'

/**
 * 修改SVG背景颜色
 */
const modifySVGBackground = (svgContent, bgColor) => {
  if (!svgContent || !bgColor) return svgContent
  
  // 解析SVG内容
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgContent, 'image/svg+xml')
  const svg = doc.querySelector('svg')
  
  if (!svg) return svgContent
  
  // 查找背景矩形（通常是第一个rect，覆盖整个画布）
  const rects = svg.querySelectorAll('rect')
  let bgRect = null
  
  for (const rect of rects) {
    const width = rect.getAttribute('width')
    const height = rect.getAttribute('height')
    const x = rect.getAttribute('x') || '0'
    const y = rect.getAttribute('y') || '0'
    
    // 检查是否是背景矩形（覆盖整个画布或接近整个画布）
    if ((width === '800' || width === '100%') && 
        (height === '600' || height === '100%') &&
        (x === '0' || !x) && (y === '0' || !y)) {
      bgRect = rect
      break
    }
  }
  
  if (bgRect) {
    // 修改背景矩形的填充颜色
    if (bgColor === 'transparent') {
      bgRect.setAttribute('fill', 'transparent')
      bgRect.setAttribute('fill-opacity', '0')
    } else {
      bgRect.setAttribute('fill', bgColor)
      bgRect.removeAttribute('fill-opacity')
    }
  } else if (bgColor !== 'transparent') {
    // 如果没有背景矩形，创建一个
    const viewBox = svg.getAttribute('viewBox') || '0 0 800 600'
    const [, , vbWidth, vbHeight] = viewBox.split(' ').map(Number)
    
    const newRect = doc.createElementNS('http://www.w3.org/2000/svg', 'rect')
    newRect.setAttribute('width', vbWidth || 800)
    newRect.setAttribute('height', vbHeight || 600)
    newRect.setAttribute('fill', bgColor)
    
    // 插入到SVG的最前面
    svg.insertBefore(newRect, svg.firstChild)
  }
  
  // 序列化回字符串
  const serializer = new XMLSerializer()
  return serializer.serializeToString(svg)
}

/**
 * 导出SVG文件
 */
export const exportSVG = (svgElement, filename = 'animation', bgColor = null) => {
  if (!svgElement) return false
  let svgData = svgElement.innerHTML
  
  // 如果指定了背景颜色，修改SVG
  if (bgColor) {
    svgData = modifySVGBackground(svgData, bgColor)
  }
  
  const blob = new Blob([svgData], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.svg`
  a.click()
  URL.revokeObjectURL(url)
  return true
}

/**
 * 处理 SSE 数据并下载文件
 */
const handleSSEData = (data, filename, format, onProgress) => {
  if (data.type === 'progress') {
    if (onProgress && data.percent >= 0) {
      onProgress(data.percent, data.message)
    }
    return { done: false }
  } else if (data.type === 'complete') {
    // 将 base64 转为 Blob 并下载
    const byteCharacters = atob(data.data)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: data.mimetype })
    
    const downloadUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = downloadUrl
    a.download = data.filename || `${filename}.${format}`
    a.click()
    URL.revokeObjectURL(downloadUrl)
    
    return { done: true, success: true }
  } else if (data.type === 'error') {
    return { done: true, success: false, error: data.message }
  }
  return { done: false }
}

/**
 * 从 zustand persist 存储中获取 token
 */
const getAuthToken = () => {
  try {
    const authStorage = localStorage.getItem('auth-storage')
    if (authStorage) {
      const parsed = JSON.parse(authStorage)
      return parsed?.state?.token || null
    }
  } catch (e) {
    console.error('获取 token 失败:', e)
  }
  return null
}

/**
 * 使用 fetch 进行 SSE 流式导出（支持认证头）
 */
const exportWithFetch = async (url, filename, format, onProgress) => {
  const token = getAuthToken()
  const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
  
  console.log('fetch SSE 请求:', url, '有token:', !!token)
  
  const response = await fetch(url, { headers })
  
  if (!response.ok) {
    console.error('fetch SSE 响应错误:', response.status)
    throw new Error(`HTTP ${response.status}`)
  }
  
  console.log('fetch SSE 连接成功，开始读取流')
  
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let completed = false
  
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const jsonStr = line.slice(6).trim()
        if (!jsonStr) continue
        
        try {
          const data = JSON.parse(jsonStr)
          const result = handleSSEData(data, filename, format, onProgress)
          if (result.done) {
            if (result.success) {
              completed = true
              return true
            }
            throw new Error(result.error || '导出失败')
          }
        } catch (e) {
          // 只有当是我们主动抛出的错误时才重新抛出
          if (e.message && e.message !== 'Unexpected end of JSON input' && !e.message.includes('JSON')) {
            throw e
          }
          // JSON 解析错误，忽略继续
          console.log('JSON 解析跳过:', jsonStr.substring(0, 50))
        }
      }
    }
  }
  
  if (completed) return true
  throw new Error('连接意外关闭')
}

/**
 * 使用 EventSource 进行 SSE 流式导出（公开端点）
 */
const exportWithEventSource = (url, filename, format, onProgress) => {
  return new Promise((resolve, reject) => {
    console.log('EventSource 连接:', url)
    const eventSource = new EventSource(url)
    let hasReceivedData = false
    
    eventSource.onopen = () => {
      console.log('EventSource 连接已打开')
    }
    
    eventSource.onmessage = (event) => {
      hasReceivedData = true
      try {
        const data = JSON.parse(event.data)
        console.log('EventSource 收到数据:', data.type, data.percent)
        const result = handleSSEData(data, filename, format, onProgress)
        if (result.done) {
          eventSource.close()
          if (result.success) resolve(true)
          else reject(new Error(result.error || '导出失败'))
        }
      } catch (e) {
        console.error('解析 SSE 数据失败:', e)
      }
    }
    
    eventSource.onerror = (e) => {
      console.log('EventSource 错误，已收到数据:', hasReceivedData, e)
      eventSource.close()
      // 如果从未收到数据，说明连接失败（可能是 403）
      reject(new Error(hasReceivedData ? '连接中断' : '连接失败'))
    }
  })
}

/**
 * 通用 SSE 导出函数
 */
const exportWithSSE = async (animationId, format, filename, duration, onProgress, bgColor = null) => {
  const bgParam = bgColor ? `&bgColor=${encodeURIComponent(bgColor)}` : ''
  const publicUrl = `/api/community/animations/${animationId}/export-stream/${format}?duration=${duration}${bgParam}`
  const privateUrl = `/api/animations/${animationId}/export-stream/${format}?duration=${duration}${bgParam}`
  
  // 先尝试公开端点（使用 EventSource）
  try {
    console.log('尝试公开 SSE 端点:', publicUrl)
    await exportWithEventSource(publicUrl, filename, format, onProgress)
    return true
  } catch (err) {
    console.log('公开 SSE 失败:', err.message, '，尝试私有端点')
  }
  
  // 再尝试私有端点（使用 fetch，支持认证）
  try {
    console.log('尝试私有 SSE 端点:', privateUrl)
    await exportWithFetch(privateUrl, filename, format, onProgress)
    return true
  } catch (err) {
    console.error('私有 SSE 也失败:', err.message)
    throw err
  }
}

/**
 * 通过后端API导出MP4视频（带真实进度）
 */
export const exportVideo = async (animationId, filename = 'animation', duration = 5, onProgress, bgColor = null) => {
  if (!animationId) throw new Error('动画ID不存在')
  
  try {
    return await exportWithSSE(animationId, 'mp4', filename, duration, onProgress, bgColor)
  } catch (err) {
    console.warn('SSE 导出失败，尝试普通请求:', err.message)
    return await exportFallback(animationId, 'mp4', filename, duration, onProgress, bgColor)
  }
}

/**
 * 通过后端API导出GIF动画（带真实进度）
 */
export const exportGIF = async (animationId, filename = 'animation', duration = 5, onProgress, bgColor = null) => {
  if (!animationId) throw new Error('动画ID不存在')
  
  try {
    return await exportWithSSE(animationId, 'gif', filename, duration, onProgress, bgColor)
  } catch (err) {
    console.warn('SSE 导出失败，尝试普通请求:', err.message)
    return await exportFallback(animationId, 'gif', filename, duration, onProgress, bgColor)
  }
}

/**
 * 备用导出方法（无真实进度）
 */
const exportFallback = async (animationId, format, filename, duration, onProgress, bgColor = null) => {
  const timeout = Math.max(240000, 30000 + duration * 15000)
  
  if (onProgress) onProgress(10, '正在导出...')
  
  const params = { duration }
  if (bgColor) params.bgColor = bgColor
  
  let response
  try {
    response = await api.get(`/community/animations/${animationId}/export/${format}`, {
      params,
      responseType: 'blob',
      timeout
    })
  } catch (err) {
    if (err.response?.status === 403 || err.response?.status === 404) {
      response = await api.get(`/animations/${animationId}/export/${format}`, {
        params,
        responseType: 'blob',
        timeout
      })
    } else {
      throw err
    }
  }
  
  if (onProgress) onProgress(100, '导出完成')
  
  const mimetype = format === 'mp4' ? 'video/mp4' : 'image/gif'
  const blob = new Blob([response.data], { type: mimetype })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.${format}`
  a.click()
  URL.revokeObjectURL(url)
  
  return true
}

/**
 * 暂停/播放SVG动画
 */
export const toggleSVGAnimation = (svgElement, isPlaying) => {
  if (!svgElement) return
  
  const svgs = svgElement.querySelectorAll('svg')
  svgs.forEach(svg => {
    svg.style.animationPlayState = isPlaying ? 'paused' : 'running'
    const animatedElements = svg.querySelectorAll('*')
    animatedElements.forEach(el => {
      el.style.animationPlayState = isPlaying ? 'paused' : 'running'
    })
  })
  
  const allElements = svgElement.querySelectorAll('*')
  allElements.forEach(el => {
    const style = window.getComputedStyle(el)
    if (style.animationName && style.animationName !== 'none') {
      el.style.animationPlayState = isPlaying ? 'paused' : 'running'
    }
  })
}
