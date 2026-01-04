from django.db import models
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey

User = get_user_model()

class AutomationRule(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('active', 'Active'),
        ('paused', 'Paused'),
        ('archived', 'Archived'),
    ]
    
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='automation_rules'
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    
    # Trigger configuration
    trigger_type = models.CharField(
        max_length=50,
        choices=[
            ('issue_created', 'Issue Created'),
            ('issue_updated', 'Issue Updated'),
            ('issue_assigned', 'Issue Assigned'),
            ('decision_created', 'Decision Created'),
            ('decision_locked', 'Decision Locked'),
            ('sprint_started', 'Sprint Started'),
            ('sprint_ended', 'Sprint Ended'),
            ('comment_added', 'Comment Added'),
            ('mention_added', 'Mention Added'),
            ('custom', 'Custom'),
        ]
    )
    trigger_conditions = models.JSONField(default=dict)  # {field: value, operator: 'equals'|'contains'|'gt'|'lt'}
    
    # Action configuration
    actions = models.JSONField(default=list)  # [{type, config}]
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_rules')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'automation_rules'
        ordering = ['-created_at']
    
    def __str__(self):
        return self.name

class AutomationAction(models.Model):
    ACTION_TYPES = [
        ('assign_issue', 'Assign Issue'),
        ('change_status', 'Change Status'),
        ('add_label', 'Add Label'),
        ('send_notification', 'Send Notification'),
        ('create_comment', 'Create Comment'),
        ('move_to_sprint', 'Move to Sprint'),
        ('lock_decision', 'Lock Decision'),
        ('create_issue', 'Create Issue'),
        ('webhook', 'Webhook'),
        ('custom', 'Custom'),
    ]
    
    rule = models.ForeignKey(AutomationRule, on_delete=models.CASCADE, related_name='action_configs')
    action_type = models.CharField(max_length=50, choices=ACTION_TYPES)
    config = models.JSONField(default=dict)  # Action-specific configuration
    order = models.IntegerField(default=0)
    
    class Meta:
        db_table = 'automation_actions'
        ordering = ['order']
    
    def __str__(self):
        return f"{self.rule.name} - {self.action_type}"

class AutomationExecution(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('running', 'Running'),
        ('success', 'Success'),
        ('failed', 'Failed'),
        ('skipped', 'Skipped'),
    ]
    
    rule = models.ForeignKey(AutomationRule, on_delete=models.CASCADE, related_name='executions')
    
    # Generic relation to triggered item
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id')
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    triggered_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    
    results = models.JSONField(default=dict)  # {action_type: {success, message}}
    error_message = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'automation_executions'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['rule', '-created_at']),
            models.Index(fields=['status', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.rule.name} - {self.status}"

class AutomationTemplate(models.Model):
    """Pre-built automation templates"""
    name = models.CharField(max_length=255)
    description = models.TextField()
    category = models.CharField(
        max_length=50,
        choices=[
            ('issue_management', 'Issue Management'),
            ('decision_workflow', 'Decision Workflow'),
            ('sprint_planning', 'Sprint Planning'),
            ('notifications', 'Notifications'),
            ('integration', 'Integration'),
        ]
    )
    
    trigger_type = models.CharField(max_length=50)
    trigger_conditions = models.JSONField(default=dict)
    actions = models.JSONField(default=list)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'automation_templates'
    
    def __str__(self):
        return self.name
