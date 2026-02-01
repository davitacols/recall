from rest_framework import serializers
from apps.agile.models import Project, Sprint, Issue, Blocker, IssueComment, IssueLabel, Backlog, WorkflowTransition

class ProjectSerializer(serializers.ModelSerializer):
    lead_name = serializers.CharField(source='lead.get_full_name', read_only=True)
    
    class Meta:
        model = Project
        fields = ['id', 'name', 'key', 'description', 'lead', 'lead_name', 'created_at']
        read_only_fields = ['id', 'created_at']
    
    def validate_key(self, value):
        if not value or len(value) > 10:
            raise serializers.ValidationError("Key must be 1-10 characters")
        return value.upper()

class SprintSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source='project.name', read_only=True)
    
    class Meta:
        model = Sprint
        fields = ['id', 'name', 'project', 'project_name', 'start_date', 'end_date', 'goal', 'status', 'created_at']
        read_only_fields = ['id', 'created_at']
    
    def validate(self, data):
        if data.get('start_date') and data.get('end_date'):
            if data['start_date'] >= data['end_date']:
                raise serializers.ValidationError("Start date must be before end date")
        return data

class IssueSerializer(serializers.ModelSerializer):
    assignee_name = serializers.CharField(source='assignee.get_full_name', read_only=True)
    reporter_name = serializers.CharField(source='reporter.get_full_name', read_only=True)
    subtask_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Issue
        fields = ['id', 'key', 'title', 'description', 'issue_type', 'priority', 'status', 'assignee', 'assignee_name', 
                  'reporter', 'reporter_name', 'story_points', 'sprint', 'parent_issue', 'subtask_count', 'due_date', 
                  'in_backlog', 'created_at', 'updated_at', 'status_changed_at']
        read_only_fields = ['id', 'key', 'created_at', 'updated_at', 'status_changed_at']
    
    def get_subtask_count(self, obj):
        return obj.subtasks.count()
    
    def validate_priority(self, value):
        valid_priorities = ['lowest', 'low', 'medium', 'high', 'highest']
        if value not in valid_priorities:
            raise serializers.ValidationError(f"Priority must be one of {valid_priorities}")
        return value
    
    def validate_status(self, value):
        valid_statuses = ['backlog', 'todo', 'in_progress', 'in_review', 'testing', 'done']
        if value not in valid_statuses:
            raise serializers.ValidationError(f"Status must be one of {valid_statuses}")
        return value
    
    def validate_issue_type(self, value):
        valid_types = ['epic', 'story', 'task', 'bug', 'subtask']
        if value not in valid_types:
            raise serializers.ValidationError(f"Issue type must be one of {valid_types}")
        return value

class BlockerSerializer(serializers.ModelSerializer):
    blocked_by_name = serializers.CharField(source='blocked_by.get_full_name', read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.get_full_name', read_only=True)
    
    class Meta:
        model = Blocker
        fields = ['id', 'title', 'description', 'blocker_type', 'status', 'sprint', 'blocked_by', 'blocked_by_name',
                  'assigned_to', 'assigned_to_name', 'ticket_url', 'ticket_id', 'created_at', 'resolved_at']
        read_only_fields = ['id', 'created_at', 'resolved_at']
    
    def validate_blocker_type(self, value):
        valid_types = ['technical', 'dependency', 'decision', 'resource', 'external']
        if value not in valid_types:
            raise serializers.ValidationError(f"Type must be one of {valid_types}")
        return value

class IssueCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.get_full_name', read_only=True)
    
    class Meta:
        model = IssueComment
        fields = ['id', 'author', 'author_name', 'content', 'created_at', 'updated_at']
        read_only_fields = ['id', 'author', 'created_at', 'updated_at']

class IssueLabelSerializer(serializers.ModelSerializer):
    class Meta:
        model = IssueLabel
        fields = ['id', 'name', 'color']
        read_only_fields = ['id']
    
    def validate_color(self, value):
        if not value.startswith('#') or len(value) != 7:
            raise serializers.ValidationError("Color must be hex format (#RRGGBB)")
        return value

class BacklogSerializer(serializers.ModelSerializer):
    issue_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Backlog
        fields = ['id', 'project', 'issue_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_issue_count(self, obj):
        return obj.issues.count()

class WorkflowTransitionSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkflowTransition
        fields = ['id', 'from_status', 'to_status', 'issue_type', 'requires_assignee', 
                  'requires_story_points', 'requires_comment', 'created_at']
        read_only_fields = ['id', 'created_at']


class DecisionImpactSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    issue_key = serializers.CharField(source='issue.key', read_only=True)
    decision_title = serializers.CharField(source='decision.title', read_only=True)
    
    class Meta:
        model = DecisionImpact
        fields = ['id', 'decision', 'decision_title', 'issue', 'issue_key', 'sprint', 'impact_type', 
                  'description', 'estimated_effort_change', 'estimated_delay_days', 'created_by', 
                  'created_by_name', 'created_at']
        read_only_fields = ['id', 'created_at']

class IssueDecisionHistorySerializer(serializers.ModelSerializer):
    decision_title = serializers.CharField(source='decision.title', read_only=True)
    
    class Meta:
        model = IssueDecisionHistory
        fields = ['id', 'issue', 'decision', 'decision_title', 'change_type', 'old_value', 
                  'new_value', 'reason', 'created_at']
        read_only_fields = ['id', 'created_at']

class SprintDecisionSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = SprintDecisionSummary
        fields = ['id', 'sprint', 'decisions_made', 'decisions_impacting_sprint', 'total_effort_added',
                  'total_effort_removed', 'issues_blocked_by_decisions', 'issues_enabled_by_decisions',
                  'velocity_impact_percent', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
