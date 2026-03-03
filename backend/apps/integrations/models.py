from django.db import models
from apps.organizations.models import Organization, User
from apps.decisions.models import Decision
from apps.organizations.encryption_service import EncryptionService


def _encrypt_if_needed(value):
    return EncryptionService.encrypt(value) if value else value


def _decrypt_if_needed(value):
    return EncryptionService.decrypt(value) if value else value

class SlackIntegration(models.Model):
    organization = models.OneToOneField(Organization, on_delete=models.CASCADE, related_name='slack')
    webhook_url = models.TextField()
    channel = models.CharField(max_length=100, default='#general')
    enabled = models.BooleanField(default=True)
    post_decisions = models.BooleanField(default=True)
    post_blockers = models.BooleanField(default=True)
    post_sprint_summary = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'slack_integrations'

    def save(self, *args, **kwargs):
        self.webhook_url = _encrypt_if_needed(self.webhook_url)
        super().save(*args, **kwargs)

    def get_webhook_url(self):
        return _decrypt_if_needed(self.webhook_url)

class GitHubIntegration(models.Model):
    organization = models.OneToOneField(Organization, on_delete=models.CASCADE, related_name='github')
    access_token = models.TextField()
    repo_owner = models.CharField(max_length=100)
    repo_name = models.CharField(max_length=100)
    webhook_secret = models.TextField(blank=True)
    enabled = models.BooleanField(default=True)
    auto_link_prs = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'github_integrations'

    def save(self, *args, **kwargs):
        self.access_token = _encrypt_if_needed(self.access_token)
        self.webhook_secret = _encrypt_if_needed(self.webhook_secret)
        super().save(*args, **kwargs)

    def get_access_token(self):
        return _decrypt_if_needed(self.access_token)

    def get_webhook_secret(self):
        return _decrypt_if_needed(self.webhook_secret)

class JiraIntegration(models.Model):
    organization = models.OneToOneField(Organization, on_delete=models.CASCADE, related_name='jira')
    site_url = models.URLField()
    email = models.EmailField()
    api_token = models.TextField()
    enabled = models.BooleanField(default=True)
    auto_sync_issues = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'jira_integrations'

    def save(self, *args, **kwargs):
        self.api_token = _encrypt_if_needed(self.api_token)
        super().save(*args, **kwargs)

    def get_api_token(self):
        return _decrypt_if_needed(self.api_token)


class PullRequest(models.Model):
    """Track GitHub pull requests linked to decisions"""
    STATUS_CHOICES = [
        ('open', 'Open'),
        ('closed', 'Closed'),
        ('merged', 'Merged'),
    ]
    
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='integration_pull_requests')
    decision = models.ForeignKey(Decision, on_delete=models.CASCADE, related_name='pull_requests', null=True, blank=True)
    
    pr_number = models.IntegerField()
    pr_url = models.URLField()
    title = models.CharField(max_length=500)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    branch_name = models.CharField(max_length=200)
    
    author = models.CharField(max_length=100)
    created_at = models.DateTimeField()
    merged_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    
    commits_count = models.IntegerField(default=0)
    
    class Meta:
        unique_together = ['organization', 'pr_number']
        ordering = ['-created_at']
    
    def __str__(self):
        return f"PR #{self.pr_number}: {self.title}"


class Commit(models.Model):
    """Track commits linked to decisions"""
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    decision = models.ForeignKey(Decision, on_delete=models.CASCADE, related_name='commits', null=True, blank=True)
    pull_request = models.ForeignKey(PullRequest, on_delete=models.CASCADE, related_name='commits', null=True, blank=True)
    
    sha = models.CharField(max_length=40, unique=True)
    message = models.TextField()
    author = models.CharField(max_length=100)
    commit_url = models.URLField()
    committed_at = models.DateTimeField()
    
    class Meta:
        ordering = ['-committed_at']
    
    def __str__(self):
        return f"{self.sha[:7]}: {self.message[:50]}"
