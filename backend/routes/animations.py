from flask import Blueprint, request, jsonify, Response, stream_with_context
from flask_jwt_extended import jwt_required, get_jwt_identity, jwt_required
from models import db, User, Animation, Like, Favorite, GenerationTask
from services.ai_service import ai_service
from datetime import datetime
import json

animations_bp = Blueprint('animations', __name__)

@animations_bp.route('/generate-stream', methods=['POST'])
@jwt_required()
def generate_animation_stream():
    """流式生成动画，实时返回进度"""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': '用户不存在'}), 404
    
    if user.quota <= 0:
        return jsonify({'error': '生成次数已用完，请联系管理员'}), 403
    
    data = request.get_json()
    prompt = data.get('prompt')
    duration = data.get('duration', 30)
    params = data.get('params', {})
    
    if not prompt:
        return jsonify({'error': '请输入动画描述'}), 400
    
    # 创建生成任务
    task = GenerationTask(user_id=user_id, prompt=prompt, status='processing')
    db.session.add(task)
    db.session.commit()
    task_id = task.id
    
    def generate():
        animation_result = None
        
        for event in ai_service.generate_animation_stream(prompt, duration, params):
            if event['type'] == 'progress':
                yield f"data: {json.dumps(event)}\n\n"
            elif event['type'] == 'complete':
                animation_result = event['data']
                # 先发送完成进度
                yield f"data: {json.dumps({'type': 'progress', 'progress': 100, 'tokens': event.get('tokens', 0), 'message': '保存中...'})}\n\n"
            elif event['type'] == 'error':
                # 更新任务状态
                with db.session.begin():
                    t = GenerationTask.query.get(task_id)
                    if t:
                        t.status = 'failed'
                        t.error_message = event['message']
                yield f"data: {json.dumps(event)}\n\n"
                return
        
        if animation_result:
            try:
                # 创建动画记录
                animation = Animation(
                    title=animation_result.get('title', '未命名动画'),
                    description=animation_result.get('description', ''),
                    prompt=prompt,
                    svg_content=animation_result.get('svg_content', ''),
                    animation_data=json.dumps(animation_result.get('animation_data', {})),
                    duration=duration,
                    category=animation_result.get('category', '其他'),
                    user_id=user_id
                )
                db.session.add(animation)
                
                # 更新任务状态
                t = GenerationTask.query.get(task_id)
                if t:
                    t.status = 'completed'
                    t.result = json.dumps(animation_result)
                    t.completed_at = datetime.utcnow()
                
                # 扣减配额
                u = User.query.get(user_id)
                if u:
                    u.quota -= 1
                
                db.session.commit()
                
                yield f"data: {json.dumps({'type': 'complete', 'animation': animation.to_dict(include_content=True), 'remaining_quota': u.quota if u else 0})}\n\n"
            except Exception as e:
                db.session.rollback()
                yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
    
    return Response(
        stream_with_context(generate()),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no'
        }
    )

@animations_bp.route('/generate', methods=['POST'])
@jwt_required()
def generate_animation():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': '用户不存在'}), 404
    
    if user.quota <= 0:
        return jsonify({'error': '生成次数已用完，请联系管理员'}), 403
    
    data = request.get_json()
    prompt = data.get('prompt')
    duration = data.get('duration', 30)
    params = data.get('params', {})  # SVG参数
    
    if not prompt:
        return jsonify({'error': '请输入动画描述'}), 400
    
    # 创建生成任务
    task = GenerationTask(user_id=user_id, prompt=prompt, status='processing')
    db.session.add(task)
    db.session.commit()
    
    # 调用AI服务生成动画
    result = ai_service.generate_animation(prompt, duration, params)
    
    if result['success']:
        animation_data = result['data']
        
        # 创建动画记录
        animation = Animation(
            title=animation_data.get('title', '未命名动画'),
            description=animation_data.get('description', ''),
            prompt=prompt,
            svg_content=animation_data.get('svg_content', ''),
            animation_data=json.dumps(animation_data.get('animation_data', {})),
            duration=duration,
            category=animation_data.get('category', '其他'),
            user_id=user_id
        )
        db.session.add(animation)
        
        # 更新任务状态
        task.status = 'completed'
        task.result = json.dumps(animation_data)
        task.completed_at = datetime.utcnow()
        
        # 扣减配额
        user.quota -= 1
        
        db.session.commit()
        
        return jsonify({
            'message': '生成成功',
            'animation': animation.to_dict(include_content=True),
            'remaining_quota': user.quota
        })
    else:
        task.status = 'failed'
        task.error_message = result['error']
        db.session.commit()
        return jsonify({'error': f'生成失败: {result["error"]}'}), 500

