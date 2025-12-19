#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
测试模型配置API端点
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app, db
from models import User
import json

def test_model_api():
    """测试模型配置API"""
    print("=" * 60)
    print("🧪 测试模型配置API端点")
    print("=" * 60)
    
    with app.app_context():
        # 创建测试客户端
        client = app.test_client()
        
        # 1. 获取管理员token
        print("\n1️⃣ 获取管理员token...")
        login_response = client.post('/api/auth/login', 
            json={'username': 'admin', 'password': 'admin123'},
            content_type='application/json'
        )
        if login_response.status_code == 200:
            token = login_response.json['access_token']
            print(f"✅ 登录成功, Token: {token[:20]}...")
        else:
            print(f"❌ 登录失败: {login_response.status_code}")
            print(login_response.json)
            return
        
        headers = {'Authorization': f'Bearer {token}'}
        
        # 2. 获取可用模型列表
        print("\n2️⃣ 获取可用模型列表...")
        models_response = client.get('/api/admin/models', headers=headers)
        if models_response.status_code == 200:
            data = models_response.json
            print(f"✅ 获取成功")
            print(f"   可用模型数: {len(data['models'])}")
            for m in data['models']:
                print(f"   - {m['name']} ({m['id']})")
            print(f"   当前模型: {data['current']['name']} ({data['current']['id']})")
        else:
            print(f"❌ 获取失败: {models_response.status_code}")
            print(models_response.json)
            return
        
        # 3. 切换模型
        print("\n3️⃣ 切换模型...")
        new_model = 'gemini-3-flash-preview'
        switch_response = client.put('/api/admin/models/current',
            json={'model_id': new_model},
            headers=headers,
            content_type='application/json'
        )
        if switch_response.status_code == 200:
            data = switch_response.json
            print(f"✅ 切换成功")
            print(f"   消息: {data['message']}")
            print(f"   新模型: {data['current']['name']} ({data['current']['id']})")
        else:
            print(f"❌ 切换失败: {switch_response.status_code}")
            print(switch_response.json)
            return
        
        # 4. 验证切换
        print("\n4️⃣ 验证切换...")
        verify_response = client.get('/api/admin/models', headers=headers)
        if verify_response.status_code == 200:
            data = verify_response.json
            if data['current']['id'] == new_model:
                print(f"✅ 验证成功: 当前模型已切换为 {data['current']['name']}")
            else:
                print(f"❌ 验证失败: 期望 {new_model}, 实际 {data['current']['id']}")
        else:
            print(f"❌ 验证请求失败: {verify_response.status_code}")
        
        # 5. 切换回默认模型
        print("\n5️⃣ 切换回默认模型...")
        default_model = 'claude-haiku-4-5-20251001'
        reset_response = client.put('/api/admin/models/current',
            json={'model_id': default_model},
            headers=headers,
            content_type='application/json'
        )
        if reset_response.status_code == 200:
            print(f"✅ 已切换回默认模型")
        else:
            print(f"❌ 切换失败: {reset_response.status_code}")
        
        print("\n" + "=" * 60)
        print("✅ API测试完成")
        print("=" * 60)

if __name__ == '__main__':
    test_model_api()
