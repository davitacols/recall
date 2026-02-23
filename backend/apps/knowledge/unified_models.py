from django.db import models
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey
from apps.organizations.models import Organization, User

class ContentLink(models.Model):
    """Universal linking system connecting all content across modules"""
    LINK_TYPES = [
        ('references', 'References'),
        ('implements', 'Implements'),
        ('blocks', 'Blocks'),
        ('relates_to', 'Relates To'),
        ('supersedes', 'Supersedes'),
        ('derived_from', 'Derived From'),
    ]
    
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, db_index=True)
    
    # Source content
    source_content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE, related_name='links_from')
    source_object_id = models.PositiveIntegerField()
    source_object = GenericForeignKey('source_content_type', 'source_object_id')
    
    # Target content
    target_content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE, related_name='links_to')
    target_object_id = models.PositiveIntegerField()
    target_object = GenericForeignKey('target_content_type', 'target_object_id')
    
    link_type = models.CharField(max_length=20, choices=LINK_TYPES, default='relates_to')
    strength = models.FloatField(default=1.0)  # AI-calculated relevance (0-1)
    
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    is_auto_generated = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'content_links'
        indexes = [
            models.Index(fields=['source_content_type', 'source_object_id']),
            models.Index(fields=['target_content_type', 'target_object_id']),
            models.Index(fields=['organization', '-created_at']),
        ]
        unique_together = ['source_content_type', 'source_object_id', 'target_content_type', 'target_object_id']

class UnifiedActivity(models.Model):
    """Unified activity feed across all modules"""
    ACTIVITY_TYPES = [
        ('conversation_created', 'Conversation Created'),
        ('decision_made', 'Decision Made'),
        ('task_completed', 'Task Completed'),
        ('meeting_scheduled', 'Meeting Scheduled'),
        ('document_uploaded', 'Document Uploaded'),
        ('comment_added', 'Comment Added'),
        ('status_changed', 'Status Changed'),
    ]
    
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, db_index=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, db_index=True)
    activity_type = models.CharField(max_length=30, choices=ACTIVITY_TYPES, db_index=True)
    
    # Generic relation to any content
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id')
    
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    
    class Meta:
        db_table = 'unified_activities'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['organization', '-created_at']),
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['content_type', 'object_id']),
        ]

class ContextPanel(models.Model):
    """Pre-computed context for quick loading"""
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id')
    
    # Related content IDs by type
    related_conversations = models.JSONField(default=list)
    related_decisions = models.JSONField(default=list)
    related_tasks = models.JSONField(default=list)
    related_documents = models.JSONField(default=list)
    
    # Expert users
    expert_users = models.JSONField(default=list)  # [{user_id, relevance_score, reason}]
    
    # Historical context
    similar_past_items = models.JSONField(default=list)  # [{id, type, outcome, similarity}]
    success_rate = models.FloatField(null=True, blank=True)
    risk_indicators = models.JSONField(default=list)
    
    last_computed = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'context_panels'
        unique_together = ['content_type', 'object_id', 'organization']
        indexes = [
            models.Index(fields=['content_type', 'object_id']),
        ]
