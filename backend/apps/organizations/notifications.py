from django.db import models
from apps.organizations.models import User, Organization

class Notification(models.Model):
    NOTIFICATION_TYPES = [
        ('mention', 'Mentioned in conversation'),
        ('reply', 'Reply to your post'),
        ('decision_update', 'Decision status changed'),
        ('action_assigned', 'Action item assigned'),
        ('action_due', 'Action item due soon'),
        ('ai_summary', 'AI summary generated'),
    ]
    
    PRIORITY_LEVELS = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    title = models.CharField(max_length=255)
    message = models.TextField()
    priority = models.CharField(max_length=10, choices=PRIORITY_LEVELS, default='medium')
    
    # Link to related content
    related_url = models.CharField(max_length=500, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    
    # Status
    is_read = models.BooleanField(default=False, db_index=True)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    
    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read', '-created_at']),
        ]

class UserPreferences(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='preferences')
    
    # Notification preferences
    email_notifications = models.BooleanField(default=True)
    push_notifications = models.BooleanField(default=True)
    digest_frequency = models.CharField(max_length=10, choices=[
        ('never', 'Never'),
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
    ], default='weekly')
    
    # Feed preferences
    default_post_types = models.JSONField(default=list, blank=True)
    auto_follow_decisions = models.BooleanField(default=True)
    
    # AI preferences
    ai_summary_enabled = models.BooleanField(default=True)
    ai_action_extraction = models.BooleanField(default=True)
    
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'user_preferences'