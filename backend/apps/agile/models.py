from django.db import models
from django.utils import timezone
from apps.organizations.models import User, Organization
from apps.conversations.models import Conversation

class Project(models.Model):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    key = models.CharField(max_length=10, unique=True)
    description = models.TextField(blank=True)
    lead = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='led_projects')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'projects'
        ordering = ['-created_at']



class Sprint(models.Model):
    STATUS_CHOICES = [
        ('planning', 'Planning'),
        ('active', 'Active'),
        ('completed', 'Completed'),
    ]
    
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, db_index=True)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, null=True, blank=True, related_name='sprints')
    name = models.CharField(max_length=100)
    start_date = models.DateField()
    end_date = models.DateField()
    goal = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='planning')
    
    summary = models.TextField(blank=True)
    completed_count = models.IntegerField(default=0)
    blocked_count = models.IntegerField(default=0)
    decisions_made = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'sprints'
        ordering = ['-start_date']
        indexes = [
            models.Index(fields=['organization', '-start_date']),
            models.Index(fields=['project', '-start_date']),
        ]
    
    def save(self, *args, **kwargs):
        try:
            from apps.organizations.automation_engine import trigger_automation
            
            if self.pk:
                old_sprint = Sprint.objects.get(pk=self.pk)
                if old_sprint.status != 'active' and self.status == 'active':
                    super().save(*args, **kwargs)
                    trigger_automation(self, 'sprint_started', None)
                    return
                elif old_sprint.status != 'completed' and self.status == 'completed':
                    super().save(*args, **kwargs)
                    trigger_automation(self, 'sprint_ended', None)
                    return
        except Exception:
            pass
        
        super().save(*args, **kwargs)

class Board(models.Model):
    BOARD_TYPES = [
        ('kanban', 'Kanban'),
        ('scrum', 'Scrum'),
    ]
    
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, db_index=True)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='boards')
    name = models.CharField(max_length=255)
    board_type = models.CharField(max_length=20, choices=BOARD_TYPES, default='kanban')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'boards'
        ordering = ['-created_at']

class Column(models.Model):
    board = models.ForeignKey(Board, on_delete=models.CASCADE, related_name='columns')
    name = models.CharField(max_length=100)
    order = models.IntegerField(default=0)
    
    class Meta:
        db_table = 'columns'
        ordering = ['order']
        unique_together = ['board', 'name']

class Issue(models.Model):
    PRIORITY_CHOICES = [
        ('lowest', 'Lowest'),
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('highest', 'Highest'),
    ]
    
    STATUS_CHOICES = [
        ('backlog', 'Backlog'),
        ('todo', 'To Do'),
        ('in_progress', 'In Progress'),
        ('in_review', 'In Review'),
        ('testing', 'Testing'),
        ('done', 'Done'),
    ]
    
    ISSUE_TYPE_CHOICES = [
        ('epic', 'Epic'),
        ('story', 'Story'),
        ('task', 'Task'),
        ('bug', 'Bug'),
        ('subtask', 'Sub-task'),
    ]
    
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, db_index=True)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='issues')
    board = models.ForeignKey(Board, on_delete=models.CASCADE, related_name='issues')
    column = models.ForeignKey(Column, on_delete=models.SET_NULL, null=True, related_name='issues')
    parent_issue = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='subtasks')
    
    key = models.CharField(max_length=20)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    issue_type = models.CharField(max_length=20, choices=ISSUE_TYPE_CHOICES, default='task')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='backlog', db_index=True)
    
    assignee = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_issues')
    reporter = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reported_issues')
    
    story_points = models.IntegerField(null=True, blank=True)
    sprint = models.ForeignKey(Sprint, on_delete=models.SET_NULL, null=True, blank=True, related_name='issues')
    in_backlog = models.BooleanField(default=True, db_index=True)
    
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    due_date = models.DateField(null=True, blank=True)
    status_changed_at = models.DateTimeField(auto_now=True)
    
    # Developer-focused fields
    branch_name = models.CharField(max_length=255, blank=True, help_text='Git branch name')
    pr_url = models.URLField(blank=True, help_text='Pull request URL')
    commit_hash = models.CharField(max_length=40, blank=True, help_text='Git commit hash')
    code_review_status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending Review'),
        ('approved', 'Approved'),
        ('changes_requested', 'Changes Requested'),
        ('merged', 'Merged'),
    ], blank=True)
    ci_status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('running', 'Running'),
        ('passed', 'Passed'),
        ('failed', 'Failed'),
    ], blank=True, help_text='CI/CD pipeline status')
    ci_url = models.URLField(blank=True, help_text='CI/CD pipeline URL')
    test_coverage = models.IntegerField(null=True, blank=True, help_text='Test coverage percentage')
    
    class Meta:
        db_table = 'issues'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['organization', 'project', 'status']),
            models.Index(fields=['assignee', 'status']),
        ]
        unique_together = ['project', 'key']
    
    def save(self, *args, **kwargs):
        is_new = self.pk is None
        old_status = None
        
        if not is_new:
            try:
                old_issue = Issue.objects.get(pk=self.pk)
                old_status = old_issue.status
            except Issue.DoesNotExist:
                pass
        
        if self.sprint and self.in_backlog:
            self.in_backlog = False
        
        if not self.sprint and not self.in_backlog and self.status == 'backlog':
            self.in_backlog = True
        
        super().save(*args, **kwargs)
        
        try:
            from apps.organizations.automation_engine import trigger_automation
            from apps.organizations.analytics_engine import AnalyticsEngine
            
            if is_new:
                trigger_automation(self, 'issue_created', self.reporter)
                AnalyticsEngine.record_metric(
                    self.organization,
                    'issue_count',
                    1,
                    {'project_id': self.project_id}
                )
            else:
                if old_status and old_status != self.status:
                    trigger_automation(self, 'issue_status_changed', self.reporter, {'old_status': old_status, 'new_status': self.status})
                trigger_automation(self, 'issue_updated', self.reporter)
        except Exception:
            pass

