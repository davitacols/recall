import os
import ssl
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse
from decouple import config
import dj_database_url
from corsheaders.defaults import default_headers

try:
    import sentry_sdk
    from sentry_sdk.integrations.django import DjangoIntegration
except Exception:  # pragma: no cover - optional dependency in local envs
    sentry_sdk = None
    DjangoIntegration = None

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _env_bool(key, default=False):
    raw = config(key, default=str(default))
    if isinstance(raw, bool):
        return raw
    value = str(raw).strip().lower()
    if value in {'1', 'true', 't', 'yes', 'y', 'on'}:
        return True
    if value in {'0', 'false', 'f', 'no', 'n', 'off', ''}:
        return False
    # Fail closed for ambiguous non-boolean values (e.g. "release", "prod").
    return bool(default)


SECRET_KEY = config('SECRET_KEY')
DEBUG = _env_bool('DEBUG', default=False)
ALLOWED_HOSTS = [host.strip() for host in config('ALLOWED_HOSTS', default='localhost,127.0.0.1').split(',') if host.strip()]
if not DEBUG:
    ALLOWED_HOSTS.extend([
        host.strip()
        for host in config('EXTRA_ALLOWED_HOSTS', default='.onrender.com').split(',')
        if host.strip()
    ])
if _env_bool('ALLOW_ALL_HOSTS', default=False):
    ALLOWED_HOSTS.append('*')

SENTRY_DSN = config('SENTRY_DSN', default='').strip()
SENTRY_ENVIRONMENT = config('SENTRY_ENVIRONMENT', default='development').strip()
SENTRY_TRACES_SAMPLE_RATE = config('SENTRY_TRACES_SAMPLE_RATE', default=0.0, cast=float)

if sentry_sdk and SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[DjangoIntegration()] if DjangoIntegration else [],
        environment=SENTRY_ENVIRONMENT,
        traces_sample_rate=SENTRY_TRACES_SAMPLE_RATE,
        send_default_pii=False,
    )

# Security Settings
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SECURE_HSTS_SECONDS = 31536000 if not DEBUG else 0
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
SECURE_SSL_REDIRECT = not DEBUG
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SAMESITE = 'Lax'
SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'
SECURE_CROSS_ORIGIN_OPENER_POLICY = 'same-origin'
# Behind Render/other reverse proxies, trust forwarded HTTPS headers to avoid redirect loops.
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
USE_X_FORWARDED_HOST = True
SECURE_REDIRECT_EXEMPT = [r'^api/health/']

# Custom User Model
AUTH_USER_MODEL = 'organizations.User'

INSTALLED_APPS = [
    'daphne',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'cloudinary_storage',
    'cloudinary',
    'channels',
    'apps.organizations',
    'apps.conversations',
    'apps.decisions',
    'apps.knowledge',
    'apps.users',
    'apps.notifications.apps.NotificationsConfig',
    'apps.agile',
    'apps.business',
    'apps.integrations',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'config.security_middleware.RequestSecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'apps.organizations.middleware.OrganizationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'config.media_middleware.MediaNotFoundMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

DATABASES = {
    'default': dj_database_url.config(
        default=config('DATABASE_URL', default='sqlite:///db.sqlite3'),
        conn_max_age=600,
        conn_health_checks=True,
    )
}

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'apps.users.authentication.CognitoAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': config('DRF_ANON_THROTTLE_RATE', default='60/min'),
        'user': config('DRF_USER_THROTTLE_RATE', default='300/min'),
    },
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20
}

# AWS Cognito Configuration
COGNITO_USER_POOL_ID = config('COGNITO_USER_POOL_ID', default='')
COGNITO_CLIENT_ID = config('COGNITO_CLIENT_ID', default='')
COGNITO_REGION = config('AWS_REGION', default='us-east-1')
GOOGLE_CLIENT_ID = config('GOOGLE_CLIENT_ID', default='')
GOOGLE_OAUTH_ENABLED = _env_bool('GOOGLE_OAUTH_ENABLED', default=bool(GOOGLE_CLIENT_ID))
GOOGLE_CLIENT_SECRET = config('GOOGLE_CLIENT_SECRET', default='')
MICROSOFT_CLIENT_ID = config('MICROSOFT_CLIENT_ID', default='')
MICROSOFT_CLIENT_SECRET = config('MICROSOFT_CLIENT_SECRET', default='')
MICROSOFT_TENANT_ID = config('MICROSOFT_TENANT_ID', default='common')

