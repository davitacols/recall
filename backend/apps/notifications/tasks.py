from celery import shared_task
import resend
from django.conf import settings
from .models import Notification

@shared_task
def send_notification_email(notification_id):
    """Send email for a notification"""
    try:
        notification = Notification.objects.get(id=notification_id)
        user = notification.user
        
        # Check if user has email notifications enabled
        if not user.email_notifications:
            return
        
        # Check notification type preferences
        if notification.notification_type == 'mention' and not user.mention_notifications:
            return
        if notification.notification_type == 'reply' and not user.reply_notifications:
            return
        if notification.notification_type == 'decision' and not user.decision_notifications:
            return
        if notification.notification_type == 'task' and not getattr(user, 'task_notifications', True):
            return
        if notification.notification_type == 'goal' and not getattr(user, 'goal_notifications', True):
            return
        if notification.notification_type == 'meeting' and not getattr(user, 'meeting_notifications', True):
            return
        
        # Configure Resend
        resend.api_key = settings.RESEND_API_KEY
        
        # Send email
        resend.Emails.send({
            "from": settings.DEFAULT_FROM_EMAIL,
            "to": user.email,
            "subject": f"Recall: {notification.title}",
            "html": f"""
                <h2>{notification.title}</h2>
                <p>{notification.message}</p>
                <p><a href="{settings.FRONTEND_URL}{notification.link}">View in Recall</a></p>
            """
        })
    except Notification.DoesNotExist:
        pass
    except Exception as e:
        print(f"Failed to send email: {e}")
