from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.db import connection
from django.conf import settings
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
import redis
import re
from urllib.parse import urlparse

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


def _extract_email_address(value):
    if not value:
        return ''
    match = re.search(r'<([^>]+)>', value)
    if match:
        return match.group(1).strip().lower()
    return str(value).strip().lower()


def _extract_domain(email_or_host):
    if not email_or_host:
        return ''
    if '@' in email_or_host:
        return email_or_host.split('@', 1)[1].strip().lower()
    return str(email_or_host).strip().lower()


def _base_domain(host):
    if not host:
        return ''
    parts = host.split('.')
    if len(parts) <= 2:
        return host
    second_level_suffixes = {'co.uk', 'org.uk', 'gov.uk', 'com.au', 'co.nz', 'com.ng', 'com.br'}
    last_two = '.'.join(parts[-2:])
    last_three = '.'.join(parts[-3:])
    if last_two in second_level_suffixes and len(parts) >= 3:
        return last_three
    return last_two


@csrf_exempt
def email_deliverability_health_check(request):
    default_from_raw = getattr(settings, 'DEFAULT_FROM_EMAIL', '') or ''
    support_email_raw = getattr(settings, 'SUPPORT_EMAIL', '') or ''
    frontend_url = getattr(settings, 'FRONTEND_URL', '') or ''

    default_from_email = _extract_email_address(default_from_raw)
    support_email = _extract_email_address(support_email_raw)
    frontend_host = (urlparse(frontend_url).hostname or '').lower()

    sender_domain = _extract_domain(default_from_email)
    support_domain = _extract_domain(support_email)
    frontend_domain = _base_domain(frontend_host)
    sender_base_domain = _base_domain(sender_domain)
    support_base_domain = _base_domain(support_domain)

    warnings = []
    checks = {
        'default_from_configured': bool(default_from_email),
        'support_email_configured': bool(support_email),
        'frontend_url_configured': bool(frontend_host),
        'sender_domain_not_resend_default': sender_domain != 'resend.dev',
        'sender_frontend_domain_aligned': bool(sender_base_domain and frontend_domain and sender_base_domain == frontend_domain),
        'support_sender_domain_aligned': bool(support_base_domain and sender_base_domain and support_base_domain == sender_base_domain),
    }

    if not checks['default_from_configured']:
        warnings.append('DEFAULT_FROM_EMAIL is not configured.')
    if checks['default_from_configured'] and not checks['sender_domain_not_resend_default']:
        warnings.append('DEFAULT_FROM_EMAIL is using resend.dev; use your verified domain.')
    if not checks['support_email_configured']:
        warnings.append('SUPPORT_EMAIL is not configured.')
    if not checks['frontend_url_configured']:
        warnings.append('FRONTEND_URL is not configured.')
    if checks['frontend_url_configured'] and checks['default_from_configured'] and not checks['sender_frontend_domain_aligned']:
        warnings.append('Sender domain and FRONTEND_URL domain are not aligned.')
    if checks['support_email_configured'] and checks['default_from_configured'] and not checks['support_sender_domain_aligned']:
        warnings.append('SUPPORT_EMAIL domain should match sender domain.')

    status = 'healthy' if not warnings else 'degraded'
    response = {
        'status': status,
        'checks': checks,
        'domains': {
            'sender_domain': sender_domain,
            'sender_base_domain': sender_base_domain,
            'support_domain': support_domain,
            'support_base_domain': support_base_domain,
            'frontend_host': frontend_host,
            'frontend_base_domain': frontend_domain,
        },
        'warnings': warnings,
    }
    return JsonResponse(response, status=200)
