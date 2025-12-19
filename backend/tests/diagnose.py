#!/usr/bin/env python
"""系统诊断脚本"""
import os
import sys
from dotenv import load_dotenv

print("=" * 70)
print("🔍 Easy Animate 系统诊断")
print("=" * 70)

# 加载环境变量
load_dotenv()

print("\n📋 环境变量检查:")
print("-" * 70)

env_vars = {
    'CLAUDE_API_KEY': '✅ 已配置' if os.environ.get('CLAUDE_API_KEY') else '❌ 未配置',
    'CLAUDE_API_BASE_URL': os.environ.get('CLAUDE_API_BASE_URL', '❌ 未配置'),
    'CLAUDE_MODEL': os.environ.get('CLAUDE_MODEL', '❌ 未配置'),
    'SECRET_KEY': '✅ 已配置' if os.environ.get('SECRET_KEY') else '❌ 未配置',
    'JWT_SECRET_KEY': '✅ 已配置' if os.environ.get('JWT_SECRET_KEY') else '❌ 未配置',
}

for key, value in env_vars.items():
    if key == 'CLAUDE_API_KEY':
        api_key = os.environ.get('CLAUDE_API_KEY', '')
        if api_key:
            print(f"  {key}: {api_key[:20]}... (长度: {len(api_key)})")
        else:
            print(f"  {key}: ❌ 未配置")
    else:
        print(f"  {key}: {value}")

print("\n📁 文件结构检查:")
print("-" * 70)

files_to_check = [
    'backend/config.py',
    'backend/models.py',
    'backend/app.py',
    'backend/services/ai_service.py',
    'backend/routes/auth.py',
    'backend/routes/animations.py',
    'backend/routes/community.py',
    'backend/routes/admin.py',
    'backend/.env',
    'backend/db',
]

for file_path in files_to_check:
    if os.path.exists(file_path):
        if os.path.isdir(file_path):
            print(f"  ✅ {file_path}/ (目录)")
        else:
            size = os.path.getsize(file_path)
            print(f"  ✅ {file_path} ({size} bytes)")
    else:
        print(f"  ❌ {file_path} (不存在)")

print("\n🔧 Python 依赖检查:")
print("-" * 70)

required_packages = [
    'flask',
    'flask_cors',
    'flask_jwt_extended',
    'flask_sqlalchemy',
    'requests',
    'python_dotenv',
]

for package in required_packages:
    try:
        __import__(package.replace('_', '-'))
        print(f"  ✅ {package}")
    except ImportError:
        print(f"  ❌ {package} (未安装)")

print("\n🌐 API 连通性检查:")
print("-" * 70)

api_key = os.environ.get('CLAUDE_API_KEY', '')
base_url = os.environ.get('CLAUDE_API_BASE_URL', 'https://yunwu.ai/v1')

if not api_key:
    print("  ❌ CLAUDE_API_KEY 未配置，无法测试连通性")
else:
    try:
        import requests
        import json
        
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {api_key}'
        }
        
        payload = {
            "model": "claude-haiku-4-5-20251001",
            "messages": [{"role": "user", "content": "test"}],
            "temperature": 0.7,
            "max_tokens": 50
        }
        
        print(f"  📡 测试 URL: {base_url}/chat/completions")
        response = requests.post(
            f"{base_url}/chat/completions",
            headers=headers,
            json=payload,
            timeout=10
        )
        
        if response.status_code == 200:
            print(f"  ✅ API 连接成功 (状态码: 200)")
        else:
            print(f"  ❌ API 返回错误 (状态码: {response.status_code})")
            try:
                error_data = response.json()
                error_msg = error_data.get('error', {}).get('message', response.text)
                print(f"     错误信息: {error_msg}")
            except:
                print(f"     响应: {response.text[:100]}")
    except Exception as e:
        print(f"  ❌ 连接失败: {str(e)}")

print("\n" + "=" * 70)
print("诊断完成")
print("=" * 70)

print("\n💡 建议:")
print("-" * 70)
print("1. 确保 .env 文件中的 CLAUDE_API_KEY 正确无误")
print("2. 检查 API Key 是否有多余的空格或换行符")
print("3. 访问 https://yunwu.ai 检查账户状态和余额")
print("4. 如果 API 连接失败，检查网络连接和防火墙设置")
print("=" * 70)
