# Easy Animate 快速部署指南

## 部署到 106.13.112.233:5000

### 前置要求
- Node.js 16+ 
- Python 3.8+
- npm 或 yarn

### 方式1：快速部署脚本（推荐）

#### Windows
```bash
deploy.bat http://106.13.112.233:5000 8000
```

#### Linux/Mac
```bash
chmod +x deploy.sh
./deploy.sh http://106.13.112.233:5000 8000
```

### 方式2：手动部署

#### 1. 构建前端
```bash
cd frontend
npm install
VITE_BACKEND_URL=http://106.13.112.233:5000 npm run build
```

#### 2. 启动前端服务
```bash
# 方式A：使用Python
cd dist
python -m http.server 8000

# 方式B：使用serve
npm install -g serve
serve -s dist -l 8000
```

#### 3. 启动后端服务
```bash
cd backend
python app.py
```

### 方式3：Docker部署

```bash
# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

## 访问应用

- **前端**: http://localhost:8000
- **后端API**: http://106.13.112.233:5000/api
- **后端**: http://localhost:5000

## 环境变量配置

### 前端环境变量

编辑 `frontend/.env.production`:
```
VITE_BACKEND_URL=http://106.13.112.233:5000
```

### 后端环境变量

编辑 `backend/.env`:
```
FLASK_ENV=production
DATABASE_URL=sqlite:///instance/easyanimate.db
```

## 常见问题

### Q: 前端无法连接到后端
**A**: 检查以下几点：
1. 后端服务是否正在运行
2. `VITE_BACKEND_URL` 是否正确设置
3. 防火墙是否允许访问后端端口
4. 浏览器控制台是否有CORS错误

### Q: 构建失败
**A**: 
1. 清除 `node_modules` 和 `dist` 目录
2. 重新安装依赖: `npm install`
3. 重新构建: `npm run build`

### Q: 如何更改前端端口
**A**: 
- Python: `python -m http.server 3000`
- serve: `serve -s dist -l 3000`
- Docker: 修改 `docker-compose.yml` 中的端口映射

## 生产环境建议

1. **使用Nginx反向代理**
   - 提高性能
   - 支持HTTPS
   - 负载均衡

2. **启用HTTPS**
   - 获取SSL证书（Let's Encrypt）
   - 配置Nginx SSL

3. **监控和日志**
   - 使用PM2管理Node进程
   - 配置日志收集
   - 设置告警

4. **性能优化**
   - 启用Gzip压缩
   - 配置缓存策略
   - 使用CDN加速

## 部署检查清单

- [ ] 后端服务正在运行
- [ ] 前端已构建
- [ ] 环境变量已正确配置
- [ ] 防火墙规则已配置
- [ ] 数据库已初始化
- [ ] 日志系统已配置
- [ ] 备份策略已制定
- [ ] 监控告警已设置

## 获取帮助

查看详细部署指南: `DEPLOYMENT_GUIDE.md`
查看后端启动指南: `backend/STARTUP.md`
