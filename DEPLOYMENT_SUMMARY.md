# 部署配置总结

## 已完成的配置

### 1. 前端环境变量支持
- ✅ `frontend/.env.production` - 生产环境配置（后端: 106.13.112.233:5000）
- ✅ `frontend/.env.development` - 开发环境配置（后端: localhost:5000）
- ✅ `frontend/vite.config.js` - 支持环境变量读取

### 2. API配置
- ✅ `frontend/src/services/api.js` - 支持开发/生产环境自动切换
  - 开发环境：使用相对路径 `/api`（由Vite代理）
  - 生产环境：使用完整URL `http://106.13.112.233:5000/api`

### 3. 部署脚本
- ✅ `deploy.sh` - Linux/Mac快速部署脚本
- ✅ `deploy.bat` - Windows快速部署脚本
- ✅ 自动安装依赖、构建、提示启动命令

### 4. Docker支持
- ✅ `frontend/Dockerfile` - 前端容器化
- ✅ `docker-compose.yml` - 完整的容器编排
- ✅ `nginx.conf` - Nginx反向代理配置

### 5. 文档
- ✅ `DEPLOYMENT_GUIDE.md` - 详细部署指南
- ✅ `QUICK_DEPLOY.md` - 快速部署指南

## 快速开始

### 开发环境
```bash
# 终端1：启动后端
cd backend
python app.py

# 终端2：启动前端
cd frontend
npm install
npm run dev
```
访问: http://localhost:5173

### 生产环境（远程后端）
```bash
# 方式1：使用部署脚本
./deploy.sh http://106.13.112.233:5000 8000

# 方式2：手动构建
cd frontend
npm install
VITE_BACKEND_URL=http://106.13.112.233:5000 npm run build
cd dist
python -m http.server 8000
```
访问: http://localhost:8000

### Docker部署
```bash
docker-compose up -d
```
访问: http://localhost:80

## 环境变量说明

### 前端
| 环境 | 变量 | 值 |
|------|------|-----|
| 开发 | `VITE_BACKEND_URL` | `http://localhost:5000` |
| 生产 | `VITE_BACKEND_URL` | `http://106.13.112.233:5000` |

### 后端
参考 `backend/.env.example`

## 关键文件修改

### 1. `frontend/vite.config.js`
```javascript
const backendUrl = process.env.VITE_BACKEND_URL || 'http://localhost:5000'
```

### 2. `frontend/src/services/api.js`
```javascript
const getBaseURL = () => {
  if (import.meta.env.DEV) {
    return '/api'  // 开发环境
  } else {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || window.location.origin
    return `${backendUrl}/api`  // 生产环境
  }
}
```

## 部署检查清单

- [ ] 后端服务已启动（106.13.112.233:5000）
- [ ] 前端依赖已安装
- [ ] 前端已构建（`npm run build`）
- [ ] 环境变量已正确配置
- [ ] 防火墙允许访问
- [ ] 数据库已初始化
- [ ] 日志系统已配置

## 常见问题

### 前端无法连接后端
1. 检查后端是否运行: `curl http://106.13.112.233:5000/api/health`
2. 检查环境变量: `VITE_BACKEND_URL=http://106.13.112.233:5000`
3. 检查CORS配置（如需要）

### 构建失败
1. 清除缓存: `rm -rf node_modules dist`
2. 重新安装: `npm install`
3. 重新构建: `npm run build`

### 端口被占用
- 修改前端端口: `python -m http.server 3000`
- 修改后端端口: 编辑 `backend/app.py`

## 下一步

1. 测试前端连接
2. 验证API调用
3. 配置HTTPS（生产环境）
4. 设置监控告警
5. 配置自动备份

## 相关文档

- 详细部署指南: `DEPLOYMENT_GUIDE.md`
- 快速部署指南: `QUICK_DEPLOY.md`
- 后端启动指南: `backend/STARTUP.md`
- 项目需求文档: `项目需求文档.md`
