from django.db import models
from apps.organizations.models import Organization
import hmac
import hashlib

class Webhook(models.Model):
    EVENTS = [
        ('issue.created', 'Issue Created'),
        ('issue.updated', 'Issue Updated'),
        ('issue.deleted', 'Issue Deleted'),
        ('sprint.started', 'Sprint Started'),
        ('sprint.completed', 'Sprint Completed'),
        ('decision.made', 'Decision Made'),
        ('conversation.created', 'Conversation Created'),
    ]
    
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='webhooks')
    name = models.CharField(max_length=200)
    url = models.URLField()
    events = models.JSONField(default=list)
    secret = models.CharField(max_length=100, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def generate_signature(self, payload):
        if not self.secret:
            return None
        return hmac.new(
            self.secret.encode(),
            payload.encode(),
            hashlib.sha256
        ).hexdigest()

class WebhookDelivery(models.Model):
    webhook = models.ForeignKey(Webhook, on_delete=models.CASCADE, related_name='deliveries')
    event = models.CharField(max_length=50)
    payload = models.JSONField()
    response_status = models.IntegerField(null=True)
    response_body = models.TextField(blank=True)
    delivered_at = models.DateTimeField(auto_now_add=True)
    success = models.BooleanField(default=False)

class ExternalIntegration(models.Model):
    TYPES = [
        ('slack', 'Slack'),
        ('teams', 'Microsoft Teams'),
        ('gitlab', 'GitLab'),
        ('bitbucket', 'Bitbucket'),
        ('github', 'GitHub'),
    ]
    
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='external_integrations')
    type = models.CharField(max_length=20, choices=TYPES)
    name = models.CharField(max_length=200)
    config = models.JSONField(default=dict)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['organization', 'type', 'name']
