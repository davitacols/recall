from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Notification
from .utils import dispatch_notification


@receiver(post_save, sender=Notification)
def notification_created(sender, instance, created, raw, **kwargs):
    """
    Ensure every Notification created anywhere in the codebase triggers:
    1) in-app websocket delivery
    2) email delivery (respecting user preferences in task layer)
    """
    if raw or not created:
        return
    dispatch_notification(instance)
