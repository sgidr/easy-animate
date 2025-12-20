from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, jwt_required
from models import db, Animation, Like, Favorite, User
from sqlalchemy import distinct

community_bp = Blueprint('community', __name__)

# 预设分类（确保这些分类始终显示）
DEFAULT_CATEGORIES = ['计算机科学', '电子通信', '物理', '数学', '天文', '化学', '生物', '地理', '其他']

def get_all_categories():
    """获取所有分类：预设分类 + 数据库中的分类"""
    # 从数据库获取所有公开动画的分类
    db_categories = db.session.query(distinct(Animation.category))\
        .filter(Animation.is_public == True)\
        .filter(Animation.category != None)\
        .filter(Animation.category != '')\
        .all()
    db_categories = [c[0] for c in db_categories if c[0]]
    
    # 合并预设分类和数据库分类，去重并保持顺序
    all_categories = ['全部']
    for cat in DEFAULT_CATEGORIES:
        if cat not in all_categories:
            all_categories.append(cat)
    for cat in db_categories:
        if cat not in all_categories:
            all_categories.append(cat)
    
    return all_categories

@community_bp.route('/animations', methods=['GET'])
def get_public_animations():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 12, type=int)
    category = request.args.get('category', '全部')
    search = request.args.get('search', '')
    
    query = Animation.query.filter_by(is_public=True)
    
    if category and category != '全部':
        query = query.filter_by(category=category)
    
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
        'current_page': page,
        'categories': get_all_categories()
    })

@community_bp.route('/animations/<int:animation_id>', methods=['GET'])
def get_public_animation(animation_id):
    animation = Animation.query.get(animation_id)
    
    if not animation or not animation.is_public:
        return jsonify({'error': '动画不存在或未公开'}), 404
    
    return jsonify(animation.to_dict(include_content=True))

@community_bp.route('/animations/<int:animation_id>/like', methods=['POST'])
@jwt_required()
def like_animation(animation_id):
    user_id = int(get_jwt_identity())
    animation = Animation.query.get(animation_id)
    
    if not animation or not animation.is_public:
        return jsonify({'error': '动画不存在'}), 404
    
    existing = Like.query.filter_by(user_id=user_id, animation_id=animation_id).first()
    
    if existing:
        db.session.delete(existing)
        db.session.commit()
        return jsonify({'message': '取消点赞', 'liked': False, 'likes_count': animation.likes.count()})
    
    like = Like(user_id=user_id, animation_id=animation_id)
    db.session.add(like)
    db.session.commit()
    return jsonify({'message': '点赞成功', 'liked': True, 'likes_count': animation.likes.count()})

@community_bp.route('/animations/<int:animation_id>/favorite', methods=['POST'])
@jwt_required()
def favorite_animation(animation_id):
    user_id = int(get_jwt_identity())
    animation = Animation.query.get(animation_id)
    
    if not animation or not animation.is_public:
        return jsonify({'error': '动画不存在'}), 404
    
    existing = Favorite.query.filter_by(user_id=user_id, animation_id=animation_id).first()
    
    if existing:
        db.session.delete(existing)
        db.session.commit()
        return jsonify({'message': '取消收藏', 'favorited': False, 'favorites_count': animation.favorites.count()})
    
    favorite = Favorite(user_id=user_id, animation_id=animation_id)
    db.session.add(favorite)
    db.session.commit()
    return jsonify({'message': '收藏成功', 'favorited': True, 'favorites_count': animation.favorites.count()})

@community_bp.route('/favorites', methods=['GET'])
@jwt_required()
def get_my_favorites():
    user_id = int(get_jwt_identity())
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 12, type=int)
    
    favorites = Favorite.query.filter_by(user_id=user_id)\
        .order_by(Favorite.created_at.desc())\
        .paginate(page=page, per_page=per_page)
    
    animations = [f.animation.to_dict() for f in favorites.items if f.animation]
    
    return jsonify({
        'animations': animations,
        'total': favorites.total,
        'pages': favorites.pages,
        'current_page': page
    })

@community_bp.route('/featured', methods=['GET'])
def get_featured_animations():
    """获取精选推荐动画 - 按点赞+收藏数排序取前3名"""
    from sqlalchemy import func
    from models import Like, Favorite
    
    # 子查询：计算每个动画的点赞数
    likes_count = db.session.query(
        Like.animation_id,
        func.count(Like.id).label('likes')
    ).group_by(Like.animation_id).subquery()
    
    # 子查询：计算每个动画的收藏数
    favorites_count = db.session.query(
        Favorite.animation_id,
        func.count(Favorite.id).label('favorites')
    ).group_by(Favorite.animation_id).subquery()
    
    # 主查询：按点赞+收藏总数排序
    animations = db.session.query(Animation)\
        .outerjoin(likes_count, Animation.id == likes_count.c.animation_id)\
        .outerjoin(favorites_count, Animation.id == favorites_count.c.animation_id)\
        .filter(Animation.is_public == True)\
        .order_by(
            (func.coalesce(likes_count.c.likes, 0) + func.coalesce(favorites_count.c.favorites, 0)).desc(),
            Animation.created_at.desc()
        )\
        .limit(3).all()
    
    return jsonify({
        'animations': [a.to_dict() for a in animations]
    })