class IssueComment(models.Model):
    issue = models.ForeignKey(Issue, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'issue_comments'
        ordering = ['created_at']

class IssueLabel(models.Model):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, db_index=True)
    name = models.CharField(max_length=50)
    color = models.CharField(max_length=7, default='#4F46E5')
    issues = models.ManyToManyField(Issue, related_name='labels')
    
    class Meta:
        db_table = 'issue_labels'
        unique_together = ['organization', 'name']

class Blocker(models.Model):
    BLOCKER_TYPES = [
        ('technical', 'Technical'),
        ('dependency', 'Dependency'),
        ('decision', 'Decision Needed'),
        ('resource', 'Resource'),
        ('external', 'External'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('resolved', 'Resolved'),
        ('escalated', 'Escalated'),
    ]
    
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, db_index=True)
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='blockers')
    sprint = models.ForeignKey(Sprint, on_delete=models.SET_NULL, null=True, blank=True, related_name='blockers')
    
    title = models.CharField(max_length=255)
    description = models.TextField()
    blocker_type = models.CharField(max_length=20, choices=BLOCKER_TYPES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active', db_index=True)
    
    blocked_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='blockers_reported')
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='blockers_assigned')
    
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    
    ticket_url = models.URLField(blank=True)
    ticket_id = models.CharField(max_length=50, blank=True)
    
    class Meta:
        db_table = 'blockers'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['organization', 'status', '-created_at']),
        ]

class Retrospective(models.Model):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, db_index=True)
    sprint = models.ForeignKey(Sprint, on_delete=models.CASCADE, related_name='retrospectives')
    
    what_went_well = models.JSONField(default=list)
    what_needs_improvement = models.JSONField(default=list)
    action_items = models.JSONField(default=list)
    
    recurring_issues = models.JSONField(default=list)
    positive_trends = models.JSONField(default=list)
    
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    
    class Meta:
        db_table = 'retrospectives'
        ordering = ['-created_at']

class SprintUpdate(models.Model):
    TYPE_CHOICES = [
        ('sprint_update', 'Sprint Update'),
        ('blocker', 'Blocker'),
        ('decision_impact', 'Decision Impact'),
    ]
    
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, db_index=True)
    sprint = models.ForeignKey(Sprint, on_delete=models.CASCADE, related_name='updates')
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='sprint_update')
    title = models.CharField(max_length=255)
    content = models.TextField()
    ai_summary = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    
    class Meta:
        db_table = 'sprint_updates'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['organization', 'sprint', '-created_at']),
        ]


