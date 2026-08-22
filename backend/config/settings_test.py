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

# No test may reach a third-party service. REDIS_URL was inherited from the
# environment, so the health check dialled the production Upstash host on every
# run - a real outbound connection to a live service, from a test suite, which
# is exactly what the mail-provider key was blanked to prevent.
#
# Pointed at a local address that nothing is listening on. The health check
# reports redis as error, which is honest: there is no broker in a test run.
REDIS_URL = "redis://127.0.0.1:6379/15"
CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = REDIS_URL

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

# No test may reach a third-party API. Channels, cache and Celery were already
# made inert above; email was not, and send_email only short-circuits when this
# key is empty. Any suite run in a shell with a real RESEND_API_KEY — a
# developer's own environment, or CI if the key were ever added there — was
# issuing live HTTP requests to Resend on every notification created. It showed
# up as a wall of "Resend email failed (422)" and a five-second test taking
# twelve, and the only thing standing between that and real mail going out was
# that example.com addresses are rejected.
RESEND_API_KEY = ""
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
