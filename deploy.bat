@echo off
REM Easy Animate 部署脚本 (Windows)
REM 用法: deploy.bat [backend_url] [port]
REM 示例: deploy.bat http://106.13.112.233:5000 8000

setlocal enabledelayedexpansion

set BACKEND_URL=%1
set FRONTEND_PORT=%2

if "%BACKEND_URL%"=="" set BACKEND_URL=http://106.13.112.233:5000
if "%FRONTEND_PORT%"=="" set FRONTEND_PORT=8000

echo.
echo ==========================================
echo Easy Animate 部署脚本
echo ==========================================
echo 后端地址: %BACKEND_URL%
echo 前端端口: %FRONTEND_PORT%
echo.

REM 检查Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ 错误: 未找到Node.js，请先安装Node.js
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✓ Node.js 版本: %NODE_VERSION%

REM 进入前端目录
cd frontend

REM 安装依赖
echo.
echo 📦 安装前端依赖...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ❌ 安装依赖失败
    pause
    exit /b 1
)

REM 构建前端
echo.
echo 🔨 构建前端...
set VITE_BACKEND_URL=%BACKEND_URL%
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo ❌ 构建失败
    pause
    exit /b 1
)

echo.
echo ✓ 前端构建完成
echo.
echo ==========================================
echo 部署完成！
echo ==========================================
echo.
echo 启动前端服务器:
echo   cd frontend\dist
echo   python -m http.server %FRONTEND_PORT%
echo.
echo 或使用 serve:
echo   npm install -g serve
echo   serve -s dist -l %FRONTEND_PORT%
echo.
echo 访问地址: http://localhost:%FRONTEND_PORT%
echo.
pause
