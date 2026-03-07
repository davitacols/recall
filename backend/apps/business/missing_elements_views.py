from datetime import datetime, timedelta, time as dt_time

import requests
from urllib.parse import urlencode
from django.conf import settings
from django.core import signing
from django.shortcuts import get_object_or_404, redirect
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status

from apps.conversations.models import Reaction
from apps.organizations.models import User
from .models import CalendarConnection, JourneyMap, Meeting, Task
from .calendar_provider_service import fetch_external_busy_windows


def _iso_or_none(value):
    return value.isoformat() if value else None


def _ensure_aware(value):
    if value and timezone.is_naive(value):
        return timezone.make_aware(value)
    return value


def _working_window(day):
    start = timezone.make_aware(datetime.combine(day, dt_time(hour=9)))
    end = timezone.make_aware(datetime.combine(day, dt_time(hour=17)))
    return start, end


def _busy_windows_for_user(user, start_dt, end_dt):
    meetings = Meeting.objects.filter(
        organization=user.organization,
        attendees=user,
        meeting_date__lt=end_dt,
        meeting_date__gte=start_dt - timedelta(days=1),
    ).order_by('meeting_date')

    busy = []
    for meeting in meetings:
        meeting_start = meeting.meeting_date
        meeting_end = meeting_start + timedelta(minutes=max(15, meeting.duration_minutes or 60))
        if meeting_end <= start_dt or meeting_start >= end_dt:
            continue
        busy.append((meeting_start, meeting_end))
    return busy


def _find_slot(user, duration_minutes, start_dt, end_dt):
    duration = timedelta(minutes=max(15, duration_minutes))
    busy = _busy_windows_for_user(user, start_dt, end_dt)

    days_to_check = (end_dt.date() - start_dt.date()).days + 1
    for day_offset in range(max(1, days_to_check)):
        day = start_dt.date() + timedelta(days=day_offset)
        if day.weekday() >= 5:
            continue

        day_start, day_end = _working_window(day)
        cursor = max(day_start, start_dt)
        hard_end = min(day_end, end_dt)
        if cursor >= hard_end:
            continue

        day_busy = [(s, e) for s, e in busy if e > cursor and s < hard_end]
        day_busy.sort(key=lambda x: x[0])

        for busy_start, busy_end in day_busy:
            if cursor + duration <= busy_start:
                return cursor, cursor + duration
            cursor = max(cursor, busy_end)
            if cursor >= hard_end:
                break

        if cursor + duration <= hard_end:
            return cursor, cursor + duration

    return None, None


def _normalize_next_path(raw_value):
    raw = str(raw_value or '').strip()
    if not raw.startswith('/'):
        return '/business/calendar'
    if raw.startswith('//'):
        return '/business/calendar'
    return raw


def _calendar_oauth_state(user_id, provider, next_path):
    payload = {'user_id': user_id, 'provider': provider, 'next': _normalize_next_path(next_path)}
    return signing.dumps(payload, salt='business-calendar-oauth-v1')


def _calendar_callback_url(request):
    configured = str(getattr(settings, 'CALENDAR_OAUTH_REDIRECT_URI', '') or '').strip()
    if configured:
        return configured
    return request.build_absolute_uri('/api/business/calendar/oauth/callback/')


def _calendar_frontend_redirect(next_path, **params):
    query = urlencode(params)
    target = f"{settings.FRONTEND_URL.rstrip('/')}{_normalize_next_path(next_path)}"
    if query:
        return f"{target}?{query}"
    return target


def _exchange_google_code(code, redirect_uri):
    response = requests.post(
        'https://oauth2.googleapis.com/token',
        data={
            'code': code,
            'client_id': getattr(settings, 'GOOGLE_CLIENT_ID', ''),
            'client_secret': getattr(settings, 'GOOGLE_CLIENT_SECRET', ''),
            'redirect_uri': redirect_uri,
            'grant_type': 'authorization_code',
        },
        timeout=20,
    )
    if not response.ok:
        return None
    payload = response.json()
    if not payload.get('access_token'):
        return None
    return payload


