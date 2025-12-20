import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 从环境变量读取后端地址，默认为本地
const backendUrl = process.env.VITE_BACKEND_URL || 'http://localhost:5000'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: backendUrl,
        changeOrigin: true
      }
    }
  }
})
