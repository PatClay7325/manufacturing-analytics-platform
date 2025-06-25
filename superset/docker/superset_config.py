import os

# Superset specific config
ROW_LIMIT = 5000

# Flask App Builder configuration
SECRET_KEY = os.environ.get('SECRET_KEY', 'mKQ7J4EdDVj5YvgSfFY45dEP9QpNXYr7kRxzW3nCBhA6uLm2TsF8')  # Change this!

# The SQLAlchemy connection string
SQLALCHEMY_DATABASE_URI = f"postgresql://{os.environ.get('DATABASE_USER', 'superset')}:{os.environ.get('DATABASE_PASSWORD', 'superset')}@{os.environ.get('DATABASE_HOST', 'superset-db')}:{os.environ.get('DATABASE_PORT', '5432')}/{os.environ.get('DATABASE_DB', 'superset')}"

# Redis configuration
REDIS_HOST = os.environ.get('REDIS_HOST', 'superset-redis')
REDIS_PORT = os.environ.get('REDIS_PORT', 6379)
REDIS_CELERY_DB = os.environ.get('REDIS_CELERY_DB', 0)
REDIS_RESULTS_DB = os.environ.get('REDIS_RESULTS_DB', 1)

# Celery configuration
class CeleryConfig:
    broker_url = f'redis://{REDIS_HOST}:{REDIS_PORT}/{REDIS_CELERY_DB}'
    result_backend = f'redis://{REDIS_HOST}:{REDIS_PORT}/{REDIS_RESULTS_DB}'

CELERY_CONFIG = CeleryConfig

# Cache configuration
CACHE_CONFIG = {
    'CACHE_TYPE': 'RedisCache',
    'CACHE_DEFAULT_TIMEOUT': 300,
    'CACHE_KEY_PREFIX': 'superset_',
    'CACHE_REDIS_HOST': REDIS_HOST,
    'CACHE_REDIS_PORT': REDIS_PORT,
    'CACHE_REDIS_DB': 1,
}

# Feature flags
FEATURE_FLAGS = {
    'ENABLE_TEMPLATE_PROCESSING': True,
}

# Disable example data
ENABLE_PROXY_FIX = True

# Session configuration
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SECURE = False  # Set to True in production with HTTPS
SESSION_COOKIE_SAMESITE = 'Lax'
PERMANENT_SESSION_LIFETIME = 3600  # 1 hour

# WebServer configuration
SUPERSET_WEBSERVER_PROTOCOL = 'http'
SUPERSET_WEBSERVER_ADDRESS = '0.0.0.0'
SUPERSET_WEBSERVER_PORT = 8088

# Gunicorn worker config
GUNICORN_LIMIT_REQUEST_LINE = 0
GUNICORN_LIMIT_REQUEST_FIELD_SIZE = 0

# Additional security headers
TALISMAN_ENABLED = False  # Disable for now to avoid header issues
WTF_CSRF_ENABLED = True
WTF_CSRF_TIME_LIMIT = None