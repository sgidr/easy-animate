# CORS 配置指南

## 问题描述

前端访问后端API时出现CORS错误：
```
Access to XMLHttpRequest at 'http://106.13.112.233:5000/api/...' from origin 'http://easyanimate.awei6.site' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## 解决方案

### 1. 默认配置（已启用）

后端已配置支持以下源：

```python
# 本地开发
http://localhost:5173      # Vite开发服务器
http://localhost:3000      # 生产前端
http://localhost:8000      # 部署前端

# 生产环境
http://easyanimate.awei6.site   # HTTP
https://easyanimate.awei6.site  # HTTPS
http://106.13.112.233:5000      # 后端IP（测试用）
```

### 2. 自定义CORS源

#### 方式A：修改代码（不推荐）

编辑 `backend/config.py` 中的 `get_cors_origins()` 方法：

```python
@staticmethod
def get_cors_origins():
    return [
        'http://your-domain.com',
        'https://your-domain.com',
        # 添加更多源...
    ]
```

#### 方式B：使用环境变量（推荐）

编辑 `backend/.env`：

```env
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,http://easyanimate.awei6.site,https://easyanimate.awei6.site
```

多个源用逗号分隔，不要有空格。

### 3. CORS配置详解

当前配置的参数：

```python
CORS(app, 
     origins=cors_origins,                    # 允许的源
     methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],  # 允许的HTTP方法
     allow_headers=['Content-Type', 'Authorization'],       # 允许的请求头
     supports_credentials=True,               # 支持跨域认证
     max_age=3600)                           # 预检请求缓存时间（秒）
```

### 4. 验证CORS配置

#### 方式A：检查响应头

```bash
curl -i -X OPTIONS http://106.13.112.233:5000/api/community/featured \
  -H "Origin: http://easyanimate.awei6.site" \
  -H "Access-Control-Request-Method: GET"
```

应该看到：
```
Access-Control-Allow-Origin: http://easyanimate.awei6.site
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

#### 方式B：检查后端日志

启动后端时应该看到：
```
✅ CORS允许的源: ['http://localhost:5173', 'http://localhost:3000', ...]
```

### 5. 常见问题

#### Q: 为什么还是有CORS错误？

**A:** 检查以下几点：

1. **后端是否重启？**
   - 修改 `.env` 后必须重启后端服务
   - 修改代码后也需要重启

2. **源是否完全匹配？**
   - `http://easyanimate.awei6.site` 和 `https://easyanimate.awei6.site` 是不同的源
   - 包括协议、域名、端口都要完全匹配

3. **是否有拼写错误？**
   - 检查 `.env` 中的域名拼写
   - 检查前端访问的实际域名

4. **浏览器缓存？**
   - 清除浏览器缓存
   - 使用无痕模式测试

#### Q: 如何允许所有源？

**A:** 不推荐在生产环境这样做，但如果需要：

```python
CORS(app, origins="*")
```

#### Q: 如何只允许特定的方法？

**A:** 修改 `methods` 参数：

```python
CORS(app, 
     origins=cors_origins,
     methods=['GET', 'POST'],  # 只允许GET和POST
     allow_headers=['Content-Type', 'Authorization'])
```

#### Q: 如何处理预检请求超时？

**A:** 增加 `max_age` 值：

```python
CORS(app, 
     origins=cors_origins,
     max_age=86400)  # 24小时
```

### 6. 生产环境建议

1. **明确指定源**
   ```env
   CORS_ORIGINS=https://easyanimate.awei6.site
   ```

2. **使用HTTPS**
   - 生产环境应该使用HTTPS
   - 配置 `https://easyanimate.awei6.site`

3. **限制方法**
   - 只允许必要的HTTP方法
   - 不要使用通配符 `*`

4. **监控CORS错误**
   - 记录CORS相关的错误
   - 定期检查日志

### 7. 部署检查清单

- [ ] 后端已重启
- [ ] `.env` 中的 `CORS_ORIGINS` 已正确配置
- [ ] 前端域名与CORS配置匹配
- [ ] 浏览器缓存已清除
- [ ] 测试API调用成功
- [ ] 日志中显示正确的CORS源

## 相关文件

- `backend/app.py` - CORS初始化
- `backend/config.py` - CORS配置方法
- `backend/.env` - 环境变量配置

## 参考资源

- [Flask-CORS文档](https://flask-cors.readthedocs.io/)
- [MDN CORS指南](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
