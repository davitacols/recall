from django.db import models
from apps.organizations.models import Organization, User
from apps.conversations.models import Conversation
from apps.decisions.models import Decision

class Goal(models.Model):
    STATUS_CHOICES = [
        ('not_started', 'Not Started'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('on_hold', 'On Hold'),
    ]
    
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='not_started')
    owner = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='owned_goals')
    conversation = models.ForeignKey(Conversation, on_delete=models.SET_NULL, null=True, blank=True, related_name='business_goals')
    decision = models.ForeignKey(Decision, on_delete=models.SET_NULL, null=True, blank=True, related_name='business_goals')
    target_date = models.DateField(null=True, blank=True)
    progress = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'business_goals'
        ordering = ['-created_at']

class Meeting(models.Model):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    meeting_date = models.DateTimeField()
    duration_minutes = models.IntegerField(default=60)
    location = models.CharField(max_length=255, blank=True)
    goal = models.ForeignKey(Goal, on_delete=models.SET_NULL, null=True, blank=True, related_name='meetings')
    conversation = models.ForeignKey(Conversation, on_delete=models.SET_NULL, null=True, blank=True, related_name='business_meetings')
    decision = models.ForeignKey(Decision, on_delete=models.SET_NULL, null=True, blank=True, related_name='business_meetings')
    attendees = models.ManyToManyField(User, related_name='meetings')
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_meetings')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'business_meetings'
        ordering = ['-meeting_date']

class Task(models.Model):
    STATUS_CHOICES = [
        ('todo', 'To Do'),
        ('in_progress', 'In Progress'),
        ('done', 'Done'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
    ]
    
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='todo')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium')
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_tasks')
    goal = models.ForeignKey(Goal, on_delete=models.SET_NULL, null=True, blank=True, related_name='tasks')
    meeting = models.ForeignKey(Meeting, on_delete=models.SET_NULL, null=True, blank=True, related_name='action_items')
    conversation = models.ForeignKey(Conversation, on_delete=models.SET_NULL, null=True, blank=True, related_name='business_tasks')
    decision = models.ForeignKey(Decision, on_delete=models.SET_NULL, null=True, blank=True, related_name='business_tasks')
    due_date = models.DateField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'business_tasks'
        ordering = ['-created_at']


class JourneyMap(models.Model):
    """Visual journey-mapping canvas data for early-stage project discovery."""
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='journey_maps')
    title = models.CharField(max_length=255)
    objective = models.TextField(blank=True)
    map_data = models.JSONField(default=dict, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_journey_maps')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'business_journey_maps'
        ordering = ['-updated_at']


class CalendarConnection(models.Model):
    """Store calendar provider linkage metadata for scheduling features."""
    PROVIDER_CHOICES = [
        ('google', 'Google'),
        ('outlook', 'Outlook'),
        ('manual', 'Manual'),
    ]

    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='calendar_connections')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='calendar_connections')
    provider = models.CharField(max_length=20, choices=PROVIDER_CHOICES)
    is_connected = models.BooleanField(default=False)
    external_calendar_id = models.CharField(max_length=255, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    last_synced_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'business_calendar_connections'
        ordering = ['-updated_at']
        unique_together = ['organization', 'user', 'provider']
