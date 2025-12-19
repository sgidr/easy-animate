#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
检查数据库中的动画
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app, db
from models import Animation

def check_animations():
    """检查所有动画"""
    print("=" * 60)
    print("🧪 检查数据库中的动画")
    print("=" * 60)
    
    with app.app_context():
        # 获取所有动画
        all_animations = Animation.query.all()
        print(f"\n📊 总动画数: {len(all_animations)}")
        
        if not all_animations:
            print("❌ 数据库中没有动画")
            return
        
        # 显示所有动画
        print("\n📋 所有动画:")
        for anim in all_animations:
            status = "🔓 公开" if anim.is_public else "🔒 私密"
            print(f"  ID: {anim.id} | {status} | {anim.title}")
            print(f"     作者: {anim.author.username if anim.author else '未知'}")
            print(f"     描述: {anim.description[:50]}...")
            print()
        
        # 检查公开动画
        public_animations = Animation.query.filter_by(is_public=True).all()
        print(f"\n🔓 公开动画数: {len(public_animations)}")
        
        if public_animations:
            print("公开动画列表:")
            for anim in public_animations:
                print(f"  - ID: {anim.id} | {anim.title}")
        else:
            print("❌ 没有公开的动画")
        
        # 检查特定ID的动画
        print("\n🔍 检查特定ID的动画:")
        for test_id in [1, 2, 3, 4, 5, 6]:
            anim = Animation.query.get(test_id)
            if anim:
                status = "🔓 公开" if anim.is_public else "🔒 私密"
                print(f"  ID {test_id}: {status} | {anim.title}")
            else:
                print(f"  ID {test_id}: ❌ 不存在")
        
        print("\n" + "=" * 60)
        print("✅ 检查完成")
        print("=" * 60)

if __name__ == '__main__':
    check_animations()