AUTH_RATE_LIMITS = {
    'login': {
        'limit': config('AUTH_LOGIN_RATE_LIMIT', default=5, cast=int),
        'window': config('AUTH_LOGIN_RATE_WINDOW', default=3600, cast=int),
    },
    'google_login': {
        'limit': config('AUTH_GOOGLE_LOGIN_RATE_LIMIT', default=10, cast=int),
        'window': config('AUTH_GOOGLE_LOGIN_RATE_WINDOW', default=3600, cast=int),
    },
    'register': {
        'limit': config('AUTH_REGISTER_RATE_LIMIT', default=5, cast=int),
        'window': config('AUTH_REGISTER_RATE_WINDOW', default=3600, cast=int),
    },
    'forgot_password': {
        'limit': config('AUTH_FORGOT_PASSWORD_RATE_LIMIT', default=10, cast=int),
        'window': config('AUTH_FORGOT_PASSWORD_RATE_WINDOW', default=3600, cast=int),
    },
    'workspace_switch_code': {
        'limit': config('AUTH_WORKSPACE_SWITCH_CODE_RATE_LIMIT', default=20, cast=int),
        'window': config('AUTH_WORKSPACE_SWITCH_CODE_RATE_WINDOW', default=3600, cast=int),
    },
    'workspace_switch': {
        'limit': config('AUTH_WORKSPACE_SWITCH_RATE_LIMIT', default=30, cast=int),
        'window': config('AUTH_WORKSPACE_SWITCH_RATE_WINDOW', default=3600, cast=int),
    },
    'invite_send': {
        'limit': config('AUTH_INVITE_SEND_RATE_LIMIT', default=20, cast=int),
        'window': config('AUTH_INVITE_SEND_RATE_WINDOW', default=3600, cast=int),
    },
    'invite_resend': {
        'limit': config('AUTH_INVITE_RESEND_RATE_LIMIT', default=60, cast=int),
        'window': config('AUTH_INVITE_RESEND_RATE_WINDOW', default=3600, cast=int),
    },
}

# Celery Configuration
redis_url = config('REDIS_URL', default='redis://localhost:6379/0')
if DEBUG:
    # Use synchronous task execution for local development
    CELERY_TASK_ALWAYS_EAGER = True
    CELERY_TASK_EAGER_PROPAGATES = True
CELERY_BROKER_URL = redis_url
CELERY_RESULT_BACKEND = redis_url
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'UTC'
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT = 30 * 60
NOTIFICATIONS_USE_CELERY = _env_bool('NOTIFICATIONS_USE_CELERY', default=False)

# AI Configuration
AWS_ACCESS_KEY_ID = config('AWS_ACCESS_KEY_ID', default='')
AWS_SECRET_ACCESS_KEY = config('AWS_SECRET_ACCESS_KEY', default='')
AWS_REGION = config('AWS_REGION', default='us-east-1')
ANTHROPIC_API_KEY = config('ANTHROPIC_API_KEY', default='')

# Bot protection (Cloudflare Turnstile)
TURNSTILE_ENABLED = _env_bool('TURNSTILE_ENABLED', default=False)
TURNSTILE_SECRET_KEY = config('TURNSTILE_SECRET_KEY', default='')
TURNSTILE_VERIFY_URL = config(
    'TURNSTILE_VERIFY_URL',
    default='https://challenges.cloudflare.com/turnstile/v0/siteverify'
)

# Email Configuration (Resend)
RESEND_API_KEY = config('RESEND_API_KEY', default='')
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='Knoledgr <support@knoledgr.com>')
SUPPORT_EMAIL = config('SUPPORT_EMAIL', default='support@knoledgr.com')
FRONTEND_URL = config('FRONTEND_URL', default='http://localhost:3000')

