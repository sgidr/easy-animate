import api from '../services/api'

/**
 * 导出SVG文件
 */
export const exportSVG = (svgElement, filename = 'animation') => {
  if (!svgElement) return false
  const svgData = svgElement.innerHTML
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
const exportWithSSE = async (animationId, format, filename, duration, onProgress) => {
  const publicUrl = `/api/community/animations/${animationId}/export-stream/${format}?duration=${duration}`
  const privateUrl = `/api/animations/${animationId}/export-stream/${format}?duration=${duration}`
  
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
export const exportVideo = async (animationId, filename = 'animation', duration = 5, onProgress) => {
  if (!animationId) throw new Error('动画ID不存在')
  
  try {
    return await exportWithSSE(animationId, 'mp4', filename, duration, onProgress)
  } catch (err) {
    console.warn('SSE 导出失败，尝试普通请求:', err.message)
    return await exportFallback(animationId, 'mp4', filename, duration, onProgress)
  }
}

/**
 * 通过后端API导出GIF动画（带真实进度）
 */
export const exportGIF = async (animationId, filename = 'animation', duration = 5, onProgress) => {
  if (!animationId) throw new Error('动画ID不存在')
  
  try {
    return await exportWithSSE(animationId, 'gif', filename, duration, onProgress)
  } catch (err) {
    console.warn('SSE 导出失败，尝试普通请求:', err.message)
    return await exportFallback(animationId, 'gif', filename, duration, onProgress)
  }
}

/**
 * 备用导出方法（无真实进度）
 */
const exportFallback = async (animationId, format, filename, duration, onProgress) => {
  const timeout = Math.max(240000, 30000 + duration * 15000)
  
  if (onProgress) onProgress(10, '正在导出...')
  
  let response
  try {
    response = await api.get(`/community/animations/${animationId}/export/${format}`, {
      params: { duration },
      responseType: 'blob',
      timeout
    })
  } catch (err) {
    if (err.response?.status === 403 || err.response?.status === 404) {
      response = await api.get(`/animations/${animationId}/export/${format}`, {
        params: { duration },
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
