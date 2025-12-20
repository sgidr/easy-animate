# CORS错误快速修复

## 问题
```
Access to XMLHttpRequest at 'http://106.13.112.233:5000/api/...' from origin 'http://easyanimate.awei6.site' 
has been blocked by CORS policy
```

## 快速修复（3步）

### 1. 确认后端已更新
后端代码已包含CORS支持，确保你有最新的代码：
- `backend/app.py` - 已配置CORS
- `backend/config.py` - 已添加 `get_cors_origins()` 方法

### 2. 重启后端服务
```bash
# 停止当前后端
Ctrl+C

# 重新启动
cd backend
python app.py
```

启动时应该看到：
```
✅ CORS允许的源: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:8000', 'http://easyanimate.awei6.site', 'https://easyanimate.awei6.site', 'http://106.13.112.233:5000']
```

### 3. 清除浏览器缓存并重新加载
- 按 `F12` 打开开发者工具
- 右键点击刷新按钮，选择"清空缓存并硬性重新加载"
- 或按 `Ctrl+Shift+Delete` 清除缓存

## 验证修复

### 方法1：检查浏览器控制台
1. 打开浏览器开发者工具（F12）
2. 切换到 Network 标签
3. 刷新页面
4. 查看API请求的响应头中是否有：
   ```
   Access-Control-Allow-Origin: http://easyanimate.awei6.site
   ```

### 方法2：使用curl测试
```bash
curl -i -X OPTIONS http://106.13.112.233:5000/api/community/featured \
  -H "Origin: http://easyanimate.awei6.site" \
  -H "Access-Control-Request-Method: GET"
```

应该看到 `200 OK` 和 CORS相关的响应头。

## 如果还是不行

### 检查清单
- [ ] 后端服务是否正在运行？
  ```bash
  curl http://106.13.112.233:5000/api/health
  ```

- [ ] 前端访问的域名是否正确？
  - 检查浏览器地址栏
  - 应该是 `http://easyanimate.awei6.site`

- [ ] 是否有拼写错误？
  - 检查 `backend/config.py` 中的域名
  - 确保与前端访问的域名完全匹配

- [ ] 是否需要HTTPS？
  - 如果前端使用HTTPS，后端也需要配置HTTPS源
  - 在 `backend/config.py` 中添加 `https://easyanimate.awei6.site`

### 手动配置CORS源

编辑 `backend/.env`：
```env
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,http://localhost:8000,http://easyanimate.awei6.site,https://easyanimate.awei6.site
```

然后重启后端。

## 常见错误

### 错误1：预检请求失败
```
Response to preflight request doesn't pass access control check
```
**原因**：OPTIONS请求被拒绝
**解决**：确保 `methods` 包含 `OPTIONS`（已默认配置）

### 错误2：Authorization头被拒绝
```
Request header field Authorization is not allowed
```
**原因**：`allow_headers` 不包含 `Authorization`
**解决**：已在配置中包含，重启后端

### 错误3：Credentials被拒绝
```
The value of the 'Access-Control-Allow-Credentials' header
```
**原因**：跨域请求中使用了认证信息
**解决**：已配置 `supports_credentials=True`

## 后续步骤

1. 测试所有API端点
2. 检查登录功能
3. 测试文件上传
4. 验证SSE连接（导出进度）

## 需要帮助？

查看详细文档：`CORS_CONFIGURATION.md`
