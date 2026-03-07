from django.db import models
from apps.organizations.models import Organization
from apps.organizations.models import User

class Notification(models.Model):
    NOTIFICATION_TYPES = [
        ('mention', 'Mentioned'),
        ('reply', 'Reply'),
        ('reaction', 'Reaction'),
        ('decision', 'Decision'),
        ('task', 'Task'),
        ('goal', 'Goal'),
        ('meeting', 'Meeting'),
        ('issue_assigned', 'Issue Assigned'),
        ('reminder', 'Reminder'),
        ('badge', 'Badge Earned'),
        ('automation', 'Automation'),
        ('message', 'Message'),
        ('system', 'System'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    title = models.CharField(max_length=255)
    message = models.TextField()
    link = models.CharField(max_length=255, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    
    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read', '-created_at']),
        ]


class EmailCampaign(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('scheduled', 'Scheduled'),
        ('sending', 'Sending'),
        ('sent', 'Sent'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ]
    SEGMENT_CHOICES = [
        ('all_opted_in', 'All opted-in users'),
        ('active_30d', 'Active users (30 days)'),
        ('admins_managers', 'Admins and managers'),
    ]

    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='email_campaigns')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_email_campaigns')
    name = models.CharField(max_length=255)
    subject = models.CharField(max_length=255)
    preheader = models.CharField(max_length=255, blank=True)
    body_html = models.TextField()
    cta_label = models.CharField(max_length=120, blank=True, default='Open Knoledgr')
    cta_url = models.CharField(max_length=500, blank=True, default='/')
    segment = models.CharField(max_length=30, choices=SEGMENT_CHOICES, default='all_opted_in')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft', db_index=True)
    scheduled_for = models.DateTimeField(null=True, blank=True, db_index=True)
    sent_at = models.DateTimeField(null=True, blank=True)

    total_recipients = models.IntegerField(default=0)
    sent_count = models.IntegerField(default=0)
    failed_count = models.IntegerField(default=0)
    suppressed_count = models.IntegerField(default=0)
    open_count = models.IntegerField(default=0)
    click_count = models.IntegerField(default=0)

    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'email_campaigns'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['organization', 'status', '-created_at']),
        ]

    def __str__(self):
        return f"{self.organization_id}:{self.name}"


class EmailCampaignRecipient(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('sent', 'Sent'),
        ('failed', 'Failed'),
        ('suppressed', 'Suppressed'),
        ('unsubscribed', 'Unsubscribed'),
    ]

    campaign = models.ForeignKey(EmailCampaign, on_delete=models.CASCADE, related_name='recipients')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='campaign_deliveries')
    email = models.EmailField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', db_index=True)
    provider_message_id = models.CharField(max_length=255, blank=True)
    error_message = models.TextField(blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    opened_at = models.DateTimeField(null=True, blank=True)
    clicked_at = models.DateTimeField(null=True, blank=True)
    unsubscribed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'email_campaign_recipients'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['campaign', 'status']),
            models.Index(fields=['email', '-created_at']),
        ]
        constraints = [
            models.UniqueConstraint(fields=['campaign', 'email'], name='campaign_email_unique'),
        ]
