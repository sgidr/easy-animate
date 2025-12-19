#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
测试模型配置功能
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app, db
from models import SystemConfig, User
from services.ai_service import ai_service

def test_model_config():
    """测试模型配置"""
    print("=" * 60)
    print("🧪 测试模型配置功能")
    print("=" * 60)
    
    with app.app_context():
        # 1. 测试获取可用模型
        print("\n1️⃣ 获取可用模型列表...")
        models = ai_service.get_available_models()
        print(f"✅ 可用模型数: {len(models)}")
        for m in models:
            print(f"   - {m['name']} ({m['id']})")
        
        # 2. 测试获取当前模型
        print("\n2️⃣ 获取当前模型...")
        current = ai_service.get_current_model_info()
        print(f"✅ 当前模型: {current['name']} ({current['id']})")
        
        # 3. 测试设置模型
        print("\n3️⃣ 测试切换模型...")
        test_model = 'gemini-3-flash-preview'
        success = ai_service.set_model(test_model)
        if success:
            print(f"✅ 模型切换成功")
            # 验证切换
            updated = ai_service.get_current_model_info()
            print(f"   新模型: {updated['name']} ({updated['id']})")
            if updated['id'] == test_model:
                print("✅ 模型切换验证成功")
            else:
                print(f"❌ 模型切换验证失败: 期望 {test_model}, 实际 {updated['id']}")
        else:
            print("❌ 模型切换失败")
        
        # 4. 测试SystemConfig直接操作
        print("\n4️⃣ 测试SystemConfig直接操作...")
        SystemConfig.set('test_key', 'test_value', '测试配置')
        retrieved = SystemConfig.get('test_key')
        if retrieved == 'test_value':
            print("✅ SystemConfig 读写成功")
        else:
            print(f"❌ SystemConfig 读写失败: 期望 test_value, 实际 {retrieved}")
        
        # 5. 切换回默认模型
        print("\n5️⃣ 切换回默认模型...")
        ai_service.set_model('claude-haiku-4-5-20251001')
        final = ai_service.get_current_model_info()
        print(f"✅ 最终模型: {final['name']} ({final['id']})")
        
        print("\n" + "=" * 60)
        print("✅ 所有测试完成")
        print("=" * 60)

if __name__ == '__main__':
    test_model_config()
