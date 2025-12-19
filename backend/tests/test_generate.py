#!/usr/bin/env python
"""测试动画生成流程"""
import os
import sys
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

print("=" * 70)
print("🎬 测试动画生成流程")
print("=" * 70)

# 导入AI服务
from services.ai_service import ai_service

print("\n📋 AI Service 配置:")
print(f"  API Key: {ai_service.api_key[:20]}..." if ai_service.api_key else "  API Key: ❌ 未配置")
print(f"  Base URL: {ai_service.base_url}")
print(f"  Model: {ai_service.model}")

print("\n🎨 测试生成动画...")
print("-" * 70)

test_prompts = [
    "太阳系行星运动轨迹",
    "细胞分裂过程",
    "水循环演示"
]

for prompt in test_prompts:
    print(f"\n📝 提示词: {prompt}")
    result = ai_service.generate_animation(prompt, duration=30)
    
    if result['success']:
        print(f"✅ 生成成功!")
        data = result['data']
        print(f"   标题: {data.get('title', 'N/A')}")
        print(f"   描述: {data.get('description', 'N/A')[:50]}...")
        print(f"   SVG 长度: {len(data.get('svg_content', ''))} 字符")
    else:
        print(f"❌ 生成失败: {result['error']}")

print("\n" + "=" * 70)
print("测试完成")
print("=" * 70)
