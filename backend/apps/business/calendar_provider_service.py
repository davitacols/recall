from datetime import timedelta

import requests
from django.conf import settings
from django.utils import timezone
from django.utils.dateparse import parse_datetime


def _to_iso(value):
    if timezone.is_naive(value):
        value = timezone.make_aware(value)
    return value.isoformat()


def _parse_external_datetime(value):
    dt = parse_datetime(value) if isinstance(value, str) else None
    if not dt:
        return None
    if timezone.is_naive(dt):
        return timezone.make_aware(dt)
    return dt


def _refresh_google_token(connection):
    metadata = connection.metadata or {}
    refresh_token = metadata.get('refresh_token')
    client_id = metadata.get('client_id') or getattr(settings, 'GOOGLE_CLIENT_ID', '')
    client_secret = metadata.get('client_secret') or getattr(settings, 'GOOGLE_CLIENT_SECRET', '')
    if not (refresh_token and client_id and client_secret):
        return None

    response = requests.post(
        'https://oauth2.googleapis.com/token',
        data={
            'client_id': client_id,
            'client_secret': client_secret,
            'refresh_token': refresh_token,
            'grant_type': 'refresh_token',
        },
        timeout=15,
    )
    if not response.ok:
        return None

    payload = response.json()
    access_token = payload.get('access_token')
    expires_in = int(payload.get('expires_in') or 0)
    if not access_token:
        return None

    metadata['access_token'] = access_token
    if expires_in > 0:
        metadata['expires_at'] = (timezone.now() + timedelta(seconds=expires_in)).isoformat()
    connection.metadata = metadata
    connection.last_synced_at = timezone.now()
    connection.save(update_fields=['metadata', 'last_synced_at', 'updated_at'])
    return access_token


def _refresh_outlook_token(connection):
    metadata = connection.metadata or {}
    refresh_token = metadata.get('refresh_token')
    client_id = metadata.get('client_id') or getattr(settings, 'MICROSOFT_CLIENT_ID', '')
    client_secret = metadata.get('client_secret') or getattr(settings, 'MICROSOFT_CLIENT_SECRET', '')
    tenant = metadata.get('tenant_id') or getattr(settings, 'MICROSOFT_TENANT_ID', 'common')
    if not (refresh_token and client_id and client_secret):
        return None

    token_url = f'https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token'
    response = requests.post(
        token_url,
        data={
            'client_id': client_id,
            'client_secret': client_secret,
            'refresh_token': refresh_token,
            'grant_type': 'refresh_token',
            'scope': 'https://graph.microsoft.com/.default offline_access',
        },
        timeout=15,
    )
    if not response.ok:
        return None

    payload = response.json()
    access_token = payload.get('access_token')
    expires_in = int(payload.get('expires_in') or 0)
    if not access_token:
        return None

    metadata['access_token'] = access_token
    if expires_in > 0:
        metadata['expires_at'] = (timezone.now() + timedelta(seconds=expires_in)).isoformat()
    connection.metadata = metadata
    connection.last_synced_at = timezone.now()
    connection.save(update_fields=['metadata', 'last_synced_at', 'updated_at'])
    return access_token


def _google_free_busy(connection, start_dt, end_dt):
    metadata = connection.metadata or {}
    access_token = metadata.get('access_token')
    calendar_id = connection.external_calendar_id or metadata.get('calendar_id') or 'primary'
    if not access_token:
        return []

    def _request(token):
        return requests.post(
            'https://www.googleapis.com/calendar/v3/freeBusy',
            headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'},
            json={
                'timeMin': _to_iso(start_dt),
                'timeMax': _to_iso(end_dt),
                'items': [{'id': calendar_id}],
            },
            timeout=20,
        )

    response = _request(access_token)
    if response.status_code == 401:
        refreshed = _refresh_google_token(connection)
        if refreshed:
            response = _request(refreshed)
    if not response.ok:
        return []

    payload = response.json()
    calendars = payload.get('calendars') or {}
    calendar_info = calendars.get(calendar_id) or next(iter(calendars.values()), {})
    busy_windows = calendar_info.get('busy') or []

    rows = []
    for item in busy_windows:
        start = _parse_external_datetime(item.get('start'))
        end = _parse_external_datetime(item.get('end'))
        if start and end and end > start:
            rows.append((start, end))
    return rows


def _outlook_free_busy(connection, start_dt, end_dt):
    metadata = connection.metadata or {}
    access_token = metadata.get('access_token')
    if not access_token:
        return []

    def _request(token):
        return requests.get(
            'https://graph.microsoft.com/v1.0/me/calendarView',
            headers={'Authorization': f'Bearer {token}'},
            params={
                'startDateTime': _to_iso(start_dt),
                'endDateTime': _to_iso(end_dt),
                '$select': 'start,end,showAs',
            },
            timeout=20,
        )

    response = _request(access_token)
    if response.status_code == 401:
        refreshed = _refresh_outlook_token(connection)
        if refreshed:
            response = _request(refreshed)
    if not response.ok:
        return []

    payload = response.json()
    events = payload.get('value') or []
    rows = []
    for event in events:
        start_raw = ((event.get('start') or {}).get('dateTime') or '').strip()
        end_raw = ((event.get('end') or {}).get('dateTime') or '').strip()
        start = _parse_external_datetime(start_raw)
        end = _parse_external_datetime(end_raw)
        if start and end and end > start:
            rows.append((start, end))
    return rows


def fetch_external_busy_windows(connection, start_dt, end_dt):
    provider = (connection.provider or '').lower()
    if provider == 'google':
        return _google_free_busy(connection, start_dt, end_dt)
    if provider == 'outlook':
        return _outlook_free_busy(connection, start_dt, end_dt)
    return []
