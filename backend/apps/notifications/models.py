from django.db import models
from apps.organizations.models import User

class Notification(models.Model):
    NOTIFICATION_TYPES = [
        ('mention', 'Mentioned'),
        ('reply', 'Reply'),
        ('decision', 'Decision'),
        ('reminder', 'Reminder'),
        ('badge', 'Badge Earned'),
        ('system', 'System'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    title = models.CharField(max_length=255)
    message = models.TextField()
    link = models.CharField(max_length=255, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    
    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read', '-created_at']),
        ]
