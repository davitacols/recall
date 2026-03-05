import re
import hashlib
from django.core.exceptions import ValidationError
from django.core.cache import cache
from django.contrib.auth import get_user_model

def check_rate_limit(user_id, action='login', limit=5, window=3600):
    """Simple fixed-window rate limiter using Django cache."""
    if not user_id:
        user_id = "anonymous"
    key = f"rl:{action}:{str(user_id).lower()}"
    try:
        # Initialize counter with TTL if key does not exist.
        created = cache.add(key, 1, timeout=window)
        if created:
            return True
        count = cache.get(key, 0)
        if count >= limit:
            return False
        try:
            cache.incr(key)
        except ValueError:
            cache.set(key, count + 1, timeout=window)
        return True
    except Exception:
        # Fail open to avoid auth outage if cache backend is unavailable.
        return True

def validate_email(email):
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not email or not re.match(pattern, email):
        raise ValidationError('Please enter a valid email address')

def validate_password(password):
    """Validate password strength"""
    if len(password) < 8:
        raise ValidationError('Password must be at least 8 characters')
    if not re.search(r'[A-Z]', password):
        raise ValidationError('Password must contain at least one uppercase letter')
    if not re.search(r'[a-z]', password):
        raise ValidationError('Password must contain at least one lowercase letter')
    if not re.search(r'[0-9]', password):
        raise ValidationError('Password must contain at least one number')

def validate_username(username):
    """Validate username format"""
    if len(username) < 3:
        raise ValidationError('Username must be at least 3 characters')
    if not re.match(r'^[a-zA-Z0-9_-]+$', username):
        raise ValidationError('Username can only contain letters, numbers, underscores, and hyphens')


def generate_unique_org_username(seed_value, org_slug, max_length=150):
    """Generate a globally-unique username namespaced by organization slug."""
    base = (seed_value or '').strip().lower()
    if '@' in base:
        base = base.split('@')[0]
    base = re.sub(r'[^a-z0-9_-]+', '-', base).strip('-') or 'user'

    org_part = re.sub(r'[^a-z0-9-]+', '-', (org_slug or '').strip().lower()).strip('-') or 'org'
    prefix = f"{base}__{org_part}"
    prefix = prefix[:max_length]

    User = get_user_model()
    candidate = prefix
    suffix = 1
    while User.objects.filter(username__iexact=candidate).exists():
        suffix_text = f"-{suffix}"
        candidate = f"{prefix[:max_length - len(suffix_text)]}{suffix_text}"
        suffix += 1

    return candidate


def get_client_fingerprint(request):
    """
    Build a coarse client fingerprint for abuse throttling.
    Uses forwarded IP when available and user-agent hash.
    """
    forwarded_for = (request.META.get('HTTP_X_FORWARDED_FOR') or '').split(',')[0].strip()
    remote_addr = (request.META.get('REMOTE_ADDR') or '').strip()
    ip = forwarded_for or remote_addr or 'unknown'
    user_agent = (request.META.get('HTTP_USER_AGENT') or '').strip().lower()
    digest = hashlib.sha256(f"{ip}|{user_agent}".encode()).hexdigest()[:16]
    return f"{ip}:{digest}"
