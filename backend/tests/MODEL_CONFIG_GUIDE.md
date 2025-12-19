# 模型配置功能使用指南

## 功能概述

Easy Animate 支持多个AI模型，管理员可以在后台管理页面切换使用的模型。

**支持的模型**:
- Claude Haiku 4.5 (claude-haiku-4-5-20251001) - 默认
- Gemini 3 Flash (gemini-3-flash-preview)
- Gemini 3 Pro (gemini-3-pro-preview-11-2025)

## 使用步骤

### 1. 访问管理后台

1. 登录系统（使用管理员账户）
   - 用户名: `admin`
   - 密码: `admin123`

2. 点击导航栏中的"管理后台"

### 2. 进入系统设置

1. 在管理后台页面，点击"系统设置"标签
2. 页面会显示"AI 模型配置"部分

### 3. 切换模型

1. 在"AI 模型配置"区域，会看到三个模型卡片
2. 点击要使用的模型卡片
3. 系统会自动切换模型
4. 当前使用的模型会显示"当前"标签

## 故障排除

### 问题1: 看不到"系统设置"标签

**原因**: 
- 可能没有管理员权限
- 页面没有正确加载

**解决方案**:
1. 确认已使用管理员账户登录
2. 刷新页面 (F5)
3. 检查浏览器控制台是否有错误信息

### 问题2: 点击模型后没有反应

**原因**:
- API请求失败
- 网络连接问题

**解决方案**:
1. 打开浏览器开发者工具 (F12)
2. 切换到"Console"标签
3. 查看是否有错误信息
4. 检查"Network"标签中的API请求状态

### 问题3: 模型切换后没有生效

**原因**:
- 数据库未正确保存
- 缓存问题

**解决方案**:
1. 刷新页面
2. 重新登录
3. 检查后端日志

## 后端诊断

### 运行模型配置测试

```bash
# 测试模型配置功能
python backend/tests/test_model_config.py

# 测试模型配置API
python backend/tests/test_model_api.py
```

### 检查数据库

```bash
# 进入Python交互式环境
python

# 在Python中执行
from app import app, db
from models import SystemConfig

with app.app_context():
    # 查看所有配置
    configs = SystemConfig.query.all()
    for c in configs:
        print(f"{c.key}: {c.value}")
    
    # 查看当前模型
    model = SystemConfig.get('ai_model', 'claude-haiku-4-5-20251001')
    print(f"当前模型: {model}")
```

## 前端诊断

### 检查浏览器控制台

1. 打开浏览器开发者工具 (F12)
2. 切换到"Console"标签
3. 查看是否有错误信息
4. 特别注意以下错误:
   - `401 Unauthorized` - 认证失败
   - `403 Forbidden` - 权限不足
   - `404 Not Found` - API端点不存在
   - `500 Internal Server Error` - 服务器错误

### 检查Network请求

1. 打开浏览器开发者工具 (F12)
2. 切换到"Network"标签
3. 点击模型卡片
4. 查看请求详情:
   - 请求URL: `/api/admin/models/current`
   - 请求方法: `PUT`
   - 请求体: `{"model_id": "gemini-3-flash-preview"}`
   - 响应状态: 应该是 `200`

## API端点

### 获取可用模型列表

```
GET /api/admin/models
Authorization: Bearer <token>

响应:
{
  "models": [
    {"id": "claude-haiku-4-5-20251001", "name": "Claude Haiku 4.5", "provider": "claude"},
    {"id": "gemini-3-flash-preview", "name": "Gemini 3 Flash", "provider": "gemini"},
    {"id": "gemini-3-pro-preview-11-2025", "name": "Gemini 3 Pro", "provider": "gemini"}
  ],
  "current": {"id": "claude-haiku-4-5-20251001", "name": "Claude Haiku 4.5", "provider": "claude"}
}
```

### 切换模型

```
PUT /api/admin/models/current
Authorization: Bearer <token>
Content-Type: application/json

请求体:
{
  "model_id": "gemini-3-flash-preview"
}

响应:
{
  "message": "模型已更新",
  "current": {"id": "gemini-3-flash-preview", "name": "Gemini 3 Flash", "provider": "gemini"}
}
```

## 常见问题

### Q: 切换模型后，新生成的动画会使用新模型吗?

A: 是的。模型切换后，所有新生成的动画都会使用新选择的模型。

### Q: 可以同时使用多个模型吗?

A: 目前不支持。系统只能使用一个模型。如果需要使用不同的模型，需要在管理后台切换。

### Q: 模型切换会影响已生成的动画吗?

A: 不会。已生成的动画不会受到影响。模型切换只影响新生成的动画。

### Q: 如何恢复到默认模型?

A: 在"AI 模型配置"中点击"Claude Haiku 4.5"卡片即可。

## 技术细节

### 模型配置存储

模型配置存储在SQLite数据库的 `system_config` 表中:

```sql
CREATE TABLE system_config (
  id INTEGER PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description VARCHAR(256),
  updated_at DATETIME
);
```

### 模型切换流程

1. 前端发送 `PUT /api/admin/models/current` 请求
2. 后端验证管理员权限
3. 后端验证模型ID有效性
4. 后端调用 `ai_service.set_model(model_id)`
5. `ai_service` 将模型ID保存到数据库
6. 后端返回成功响应
7. 前端刷新模型列表显示

### 模型获取流程

1. 前端发送 `GET /api/admin/models` 请求
2. 后端调用 `ai_service.get_available_models()` 获取可用模型列表
3. 后端调用 `ai_service.get_current_model_info()` 获取当前模型
4. `ai_service` 从数据库读取当前模型配置
5. 后端返回模型列表和当前模型信息
6. 前端显示模型卡片

## 支持

如果遇到问题，请:

1. 查看浏览器控制台错误信息
2. 运行诊断脚本: `python backend/tests/test_model_api.py`
3. 检查后端日志
4. 查看本指南的故障排除部分
