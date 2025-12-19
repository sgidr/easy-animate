#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
创建一些公开的测试动画
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app, db
from models import Animation, User
import json

def create_public_animations():
    """创建公开的测试动画"""
    print("=" * 60)
    print("🧪 创建公开的测试动画")
    print("=" * 60)
    
    with app.app_context():
        # 获取admin用户
        admin = User.query.filter_by(username='admin').first()
        if not admin:
            print("❌ 找不到admin用户")
            return
        
        # 创建测试动画
        test_animations = [
            {
                'title': '太阳系行星运动',
                'description': '展示太阳系各行星绕太阳公转的轨迹和相对位置',
                'prompt': '太阳系行星运动轨迹',
                'category': '天文',
                'svg_content': '''<svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      @keyframes orbit1 { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      @keyframes orbit2 { from { transform: rotate(0deg); } to { transform: rotate(180deg); } }
      .sun { fill: #fbbf24; }
      .planet { fill: #3b82f6; }
      .orbit { fill: none; stroke: #64748b; stroke-width: 1; }
    </style>
  </defs>
  <rect width="800" height="600" fill="#0f172a"/>
  <circle cx="400" cy="300" r="100" class="orbit"/>
  <circle cx="400" cy="300" r="150" class="orbit"/>
  <circle cx="400" cy="300" r="200" class="orbit"/>
  <circle cx="400" cy="300" r="15" class="sun"/>
  <g style="animation: orbit1 10s linear infinite; transform-origin: 400px 300px;">
    <circle cx="500" cy="300" r="5" class="planet"/>
  </g>
  <g style="animation: orbit2 20s linear infinite; transform-origin: 400px 300px;">
    <circle cx="550" cy="300" r="4" class="planet"/>
  </g>
  <text x="400" y="550" text-anchor="middle" fill="#e2e8f0" font-size="20">太阳系行星运动</text>
</svg>'''
            },
            {
                'title': '水循环演示',
                'description': '展示水的循环过程：蒸发、凝结、降水、汇流',
                'prompt': '水循环演示',
                'category': '地理',
                'svg_content': '''<svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      @keyframes rise { 0% { transform: translateY(0); } 100% { transform: translateY(-100px); } }
      @keyframes fall { 0% { transform: translateY(-100px); } 100% { transform: translateY(100px); } }
      .water { fill: #22d3ee; }
      .text { fill: #e2e8f0; font-size: 16px; }
    </style>
  </defs>
  <rect width="800" height="600" fill="#0f172a"/>
  <rect x="0" y="400" width="800" height="200" fill="#1e40af"/>
  <circle cx="200" cy="300" r="20" class="water" style="animation: rise 3s ease-in-out infinite;"/>
  <circle cx="400" cy="200" r="15" class="water" style="animation: fall 3s ease-in-out infinite; animation-delay: 1s;"/>
  <circle cx="600" cy="300" r="20" class="water" style="animation: rise 3s ease-in-out infinite; animation-delay: 2s;"/>
  <text x="400" y="550" text-anchor="middle" class="text">水循环过程</text>
</svg>'''
            },
            {
                'title': 'DNA双螺旋结构',
                'description': '展示DNA分子的双螺旋结构和碱基对配对',
                'prompt': 'DNA双螺旋结构',
                'category': '生物',
                'svg_content': '''<svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      @keyframes rotate { from { transform: rotateY(0deg); } to { transform: rotateY(360deg); } }
      .helix { fill: none; stroke: #6366f1; stroke-width: 3; }
      .base { fill: #22d3ee; }
      .text { fill: #e2e8f0; font-size: 20px; }
    </style>
  </defs>
  <rect width="800" height="600" fill="#0f172a"/>
  <path class="helix" d="M 300 100 Q 350 150 300 200 Q 250 250 300 300 Q 350 350 300 400 Q 250 450 300 500"/>
  <path class="helix" d="M 500 100 Q 450 150 500 200 Q 550 250 500 300 Q 450 350 500 400 Q 550 450 500 500"/>
  <circle cx="300" cy="150" r="8" class="base"/>
  <circle cx="500" cy="150" r="8" class="base"/>
  <circle cx="300" cy="250" r="8" class="base"/>
  <circle cx="500" cy="250" r="8" class="base"/>
  <circle cx="300" cy="350" r="8" class="base"/>
  <circle cx="500" cy="350" r="8" class="base"/>
  <text x="400" y="550" text-anchor="middle" class="text">DNA双螺旋结构</text>
</svg>'''
            }
        ]
        
        # 添加到数据库
        count = 0
        for anim_data in test_animations:
            # 检查是否已存在
            existing = Animation.query.filter_by(title=anim_data['title']).first()
            if existing:
                print(f"⏭️  跳过: {anim_data['title']} (已存在)")
                continue
            
            anim = Animation(
                title=anim_data['title'],
                description=anim_data['description'],
                prompt=anim_data['prompt'],
                category=anim_data['category'],
                svg_content=anim_data['svg_content'],
                animation_data=json.dumps({'duration': 30}),
                duration=30,
                user_id=admin.id,
                is_public=True
            )
            db.session.add(anim)
            count += 1
            print(f"✅ 创建: {anim_data['title']}")
        
        if count > 0:
            db.session.commit()
            print(f"\n✅ 成功创建 {count} 个公开动画")
        else:
            print("\n⏭️  没有新动画需要创建")
        
        # 显示所有公开动画
        public_animations = Animation.query.filter_by(is_public=True).all()
        print(f"\n📊 现在有 {len(public_animations)} 个公开动画:")
        for anim in public_animations:
            print(f"  - ID: {anim.id} | {anim.title}")
        
        print("\n" + "=" * 60)
        print("✅ 完成")
        print("=" * 60)

if __name__ == '__main__':
    create_public_animations()
