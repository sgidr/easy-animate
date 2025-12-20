# Easy Animate 部署指南

## 前端部署配置

### 环境变量配置

前端已配置支持远程后端。根据环境选择不同的配置：

#### 开发环境
```bash
# 使用本地后端 (localhost:5000)
npm run dev
```

#### 生产环境 - 远程后端 (106.13.112.233:5000)

**方式1：使用预配置的生产环境变量**
```bash
npm run build
# 自动使用 .env.production 中的配置
# VITE_BACKEND_URL=http://106.13.112.233:5000
```

**方式2：自定义后端地址**
```bash
VITE_BACKEND_URL=http://106.13.112.233:5000 npm run build
```

### 构建和部署步骤

1. **安装依赖**
   ```bash
   cd frontend
   npm install
   ```

2. **构建生产版本**
   ```bash
   npm run build
   ```
   生成的文件在 `dist/` 目录

3. **部署到服务器**
   
   **选项A：使用Nginx**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       root /path/to/frontend/dist;
       index index.html;
       
       # 处理SPA路由
       location / {
           try_files $uri $uri/ /index.html;
       }
       
       # API代理（可选，如果前端和后端在同一服务器）
       location /api/ {
           proxy_pass http://localhost:5000/api/;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

   **选项B：使用Node.js服务器**
   ```bash
   npm install -g serve
   serve -s dist -l 3000
   ```

   **选项C：使用Python简单服务器**
   ```bash
   cd dist
   python -m http.server 8000
   ```

4. **验证部署**
   - 访问前端地址
   - 检查浏览器控制台是否有CORS错误
   - 测试API调用（登录、创建动画等）

### 常见问题

#### CORS错误
如果前端和后端不在同一域名，需要在后端配置CORS：

在 `backend/app.py` 中确保已配置：
```python
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://106.13.112.233:5000", "http://your-frontend-domain.com"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})
```

#### API请求失败
1. 检查 `.env.production` 中的 `VITE_BACKEND_URL` 是否正确
2. 确保后端服务正在运行
3. 检查防火墙是否允许访问后端端口

#### 环境变量未生效
- 确保在构建前设置了环境变量
- 清除 `dist/` 目录后重新构建
- 检查 `vite.config.js` 中的环境变量读取逻辑

### 开发环境快速启动

```bash
# 终端1：启动后端
cd backend
python app.py

# 终端2：启动前端开发服务器
cd frontend
npm run dev
```

访问 `http://localhost:5173`

### 生产环境快速启动

```bash
# 构建前端
cd frontend
npm run build

# 启动后端
cd backend
python app.py

# 在另一个终端启动前端服务
cd frontend/dist
python -m http.server 8000
```

访问 `http://your-server-ip:8000`

## 后端部署配置

参考 `backend/STARTUP.md` 获取后端部署说明。

## 环境变量说明

### 前端环境变量

| 变量名 | 说明 | 默认值 | 示例 |
|--------|------|--------|------|
| `VITE_BACKEND_URL` | 后端API服务器地址 | `http://localhost:5000` | `http://106.13.112.233:5000` |

### 后端环境变量

参考 `backend/.env.example` 获取完整列表。

## 性能优化建议

1. **启用Gzip压缩**
   ```nginx
   gzip on;
   gzip_types text/plain text/css application/json application/javascript;
   ```

2. **设置缓存策略**
   ```nginx
   location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
       expires 1y;
       add_header Cache-Control "public, immutable";
   }
   ```

3. **使用CDN加速静态资源**

4. **启用HTTP/2**
   ```nginx
   listen 443 ssl http2;
   ```

## 监控和日志

- 前端：检查浏览器开发者工具的Console和Network标签
- 后端：查看 `backend/app.py` 的日志输出
- 服务器：使用 `tail -f` 查看Nginx/Apache日志

