from celery import shared_task
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from .models import Notification
from .email_service import send_notification_email as send_notification_email_via_resend, send_email
from apps.organizations.models import User


def _notification_allowed_for_user(notification, user):
    if notification.notification_type == 'mention' and not getattr(user, 'mention_notifications', True):
        return False
    if notification.notification_type == 'reply' and not getattr(user, 'reply_notifications', True):
        return False
    if notification.notification_type == 'decision' and not getattr(user, 'decision_notifications', True):
        return False
    if notification.notification_type == 'task' and not getattr(user, 'task_notifications', True):
        return False
    if notification.notification_type == 'goal' and not getattr(user, 'goal_notifications', True):
        return False
    if notification.notification_type == 'meeting' and not getattr(user, 'meeting_notifications', True):
        return False
    return True

@shared_task
def send_notification_email(notification_id):
    """Send email for a notification"""
    try:
        notification = Notification.objects.get(id=notification_id)
        user = notification.user

        if not user.email:
            return
        
        # Check if user has email notifications enabled
        if not user.email_notifications:
            return

        digest_frequency = getattr(user, 'digest_frequency', 'daily')
        if digest_frequency == 'never':
            return

        # Realtime sends immediately. Hourly/daily/weekly are sent by digest tasks.
        if digest_frequency not in {'realtime', ''}:
            return

        if not _notification_allowed_for_user(notification, user):
            return

        send_notification_email_via_resend(user, notification)
    except Notification.DoesNotExist:
        pass
    except Exception as e:
        print(f"Failed to send email: {e}")


@shared_task
def send_notification_digest(user_id, frequency='daily'):
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return

    if not user.email or not getattr(user, 'email_notifications', True):
        return

    digest_frequency = getattr(user, 'digest_frequency', 'daily')
    if digest_frequency != frequency:
        return

    now = timezone.now()
    window = {
        'hourly': timedelta(hours=1),
        'daily': timedelta(days=1),
        'weekly': timedelta(days=7),
    }.get(frequency, timedelta(days=1))

    notifications = Notification.objects.filter(
        user=user,
        created_at__gte=now - window,
        created_at__lte=now,
    ).order_by('-created_at')

    filtered = [n for n in notifications if _notification_allowed_for_user(n, user)]
    if not filtered:
        return

    preview = filtered[:12]
    subject = f"Knoledgr {frequency.capitalize()} digest ({len(filtered)} updates)"
    body_lines = []
    for item in preview:
        body_lines.append(
            f"<li><strong>{item.title}</strong><br/>{item.message}</li>"
        )

    html = (
        "<h2>Knoledgr digest</h2>"
        f"<p>You have {len(filtered)} new updates in the last {frequency} window.</p>"
        "<ul>"
        + "".join(body_lines)
        + "</ul>"
        f"<p><a href=\"{(getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')).rstrip('/')}/notifications\">Open notifications</a></p>"
    )

    send_email(user.email, subject, html)


@shared_task
def send_hourly_digests():
    for user_id in User.objects.filter(
        is_active=True,
        email_notifications=True,
        digest_frequency='hourly',
    ).values_list('id', flat=True):
        send_notification_digest(user_id, 'hourly')


@shared_task
def send_daily_digests():
    for user_id in User.objects.filter(
        is_active=True,
        email_notifications=True,
        digest_frequency='daily',
    ).values_list('id', flat=True):
        send_notification_digest(user_id, 'daily')


@shared_task
def send_weekly_digests():
    for user_id in User.objects.filter(
        is_active=True,
        email_notifications=True,
        digest_frequency='weekly',
    ).values_list('id', flat=True):
        send_notification_digest(user_id, 'weekly')
