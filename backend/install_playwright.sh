#!/bin/bash

# Playwright 安装脚本 (Ubuntu 24)
# 用于安装 Playwright 及其浏览器依赖

echo "=========================================="
echo "Playwright 安装脚本 (Ubuntu 24)"
echo "=========================================="

# 检查是否以root运行
if [ "$EUID" -ne 0 ]; then
    echo "请使用 sudo 运行此脚本"
    echo "用法: sudo ./install_playwright.sh"
    exit 1
fi

echo ""
echo "1. 更新系统包..."
apt-get update

echo ""
echo "2. 安装系统依赖..."
apt-get install -y \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxkbcommon0 \
    libatspi2.0-0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    libfontconfig1 \
    libfreetype6 \
    libglib2.0-0 \
    libgtk-3-0 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxext6 \
    fonts-liberation \
    fonts-noto-cjk \
    fonts-noto-color-emoji \
    xvfb

echo ""
echo "3. 安装 Python Playwright..."
pip install playwright

echo ""
echo "4. 安装 Playwright 浏览器..."
playwright install chromium

echo ""
echo "5. 安装 Playwright 系统依赖..."
playwright install-deps chromium

echo ""
echo "=========================================="
echo "安装完成！"
echo "=========================================="
echo ""
echo "验证安装:"
echo "  python -c \"from playwright.sync_api import sync_playwright; print('Playwright OK')\""
echo ""
echo "如果仍有问题，尝试:"
echo "  playwright install --with-deps chromium"
echo ""
