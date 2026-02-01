from django.db import models
from django.utils import timezone
from apps.organizations.models import User, Organization
from apps.conversations.models import Conversation
from apps.decisions.models import Decision

class Favorite(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='favorites')
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, null=True, blank=True)
    decision = models.ForeignKey(Decision, on_delete=models.CASCADE, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'favorites'
        unique_together = [['user', 'conversation'], ['user', 'decision']]

class EmailDigest(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='email_digest')
    enabled = models.BooleanField(default=True)
    frequency = models.CharField(max_length=20, choices=[
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
    ], default='weekly')
    last_sent = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'email_digests'

class BulkAction(models.Model):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    action_type = models.CharField(max_length=50, choices=[
        ('update_status', 'Update Status'),
        ('add_tag', 'Add Tag'),
        ('remove_tag', 'Remove Tag'),
        ('assign', 'Assign'),
        ('archive', 'Archive'),
    ])
    item_ids = models.JSONField(default=list)
    changes = models.JSONField(default=dict)
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ], default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'bulk_actions'

class AuditTrail(models.Model):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    action = models.CharField(max_length=50)
    model_name = models.CharField(max_length=50)
    object_id = models.CharField(max_length=100)
    old_values = models.JSONField(default=dict)
    new_values = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'audit_trails'
        ordering = ['-created_at']

class TrendingTopic(models.Model):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    topic = models.CharField(max_length=255)
    mention_count = models.IntegerField(default=0)
    last_mentioned = models.DateTimeField(auto_now=True)
    trend_score = models.FloatField(default=0)
    
    class Meta:
        db_table = 'trending_topics'
        unique_together = ['organization', 'topic']
