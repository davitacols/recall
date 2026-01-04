from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()

class AnalyticsMetric(models.Model):
    METRIC_TYPES = [
        ('issue_count', 'Issue Count'),
        ('decision_count', 'Decision Count'),
        ('sprint_velocity', 'Sprint Velocity'),
        ('completion_rate', 'Completion Rate'),
        ('user_activity', 'User Activity'),
        ('comment_count', 'Comment Count'),
        ('resolution_time', 'Resolution Time'),
        ('team_capacity', 'Team Capacity'),
    ]
    
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='metrics'
    )
    metric_type = models.CharField(max_length=50, choices=METRIC_TYPES)
    value = models.FloatField()
    metadata = models.JSONField(default=dict)  # {period, project_id, sprint_id, etc}
    
    recorded_at = models.DateTimeField(auto_now_add=True, db_index=True)
    
    class Meta:
        db_table = 'analytics_metrics'
        ordering = ['-recorded_at']
        indexes = [
            models.Index(fields=['organization', 'metric_type', '-recorded_at']),
        ]

class Report(models.Model):
    REPORT_TYPES = [
        ('sprint_summary', 'Sprint Summary'),
        ('team_performance', 'Team Performance'),
        ('project_overview', 'Project Overview'),
        ('decision_analysis', 'Decision Analysis'),
        ('custom', 'Custom'),
    ]
    
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('published', 'Published'),
        ('archived', 'Archived'),
    ]
    
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='reports'
    )
    name = models.CharField(max_length=255)
    report_type = models.CharField(max_length=50, choices=REPORT_TYPES)
    description = models.TextField(blank=True)
    
    # Report configuration
    filters = models.JSONField(default=dict)  # {project_id, sprint_id, date_range, etc}
    sections = models.JSONField(default=list)  # [{type, config}]
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_reports')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'reports'
        ordering = ['-created_at']

class Dashboard(models.Model):
    """Custom dashboards for users"""
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='dashboards'
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='dashboards')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    
    # Dashboard configuration
    widgets = models.JSONField(default=list)  # [{type, config, position}]
    layout = models.CharField(
        max_length=20,
        choices=[
            ('grid', 'Grid'),
            ('list', 'List'),
            ('custom', 'Custom'),
        ],
        default='grid'
    )
    
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'dashboards'
        unique_together = ['user', 'is_default']

class DashboardWidget(models.Model):
    WIDGET_TYPES = [
        ('metric_card', 'Metric Card'),
        ('chart', 'Chart'),
        ('table', 'Table'),
        ('timeline', 'Timeline'),
        ('heatmap', 'Heatmap'),
        ('gauge', 'Gauge'),
    ]
    
    dashboard = models.ForeignKey(Dashboard, on_delete=models.CASCADE, related_name='widget_configs')
    widget_type = models.CharField(max_length=50, choices=WIDGET_TYPES)
    title = models.CharField(max_length=255)
    config = models.JSONField(default=dict)  # {metric_type, period, chart_type, etc}
    
    position_x = models.IntegerField(default=0)
    position_y = models.IntegerField(default=0)
    width = models.IntegerField(default=1)
    height = models.IntegerField(default=1)
    
    class Meta:
        db_table = 'dashboard_widgets'

class Integration(models.Model):
    INTEGRATION_TYPES = [
        ('slack', 'Slack'),
        ('github', 'GitHub'),
        ('jira', 'Jira'),
        ('asana', 'Asana'),
        ('trello', 'Trello'),
        ('webhook', 'Webhook'),
        ('zapier', 'Zapier'),
        ('custom', 'Custom'),
    ]
    
    STATUS_CHOICES = [
        ('connected', 'Connected'),
        ('disconnected', 'Disconnected'),
        ('error', 'Error'),
    ]
    
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='integrations'
    )
    integration_type = models.CharField(max_length=50, choices=INTEGRATION_TYPES)
    name = models.CharField(max_length=255)
    
    # Credentials (encrypted in production)
    credentials = models.JSONField(default=dict)
    config = models.JSONField(default=dict)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='disconnected')
    last_sync = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True)
    
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_integrations')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'integrations'
        unique_together = ['organization', 'integration_type']

class IntegrationLog(models.Model):
    """Log integration sync events"""
    integration = models.ForeignKey(Integration, on_delete=models.CASCADE, related_name='logs')
    action = models.CharField(max_length=50)  # sync, push, pull, error
    status = models.CharField(max_length=20, choices=[('success', 'Success'), ('failed', 'Failed')])
    
    details = models.JSONField(default=dict)
    error_message = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'integration_logs'
        ordering = ['-created_at']