def _exchange_outlook_code(code, redirect_uri):
    tenant = getattr(settings, 'MICROSOFT_TENANT_ID', 'common')
    response = requests.post(
        f'https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token',
        data={
            'client_id': getattr(settings, 'MICROSOFT_CLIENT_ID', ''),
            'client_secret': getattr(settings, 'MICROSOFT_CLIENT_SECRET', ''),
            'code': code,
            'redirect_uri': redirect_uri,
            'grant_type': 'authorization_code',
            'scope': 'offline_access Calendars.Read User.Read',
        },
        timeout=20,
    )
    if not response.ok:
        return None
    payload = response.json()
    if not payload.get('access_token'):
        return None
    return payload


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def journey_maps(request):
    org = request.user.organization
    if request.method == 'GET':
        maps = JourneyMap.objects.filter(organization=org)
        return Response([
            {
                'id': item.id,
                'title': item.title,
                'objective': item.objective,
                'map_data': item.map_data,
                'created_by': item.created_by_id,
                'created_at': item.created_at,
                'updated_at': item.updated_at,
            }
            for item in maps
        ])

    title = (request.data.get('title') or '').strip()
    if not title:
        return Response({'error': 'title is required'}, status=status.HTTP_400_BAD_REQUEST)

    item = JourneyMap.objects.create(
        organization=org,
        title=title,
        objective=request.data.get('objective', ''),
        map_data=request.data.get('map_data', {}) or {},
        created_by=request.user,
    )
    return Response({'id': item.id}, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def journey_map_detail(request, map_id):
    item = get_object_or_404(JourneyMap, id=map_id, organization=request.user.organization)

    if request.method == 'GET':
        return Response({
            'id': item.id,
            'title': item.title,
            'objective': item.objective,
            'map_data': item.map_data,
            'created_by': item.created_by_id,
            'created_at': item.created_at,
            'updated_at': item.updated_at,
        })

    if request.method == 'PUT':
        item.title = request.data.get('title', item.title)
        item.objective = request.data.get('objective', item.objective)
        if 'map_data' in request.data:
            item.map_data = request.data.get('map_data') or {}
        item.save()
        return Response({'message': 'Journey map updated'})

    item.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def calendar_connections(request):
    org = request.user.organization
    user = request.user

    if request.method == 'GET':
        items = CalendarConnection.objects.filter(organization=org, user=user)
        return Response([
            {
                'id': item.id,
                'provider': item.provider,
                'is_connected': item.is_connected,
                'external_calendar_id': item.external_calendar_id,
                'metadata': item.metadata,
                'last_synced_at': item.last_synced_at,
            }
            for item in items
        ])

    provider = (request.data.get('provider') or '').strip().lower()
    if provider not in {'google', 'outlook', 'manual'}:
        return Response({'error': 'provider must be one of google, outlook, manual'}, status=400)

    existing = CalendarConnection.objects.filter(organization=org, user=user, provider=provider).first()
    metadata = request.data.get('metadata')
    if metadata is None:
        metadata = existing.metadata if existing else {}
    item, _ = CalendarConnection.objects.update_or_create(
        organization=org,
        user=user,
        provider=provider,
        defaults={
            'is_connected': bool(request.data.get('is_connected', True)),
            'external_calendar_id': request.data.get('external_calendar_id', ''),
            'metadata': metadata or {},
            'last_synced_at': timezone.now(),
        },
    )
    return Response({'id': item.id, 'message': 'Calendar connection saved'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def calendar_oauth_start(request):
    provider = (request.GET.get('provider') or '').strip().lower()
    if provider not in {'google', 'outlook'}:
        return Response({'error': 'provider must be google or outlook'}, status=400)

    callback_url = _calendar_callback_url(request)
    state = _calendar_oauth_state(
        user_id=request.user.id,
        provider=provider,
        next_path=request.GET.get('next') or '/business/calendar',
    )

    if provider == 'google':
        if not getattr(settings, 'GOOGLE_CLIENT_ID', ''):
            return Response({'error': 'GOOGLE_CLIENT_ID is not configured'}, status=503)
        authorize_params = {
            'client_id': getattr(settings, 'GOOGLE_CLIENT_ID', ''),
            'redirect_uri': callback_url,
            'response_type': 'code',
            'access_type': 'offline',
            'prompt': 'consent',
            'scope': 'https://www.googleapis.com/auth/calendar.readonly openid email profile',
            'state': state,
        }
        authorize_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(authorize_params)}"
    else:
        tenant = getattr(settings, 'MICROSOFT_TENANT_ID', 'common')
        if not getattr(settings, 'MICROSOFT_CLIENT_ID', ''):
            return Response({'error': 'MICROSOFT_CLIENT_ID is not configured'}, status=503)
        authorize_params = {
            'client_id': getattr(settings, 'MICROSOFT_CLIENT_ID', ''),
            'response_type': 'code',
            'redirect_uri': callback_url,
            'response_mode': 'query',
            'scope': 'offline_access Calendars.Read User.Read',
            'state': state,
        }
        authorize_url = f"https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize?{urlencode(authorize_params)}"

    return Response({'provider': provider, 'authorize_url': authorize_url})


@api_view(['GET'])
@permission_classes([AllowAny])
def calendar_oauth_callback(request):
    state = request.GET.get('state')
    code = request.GET.get('code')
    oauth_error = request.GET.get('error')
    if not state:
        return Response({'error': 'Missing state'}, status=400)
    try:
        state_payload = signing.loads(state, salt='business-calendar-oauth-v1', max_age=15 * 60)
    except Exception:
        return Response({'error': 'Invalid or expired OAuth state'}, status=400)

    next_path = _normalize_next_path(state_payload.get('next') or '/business/calendar')
    provider = str(state_payload.get('provider') or '').strip().lower()
    user = User.objects.filter(id=state_payload.get('user_id'), is_active=True).select_related('organization').first()
    if not user:
        return Response({'error': 'User not found for OAuth flow'}, status=400)

    if oauth_error:
        return redirect(_calendar_frontend_redirect(next_path, calendar_oauth='error', provider=provider, reason=oauth_error))
    if not code:
        return redirect(_calendar_frontend_redirect(next_path, calendar_oauth='error', provider=provider, reason='missing_code'))

    callback_url = _calendar_callback_url(request)
    if provider == 'google':
        token_payload = _exchange_google_code(code, callback_url)
    elif provider == 'outlook':
        token_payload = _exchange_outlook_code(code, callback_url)
    else:
        token_payload = None
    if not token_payload:
        return redirect(_calendar_frontend_redirect(next_path, calendar_oauth='error', provider=provider, reason='token_exchange_failed'))

    expires_in = int(token_payload.get('expires_in') or 0)
    metadata = {
        'access_token': token_payload.get('access_token'),
        'refresh_token': token_payload.get('refresh_token'),
        'token_type': token_payload.get('token_type', 'Bearer'),
        'scope': token_payload.get('scope', ''),
    }
    if expires_in > 0:
        metadata['expires_at'] = (timezone.now() + timedelta(seconds=expires_in)).isoformat()
    if provider == 'google':
        metadata['client_id'] = getattr(settings, 'GOOGLE_CLIENT_ID', '')
        metadata['client_secret'] = getattr(settings, 'GOOGLE_CLIENT_SECRET', '')
    if provider == 'outlook':
        metadata['client_id'] = getattr(settings, 'MICROSOFT_CLIENT_ID', '')
        metadata['client_secret'] = getattr(settings, 'MICROSOFT_CLIENT_SECRET', '')
        metadata['tenant_id'] = getattr(settings, 'MICROSOFT_TENANT_ID', 'common')

    connection, _ = CalendarConnection.objects.update_or_create(
        organization=user.organization,
        user=user,
        provider=provider,
        defaults={
            'is_connected': True,
            'metadata': metadata,
            'last_synced_at': timezone.now(),
        },
    )
    connection.last_synced_at = timezone.now()
    connection.save(update_fields=['last_synced_at', 'updated_at'])
    return redirect(_calendar_frontend_redirect(next_path, calendar_oauth='success', provider=provider))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def calendar_free_busy(request):
    org = request.user.organization
    user_id = request.GET.get('user_id')
    target_user = request.user
    if user_id:
        target_user = get_object_or_404(User, id=user_id, organization=org)

    start_dt = parse_datetime(request.GET.get('start')) if request.GET.get('start') else timezone.now()
    end_dt = parse_datetime(request.GET.get('end')) if request.GET.get('end') else (start_dt + timedelta(days=7))
    start_dt = _ensure_aware(start_dt)
    end_dt = _ensure_aware(end_dt)
    if not start_dt or not end_dt or start_dt >= end_dt:
        return Response({'error': 'Invalid start/end window'}, status=400)

    internal_busy = _busy_windows_for_user(target_user, start_dt, end_dt)
    external_busy = []

    requested_provider = (request.GET.get('provider') or '').strip().lower()
    connection_qs = CalendarConnection.objects.filter(
        organization=org,
        user=target_user,
        is_connected=True,
    )
    if requested_provider:
        connection_qs = connection_qs.filter(provider=requested_provider)
    connection = connection_qs.order_by('-updated_at').first()
    if connection:
        try:
            external_busy = fetch_external_busy_windows(connection, start_dt, end_dt)
        except Exception:
            external_busy = []

    all_busy = []
    all_busy.extend([(s, e, 'internal') for s, e in internal_busy])
    all_busy.extend([(s, e, 'external') for s, e in external_busy])
    all_busy.sort(key=lambda row: row[0])

    return Response({
        'user_id': target_user.id,
        'window': {'start': start_dt, 'end': end_dt},
        'provider_used': connection.provider if connection else None,
        'busy': [
            {'start': _iso_or_none(start), 'end': _iso_or_none(end), 'source': source}
            for start, end, source in all_busy
        ],
        'counts': {
            'internal': len(internal_busy),
            'external': len(external_busy),
            'total': len(all_busy),
        },
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def slot_task(request):
    org = request.user.organization
    task_id = request.data.get('task_id')
    if not task_id:
        return Response({'error': 'task_id is required'}, status=400)

    task = get_object_or_404(Task, id=task_id, organization=org)
    target_user = task.assigned_to or request.user

    duration_minutes = int(request.data.get('duration_minutes', 60) or 60)
    start_dt = parse_datetime(request.data.get('start')) if request.data.get('start') else timezone.now()
    end_dt = parse_datetime(request.data.get('end')) if request.data.get('end') else (start_dt + timedelta(days=7))
    start_dt = _ensure_aware(start_dt)
    end_dt = _ensure_aware(end_dt)
    if not start_dt or not end_dt or start_dt >= end_dt:
        return Response({'error': 'Invalid start/end window'}, status=400)

    slot_start, slot_end = _find_slot(
        user=target_user,
        duration_minutes=duration_minutes,
        start_dt=start_dt,
        end_dt=end_dt,
    )
    if not slot_start:
        return Response({
            'task_id': task.id,
            'assigned_to': target_user.id,
            'scheduled': False,
            'message': 'No available slot found in the requested window.',
        })

    return Response({
        'task_id': task.id,
        'assigned_to': target_user.id,
        'scheduled': True,
        'suggested_slot': {
            'start': slot_start,
            'end': slot_end,
            'duration_minutes': duration_minutes,
        },
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def burnout_risk(request):
    org = request.user.organization
    days = int(request.GET.get('days', 14) or 14)
    cutoff = timezone.now() - timedelta(days=days)

    users = User.objects.filter(organization=org, is_active=True).order_by('id')[:100]
    rows = []

    for user in users:
        assigned_open = Task.objects.filter(
            organization=org,
            assigned_to=user,
            status__in=['todo', 'in_progress'],
        ).count()
        overdue = Task.objects.filter(
            organization=org,
            assigned_to=user,
            status__in=['todo', 'in_progress'],
            due_date__lt=timezone.now().date(),
        ).count()
        meetings_hours = sum(
            max(15, m.duration_minutes or 60) for m in Meeting.objects.filter(
                organization=org,
                attendees=user,
                meeting_date__gte=cutoff,
            )
        ) / 60.0
        concern_reactions = Reaction.objects.filter(
            conversation__organization=org,
            user=user,
            reaction_type='concern',
            created_at__gte=cutoff,
        ).count()

        score = (
            min(40, assigned_open * 2)
            + min(25, overdue * 5)
            + min(20, int(meetings_hours))
            + min(15, concern_reactions * 3)
        )
        if score >= 65:
            level = 'high'
        elif score >= 40:
            level = 'medium'
        else:
            level = 'low'

        rows.append({
            'user_id': user.id,
            'name': user.get_full_name(),
            'risk_score': score,
            'risk_level': level,
            'signals': {
                'open_tasks': assigned_open,
                'overdue_tasks': overdue,
                'meeting_hours_last_period': round(meetings_hours, 1),
                'concern_reactions_last_period': concern_reactions,
            },
        })

    rows.sort(key=lambda item: item['risk_score'], reverse=True)
    return Response({
        'period_days': days,
        'users_evaluated': len(rows),
        'high_risk_count': len([r for r in rows if r['risk_level'] == 'high']),
        'results': rows,
    })