class CodeCommit(models.Model):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, db_index=True)
    issue = models.ForeignKey(Issue, on_delete=models.CASCADE, related_name='commits', null=True, blank=True)
    
    commit_hash = models.CharField(max_length=40, db_index=True)
    message = models.TextField()
    author = models.CharField(max_length=255)
    branch = models.CharField(max_length=255)
    url = models.URLField()
    
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    
    class Meta:
        db_table = 'code_commits'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['organization', 'issue', '-created_at']),
        ]


class PullRequest(models.Model):
    STATUS_CHOICES = [
        ('open', 'Open'),
        ('approved', 'Approved'),
        ('changes_requested', 'Changes Requested'),
        ('merged', 'Merged'),
        ('closed', 'Closed'),
    ]
    
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, db_index=True)
    issue = models.ForeignKey(Issue, on_delete=models.CASCADE, related_name='pull_requests', null=True, blank=True)
    
    pr_number = models.IntegerField()
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    url = models.URLField()
    
    author = models.CharField(max_length=255)
    reviewers = models.JSONField(default=list)
    
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    merged_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'pull_requests'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['organization', 'issue', 'status']),
        ]

class DecisionIssueLink(models.Model):
    """Links decisions to issues they impact"""
    from apps.decisions.models import Decision
    decision = models.ForeignKey(Decision, on_delete=models.CASCADE, related_name='linked_issues')
    issue = models.ForeignKey(Issue, on_delete=models.CASCADE, related_name='linked_decisions')
    impact_type = models.CharField(max_length=50, choices=[
        ('blocks', 'Blocks'),
        ('enables', 'Enables'),
        ('relates_to', 'Relates To'),
    ])
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'decision_issue_links'
        unique_together = ['decision', 'issue']

class ConversationIssueLink(models.Model):
    """Links conversations to issues they discuss"""
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='linked_issues')
    issue = models.ForeignKey(Issue, on_delete=models.CASCADE, related_name='linked_conversations')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'conversation_issue_links'
        unique_together = ['conversation', 'issue']

class BlockerIssueLink(models.Model):
    """Links blockers to issues they block"""
    blocker = models.ForeignKey(Blocker, on_delete=models.CASCADE, related_name='blocked_issues')
    issue = models.ForeignKey(Issue, on_delete=models.CASCADE, related_name='blocking_blockers')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'blocker_issue_links'
        unique_together = ['blocker', 'issue']

class SprintVelocity(models.Model):
    """Track velocity metrics for sprints"""
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, db_index=True)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='velocities')
    sprint = models.OneToOneField(Sprint, on_delete=models.CASCADE, related_name='velocity')
    
    planned_points = models.IntegerField(default=0)
    completed_points = models.IntegerField(default=0)
    velocity = models.FloatField(default=0.0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'sprint_velocities'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['organization', 'project', '-created_at']),
        ]

class TeamCapacity(models.Model):
    """Track team member capacity for sprints"""
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, db_index=True)
    sprint = models.ForeignKey(Sprint, on_delete=models.CASCADE, related_name='capacities')
    team_member = models.ForeignKey(User, on_delete=models.CASCADE)
    
    available_hours = models.FloatField()
    allocated_hours = models.FloatField(default=0.0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'team_capacities'
        unique_together = ['sprint', 'team_member']
        indexes = [
            models.Index(fields=['organization', 'sprint']),
        ]

class SprintForecast(models.Model):
    """Sprint forecasting based on historical velocity"""
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, db_index=True)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='forecasts')
    sprint = models.OneToOneField(Sprint, on_delete=models.CASCADE, related_name='forecast')
    
    avg_velocity = models.FloatField()
    recommended_capacity = models.IntegerField()
    confidence_level = models.CharField(max_length=20, choices=[
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
    ], default='medium')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'sprint_forecasts'
        ordering = ['-sprint__start_date']

class BurndownData(models.Model):
    """Daily burndown data for sprints"""
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, db_index=True)
    sprint = models.ForeignKey(Sprint, on_delete=models.CASCADE, related_name='burndown_data')
    
    date = models.DateField()
    remaining_points = models.IntegerField()
    completed_points = models.IntegerField()
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'burndown_data'
        unique_together = ['sprint', 'date']
        ordering = ['date']
        indexes = [
            models.Index(fields=['organization', 'sprint', 'date']),
        ]


