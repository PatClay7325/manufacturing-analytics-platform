import os
from datetime import timedelta
from celery.schedules import crontab

# Superset specific config
ROW_LIMIT = 5000

# Flask App Builder configuration
# Your App secret key will be used for securely signing the session cookie
# and encrypting sensitive information on the database
# Make sure you are changing this key for your deployment with a strong key.
SECRET_KEY = os.environ.get('SECRET_KEY', 'thisISaSECRET_1234')

# The SQLAlchemy connection string to your database backend
# This connection defines the path to the database that stores your
# superset metadata (slices, connections, tables, dashboards, ...).
SQLALCHEMY_DATABASE_URI = f"postgresql://{os.environ.get('DATABASE_USER', 'superset')}:{os.environ.get('DATABASE_PASSWORD', 'superset')}@{os.environ.get('DATABASE_HOST', 'superset-db')}:{os.environ.get('DATABASE_PORT', '5432')}/{os.environ.get('DATABASE_DB', 'superset')}"

# Flask-WTF flag for CSRF
WTF_CSRF_ENABLED = True
# Add endpoints that need to be exempt from CSRF protection
WTF_CSRF_EXEMPT_LIST = ['superset.views.core.log']

# Set this API key to enable Mapbox visualizations
MAPBOX_API_KEY = os.environ.get('MAPBOX_API_KEY', '')

# Cache configuration
CACHE_CONFIG = {
    'CACHE_TYPE': 'RedisCache',
    'CACHE_DEFAULT_TIMEOUT': 300,
    'CACHE_KEY_PREFIX': 'superset_',
    'CACHE_REDIS_HOST': os.environ.get('REDIS_HOST', 'superset-redis'),
    'CACHE_REDIS_PORT': os.environ.get('REDIS_PORT', 6379),
    'CACHE_REDIS_DB': os.environ.get('REDIS_RESULTS_DB', 1),
}

DATA_CACHE_CONFIG = CACHE_CONFIG

# Celery configuration
class CeleryConfig:
    broker_url = f"redis://{os.environ.get('REDIS_HOST', 'superset-redis')}:{os.environ.get('REDIS_PORT', 6379)}/{os.environ.get('REDIS_CELERY_DB', 0)}"
    imports = (
        'superset.sql_lab',
        'superset.tasks',
    )
    result_backend = f"redis://{os.environ.get('REDIS_HOST', 'superset-redis')}:{os.environ.get('REDIS_PORT', 6379)}/{os.environ.get('REDIS_RESULTS_DB', 1)}"
    worker_prefetch_multiplier = 10
    task_acks_late = True
    task_annotations = {
        'sql_lab.get_sql_results': {
            'rate_limit': '100/s',
        },
    }
    beat_schedule = {
        'reports.scheduler': {
            'task': 'reports.scheduler',
            'schedule': crontab(minute='*', hour='*'),
        },
        'reports.prune_log': {
            'task': 'reports.prune_log',
            'schedule': crontab(minute=0, hour=0),
        },
    }

CELERY_CONFIG = CeleryConfig

# Feature flags
FEATURE_FLAGS = {
    "ENABLE_TEMPLATE_PROCESSING": True,
    "ENABLE_TEMPLATE_REMOVE_FILTERS": False,
    "EMBEDDED_SUPERSET": True,
    "ENABLE_CORS": True,
    "DASHBOARD_RBAC": True,
    "DASHBOARD_NATIVE_FILTERS": True,
    "DASHBOARD_CROSS_FILTERS": True,
    "DASHBOARD_NATIVE_FILTERS_SET": True,
    "ENABLE_EXPLORE_DRAG_AND_DROP": True,
    "ENABLE_DND_WITH_CLICK_UX": True,
    "ENABLE_JAVASCRIPT_CONTROLS": True,
    "DISABLE_LEGACY_DATASOURCE_EDITOR": True,
}

# CORS configuration for embedded dashboards
ENABLE_CORS = True
CORS_OPTIONS = {
    'supports_credentials': True,
    'allow_headers': ['*'],
    'origins': [
        'http://localhost:3000',
        'http://manufacturing-app:3000',
        os.environ.get('NEXTAUTH_URL', 'http://localhost:3000')
    ]
}

# Guest token configuration for embedded dashboards
GUEST_ROLE_NAME = "Gamma"
GUEST_TOKEN_JWT_SECRET = os.environ.get('SECRET_KEY', 'thisISaSECRET_1234')
GUEST_TOKEN_JWT_ALGO = "HS256"
GUEST_TOKEN_HEADER_NAME = "X-GuestToken"
GUEST_TOKEN_JWT_EXP_TIMEDELTA = timedelta(minutes=5)

# Public role configuration
PUBLIC_ROLE_LIKE = "Gamma"

# Security configuration
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SECURE = False  # Set to True in production with HTTPS
SESSION_COOKIE_SAMESITE = "Lax"
PERMANENT_SESSION_LIFETIME = 1800

# Allow embedding in iframes
TALISMAN_ENABLED = False
TALISMAN_CONFIG = {
    'content_security_policy': None,
    'content_security_policy_nonce_in': ['script-src'],
    'force_https': False,
}

# HTTP headers configuration
HTTP_HEADERS = {
    'X-Frame-Options': 'ALLOWFROM http://localhost:3000'
}

# Dashboard configuration
DASHBOARD_TEMPLATE_TOOLTIP_SHOW_KEYS = True

# Add Manufacturing Database automatically on startup
from superset.connectors.sqla.models import SqlaTable
from superset import db
import logging

logger = logging.getLogger(__name__)

def init_manufacturing_database():
    """Initialize the manufacturing database connection"""
    try:
        from superset.models.core import Database
        
        # Check if database already exists
        existing_db = db.session.query(Database).filter_by(
            database_name='Manufacturing TimescaleDB'
        ).first()
        
        if not existing_db:
            # Create new database connection
            manufacturing_db = Database(
                database_name='Manufacturing TimescaleDB',
                sqlalchemy_uri=f"postgresql://{os.environ.get('MANUFACTURING_DB_USER', 'postgres')}:{os.environ.get('MANUFACTURING_DB_PASSWORD', 'postgres')}@{os.environ.get('MANUFACTURING_DB_HOST', 'timescaledb')}:5432/{os.environ.get('MANUFACTURING_DB_NAME', 'manufacturing')}",
                expose_in_sqllab=True,
                allow_ctas=True,
                allow_cvas=True,
                allow_dml=True,
                allow_multi_schema_metadata_fetch=True,
            )
            db.session.add(manufacturing_db)
            db.session.commit()
            logger.info("Manufacturing database connection created successfully")
    except Exception as e:
        logger.error(f"Failed to create manufacturing database connection: {str(e)}")

# Run initialization after app starts
from superset.initialization import SupersetAppInitializer

class CustomSupersetAppInitializer(SupersetAppInitializer):
    def init_app(self):
        super().init_app()
        with self.superset_app.app_context():
            init_manufacturing_database()

# Use custom initializer
APP_INITIALIZER = CustomSupersetAppInitializer