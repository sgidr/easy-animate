# HTTPS 混合内容问题修复

## 问题
```
Mixed Content: The page at 'https://easyanimate.awei6.site/' was loaded over HTTPS, 
but requested an insecure XMLHttpRequest endpoint 'http://106.13.112.233:5000/api/...'
```

前端使用HTTPS，但后端API使用HTTP，浏览器会阻止这种"混合内容"请求。

## 解决方案（推荐：Nginx反向代理）

让前端和后端API都通过同一个域名（HTTPS）访问。

### 1. 配置Nginx

将 `nginx_easyanimate.conf` 复制到服务器：

```bash
# 复制配置文件
sudo cp nginx_easyanimate.conf /etc/nginx/sites-available/easyanimate

# 创建软链接启用
sudo ln -s /etc/nginx/sites-available/easyanimate /etc/nginx/sites-enabled/

# 修改配置中的SSL证书路径
sudo nano /etc/nginx/sites-available/easyanimate
```

关键配置：
```nginx
# 前端静态文件
location / {
    root /var/www/easyanimate/dist;
    try_files $uri $uri/ /index.html;
}

# 后端API代理
location /api/ {
    proxy_pass http://127.0.0.1:5000/api/;
    # ... 其他配置
}
```

### 2. 部署前端

```bash
# 构建前端（不设置VITE_BACKEND_URL，使用相对路径）
cd frontend
npm run build

# 复制到Nginx目录
sudo mkdir -p /var/www/easyanimate
sudo cp -r dist/* /var/www/easyanimate/
```

### 3. 启动后端

```bash
cd backend
python app.py
# 或使用gunicorn
gunicorn -w 4 -b 127.0.0.1:5000 app:app
```

### 4. 重启Nginx

```bash
# 测试配置
sudo nginx -t

# 重启
sudo systemctl restart nginx
```

### 5. 验证

访问 `https://easyanimate.awei6.site`

- 前端页面应该正常加载
- API请求应该通过 `https://easyanimate.awei6.site/api/...`
- 不再有混合内容警告

## 架构说明

```
用户浏览器
    |
    | HTTPS (443)
    v
Nginx (easyanimate.awei6.site)
    |
    |-- / (前端静态文件)
    |       -> /var/www/easyanimate/dist/
    |
    |-- /api/ (后端API代理)
            -> http://127.0.0.1:5000/api/
```

## 相关文件

- `nginx_easyanimate.conf` - Nginx配置模板
- `frontend/.env.production` - 前端环境变量（已设为空，使用相对路径）
- `frontend/src/services/api.js` - API配置（支持相对路径）

## 常见问题

### Q: 没有SSL证书怎么办？

使用Let's Encrypt免费证书：
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d easyanimate.awei6.site
```

### Q: API请求超时？

检查Nginx配置中的超时设置：
```nginx
proxy_connect_timeout 300s;
proxy_send_timeout 300s;
proxy_read_timeout 300s;
```

### Q: SSE（导出进度）不工作？

确保Nginx配置中有：
```nginx
proxy_buffering off;
proxy_cache off;
proxy_set_header Connection "";
proxy_http_version 1.1;
```

### Q: 后端日志显示来自127.0.0.1？

这是正常的，因为请求通过Nginx代理。真实IP在 `X-Real-IP` 头中。
