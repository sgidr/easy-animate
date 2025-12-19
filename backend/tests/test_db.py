#!/usr/bin/env python
"""测试数据库连接和操作"""
import os
from dotenv import load_dotenv

load_dotenv()

print("=" * 70)
print("🗄️  数据库测试")
print("=" * 70)

# 导入数据库相关模块
from app import create_app, db
from models import User, Animation

app = create_app()

print("\n📋 数据库配置:")
print(f"  数据库 URI: {app.config['SQLALCHEMY_DATABASE_URI']}")
print(f"  数据库路径: {app.config['DB_PATH']}")

with app.app_context():
    print("\n🔗 测试数据库连接...")
    try:
        # 测试连接
        db.session.execute("SELECT 1")
        print("✅ 数据库连接成功!")
    except Exception as e:
        print(f"❌ 数据库连接失败: {str(e)}")
        exit(1)

    print("\n📊 数据库统计:")
    try:
        user_count = User.query.count()
        animation_count = Animation.query.count()
        print(f"  用户数: {user_count}")
        print(f"  动画数: {animation_count}")
    except Exception as e:
        print(f"❌ 查询失败: {str(e)}")

    print("\n👤 测试用户操作...")
    try:
        # 检查默认管理员
        admin = User.query.filter_by(username='admin').first()
        if admin:
            print(f"✅ 默认管理员存在")
            print(f"   用户名: {admin.username}")
            print(f"   邮箱: {admin.email}")
            print(f"   配额: {admin.quota}")
            print(f"   是否管理员: {admin.is_admin}")
        else:
            print("⚠️  默认管理员不存在")
    except Exception as e:
        print(f"❌ 查询失败: {str(e)}")

    print("\n🎬 测试动画操作...")
    try:
        # 获取最新的动画
        latest_animation = Animation.query.order_by(Animation.created_at.desc()).first()
        if latest_animation:
            print(f"✅ 最新动画:")
            print(f"   标题: {latest_animation.title}")
            print(f"   作者: {latest_animation.author.username if latest_animation.author else 'N/A'}")
            print(f"   点赞数: {latest_animation.likes.count()}")
            print(f"   收藏数: {latest_animation.favorites.count()}")
        else:
            print("⚠️  暂无动画")
    except Exception as e:
        print(f"❌ 查询失败: {str(e)}")

print("\n" + "=" * 70)
print("数据库测试完成")
print("=" * 70)
