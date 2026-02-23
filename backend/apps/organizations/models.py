from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import RegexValidator
from django.utils import timezone
import uuid

class Organization(models.Model):
    name = models.CharField(max_length=255, db_index=True)
    slug = models.SlugField(
        unique=True, 
        validators=[RegexValidator(r'^[a-z0-9-]+$', 'Only lowercase letters, numbers, and hyphens')]
    )
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True, db_index=True)
    
    # Branding
    logo = models.ImageField(upload_to='org_logos/', blank=True, null=True)
    primary_color = models.CharField(max_length=7, default='#000000', help_text='Hex color code')
    
    # Subscription/limits for enterprise features
    max_users = models.PositiveIntegerField(default=50)
    ai_processing_enabled = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'organizations'
        indexes = [
            models.Index(fields=['slug', 'is_active']),
        ]
    
    def __str__(self):
        return self.name

class User(AbstractUser):
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('manager', 'Manager'), 
        ('contributor', 'Contributor')
    ]
    
    organization = models.ForeignKey(
        Organization, 
        on_delete=models.CASCADE, 
        related_name='users',
        db_index=True
    )
    role = models.CharField(
        max_length=20, 
        choices=ROLE_CHOICES, 
        default='contributor',
        db_index=True
    )
    
    # Profile fields
    full_name = models.CharField(max_length=255, blank=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    avatar_url = models.URLField(blank=True)
    bio = models.TextField(blank=True)
    timezone = models.CharField(max_length=50, default='UTC')
    
    # Activity tracking
    last_active = models.DateTimeField(null=True, blank=True)
    
    # Notification settings
    email_notifications = models.BooleanField(default=True)
    mention_notifications = models.BooleanField(default=True)
    reply_notifications = models.BooleanField(default=True)
    decision_notifications = models.BooleanField(default=True)
    task_notifications = models.BooleanField(default=True)
    goal_notifications = models.BooleanField(default=True)
    meeting_notifications = models.BooleanField(default=True)
    digest_frequency = models.CharField(
        max_length=20,
        choices=[
            ('realtime', 'Real-time'),
            ('hourly', 'Hourly'),
            ('daily', 'Daily'),
            ('weekly', 'Weekly'),
            ('never', 'Never')
        ],
        default='daily'
    )
    
    # Onboarding progress
    onboarding_completed = models.BooleanField(default=False)
    first_conversation_created = models.BooleanField(default=False)
    first_teammate_invited = models.BooleanField(default=False)
    first_decision_made = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'users'
        unique_together = ['username', 'organization']
        indexes = [
            models.Index(fields=['organization', 'role']),
            models.Index(fields=['organization', 'is_active']),
        ]
    
    def get_full_name(self):
        return self.full_name or f"{self.first_name} {self.last_name}".strip() or self.username
    
    @property
    def can_manage_decisions(self):
        return self.role in ['admin', 'manager']
    
    @property
    def can_approve_decisions(self):
        return self.role == 'admin'

class Invitation(models.Model):
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('manager', 'Manager'),
        ('contributor', 'Contributor')
    ]
    
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='invitations')
    email = models.EmailField()
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='contributor')
    token = models.UUIDField(default=uuid.uuid4, unique=True)
    invited_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    accepted_at = models.DateTimeField(null=True, blank=True)
    is_accepted = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'invitations'
        unique_together = ['organization', 'email']
    
    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timezone.timedelta(days=7)
        super().save(*args, **kwargs)
    
    def is_valid(self):
        return not self.is_accepted and timezone.now() < self.expires_at

class SavedSearch(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='saved_searches')
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    query = models.CharField(max_length=255)
    filters = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'saved_searches'
        ordering = ['-created_at']

class SearchAnalytics(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    query = models.CharField(max_length=255)
    results_count = models.PositiveIntegerField()
    searched_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'search_analytics'
        ordering = ['-searched_at']