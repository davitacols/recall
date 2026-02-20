from django.db import models
from django.utils import timezone

class AIReminder(models.Model):
    REMINDER_TYPES = [
        ('follow_up', 'Follow Up'),
        ('deadline', 'Deadline'),
        ('review', 'Review'),
        ('update', 'Update'),
    ]
    
    organization = models.ForeignKey('organizations.Organization', on_delete=models.CASCADE, related_name='ai_reminders')
    user = models.ForeignKey('organizations.User', on_delete=models.CASCADE, related_name='ai_reminders')
    
    reminder_type = models.CharField(max_length=20, choices=REMINDER_TYPES)
    title = models.CharField(max_length=200)
    description = models.TextField()
    
    # Link to related content
    conversation_id = models.IntegerField(null=True, blank=True)
    decision_id = models.IntegerField(null=True, blank=True)
    goal_id = models.IntegerField(null=True, blank=True)
    meeting_id = models.IntegerField(null=True, blank=True)
    
    remind_at = models.DateTimeField()
    is_sent = models.BooleanField(default=False)
    is_dismissed = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['remind_at']
    
    def __str__(self):
        return f"{self.title} - {self.remind_at}"
