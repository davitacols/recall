from .models import Notification
from .tasks import send_notification_email
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

def create_notification(user, notification_type, title, message, link=''):
    notification = Notification.objects.create(
        user=user,
        notification_type=notification_type,
        title=title,
        message=message,
        link=link
    )
    
    # Send via WebSocket
    try:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'notifications_{user.id}',
            {
                'type': 'send_notification',
                'notification_id': notification.id,
                'message': message,
                'notification_type': notification_type,
                'timestamp': notification.created_at.isoformat()
            }
        )
    except Exception as e:
        print(f"Failed to send WebSocket notification: {e}")
    
    # Send email notification
    try:
        from django.conf import settings
        if settings.DEBUG or not hasattr(settings, 'CELERY_BROKER_URL'):
            send_notification_email(notification.id)
        else:
            send_notification_email.delay(notification.id)
    except Exception as e:
        print(f"Failed to send email notification: {e}")
    
    return notification