# Stripe Configuration
STRIPE_SECRET_KEY = config('STRIPE_SECRET_KEY', default='')
STRIPE_PUBLISHABLE_KEY = config('STRIPE_PUBLISHABLE_KEY', default='')
STRIPE_WEBHOOK_SECRET = config('STRIPE_WEBHOOK_SECRET', default='')
STRIPE_STARTER_PRICE_ID = config('STRIPE_STARTER_PRICE_ID', default='')
STRIPE_PROFESSIONAL_PRICE_ID = config('STRIPE_PROFESSIONAL_PRICE_ID', default='')
STRIPE_ENTERPRISE_PRICE_ID = config('STRIPE_ENTERPRISE_PRICE_ID', default='')

# Vector Database
CHROMA_PERSIST_DIRECTORY = config('CHROMA_PERSIST_DIRECTORY', default='./chroma_db')

# Model Cache Directories
HUGGINGFACE_HUB_CACHE = config('HUGGINGFACE_HUB_CACHE', default='D:\\\\huggingface_cache')
TRANSFORMERS_CACHE = config('TRANSFORMERS_CACHE', default='D:\\\\transformers_cache')
TEMP_DIR = config('TEMP_DIR', default='D:\\\\temp')

os.environ['HUGGINGFACE_HUB_CACHE'] = HUGGINGFACE_HUB_CACHE
os.environ['TRANSFORMERS_CACHE'] = TRANSFORMERS_CACHE
os.environ['TMPDIR'] = TEMP_DIR
os.environ['TEMP'] = TEMP_DIR
os.environ['TMP'] = TEMP_DIR

# CORS Configuration
def _parse_csv(value):
    return [item.strip() for item in value.split(',') if item.strip()]

CORS_ALLOWED_ORIGINS = _parse_csv(
    config(
        'CORS_ALLOWED_ORIGINS',
        default='http://localhost:3000,http://127.0.0.1:3000'
    )
)

if not DEBUG:
    CORS_ALLOWED_ORIGINS.extend([
        'https://knoledgr.com',
        'https://www.knoledgr.com',
        'https://recall-frontend.onrender.com',
        'https://recall.dev',
        FRONTEND_URL.strip(),
    ])
    CORS_ALLOWED_ORIGIN_REGEXES = []
else:
    CORS_ALLOWED_ORIGIN_REGEXES = []

# Remove duplicates while preserving order.
CORS_ALLOWED_ORIGINS = list(dict.fromkeys(CORS_ALLOWED_ORIGINS))

SECURITY_PREFLIGHT_REQUIRED_ORIGINS = _parse_csv(
    config(
        'SECURITY_PREFLIGHT_REQUIRED_ORIGINS',
        default='https://knoledgr.com,https://www.knoledgr.com'
    )
)

# Additional response header policies.
SECURITY_ENABLE_CSP = _env_bool('SECURITY_ENABLE_CSP', default=False)
SECURITY_CSP_REPORT_ONLY = _env_bool('SECURITY_CSP_REPORT_ONLY', default=True)
SECURITY_CSP_POLICY = config(
    'SECURITY_CSP_POLICY',
    default=(
        "default-src 'self'; "
        "base-uri 'self'; "
        "frame-ancestors 'none'; "
        "object-src 'none'; "
        "img-src 'self' data: https:; "
        "style-src 'self' 'unsafe-inline' https:; "
        "font-src 'self' data: https:; "
        "connect-src 'self' https: wss:; "
        "script-src 'self' https://accounts.google.com https://apis.google.com https://www.gstatic.com; "
        "frame-src https://accounts.google.com https://challenges.cloudflare.com;"
    )
)
SECURITY_PERMISSIONS_POLICY = config(
    'SECURITY_PERMISSIONS_POLICY',
    default='camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()'
)

CORS_ALLOW_ALL_ORIGINS = _env_bool('CORS_ALLOW_ALL_ORIGINS', default=DEBUG)
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = list(default_headers) + [
    'cache-control',
    'pragma',
    'expires',
]
CSRF_TRUSTED_ORIGINS = _parse_csv(
    config(
        'CSRF_TRUSTED_ORIGINS',
        default='http://localhost:3000,http://127.0.0.1:3000'
    )
)
if not DEBUG:
    CSRF_TRUSTED_ORIGINS.extend([
        'https://knoledgr.com',
        'https://www.knoledgr.com',
        'https://recall-frontend.onrender.com',
        'https://recall.dev',
        FRONTEND_URL.strip(),
    ])