@animations_bp.route('/', methods=['GET'])
@jwt_required()
def get_my_animations():
    user_id = int(get_jwt_identity())
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    
    pagination = Animation.query.filter_by(user_id=user_id)\
        .order_by(Animation.created_at.desc())\
        .paginate(page=page, per_page=per_page)
    
    return jsonify({
        'animations': [a.to_dict() for a in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': page
    })

@animations_bp.route('/<int:animation_id>', methods=['GET'])
@jwt_required(optional=True)
def get_animation(animation_id):
    identity = get_jwt_identity()
    user_id = int(identity) if identity else None  # 可能为 None（未登录）
    animation = Animation.query.get(animation_id)
    
    if not animation:
        return jsonify({'error': '动画不存在'}), 404
    
    # 检查权限：公开动画任何人可查看，私有动画只有作者可查看
    if not animation.is_public and animation.user_id != user_id:
        return jsonify({'error': '无权访问'}), 403
    
    return jsonify(animation.to_dict(include_content=True))


@animations_bp.route('/<int:animation_id>', methods=['PUT'])
@jwt_required()
def update_animation(animation_id):
    user_id = int(get_jwt_identity())
    animation = Animation.query.get(animation_id)
    
    if not animation:
        return jsonify({'error': '动画不存在'}), 404
    
    if animation.user_id != user_id:
        return jsonify({'error': '无权修改'}), 403
    
    data = request.get_json()
    
    if 'title' in data:
        animation.title = data['title']
    if 'description' in data:
        animation.description = data['description']
    if 'svg_content' in data:
        animation.svg_content = data['svg_content']
    if 'animation_data' in data:
        animation.animation_data = json.dumps(data['animation_data'])
    if 'is_public' in data:
        animation.is_public = data['is_public']
    if 'category' in data:
        animation.category = data['category']
    
    db.session.commit()
    return jsonify({'message': '更新成功', 'animation': animation.to_dict(include_content=True)})

@animations_bp.route('/<int:animation_id>', methods=['DELETE'])
@jwt_required()
def delete_animation(animation_id):
    user_id = int(get_jwt_identity())
    animation = Animation.query.get(animation_id)
    
    if not animation:
        return jsonify({'error': '动画不存在'}), 404
    
    if animation.user_id != user_id:
        return jsonify({'error': '无权删除'}), 403
    
    db.session.delete(animation)
    db.session.commit()
    return jsonify({'message': '删除成功'})

@animations_bp.route('/<int:animation_id>/publish', methods=['POST'])
@jwt_required()
def publish_animation(animation_id):
    user_id = int(get_jwt_identity())
    animation = Animation.query.get(animation_id)
    
    if not animation:
        return jsonify({'error': '动画不存在'}), 404
    
    if animation.user_id != user_id:
        return jsonify({'error': '无权操作'}), 403
    
    animation.is_public = True
    db.session.commit()
    return jsonify({'message': '发布成功', 'animation': animation.to_dict()})


@animations_bp.route('/<int:animation_id>/unpublish', methods=['POST'])
@jwt_required()
def unpublish_animation(animation_id):
    """取消发布动画（从社区移除）"""
    user_id = int(get_jwt_identity())
    animation = Animation.query.get(animation_id)
    
    if not animation:
        return jsonify({'error': '动画不存在'}), 404
    
    if animation.user_id != user_id:
        return jsonify({'error': '无权操作'}), 403
    
    animation.is_public = False
    db.session.commit()
    return jsonify({'message': '已取消分享', 'animation': animation.to_dict()})

@animations_bp.route('/<int:animation_id>/fork', methods=['POST'])
@jwt_required()
def fork_animation(animation_id):
    user_id = int(get_jwt_identity())
    original = Animation.query.get(animation_id)
    
    if not original:
        return jsonify({'error': '动画不存在'}), 404
    
    if not original.is_public and original.user_id != user_id:
        return jsonify({'error': '无权复用'}), 403
    
    # 创建副本
    forked = Animation(
        title=f"{original.title} (复用)",
        description=original.description,
        prompt=original.prompt,
        svg_content=original.svg_content,
        animation_data=original.animation_data,
        duration=original.duration,
        category=original.category,
        user_id=user_id,
        is_public=False
    )
    db.session.add(forked)
    db.session.commit()
    
    return jsonify({'message': '复用成功', 'animation': forked.to_dict(include_content=True)})

@animations_bp.route('/<int:animation_id>/export/<format>', methods=['GET'])
@jwt_required(optional=True)
def export_animation(animation_id, format):
    """导出动画为MP4或GIF"""
    from flask import Response
    from services.export_service import export_service
    from urllib.parse import quote
    
    identity = get_jwt_identity()
    user_id = int(identity) if identity else None  # 可能为 None（未登录）
    animation = Animation.query.get(animation_id)
    
    if not animation:
        return jsonify({'error': '动画不存在'}), 404
    
    # 检查权限：公开动画任何人可导出，私有动画只有作者可导出
    if not animation.is_public and animation.user_id != user_id:
        return jsonify({'error': '无权访问'}), 403
    
    if format not in ['mp4', 'gif']:
        return jsonify({'error': '不支持的格式，请使用 mp4 或 gif'}), 400
    
    if not animation.svg_content:
        return jsonify({'error': '动画内容为空'}), 400
    
    # 获取用户指定的时长（默认5秒，最大30秒）
    duration = request.args.get('duration', 5, type=int)
    duration = max(1, min(30, duration))
    
    # 获取背景颜色参数
    bg_color = request.args.get('bgColor', None)
    
    # 根据格式设置帧率
    fps = 8 if format == 'gif' else 20
    
    try:
        # 导出为字节流
        data = export_service.export_to_bytes(
            animation.svg_content,
            format=format,
            duration=duration,
            fps=fps,
            bg_color=bg_color
        )
        
        # 设置响应头 - 使用 ASCII 安全的文件名
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


@animations_bp.route('/<int:animation_id>/export-stream/<format>', methods=['GET'])
@jwt_required(optional=True)
def export_animation_stream(animation_id, format):
    """使用 SSE 流式导出动画（支持私有动画），实时返回进度"""
    from flask import Response, stream_with_context
    from services.export_service import export_service
    import json
    import base64
    import threading
    import queue
    
    identity = get_jwt_identity()
    user_id = int(identity) if identity else None
    animation = Animation.query.get(animation_id)
    
    if not animation:
        return jsonify({'error': '动画不存在'}), 404
    
    # 检查权限：公开动画任何人可导出，私有动画只有作者可导出
    if not animation.is_public and animation.user_id != user_id:
        return jsonify({'error': '无权访问'}), 403
    
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
