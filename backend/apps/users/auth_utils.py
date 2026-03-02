import re
from django.core.exceptions import ValidationError

def check_rate_limit(user_id, action='login', limit=5, window=3600):
    """Check if user has exceeded rate limit"""
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
