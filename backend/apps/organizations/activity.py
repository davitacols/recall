from django.db import models
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey
from apps.organizations.models import User, Organization

class Activity(models.Model):
    ACTION_TYPES = [
        ('conversation_created', 'Created Conversation'),
        ('conversation_replied', 'Replied to Conversation'),
        ('decision_created', 'Created Decision'),
        ('decision_approved', 'Approved Decision'),
        ('decision_implemented', 'Implemented Decision'),
        ('user_joined', 'Joined Organization'),
    ]
    
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, db_index=True)
    actor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='activities', db_index=True)
    action_type = models.CharField(max_length=50, choices=ACTION_TYPES, db_index=True)
    
    # Generic relation to any model
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE, null=True)
    object_id = models.PositiveIntegerField(null=True)
    content_object = GenericForeignKey('content_type', 'object_id')
    
    # Activity metadata
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    
    class Meta:
        db_table = 'activities'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['organization', '-created_at']),
            models.Index(fields=['actor', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.actor.get_full_name()} - {self.get_action_type_display()}"

def log_activity(organization, actor, action_type, content_object=None, **metadata):
    """Helper function to log activities"""
    return Activity.objects.create(
        organization=organization,
        actor=actor,
        action_type=action_type,
        content_object=content_object,
        metadata=metadata
    )
