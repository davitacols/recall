from .models import Notification
from .tasks import send_notification_email

def create_notification(user, notification_type, title, message, link=''):
    notification = Notification.objects.create(
        user=user,
        notification_type=notification_type,
        title=title,
        message=message,
        link=link
    )
    
    # Send email notification asynchronously
    send_notification_email.delay(notification.id)
    
    return notification
