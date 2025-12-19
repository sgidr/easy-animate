import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 240000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器 - 自动添加 Authorization header
api.interceptors.request.use(
  config => {
    // 从 localStorage 获取 token
    try {
      const authStorage = localStorage.getItem('auth-storage')
      if (authStorage) {
        const parsed = JSON.parse(authStorage)
        // zustand persist 存储格式: { state: { token, user, isAuthenticated }, version: 0 }
        const token = parsed?.state?.token
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
      }
    } catch (e) {
      console.error('Failed to parse auth storage:', e)
    }
    return config
  },
  error => Promise.reject(error)
)

// 不需要自动重定向到登录页的路径
const noRedirectPaths = ['/animations/', '/community/']

api.interceptors.response.use(
  response => response,
  error => {
    // 只有在非公开页面的401错误才重定向到登录
    const requestUrl = error.config?.url || ''
    const shouldRedirect = !noRedirectPaths.some(path => requestUrl.includes(path))
    
    if (error.response?.status === 401 && shouldRedirect) {
      // 检查当前页面是否需要登录
      const currentPath = window.location.pathname
      const publicPaths = ['/', '/gallery', '/login', '/register']
      const isPublicPage = publicPaths.some(p => currentPath === p) || currentPath.startsWith('/animation/')
      
      if (!isPublicPage) {
        localStorage.removeItem('auth-storage')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
