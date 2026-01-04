from django.db import models
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey
import json

User = get_user_model()

class AuditLog(models.Model):
    ACTION_CHOICES = [
        ('create', 'Create'),
        ('update', 'Update'),
        ('delete', 'Delete'),
        ('assign', 'Assign'),
        ('comment', 'Comment'),
        ('mention', 'Mention'),
        ('reaction', 'Reaction'),
        ('lock', 'Lock'),
        ('unlock', 'Unlock'),
        ('approve', 'Approve'),
        ('reject', 'Reject'),
        ('invite', 'Invite'),
        ('remove', 'Remove'),
        ('role_change', 'Role Change'),
    ]
    
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='audit_logs'
    )
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='audit_logs'
    )
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    
    # Generic relation to any model
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id')
    
    # Details
    description = models.TextField()
    changes = models.JSONField(default=dict, blank=True)  # {field: {old: value, new: value}}
    
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    
    class Meta:
        db_table = 'audit_logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['organization', '-created_at']),
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['action', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.action} by {self.user} on {self.created_at}"

class TeamWorkflow(models.Model):
    """Define team workflows and approval processes"""
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('active', 'Active'),
        ('archived', 'Archived'),
    ]
    
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='team_workflows'
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    workflow_type = models.CharField(
        max_length=50,
        choices=[
            ('decision_approval', 'Decision Approval'),
            ('issue_resolution', 'Issue Resolution'),
            ('sprint_planning', 'Sprint Planning'),
            ('custom', 'Custom'),
        ]
    )
    
    # Workflow configuration
    stages = models.JSONField(default=list)  # [{name, required_role, auto_advance}]
    approvers = models.ManyToManyField(User, related_name='workflows_as_approver', blank=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_workflows')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'team_workflows'
    
    def __str__(self):
        return self.name

class WorkflowInstance(models.Model):
    """Track workflow execution for specific items"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('completed', 'Completed'),
    ]
    
    workflow = models.ForeignKey(TeamWorkflow, on_delete=models.CASCADE, related_name='instances')
    
    # Generic relation to item being processed
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id')
    
    current_stage = models.IntegerField(default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    initiated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='initiated_workflows')
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'workflow_instances'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.workflow.name} - {self.status}"

class WorkflowApproval(models.Model):
    """Track individual approvals in a workflow"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('skipped', 'Skipped'),
    ]
    
    workflow_instance = models.ForeignKey(
        WorkflowInstance,
        on_delete=models.CASCADE,
        related_name='approvals'
    )
    stage_index = models.IntegerField()
    approver = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='approvals')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    comment = models.TextField(blank=True)
    decided_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'workflow_approvals'
        unique_together = ['workflow_instance', 'stage_index', 'approver']
    
    def __str__(self):
        return f"{self.workflow_instance} - Stage {self.stage_index} - {self.status}"
