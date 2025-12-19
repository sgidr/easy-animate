#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""检查配置是否正确加载"""
import os
import sys

# 添加backend路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

print("=" * 60)
print("Configuration Check")
print("=" * 60)

# 检查 .env 文件
env_file = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
print(f"\n.env file path: {env_file}")
print(f".env exists: {os.path.exists(env_file)}")

if os.path.exists(env_file):
    with open(env_file, 'r') as f:
        content = f.read()
        print(f".env content:\n{content}")

# 导入配置
print("\nImporting Config...")
from config import Config

print(f"CLAUDE_API_KEY: {Config.CLAUDE_API_KEY[:20]}..." if Config.CLAUDE_API_KEY else "CLAUDE_API_KEY: NOT SET")
print(f"CLAUDE_API_BASE_URL: {Config.CLAUDE_API_BASE_URL}")
print(f"CLAUDE_MODEL: {Config.CLAUDE_MODEL}")

print("\n" + "=" * 60)
