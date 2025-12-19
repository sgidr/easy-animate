#!/usr/bin/env python
"""测试Claude API连通性"""
import requests
import json
import os
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.environ.get('CLAUDE_API_KEY', '')
BASE_URL = os.environ.get('CLAUDE_API_BASE_URL', 'https://yunwu.ai/v1')
MODEL = os.environ.get('CLAUDE_MODEL', 'claude-haiku-4-5-20251001')

print("=" * 60)
print("Claude API 连通性测试")
print("=" * 60)
print(f"API Key: {API_KEY[:20]}..." if API_KEY else "API Key: 未配置")
print(f"Base URL: {BASE_URL}")
print(f"Model: {MODEL}")
print("=" * 60)

if not API_KEY:
    print("❌ 错误: CLAUDE_API_KEY 未配置")
    print("请在 .env 文件中设置 CLAUDE_API_KEY")
    exit(1)

headers = {
    'Content-Type': 'application/json',
    'Authorization': f'Bearer {API_KEY}'
}

payload = {
    "model": MODEL,
    "messages": [
        {"role": "user", "content": "Say 'Hello, this is a test!'"}
    ],
    "temperature": 0.7,
    "max_tokens": 100
}

try:
    print("\n📡 正在发送请求...")
    response = requests.post(
        f"{BASE_URL}/chat/completions",
        headers=headers,
        json=payload,
        timeout=30
    )
    
    print(f"📊 状态码: {response.status_code}")
    
    if response.status_code == 200:
        print("✅ 连接成功!")
        data = response.json()
        print(f"\n📝 API 响应:")
        print(json.dumps(data, indent=2, ensure_ascii=False))
        
        if 'choices' in data and len(data['choices']) > 0:
            content = data['choices'][0]['message']['content']
            print(f"\n💬 模型回复: {content}")
    else:
        print(f"❌ 请求失败!")
        print(f"\n📋 响应内容:")
        try:
            error_data = response.json()
            print(json.dumps(error_data, indent=2, ensure_ascii=False))
        except:
            print(response.text)
        
        # 常见错误诊断
        if response.status_code == 401:
            print("\n🔍 诊断: 401 Unauthorized")
            print("可能原因:")
            print("  1. API Key 无效或已过期")
            print("  2. API Key 格式错误")
            print("  3. 账户余额不足")
            print("\n解决方案:")
            print("  - 检查 .env 文件中的 CLAUDE_API_KEY 是否正确")
            print("  - 确保 API Key 没有多余的空格或换行符")
            print("  - 访问 yunwu.ai 检查账户状态和余额")
        elif response.status_code == 429:
            print("\n🔍 诊断: 429 Too Many Requests")
            print("可能原因: 请求过于频繁")
        elif response.status_code == 500:
            print("\n🔍 诊断: 500 Server Error")
            print("可能原因: 服务器错误，请稍后重试")

except requests.exceptions.Timeout:
    print("❌ 连接超时")
    print("可能原因:")
    print("  1. 网络连接不稳定")
    print("  2. API 服务器响应缓慢")
    print("  3. 防火墙阻止了连接")

except requests.exceptions.ConnectionError:
    print("❌ 连接失败")
    print("可能原因:")
    print("  1. 网络连接问题")
    print("  2. API 服务器地址错误")
    print("  3. DNS 解析失败")

except Exception as e:
    print(f"❌ 发生错误: {str(e)}")

print("\n" + "=" * 60)