CSRF_TRUSTED_ORIGINS = list(dict.fromkeys(CSRF_TRUSTED_ORIGINS))

# Request size limits to reduce abuse and parser pressure.
API_MAX_BODY_SIZE_BYTES = config('API_MAX_BODY_SIZE_BYTES', default=10 * 1024 * 1024, cast=int)
DATA_UPLOAD_MAX_MEMORY_SIZE = config('DATA_UPLOAD_MAX_MEMORY_SIZE', default=10 * 1024 * 1024, cast=int)
FILE_UPLOAD_MAX_MEMORY_SIZE = config('FILE_UPLOAD_MAX_MEMORY_SIZE', default=10 * 1024 * 1024, cast=int)
DATA_UPLOAD_MAX_NUMBER_FIELDS = config('DATA_UPLOAD_MAX_NUMBER_FIELDS', default=2000, cast=int)

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

import cloudinary
import cloudinary.uploader
import cloudinary.api

cloudinary.config(
    cloud_name=config('CLOUDINARY_CLOUD_NAME', default=''),
    api_key=config('CLOUDINARY_API_KEY', default=''),
    api_secret=config('CLOUDINARY_API_SECRET', default=''),
    secure=True
)

CLOUDINARY_STORAGE = {
    'CLOUD_NAME': config('CLOUDINARY_CLOUD_NAME', default=''),
    'API_KEY': config('CLOUDINARY_API_KEY', default=''),
    'API_SECRET': config('CLOUDINARY_API_SECRET', default=''),
}

if not DEBUG:
    DEFAULT_FILE_STORAGE = 'cloudinary_storage.storage.MediaCloudinaryStorage'

MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'

# Parse Redis URL for CHANNEL_LAYERS
if DEBUG and redis_url == 'redis://localhost:6379/0':
    # Use in-memory channel layer for local development
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels.layers.InMemoryChannelLayer'
        }
    }
else:
    redis_host = redis_url
    parsed_redis = urlparse(redis_url)
    redis_query = dict(parse_qsl(parsed_redis.query, keep_blank_values=True))
    redis_query.pop('ssl', None)
    redis_query.pop('ssl_cert_reqs', None)
    normalized_redis_url = urlunparse(parsed_redis._replace(query=urlencode(redis_query)))

    if redis_url.startswith('rediss://'):
        ssl_mode = config('REDIS_SSL_CERT_REQS', default='none').strip().lower()
        ssl_cert_reqs = ssl.CERT_NONE
        if ssl_mode in ('required', 'require', 'cert_required'):
            ssl_cert_reqs = ssl.CERT_REQUIRED
        elif ssl_mode in ('optional', 'cert_optional'):
            ssl_cert_reqs = ssl.CERT_OPTIONAL

        redis_host = {
            'address': normalized_redis_url,
            # channels_redis expects SSL kwargs at the host dict top-level.
            # Nesting under "ssl" passes an unsupported "ssl" kwarg to redis.asyncio.
            'ssl_cert_reqs': ssl_cert_reqs,
        }
    else:
        redis_host = normalized_redis_url

    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels_redis.core.RedisChannelLayer',
            'CONFIG': {
                'hosts': [redis_host],
                'capacity': config('CHANNELS_CAPACITY', default=1500, cast=int),
                'expiry': config('CHANNELS_EXPIRY', default=60, cast=int),
            },
        },
    }

from datetime import timedelta
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=config('JWT_ACCESS_TOKEN_HOURS', default=8, cast=int)),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=config('JWT_REFRESH_TOKEN_DAYS', default=7, cast=int)),
    'ROTATE_REFRESH_TOKENS': _env_bool('JWT_ROTATE_REFRESH_TOKENS', default=True),
    'BLACKLIST_AFTER_ROTATION': _env_bool('JWT_BLACKLIST_AFTER_ROTATION', default=True),
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# Logging Configuration
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'level': 'DEBUG' if DEBUG else 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}
