from celery import shared_task
from .models import Notification
from .email_service import send_notification_email as send_notification_email_via_resend

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

        send_notification_email_via_resend(user, notification)
    except Notification.DoesNotExist:
        pass
    except Exception as e:
        print(f"Failed to send email: {e}")
