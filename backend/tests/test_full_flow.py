#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""测试完整的动画生成流程"""
import os
import sys

# 添加backend路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

print("=" * 70)
print("Full Flow Test - Animation Generation")
print("=" * 70)

# 1. 检查环境变量
print("\n1. Checking environment variables...")
from dotenv import load_dotenv
load_dotenv()

api_key = os.environ.get('CLAUDE_API_KEY', '')
print(f"   CLAUDE_API_KEY: {api_key[:20]}..." if api_key else "   CLAUDE_API_KEY: NOT SET")
print(f"   CLAUDE_API_BASE_URL: {os.environ.get('CLAUDE_API_BASE_URL', 'NOT SET')}")
print(f"   CLAUDE_MODEL: {os.environ.get('CLAUDE_MODEL', 'NOT SET')}")

if not api_key:
    print("\nERROR: CLAUDE_API_KEY is not set!")
    print("Please check your .env file")
    sys.exit(1)

# 2. 测试 AI Service
print("\n2. Testing AI Service...")
from services.ai_service import ai_service

print(f"   API Key: {ai_service.api_key[:20]}..." if ai_service.api_key else "   API Key: NOT SET")
print(f"   Base URL: {ai_service.base_url}")
print(f"   Model: {ai_service.model}")

if not ai_service.api_key:
    print("\nERROR: AI Service API Key is empty!")
    sys.exit(1)

# 3. 测试生成
print("\n3. Testing animation generation...")
test_prompt = "太阳系行星运动轨迹"
print(f"   Prompt: {test_prompt}")

result = ai_service.generate_animation(test_prompt, duration=30)

if result['success']:
    print("   SUCCESS!")
    data = result['data']
    print(f"   Title: {data.get('title', 'N/A')}")
    print(f"   Description: {data.get('description', 'N/A')[:50]}...")
    print(f"   SVG length: {len(data.get('svg_content', ''))} chars")
else:
    print(f"   FAILED: {result['error']}")
    sys.exit(1)

print("\n" + "=" * 70)
print("All tests passed!")
print("=" * 70)
