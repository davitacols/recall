import os
import secrets

# Force safe values before importing base settings, regardless of current shell env.
os.environ["DEBUG"] = "False"

# Generated per run rather than a literal. A hardcoded "test-secret-key" string
# works fine, but it is indistinguishable from a real leaked credential to a
# scanner, and a finding you have to remember to ignore is worse than no
# finding at all. Nothing here needs the key to be stable across runs.
os.environ.setdefault("SECRET_KEY", secrets.token_urlsafe(48))

from .settings import *  # noqa: F401,F403

# Keep test URL loading minimal to avoid optional dependency imports during checks.
ROOT_URLCONF = "config.urls_test"
SECURE_SSL_REDIRECT = False
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False

# Use local SQLite for deterministic, network-free test runs.
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": os.path.join(BASE_DIR, "test_db.sqlite3"),
    }
}

# Avoid postgres-specific migrations in local/CI tests by building schema from models.
MIGRATION_MODULES = {
    "organizations": None,
    "conversations": None,
    "decisions": None,
    "knowledge": None,
    "users": None,
    "notifications": None,
    "agile": None,
    "business": None,
    "integrations": None,
}

# Faster tests.
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]

# Keep external integrations inert during tests.
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer",
    }
}
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
    }
}
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True
