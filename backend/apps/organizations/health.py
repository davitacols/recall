from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.db import connection
from django.conf import settings
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
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


@csrf_exempt
def realtime_health_check(request):
    """Realtime health check for Channels/WebSocket dependencies."""
    status = {
        'status': 'healthy',
        'components': {},
    }

    try:
        channel_layer = get_channel_layer()
        if not channel_layer:
            raise RuntimeError('Channel layer not configured')

        channel_name = async_to_sync(channel_layer.new_channel)('health.')
        probe_message = {'type': 'health.ping', 'ok': True}
        async_to_sync(channel_layer.send)(channel_name, probe_message)
        received = async_to_sync(channel_layer.receive)(channel_name)

        status['components']['channel_layer'] = 'ok'
        status['components']['message_roundtrip'] = (
            'ok' if received and received.get('ok') is True else 'unexpected payload'
        )
    except Exception as e:
        status['components']['channel_layer'] = f'error: {str(e)}'
        status['status'] = 'unhealthy'

    try:
        status['components']['asgi_application'] = settings.ASGI_APPLICATION
    except Exception:
        status['components']['asgi_application'] = 'unknown'

    try:
        backend = settings.CHANNEL_LAYERS.get('default', {}).get('BACKEND', '')
        status['components']['channel_backend'] = backend
    except Exception:
        status['components']['channel_backend'] = 'unknown'

    http_status = 200 if status['status'] == 'healthy' else 503
    return JsonResponse(status, status=http_status)
