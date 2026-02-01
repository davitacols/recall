from django.db import models
from django.contrib.postgres.fields import JSONField
from apps.organizations.models import User, Organization

class AuditLog(models.Model):
    ACTION_CHOICES = [
        ('create', 'Create'),
        ('update', 'Update'),
        ('delete', 'Delete'),
        ('view', 'View'),
        ('export', 'Export'),
        ('lock', 'Lock'),
        ('unlock', 'Unlock'),
    ]
    
    STATUS_CHOICES = [
        ('success', 'Success'),
        ('failure', 'Failure'),
        ('partial', 'Partial'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    resource_type = models.CharField(max_length=50)
    resource_id = models.CharField(max_length=100)
    changes = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='success')
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    
    class Meta:
        db_table = 'audit_logs'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['organization', '-timestamp']),
            models.Index(fields=['user', '-timestamp']),
            models.Index(fields=['resource_type', 'resource_id']),
        ]


class LoginAudit(models.Model):
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    username = models.CharField(max_length=255, blank=True)
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True)
    success = models.BooleanField(default=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    
    class Meta:
        db_table = 'login_audits'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', '-timestamp']),
            models.Index(fields=['ip_address', '-timestamp']),
        ]


class DataAccessLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    resource_type = models.CharField(max_length=50)
    resource_id = models.CharField(max_length=100)
    access_type = models.CharField(max_length=20, choices=[('read', 'Read'), ('write', 'Write')])
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    
    class Meta:
        db_table = 'data_access_logs'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['organization', 'user', '-timestamp']),
        ]
