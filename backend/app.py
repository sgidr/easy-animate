import os
import logging
from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from config import Config
from models import db, User

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    logger.info("🚀 Easy Animate 后端启动中...")
    
    # 初始化扩展
    # CORS配置 - 支持开发和生产环境
    cors_origins = Config.get_cors_origins()
    logger.info(f"✅ CORS允许的源: {cors_origins}")
    
    CORS(app, 
         origins=cors_origins,
         methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
         allow_headers=['Content-Type', 'Authorization'],
         supports_credentials=True,
         max_age=3600)
    
    jwt = JWTManager(app)
    db.init_app(app)
    
    # JWT 错误处理
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({'error': 'Token已过期，请重新登录'}), 401
    
    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return jsonify({'error': f'无效的Token: {error}'}), 401
    
    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return jsonify({'error': '缺少认证Token'}), 401
    
    # 确保上传目录存在
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    
    # 注册蓝图
    from routes.auth import auth_bp
    from routes.animations import animations_bp
    from routes.community import community_bp
    from routes.admin import admin_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(animations_bp, url_prefix='/api/animations')
    app.register_blueprint(community_bp, url_prefix='/api/community')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    
    # 健康检查
    @app.route('/api/health')
    def health():
        return jsonify({'status': 'ok'})
    
    # 配置检查
    @app.route('/api/config-check')
    def config_check():
        from services.ai_service import ai_service
        return jsonify({
            'api_key_set': bool(ai_service.api_key),
            'base_url': ai_service.base_url,
            'model': ai_service.model
        })
    
    # 创建数据库表
    with app.app_context():
        db.create_all()
        # 创建默认管理员账户
        if not User.query.filter_by(username='admin').first():
            admin = User(
                username='admin',
                email='admin@example.com',
                is_admin=True,
                quota=999
            )
            admin.set_password('admin123')
            db.session.add(admin)
            db.session.commit()
    
    return app

app = create_app()

if __name__ == '__main__':
    app.run(debug=True, port=5000)
