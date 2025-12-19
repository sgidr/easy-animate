#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""测试服务器启动和API调用"""
import os
import sys
import time
import requests
import json
from threading import Thread

# 添加backend路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

print("=" * 70)
print("Server Startup Test")
print("=" * 70)

# 1. 启动服务器
print("\n1. Starting Flask server...")
from app import app

def run_server():
    app.run(debug=False, port=5000, use_reloader=False)

server_thread = Thread(target=run_server, daemon=True)
server_thread.start()

# 等待服务器启动
print("   Waiting for server to start...")
time.sleep(3)

# 2. 测试健康检查
print("\n2. Testing health check...")
try:
    response = requests.get('http://localhost:5000/api/health', timeout=5)
    if response.status_code == 200:
        print(f"   SUCCESS: {response.json()}")
    else:
        print(f"   FAILED: Status {response.status_code}")
except Exception as e:
    print(f"   ERROR: {str(e)}")

# 3. 测试配置检查
print("\n3. Testing config check...")
try:
    response = requests.get('http://localhost:5000/api/config-check', timeout=5)
    if response.status_code == 200:
        data = response.json()
        print(f"   API Key Set: {data['api_key_set']}")
        print(f"   Base URL: {data['base_url']}")
        print(f"   Model: {data['model']}")
    else:
        print(f"   FAILED: Status {response.status_code}")
except Exception as e:
    print(f"   ERROR: {str(e)}")

# 4. 测试用户注册
print("\n4. Testing user registration...")
try:
    response = requests.post(
        'http://localhost:5000/api/auth/register',
        json={
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'testpass123'
        },
        timeout=5
    )
    if response.status_code == 201:
        data = response.json()
        print(f"   SUCCESS: User created")
        print(f"   Token: {data['access_token'][:20]}...")
        token = data['access_token']
    else:
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.json()}")
except Exception as e:
    print(f"   ERROR: {str(e)}")

# 5. 测试动画生成
print("\n5. Testing animation generation...")
try:
    response = requests.post(
        'http://localhost:5000/api/animations/generate',
        headers={'Authorization': f'Bearer {token}'},
        json={
            'prompt': '太阳系行星运动轨迹',
            'duration': 30
        },
        timeout=60
    )
    if response.status_code == 200:
        data = response.json()
        print(f"   SUCCESS!")
        print(f"   Title: {data['animation']['title']}")
        print(f"   Remaining quota: {data['remaining_quota']}")
    else:
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.json()}")
except Exception as e:
    print(f"   ERROR: {str(e)}")

print("\n" + "=" * 70)
print("Test completed")
print("=" * 70)
