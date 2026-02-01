from django.core.cache import cache
from django.http import JsonResponse
from functools import wraps
from datetime import datetime, timedelta
import hashlib

class RateLimiter:
    """Rate limiting for API endpoints"""
    
    LIMITS = {
        'login': (5, 300),  # 5 attempts per 5 minutes
        'signup': (3, 300),
        'api_general': (100, 60),  # 100 requests per minute
        'api_search': (30, 60),
        'api_write': (50, 60),
    }
    
    @staticmethod
    def get_client_id(request):
        """Get unique client identifier"""
        if request.user.is_authenticated:
            return f"user_{request.user.id}"
        
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        ip = x_forwarded_for.split(',')[0] if x_forwarded_for else request.META.get('REMOTE_ADDR')
        return f"ip_{ip}"
    
    @staticmethod
    def is_rate_limited(client_id, limit_type='api_general'):
        """Check if client is rate limited"""
        limit, window = RateLimiter.LIMITS.get(limit_type, (100, 60))
        key = f"ratelimit:{limit_type}:{client_id}"
        
        current = cache.get(key, 0)
        if current >= limit:
            return True
        
        cache.set(key, current + 1, window)
        return False
    
    @staticmethod
    def get_remaining(client_id, limit_type='api_general'):
        """Get remaining requests"""
        limit, _ = RateLimiter.LIMITS.get(limit_type, (100, 60))
        key = f"ratelimit:{limit_type}:{client_id}"
        current = cache.get(key, 0)
        return max(0, limit - current)


def rate_limit(limit_type='api_general'):
    """Decorator for rate limiting endpoints"""
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            client_id = RateLimiter.get_client_id(request)
            
            if RateLimiter.is_rate_limited(client_id, limit_type):
                return JsonResponse(
                    {'error': 'Rate limit exceeded'},
                    status=429
                )
            
            response = view_func(request, *args, **kwargs)
            remaining = RateLimiter.get_remaining(client_id, limit_type)
            response['X-RateLimit-Remaining'] = remaining
            return response
        
        return wrapper
    return decorator


class AuditLogger:
    """Audit logging for sensitive operations"""
    
    @staticmethod
    def log_action(user, action, resource_type, resource_id, org_id, changes=None, status='success'):
        """Log audit action"""
        from apps.organizations.models import AuditLog
        
        AuditLog.objects.create(
            user=user,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            organization_id=org_id,
            changes=changes or {},
            status=status,
            timestamp=datetime.now(),
            ip_address=None,
            user_agent=None
        )
    
    @staticmethod
    def log_login(user, ip_address, user_agent, success=True):
        """Log login attempt"""
        from apps.organizations.models import LoginAudit
        
        LoginAudit.objects.create(
            user=user if success else None,
            username=user.username if success else None,
            ip_address=ip_address,
            user_agent=user_agent,
            success=success,
            timestamp=datetime.now()
        )


class DataEncryption:
    """Data encryption utilities"""
    
    SENSITIVE_FIELDS = {
        'Conversation': ['content', 'why_this_matters'],
        'Decision': ['description', 'rationale'],
        'User': ['email'],
    }
    
    @staticmethod
    def should_encrypt(model_name, field_name):
        """Check if field should be encrypted"""
        return field_name in DataEncryption.SENSITIVE_FIELDS.get(model_name, [])
    
    @staticmethod
    def encrypt_field(value):
        """Encrypt sensitive field"""
        from cryptography.fernet import Fernet
        from django.conf import settings
        
        if not value:
            return value
        
        key = settings.SECRET_KEY.encode()[:32].ljust(32, b'0')
        cipher = Fernet(key)
        return cipher.encrypt(value.encode()).decode()
    
    @staticmethod
    def decrypt_field(encrypted_value):
        """Decrypt sensitive field"""
        from cryptography.fernet import Fernet
        from django.conf import settings
        
        if not encrypted_value:
            return encrypted_value
        
        key = settings.SECRET_KEY.encode()[:32].ljust(32, b'0')
        cipher = Fernet(key)
        return cipher.decrypt(encrypted_value.encode()).decode()
