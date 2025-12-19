#!/usr/bin/env python
"""测试认证功能"""
import os
from dotenv import load_dotenv

load_dotenv()

print("=" * 70)
print("🔐 认证功能测试")
print("=" * 70)

from app import create_app, db
from models import User

app = create_app()

with app.app_context():
    print("\n👤 测试用户注册...")
    try:
        # 创建测试用户
        test_user = User(
            username='testuser',
            email='test@example.com'
        )
        test_user.set_password('testpass123')
        
        # 检查是否已存在
        existing = User.query.filter_by(username='testuser').first()
        if existing:
            print("⚠️  测试用户已存在，跳过创建")
        else:
            db.session.add(test_user)
            db.session.commit()
            print("✅ 测试用户创建成功")
            print(f"   用户名: {test_user.username}")
            print(f"   邮箱: {test_user.email}")
            print(f"   配额: {test_user.quota}")
    except Exception as e:
        print(f"❌ 创建失败: {str(e)}")
        db.session.rollback()

    print("\n🔑 测试密码验证...")
    try:
        user = User.query.filter_by(username='testuser').first()
        if user:
            # 测试正确密码
            if user.check_password('testpass123'):
                print("✅ 正确密码验证成功")
            else:
                print("❌ 正确密码验证失败")
            
            # 测试错误密码
            if not user.check_password('wrongpass'):
                print("✅ 错误密码验证成功（正确拒绝）")
            else:
                print("❌ 错误密码验证失败（不应该通过）")
        else:
            print("⚠️  测试用户不存在")
    except Exception as e:
        print(f"❌ 验证失败: {str(e)}")

    print("\n📊 用户数据检查...")
    try:
        user = User.query.filter_by(username='testuser').first()
        if user:
            user_dict = user.to_dict()
            print("✅ 用户数据:")
            for key, value in user_dict.items():
                if key != 'password_hash':
                    print(f"   {key}: {value}")
        else:
            print("⚠️  测试用户不存在")
    except Exception as e:
        print(f"❌ 查询失败: {str(e)}")

    print("\n🧹 清理测试数据...")
    try:
        user = User.query.filter_by(username='testuser').first()
        if user:
            db.session.delete(user)
            db.session.commit()
            print("✅ 测试用户已删除")
        else:
            print("⚠️  测试用户不存在")
    except Exception as e:
        print(f"❌ 删除失败: {str(e)}")
        db.session.rollback()

print("\n" + "=" * 70)
print("认证测试完成")
print("=" * 70)
