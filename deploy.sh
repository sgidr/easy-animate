#!/bin/bash

# Easy Animate 部署脚本
# 用法: ./deploy.sh [backend_url] [port]
# 示例: ./deploy.sh http://106.13.112.233:5000 8000

set -e

BACKEND_URL=${1:-"http://106.13.112.233:5000"}
FRONTEND_PORT=${2:-8000}

echo "=========================================="
echo "Easy Animate 部署脚本"
echo "=========================================="
echo "后端地址: $BACKEND_URL"
echo "前端端口: $FRONTEND_PORT"
echo ""

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未找到Node.js，请先安装Node.js"
    exit 1
fi

echo "✓ Node.js 版本: $(node --version)"

# 进入前端目录
cd frontend

# 安装依赖
echo ""
echo "📦 安装前端依赖..."
npm install

# 构建前端
echo ""
echo "🔨 构建前端..."
VITE_BACKEND_URL=$BACKEND_URL npm run build

echo ""
echo "✓ 前端构建完成"
echo ""
echo "=========================================="
echo "部署完成！"
echo "=========================================="
echo ""
echo "启动前端服务器:"
echo "  cd frontend/dist"
echo "  python -m http.server $FRONTEND_PORT"
echo ""
echo "或使用 serve:"
echo "  npm install -g serve"
echo "  serve -s dist -l $FRONTEND_PORT"
echo ""
echo "访问地址: http://localhost:$FRONTEND_PORT"
echo ""
