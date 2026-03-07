from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from html import escape
from .models import Notification
from .email_service import (
    send_notification_email as send_notification_email_via_resend,
    send_email,
    build_frontend_url,
    render_email_template,
    build_text_email,
)
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

    try:
        from apps.organizations.automation_engine import SmartNotificationEngine
        batched_items = SmartNotificationEngine.batch_notifications(user, filtered, batch_size=5)
    except Exception:
        batched_items = filtered

    preview = batched_items[:12]
    subject = f"Knoledgr {frequency.capitalize()} digest ({len(filtered)} updates)"
    body_items = []
    text_lines = [
        f"You have {len(filtered)} new updates in the last {frequency} window.",
        "",
    ]
    for item in preview:
        if isinstance(item, dict) and item.get('type') == 'batch':
            batch_count = int(item.get('count') or 0)
            summary = item.get('summary') or f'You have {batch_count} new updates'
            batch_children = item.get('items') or []
            body_items.append(
                "<li style=\"margin:0 0 12px 0;\">"
                f"<div style=\"font-weight:700;\">{escape(summary)}</div>"
                f"<div style=\"font-size:13px;color:#6c5a49;\">Grouped to reduce notification noise.</div>"
                "</li>"
            )
            text_lines.append(f"- {summary}")
            for child in batch_children[:3]:
                child_link = build_frontend_url(getattr(child, 'link', '') or '/notifications')
                text_lines.append(f"  - {child.title}: {child.message}")
                text_lines.append(f"    Open: {child_link}")
            continue

        item_link = build_frontend_url(item.link or '/notifications')
        body_items.append(
            "<li style=\"margin:0 0 10px 0;\">"
            f"<div style=\"font-weight:700;\">{escape(item.title)}</div>"
            f"<div style=\"margin:4px 0 6px 0;\">{escape(item.message)}</div>"
            f"<a href=\"{escape(item_link)}\" style=\"font-size:13px;\">Open update</a>"
            "</li>"
        )
        text_lines.append(f"- {item.title}: {item.message}")
        text_lines.append(f"  Open: {item_link}")

    digest_url = build_frontend_url('/notifications')
    html_body = (
        f"<p>You have {len(filtered)} new updates in the last {frequency} window.</p>"
        "<ul style=\"padding-left:18px;\">"
        + "".join(body_items)
        + "</ul>"
    )

    html = render_email_template(
        preheader=f"{len(filtered)} updates in your {frequency} digest",
        title=f"Your {frequency.capitalize()} digest",
        body_html=html_body,
        cta_label='Open notifications',
        cta_url=digest_url,
        reason_text='You received this email because digest notifications are enabled in your Knoledgr account.',
        variant='digest',
    )
    text = build_text_email(
        title=f"{frequency.capitalize()} digest",
        body_lines=text_lines,
        cta_label='Open notifications',
        cta_url=digest_url,
        reason_text='You received this email because digest notifications are enabled in your Knoledgr account.',
    )

    send_email(user.email, subject, html, text_content=text)


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
