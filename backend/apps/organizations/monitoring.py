from django.http import JsonResponse
from django.db import connection
from django.core.cache import cache
from django.conf import settings
import time
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class HealthCheck:
    """System health checks"""
    
    @staticmethod
    def check_database():
        """Check database connectivity"""
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            return {'status': 'healthy', 'response_time': 0}
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return {'status': 'unhealthy', 'error': str(e)}
    
    @staticmethod
    def check_cache():
        """Check cache connectivity"""
        try:
            cache.set('health_check', 'ok', 10)
            value = cache.get('health_check')
            if value == 'ok':
                return {'status': 'healthy'}
            return {'status': 'unhealthy', 'error': 'Cache value mismatch'}
        except Exception as e:
            logger.error(f"Cache health check failed: {e}")
            return {'status': 'unhealthy', 'error': str(e)}
    
    @staticmethod
    def get_full_health():
        """Get full system health"""
        return {
            'timestamp': datetime.now().isoformat(),
            'database': HealthCheck.check_database(),
            'cache': HealthCheck.check_cache(),
            'version': settings.VERSION if hasattr(settings, 'VERSION') else '1.0.0',
        }


def health_check_view(request):
    """Health check endpoint"""
    health = HealthCheck.get_full_health()
    status_code = 200 if all(
        check.get('status') == 'healthy' 
        for check in [health['database'], health['cache']]
    ) else 503
    return JsonResponse(health, status=status_code)


class PerformanceMonitor:
    """Monitor API performance"""
    
    @staticmethod
    def log_request(request, response, duration):
        """Log request performance"""
        logger.info(
            f"API Request: {request.method} {request.path} - "
            f"Status: {response.status_code} - Duration: {duration:.2f}ms"
        )
    
    @staticmethod
    def get_slow_queries(threshold_ms=100):
        """Get slow database queries"""
        from django.db import connection
        from django.test.utils import CaptureQueriesContext
        
        slow_queries = []
        for query in connection.queries:
            time_ms = float(query['time']) * 1000
            if time_ms > threshold_ms:
                slow_queries.append({
                    'sql': query['sql'][:200],
                    'time_ms': time_ms
                })
        return slow_queries


class AlertingRules:
    """Define alerting rules"""
    
    RULES = {
        'high_error_rate': {
            'threshold': 0.05,  # 5% error rate
            'window': 300,  # 5 minutes
            'severity': 'critical'
        },
        'slow_response_time': {
            'threshold': 1000,  # 1 second
            'window': 300,
            'severity': 'warning'
        },
        'cache_miss_rate': {
            'threshold': 0.3,  # 30% miss rate
            'window': 300,
            'severity': 'warning'
        },
        'database_connection_pool_exhausted': {
            'threshold': 0.9,  # 90% utilization
            'window': 60,
            'severity': 'critical'
        },
    }
    
    @staticmethod
    def check_alerts():
        """Check if any alerts should be triggered"""
        alerts = []
        
        # Check error rate
        error_rate = PerformanceMonitor.get_error_rate()
        if error_rate > AlertingRules.RULES['high_error_rate']['threshold']:
            alerts.append({
                'rule': 'high_error_rate',
                'value': error_rate,
                'severity': 'critical'
            })
        
        return alerts


class Metrics:
    """Collect system metrics"""
    
    @staticmethod
    def get_request_count(org_id=None):
        """Get request count"""
        from apps.organizations.audit_models import DataAccessLog
        
        query = DataAccessLog.objects.all()
        if org_id:
            query = query.filter(organization_id=org_id)
        return query.count()
    
    @staticmethod
    def get_active_users(org_id=None):
        """Get active users in last 24 hours"""
        from apps.organizations.audit_models import DataAccessLog
        from django.utils import timezone
        from datetime import timedelta
        
        cutoff = timezone.now() - timedelta(hours=24)
        query = DataAccessLog.objects.filter(timestamp__gte=cutoff)
        if org_id:
            query = query.filter(organization_id=org_id)
        return query.values('user').distinct().count()
    
    @staticmethod
    def get_api_latency():
        """Get average API latency"""
        from django.db import connection
        
        total_time = sum(float(q['time']) for q in connection.queries)
        avg_time = total_time / len(connection.queries) if connection.queries else 0
        return avg_time * 1000  # Convert to ms
