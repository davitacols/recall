from .models import Notification
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

def dispatch_in_app_notification(notification):
    """Push a newly-created notification to the user's websocket channel."""
    try:
        channel_layer = get_channel_layer()
        if not channel_layer:
            return
        async_to_sync(channel_layer.group_send)(
            f'notifications_{notification.user_id}',
            {
                'type': 'notification_message',
                'message': {
                    'type': 'notification',
                    'notification': {
                        'id': notification.id,
                        'type': notification.notification_type,
                        'title': notification.title,
                        'message': notification.message,
                        'link': notification.link,
                        'is_read': notification.is_read,
                        'created_at': notification.created_at.isoformat(),
                    }
                }
            }
        )
    except Exception as e:
        print(f"Failed to send WebSocket notification: {e}")

def dispatch_email_notification(notification):
    """Queue email delivery for a newly-created notification."""
    try:
        from .tasks import send_notification_email
        from django.conf import settings
        if settings.DEBUG or not hasattr(settings, 'CELERY_BROKER_URL'):
            send_notification_email(notification.id)
        else:
            send_notification_email.delay(notification.id)
    except Exception as e:
        print(f"Failed to send email notification: {e}")

def dispatch_notification(notification):
    """Dispatch both in-app and email channels for a notification."""
    dispatch_in_app_notification(notification)
    dispatch_email_notification(notification)

def create_notification(user, notification_type, title, message, link=''):
    """
    Canonical helper for creating notifications.
    Delivery is handled by post-save signals so all creation paths behave consistently.
    """
    notification = Notification.objects.create(
        user=user,
        notification_type=notification_type,
        title=title,
        message=message,
        link=link
    )
    return notification
