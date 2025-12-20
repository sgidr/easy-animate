# Ubuntu 24 部署指南

## 问题：导出视频/GIF效果差

如果在Ubuntu服务器上导出的视频和GIF效果很差，很可能是因为Playwright浏览器依赖没有正确安装，导致使用了备用的静态渲染方案。

## 解决方案

### 1. 安装Playwright及其依赖

#### 方式A：使用安装脚本（推荐）

```bash
cd backend
sudo chmod +x install_playwright.sh
sudo ./install_playwright.sh
```

#### 方式B：手动安装

```bash
# 1. 安装系统依赖
sudo apt-get update
sudo apt-get install -y \
    libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 \
    libcups2 libdrm2 libdbus-1-3 libxkbcommon0 \
    libatspi2.0-0 libxcomposite1 libxdamage1 libxfixes3 \
    libxrandr2 libgbm1 libasound2 libpango-1.0-0 \
    libcairo2 libfontconfig1 libfreetype6 libglib2.0-0 \
    libgtk-3-0 libx11-6 libx11-xcb1 libxcb1 libxext6 \
    fonts-liberation fonts-noto-cjk fonts-noto-color-emoji \
    xvfb

# 2. 安装Python Playwright
pip install playwright

# 3. 安装Chromium浏览器
playwright install chromium

# 4. 安装浏览器系统依赖
playwright install-deps chromium
```

### 2. 验证安装

```bash
# 测试Playwright是否正常工作
python -c "
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto('https://example.com')
    print('Playwright 工作正常!')
    browser.close()
"
```

### 3. 检查后端日志

重启后端服务后，导出时应该看到：
```
✅ Playwright 浏览器启动成功
开始捕获动画帧: duration=5s, fps=15, total_frames=75
帧捕获完成，共 75 帧
MP4导出完成: 75帧, 15fps
```

如果看到以下错误，说明Playwright没有正确安装：
```
❌ Playwright 捕获失败: ...
💡 提示: 可能需要安装浏览器依赖
```

### 4. 常见问题

#### Q: 安装后仍然报错

**A:** 尝试完整重装：
```bash
pip uninstall playwright
pip install playwright
playwright install --with-deps chromium
```

#### Q: 权限问题

**A:** 确保运行后端的用户有权限访问浏览器：
```bash
# 检查浏览器路径
playwright install chromium --dry-run

# 确保目录权限正确
chmod -R 755 ~/.cache/ms-playwright
```

#### Q: 内存不足

**A:** Chromium需要一定内存，确保服务器有足够内存：
```bash
# 检查内存
free -h

# 如果内存不足，可以添加swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

#### Q: 无头服务器问题

**A:** 如果是纯命令行服务器，可能需要虚拟显示：
```bash
# 安装xvfb
sudo apt-get install xvfb

# 使用xvfb运行
xvfb-run python app.py
```

### 5. 性能优化

#### 增加导出质量

当前配置已优化：
- MP4: 800x600分辨率, 15fps, CRF=18
- GIF: 800x600分辨率, 10fps, 统一调色板

#### 减少内存使用

如果服务器内存有限，可以降低分辨率：

编辑 `backend/services/export_service.py`:
```python
if format == 'mp4':
    width = 640
    height = 480
    fps = 10
else:
    width = 640
    height = 480
    fps = 8
```

### 6. 完整部署流程

```bash
# 1. 克隆代码
git clone <repo>
cd easyanimate

# 2. 安装Python依赖
cd backend
pip install -r requirements.txt

# 3. 安装Playwright
sudo ./install_playwright.sh

# 4. 配置环境变量
cp .env.example .env
# 编辑 .env 设置API密钥等

# 5. 启动后端
python app.py
```

### 7. 监控导出质量

检查后端日志中的导出信息：
```bash
# 查看最近的导出日志
grep -E "(导出|Playwright|帧)" backend.log | tail -20
```

正常的导出日志应该显示：
```
✅ Playwright 浏览器启动成功
开始捕获动画帧: duration=5s, fps=15, total_frames=75
帧捕获完成，共 75 帧
MP4导出完成: 75帧, 15fps
```

如果显示"使用备用方案"，说明Playwright没有正常工作。

## 相关文件

- `backend/install_playwright.sh` - Playwright安装脚本
- `backend/services/export_service.py` - 导出服务
- `backend/requirements.txt` - Python依赖

## 参考资源

- [Playwright Python文档](https://playwright.dev/python/)
- [Playwright系统要求](https://playwright.dev/python/docs/intro#system-requirements)
