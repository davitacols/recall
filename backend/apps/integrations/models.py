from django.db import models
from apps.organizations.models import Organization

class SlackIntegration(models.Model):
    organization = models.OneToOneField(Organization, on_delete=models.CASCADE, related_name='slack')
    webhook_url = models.URLField()
    channel = models.CharField(max_length=100, default='#general')
    enabled = models.BooleanField(default=True)
    post_decisions = models.BooleanField(default=True)
    post_blockers = models.BooleanField(default=True)
    post_sprint_summary = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'slack_integrations'

class GitHubIntegration(models.Model):
    organization = models.OneToOneField(Organization, on_delete=models.CASCADE, related_name='github')
    access_token = models.CharField(max_length=255)
    repo_owner = models.CharField(max_length=100)
    repo_name = models.CharField(max_length=100)
    enabled = models.BooleanField(default=True)
    auto_link_prs = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'github_integrations'

class JiraIntegration(models.Model):
    organization = models.OneToOneField(Organization, on_delete=models.CASCADE, related_name='jira')
    site_url = models.URLField()
    email = models.EmailField()
    api_token = models.CharField(max_length=255)
    enabled = models.BooleanField(default=True)
    auto_sync_issues = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'jira_integrations'
