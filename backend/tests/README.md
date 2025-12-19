# 测试工具

这个文件夹包含各种测试和诊断脚本。

## 可用的测试脚本

### 1. `diagnose.py` - 系统诊断
检查系统配置、依赖和API连通性。

```bash
python tests/diagnose.py
```

**检查项:**
- 环境变量配置
- 文件结构
- Python 依赖
- API 连通性

### 2. `test_api.py` - API 连通性测试
直接测试 Claude API 是否可用。

```bash
python tests/test_api.py
```

**功能:**
- 测试 API 连接
- 验证 API Key
- 显示 API 响应

### 3. `test_generate.py` - 动画生成测试
测试完整的动画生成流程。

```bash
python tests/test_generate.py
```

**功能:**
- 测试 AI Service 初始化
- 测试多个提示词的生成
- 显示生成结果

### 4. `test_db.py` - 数据库测试
测试数据库连接和基本操作。

```bash
python tests/test_db.py
```

**功能:**
- 测试数据库连接
- 创建测试数据
- 验证数据库操作

### 5. `test_auth.py` - 认证测试
测试用户认证功能。

```bash
python tests/test_auth.py
```

**功能:**
- 测试用户注册
- 测试用户登录
- 测试 JWT Token

## 快速诊断

如果遇到问题，按以下顺序运行测试：

1. **系统诊断** - 检查基础配置
   ```bash
   python tests/diagnose.py
   ```

2. **API 测试** - 检查 API 连接
   ```bash
   python tests/test_api.py
   ```

3. **数据库测试** - 检查数据库
   ```bash
   python tests/test_db.py
   ```

4. **生成测试** - 测试完整流程
   ```bash
   python tests/test_generate.py
   ```

## 常见问题

### API 返回 401 错误
- 检查 `.env` 文件中的 `CLAUDE_API_KEY` 是否正确
- 确保 API Key 没有多余的空格或换行符
- 访问 https://yunwu.ai 检查账户状态

### 数据库错误
- 确保 `backend/db/` 文件夹存在
- 检查文件夹权限
- 删除 `backend/db/easyanimate.db` 重新初始化

### 生成失败
- 先运行 `test_api.py` 确保 API 可用
- 检查网络连接
- 查看后端日志输出

## 注意事项

- 测试脚本需要在 `backend/` 目录下运行
- 确保已安装所有依赖：`pip install -r requirements.txt`
- 测试脚本会修改数据库，建议在开发环境使用