@community_bp.route('/animations/<int:animation_id>/export/<format>', methods=['GET'])
def export_public_animation(animation_id, format):
    """导出公开动画为MP4或GIF（无需登录）"""
    from flask import Response
    from services.export_service import export_service
    from urllib.parse import quote
    
    animation = Animation.query.get(animation_id)
    
    if not animation:
        return jsonify({'error': '动画不存在'}), 404
    
    if not animation.is_public:
        return jsonify({'error': '动画未公开'}), 403
    
    if format not in ['mp4', 'gif']:
        return jsonify({'error': '不支持的格式，请使用 mp4 或 gif'}), 400
    
    if not animation.svg_content:
        return jsonify({'error': '动画内容为空'}), 400
    
    duration = request.args.get('duration', 5, type=int)
    duration = max(1, min(30, duration))
    
    # 获取背景颜色参数
    bg_color = request.args.get('bgColor', None)
    
    fps = 8 if format == 'gif' else 20
    
    try:
        data = export_service.export_to_bytes(
            animation.svg_content,
            format=format,
            duration=duration,
            fps=fps,
            bg_color=bg_color
        )
        
        mimetype = 'video/mp4' if format == 'mp4' else 'image/gif'
        safe_filename = f"animation_{animation_id}.{format}"
        original_filename = f"{animation.title or 'animation'}.{format}"
        encoded_filename = quote(original_filename)
        
        return Response(
            data,
            mimetype=mimetype,
            headers={
                'Content-Disposition': f"attachment; filename=\"{safe_filename}\"; filename*=UTF-8''{encoded_filename}",
                'Content-Length': len(data)
            }
        )
    except Exception as e:
        return jsonify({'error': f'导出失败: {str(e)}'}), 500

@community_bp.route('/animations/<int:animation_id>/export-stream/<format>', methods=['GET'])
def export_public_animation_stream(animation_id, format):
    """使用 SSE 流式导出动画，实时返回进度"""
    from flask import Response, stream_with_context
    from services.export_service import export_service
    import json
    import base64
    import threading
    import queue
    
    animation = Animation.query.get(animation_id)
    
    if not animation:
        return jsonify({'error': '动画不存在'}), 404
    
    if not animation.is_public:
        return jsonify({'error': '动画未公开'}), 403
    
    if format not in ['mp4', 'gif']:
        return jsonify({'error': '不支持的格式'}), 400
    
    if not animation.svg_content:
        return jsonify({'error': '动画内容为空'}), 400
    
    duration = request.args.get('duration', 5, type=int)
    duration = max(1, min(30, duration))
    
    # 获取背景颜色参数
    bg_color = request.args.get('bgColor', None)
    
    fps = 8 if format == 'gif' else 20
    
    svg_content = animation.svg_content
    title = animation.title or 'animation'
    
    def generate():
        progress_queue = queue.Queue()
        result_holder = {'data': None, 'error': None}
        
        def on_progress(percent, message):
            progress_queue.put({'type': 'progress', 'percent': percent, 'message': message})
        
        def export_task():
            try:
                data = export_service.export_to_bytes_with_progress(
                    svg_content,
                    format=format,
                    duration=duration,
                    fps=fps,
                    on_progress=on_progress,
                    bg_color=bg_color
                )
                result_holder['data'] = data
            except Exception as e:
                result_holder['error'] = str(e)
            finally:
                progress_queue.put({'type': 'done'})
        
        # 在后台线程中执行导出
        thread = threading.Thread(target=export_task)
        thread.start()
        
        # 发送进度事件
        while True:
            try:
                item = progress_queue.get(timeout=60)
                if item['type'] == 'done':
                    break
                yield f"data: {json.dumps(item)}\n\n"
            except queue.Empty:
                yield f"data: {json.dumps({'type': 'progress', 'percent': -1, 'message': '处理中...'})}\n\n"
        
        thread.join()
        
        # 发送结果
        if result_holder['error']:
            yield f"data: {json.dumps({'type': 'error', 'message': result_holder['error']})}\n\n"
        else:
            # 将文件数据转为 base64
            data_base64 = base64.b64encode(result_holder['data']).decode('utf-8')
            yield f"data: {json.dumps({'type': 'complete', 'data': data_base64, 'filename': f'{title}.{format}', 'mimetype': 'video/mp4' if format == 'mp4' else 'image/gif'})}\n\n"
    
    return Response(
        stream_with_context(generate()),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no'
        }
    )