class Deployment(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('success', 'Success'),
        ('failed', 'Failed'),
    ]
    
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, db_index=True)
    
    environment = models.CharField(max_length=50)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    commit_hash = models.CharField(max_length=40)
    branch = models.CharField(max_length=255)
    
    deployed_by = models.CharField(max_length=255)
    deployed_at = models.DateTimeField(null=True, blank=True)
    
    url = models.URLField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'deployments'
        ordering = ['-created_at']


class Backlog(models.Model):
    """Product backlog for sprint planning"""
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, db_index=True)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='backlogs')
    
    issues = models.ManyToManyField(Issue, related_name='backlogs')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'backlogs'
        unique_together = ['organization', 'project']

class WorkflowTransition(models.Model):
    """Define valid status transitions for issues"""
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, db_index=True)
    
    from_status = models.CharField(max_length=20)
    to_status = models.CharField(max_length=20)
    issue_type = models.CharField(max_length=20, choices=Issue.ISSUE_TYPE_CHOICES, blank=True)
    
    requires_assignee = models.BooleanField(default=False)
    requires_story_points = models.BooleanField(default=False)
    requires_comment = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'workflow_transitions'
        unique_together = ['organization', 'from_status', 'to_status', 'issue_type']
        indexes = [
            models.Index(fields=['organization', 'from_status']),
        ]


class DecisionImpact(models.Model):
    """Track how decisions impact issues and sprints"""
    IMPACT_TYPE_CHOICES = [
        ('enables', 'Enables'),
        ('blocks', 'Blocks'),
        ('changes', 'Changes Requirements'),
        ('accelerates', 'Accelerates'),
        ('delays', 'Delays'),
    ]
    
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, db_index=True)
    decision = models.ForeignKey('decisions.Decision', on_delete=models.CASCADE, related_name='impacts')
    issue = models.ForeignKey(Issue, on_delete=models.CASCADE, related_name='decision_impacts')
    sprint = models.ForeignKey(Sprint, on_delete=models.SET_NULL, null=True, blank=True, related_name='decision_impacts')
    
    impact_type = models.CharField(max_length=20, choices=IMPACT_TYPE_CHOICES)
    description = models.TextField()
    
    # Metrics
    estimated_effort_change = models.IntegerField(default=0, help_text='Story points added/removed')
    estimated_delay_days = models.IntegerField(default=0, help_text='Days of delay if blocking')
    
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'decision_impacts'
        unique_together = ['decision', 'issue']
        indexes = [
            models.Index(fields=['organization', 'decision']),
            models.Index(fields=['organization', 'issue']),
        ]

class IssueDecisionHistory(models.Model):
    """Track how decisions changed issue status/requirements"""
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, db_index=True)
    issue = models.ForeignKey(Issue, on_delete=models.CASCADE, related_name='decision_history')
    decision = models.ForeignKey('decisions.Decision', on_delete=models.CASCADE)
    
    change_type = models.CharField(max_length=50, choices=[
        ('status_changed', 'Status Changed'),
        ('priority_changed', 'Priority Changed'),
        ('points_changed', 'Story Points Changed'),
        ('blocked', 'Blocked'),
        ('unblocked', 'Unblocked'),
    ])
    
    old_value = models.CharField(max_length=255, blank=True)
    new_value = models.CharField(max_length=255, blank=True)
    reason = models.TextField()
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'issue_decision_history'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['organization', 'issue', '-created_at']),
        ]

class SprintDecisionSummary(models.Model):
    """Summary of how decisions impacted sprint outcomes"""
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, db_index=True)
    sprint = models.OneToOneField(Sprint, on_delete=models.CASCADE, related_name='decision_summary')
    
    decisions_made = models.IntegerField(default=0)
    decisions_impacting_sprint = models.IntegerField(default=0)
    
    total_effort_added = models.IntegerField(default=0, help_text='Total story points added by decisions')
    total_effort_removed = models.IntegerField(default=0, help_text='Total story points removed by decisions')
    
    issues_blocked_by_decisions = models.IntegerField(default=0)
    issues_enabled_by_decisions = models.IntegerField(default=0)
    
    velocity_impact_percent = models.FloatField(default=0.0, help_text='% change in velocity due to decisions')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'sprint_decision_summaries'
