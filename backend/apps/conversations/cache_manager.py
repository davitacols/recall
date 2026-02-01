import json
from django.core.cache import cache
from django.conf import settings
from functools import wraps
import hashlib

class CacheManager:
    """Centralized cache management for RECALL"""
    
    CACHE_TIMEOUTS = {
        'conversation': 3600,  # 1 hour
        'decision': 3600,
        'trending': 21600,  # 6 hours
        'user_prefs': 86400,  # 24 hours
        'search': 1800,  # 30 minutes
        'analytics': 3600,
    }
    
    @staticmethod
    def get_key(prefix, *args):
        """Generate cache key"""
        key_parts = [prefix] + [str(arg) for arg in args]
        return ':'.join(key_parts)
    
    @staticmethod
    def get_conversation(conversation_id, org_id):
        """Get cached conversation"""
        key = CacheManager.get_key('conv', org_id, conversation_id)
        return cache.get(key)
    
    @staticmethod
    def set_conversation(conversation_id, org_id, data):
        """Cache conversation"""
        key = CacheManager.get_key('conv', org_id, conversation_id)
        cache.set(key, data, CacheManager.CACHE_TIMEOUTS['conversation'])
    
    @staticmethod
    def invalidate_conversation(conversation_id, org_id):
        """Invalidate conversation cache"""
        key = CacheManager.get_key('conv', org_id, conversation_id)
        cache.delete(key)
    
    @staticmethod
    def get_decision(decision_id, org_id):
        """Get cached decision"""
        key = CacheManager.get_key('dec', org_id, decision_id)
        return cache.get(key)
    
    @staticmethod
    def set_decision(decision_id, org_id, data):
        """Cache decision"""
        key = CacheManager.get_key('dec', org_id, decision_id)
        cache.set(key, data, CacheManager.CACHE_TIMEOUTS['decision'])
    
    @staticmethod
    def invalidate_decision(decision_id, org_id):
        """Invalidate decision cache"""
        key = CacheManager.get_key('dec', org_id, decision_id)
        cache.delete(key)
    
    @staticmethod
    def get_trending(org_id):
        """Get cached trending topics"""
        key = CacheManager.get_key('trend', org_id)
        return cache.get(key)
    
    @staticmethod
    def set_trending(org_id, data):
        """Cache trending topics"""
        key = CacheManager.get_key('trend', org_id)
        cache.set(key, data, CacheManager.CACHE_TIMEOUTS['trending'])
    
    @staticmethod
    def invalidate_trending(org_id):
        """Invalidate trending cache"""
        key = CacheManager.get_key('trend', org_id)
        cache.delete(key)
    
    @staticmethod
    def get_user_prefs(user_id):
        """Get cached user preferences"""
        key = CacheManager.get_key('prefs', user_id)
        return cache.get(key)
    
    @staticmethod
    def set_user_prefs(user_id, data):
        """Cache user preferences"""
        key = CacheManager.get_key('prefs', user_id)
        cache.set(key, data, CacheManager.CACHE_TIMEOUTS['user_prefs'])
    
    @staticmethod
    def invalidate_user_prefs(user_id):
        """Invalidate user preferences cache"""
        key = CacheManager.get_key('prefs', user_id)
        cache.delete(key)
    
    @staticmethod
    def get_search(query_hash, org_id):
        """Get cached search results"""
        key = CacheManager.get_key('search', org_id, query_hash)
        return cache.get(key)
    
    @staticmethod
    def set_search(query_hash, org_id, data):
        """Cache search results"""
        key = CacheManager.get_key('search', org_id, query_hash)
        cache.set(key, data, CacheManager.CACHE_TIMEOUTS['search'])
    
    @staticmethod
    def get_analytics(metric_name, org_id):
        """Get cached analytics"""
        key = CacheManager.get_key('analytics', org_id, metric_name)
        return cache.get(key)
    
    @staticmethod
    def set_analytics(metric_name, org_id, data):
        """Cache analytics"""
        key = CacheManager.get_key('analytics', org_id, metric_name)
        cache.set(key, data, CacheManager.CACHE_TIMEOUTS['analytics'])
    
    @staticmethod
    def clear_org_cache(org_id):
        """Clear all cache for organization"""
        patterns = ['conv', 'dec', 'trend', 'search', 'analytics']
        for pattern in patterns:
            key = CacheManager.get_key(pattern, org_id, '*')
            cache.delete_pattern(key)


def cache_result(cache_type='conversation', timeout=None):
    """Decorator to cache function results"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            timeout_val = timeout or CacheManager.CACHE_TIMEOUTS.get(cache_type, 3600)
            
            # Generate cache key from function args
            key_parts = [func.__name__] + [str(arg) for arg in args]
            key_str = ':'.join(key_parts)
            cache_key = hashlib.md5(key_str.encode()).hexdigest()
            
            # Try to get from cache
            result = cache.get(cache_key)
            if result is not None:
                return result
            
            # Execute function and cache result
            result = func(*args, **kwargs)
            cache.set(cache_key, result, timeout_val)
            return result
        
        return wrapper
    return decorator
