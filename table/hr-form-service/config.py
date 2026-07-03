import os
from datetime import timedelta
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()


class Config:
    """应用配置类"""

    # Flask 配置
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
    FLASK_ENV = os.environ.get('FLASK_ENV', 'development')
    FLASK_DEBUG = os.environ.get('FLASK_DEBUG', '1') == '1'
    PORT = int(os.environ.get('PORT', 5000))

    # 数据库配置
    _base = os.path.dirname(os.path.abspath(__file__))
    _env_path = os.environ.get('DATABASE_PATH')
    DATABASE_PATH = _env_path if _env_path else os.path.join(_base, 'candidates.json')
    # print(f"[CONFIG] DB_PATH={DATABASE_PATH} _env_path={_env_path}", flush=True)

    # CORS 配置
    CORS_ORIGINS = '*'

    # 基础URL（用于生成表单链接）
    API_BASE_URL = os.environ.get('API_BASE_URL', 'https://add-declined-full-michael.trycloudflare.com')

    # 时区配置
    TIMEZONE = 'Asia/Shanghai'
