from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.db import connection
from django.conf import settings
import redis

@csrf_exempt
def health_check(request):
    """System health check endpoint"""
    status = {
        'status': 'healthy',
        'components': {}
    }
    
    # Check database
    try:
        connection.ensure_connection()
        status['components']['database'] = 'ok'
    except Exception as e:
        status['components']['database'] = f'error: {str(e)}'
        status['status'] = 'unhealthy'
    
    # Check Redis
    try:
        r = redis.from_url(settings.CELERY_BROKER_URL)
        r.ping()
        status['components']['redis'] = 'ok'
    except Exception as e:
        status['components']['redis'] = f'error: {str(e)}'
        status['status'] = 'degraded'
    
    # Check AWS credentials
    if settings.AWS_ACCESS_KEY_ID:
        status['components']['aws'] = 'configured'
    else:
        status['components']['aws'] = 'not configured'
    
    # Check ChromaDB
    try:
        from apps.knowledge.search_engine import get_search_engine
        engine = get_search_engine()
        status['components']['chromadb'] = 'ok'
    except Exception as e:
        status['components']['chromadb'] = f'error: {str(e)}'
    
    return JsonResponse(status)
