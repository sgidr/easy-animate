import os
from datetime import timedelta
from dotenv import load_dotenv

# 确保在导入时加载 .env 文件
load_dotenv()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
    
    # 数据库路径
    DB_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'db')
    os.makedirs(DB_FOLDER, exist_ok=True)
    DB_PATH = os.path.join(DB_FOLDER, 'easyanimate.db')
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', f'sqlite:///{DB_PATH}')
    
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-key-change-in-production')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    
    # Claude API 配置
    CLAUDE_API_KEY = os.environ.get('CLAUDE_API_KEY', '')
    CLAUDE_API_BASE_URL = os.environ.get('CLAUDE_API_BASE_URL', 'https://yunwu.ai/v1')
    CLAUDE_MODEL = os.environ.get('CLAUDE_MODEL', 'claude-haiku-4-5-20251001')
    
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB
    
    # CORS配置 - 从环境变量读取，默认支持常见的开发和生产环境
    @staticmethod
    def get_cors_origins():
        """获取允许的CORS源"""
        # 从环境变量读取，多个源用逗号分隔
        cors_env = os.environ.get('CORS_ORIGINS', '')
        
        if cors_env:
            # 如果设置了环境变量，使用它
            return [origin.strip() for origin in cors_env.split(',')]
        
        # 默认允许的源
        return [
            'http://localhost:5173',           # 本地开发前端
            'http://localhost:3000',           # 本地生产前端
            'http://localhost:8000',           # 本地部署前端
            'http://easyanimate.awei6.site',   # 生产域名
            'https://easyanimate.awei6.site',  # 生产域名HTTPS
            'http://106.13.112.233:5000',      # 后端IP（用于测试）
        ]
