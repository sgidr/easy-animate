from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User, Animation, Like, Favorite, GenerationTask, SystemConfig
from services.ai_service import ai_service
from functools import wraps
from datetime import datetime, timedelta

admin_bp = Blueprint('admin', __name__)

def admin_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user or not user.is_admin:
            return jsonify({'error': '需要管理员权限'}), 403
        return fn(*args, **kwargs)
    return wrapper

@admin_bp.route('/users', methods=['GET'])
@admin_required
def get_users():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    search = request.args.get('search', '')
    sort_by = request.args.get('sort_by', 'created_at')
    
    query = User.query
    if search:
        query = query.filter(
            (User.username.contains(search)) | 
            (User.email.contains(search))
        )
    
    # 排序
    if sort_by == 'username':
        query = query.order_by(User.username)
    elif sort_by == 'quota':
        query = query.order_by(User.quota.desc())
    else:
        query = query.order_by(User.created_at.desc())
    
    pagination = query.paginate(page=page, per_page=per_page)
    
    users_data = []
    for u in pagination.items:
        user_dict = u.to_dict()
        user_dict['animations_count'] = u.animations.count()
        users_data.append(user_dict)
    
    return jsonify({
        'users': users_data,
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': page
    })

@admin_bp.route('/users/<int:user_id>', methods=['GET'])
@admin_required
def get_user_detail(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': '用户不存在'}), 404
    
    user_dict = user.to_dict()
    user_dict['animations_count'] = user.animations.count()
    user_dict['total_likes'] = db.session.query(Like).filter_by(user_id=user_id).count()
    user_dict['total_favorites'] = db.session.query(Favorite).filter_by(user_id=user_id).count()
    
    return jsonify(user_dict)

@admin_bp.route('/users/<int:user_id>/quota', methods=['PUT'])
@admin_required
def update_user_quota(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': '用户不存在'}), 404
    
    data = request.get_json()
    quota = data.get('quota')
    
    if quota is None or not isinstance(quota, int) or quota < 0:
        return jsonify({'error': '配额必须是非负整数'}), 400
    
    old_quota = user.quota
    user.quota = quota
    db.session.commit()
    
    return jsonify({
        'message': f'配额已从 {old_quota} 更新为 {quota}',
        'user': user.to_dict()
    })

@admin_bp.route('/users/<int:user_id>/quota/add', methods=['POST'])
@admin_required
def add_user_quota(user_id):
    """增加用户配额"""
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': '用户不存在'}), 404
    
    data = request.get_json()
    amount = data.get('amount', 0)
    
    if not isinstance(amount, int) or amount <= 0:
        return jsonify({'error': '增加数量必须是正整数'}), 400
    
    user.quota += amount
    db.session.commit()
    
    return jsonify({
        'message': f'已增加 {amount} 次配额',
        'user': user.to_dict()
    })

@admin_bp.route('/users/<int:user_id>/admin', methods=['PUT'])
@admin_required
def toggle_admin(user_id):
    """切换管理员状态"""
    current_user_id = int(get_jwt_identity())
    if user_id == current_user_id:
        return jsonify({'error': '不能修改自己的管理员状态'}), 400
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': '用户不存在'}), 404
    
    user.is_admin = not user.is_admin
    db.session.commit()
    
    return jsonify({
        'message': f'已将用户设置为{"管理员" if user.is_admin else "普通用户"}',
        'user': user.to_dict()
    })

@admin_bp.route('/users/<int:user_id>', methods=['DELETE'])
@admin_required
def delete_user(user_id):
    """删除用户及其所有数据"""
    current_user_id = int(get_jwt_identity())
    if user_id == current_user_id:
        return jsonify({'error': '不能删除自己'}), 400
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': '用户不存在'}), 404
    
    username = user.username
    
    # 删除用户的所有关联数据
    Like.query.filter_by(user_id=user_id).delete()
    Favorite.query.filter_by(user_id=user_id).delete()
    GenerationTask.query.filter_by(user_id=user_id).delete()
    
    # 删除用户的动画
    animations = Animation.query.filter_by(user_id=user_id).all()
    for animation in animations:
        Like.query.filter_by(animation_id=animation.id).delete()
        Favorite.query.filter_by(animation_id=animation.id).delete()
        db.session.delete(animation)
    
    db.session.delete(user)
    db.session.commit()
    
    return jsonify({'message': f'已删除用户 {username} 及其所有数据'})

@admin_bp.route('/animations', methods=['GET'])
@admin_required
def get_all_animations():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    search = request.args.get('search', '')
    
    query = Animation.query
    if search:
        query = query.filter(
            (Animation.title.contains(search)) |
            (Animation.description.contains(search))
        )
    
    pagination = query.order_by(Animation.created_at.desc())\
        .paginate(page=page, per_page=per_page)
    
    return jsonify({
        'animations': [a.to_dict() for a in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': page
    })

@admin_bp.route('/animations/<int:animation_id>', methods=['DELETE'])
@admin_required
def delete_animation(animation_id):
    animation = Animation.query.get(animation_id)
    if not animation:
        return jsonify({'error': '动画不存在'}), 404
    
    title = animation.title
    
    # 删除相关的点赞和收藏
    Like.query.filter_by(animation_id=animation_id).delete()
    Favorite.query.filter_by(animation_id=animation_id).delete()
    
    db.session.delete(animation)
    db.session.commit()
    
    return jsonify({'message': f'已删除动画 "{title}"'})

@admin_bp.route('/stats', methods=['GET'])
@admin_required
def get_stats():
    """获取系统统计信息"""
    total_users = User.query.count()
    total_animations = Animation.query.count()
    public_animations = Animation.query.filter_by(is_public=True).count()
    
    # 7天内新增用户
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    new_users_7d = User.query.filter(User.created_at >= seven_days_ago).count()
    
    # 7天内新增动画
    new_animations_7d = Animation.query.filter(Animation.created_at >= seven_days_ago).count()
    
    # 总点赞数
    total_likes = db.session.query(Like).count()
    
    # 总收藏数
    total_favorites = db.session.query(Favorite).count()
    
    # 平均配额
    avg_quota = db.session.query(db.func.avg(User.quota)).scalar() or 0
    
    return jsonify({
        'total_users': total_users,
        'total_animations': total_animations,
        'public_animations': public_animations,
        'new_users_7d': new_users_7d,
        'new_animations_7d': new_animations_7d,
        'total_likes': total_likes,
        'total_favorites': total_favorites,
        'avg_quota': round(avg_quota, 2)
    })

# ============ 模型配置 API ============

@admin_bp.route('/models', methods=['GET'])
@admin_required
def get_models():
    """获取可用模型列表和当前模型"""
    models = ai_service.get_available_models()
    current = ai_service.get_current_model_info()
    return jsonify({
        'models': models,
        'current': current
    })

@admin_bp.route('/models/current', methods=['PUT'])
@admin_required
def set_current_model():
    """设置当前使用的模型"""
    data = request.get_json()
    model_id = data.get('model_id')
    
    if not model_id:
        return jsonify({'error': '请选择模型'}), 400
    
    # 验证模型是否有效
    available = [m['id'] for m in ai_service.get_available_models()]
    if model_id not in available:
        return jsonify({'error': '无效的模型ID'}), 400
    
    if ai_service.set_model(model_id):
        return jsonify({
            'message': '模型已更新',
            'current': ai_service.get_current_model_info()
        })
    else:
        return jsonify({'error': '更新失败'}), 500

@admin_bp.route('/config', methods=['GET'])
@admin_required
def get_system_config():
    """获取系统配置"""
    configs = SystemConfig.query.all()
    return jsonify({
        'configs': [c.to_dict() for c in configs]
    })

@admin_bp.route('/config/<key>', methods=['PUT'])
@admin_required
def update_system_config(key):
    """更新系统配置"""
    data = request.get_json()
    value = data.get('value')
    description = data.get('description', '')
    
    if value is None:
        return jsonify({'error': '请提供配置值'}), 400
    
    config = SystemConfig.set(key, str(value), description)
    return jsonify({
        'message': '配置已更新',
        'config': config.to_dict()
    })

@admin_bp.route('/settings', methods=['GET'])
@admin_required
def get_settings():
    """获取系统设置"""
    default_quota = SystemConfig.get('default_quota', '10')
    try:
        default_quota = int(default_quota)
    except:
        default_quota = 10
    
    return jsonify({
        'default_quota': default_quota
    })

@admin_bp.route('/settings', methods=['PUT'])
@admin_required
def update_settings():
    """更新系统设置"""
    data = request.get_json()
    
    if 'default_quota' in data:
        default_quota = data.get('default_quota')
        if not isinstance(default_quota, int) or default_quota < 0:
            return jsonify({'error': '默认配额必须是非负整数'}), 400
        SystemConfig.set('default_quota', str(default_quota), '新用户默认配额')
    
    return jsonify({'message': '设置已保存'})
