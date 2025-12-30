from django.db import models
from django.utils import timezone
from apps.organizations.models import User, Organization
from apps.conversations.models import Conversation

class Sprint(models.Model):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, db_index=True)
    name = models.CharField(max_length=100)
    start_date = models.DateField()
    end_date = models.DateField()
    goal = models.TextField(blank=True)
    
    # Auto-generated summary
    summary = models.TextField(blank=True)
    completed_count = models.IntegerField(default=0)
    blocked_count = models.IntegerField(default=0)
    decisions_made = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'sprints'
        ordering = ['-start_date']
        indexes = [
            models.Index(fields=['organization', '-start_date']),
        ]

class Blocker(models.Model):
    BLOCKER_TYPES = [
        ('technical', 'Technical'),
        ('dependency', 'Dependency'),
        ('decision', 'Decision Needed'),
        ('resource', 'Resource'),
        ('external', 'External'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('resolved', 'Resolved'),
        ('escalated', 'Escalated'),
    ]
    
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, db_index=True)
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='blockers')
    sprint = models.ForeignKey(Sprint, on_delete=models.SET_NULL, null=True, blank=True, related_name='blockers')
    
    title = models.CharField(max_length=255)
    description = models.TextField()
    blocker_type = models.CharField(max_length=20, choices=BLOCKER_TYPES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active', db_index=True)
    
    blocked_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='blockers_reported')
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='blockers_assigned')
    
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    
    # External ticket linking
    ticket_url = models.URLField(blank=True)
    ticket_id = models.CharField(max_length=50, blank=True)
    
    class Meta:
        db_table = 'blockers'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['organization', 'status', '-created_at']),
        ]

class Retrospective(models.Model):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, db_index=True)
    sprint = models.ForeignKey(Sprint, on_delete=models.CASCADE, related_name='retrospectives')
    
    what_went_well = models.JSONField(default=list)
    what_needs_improvement = models.JSONField(default=list)
    action_items = models.JSONField(default=list)
    
    # AI-detected patterns
    recurring_issues = models.JSONField(default=list)
    positive_trends = models.JSONField(default=list)
    
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    
    class Meta:
        db_table = 'retrospectives'
        ordering = ['-created_at']
