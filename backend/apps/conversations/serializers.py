"""
Serializers for Conversations, Decisions, and Knowledge
Provides consistent API response formats with context
"""
from rest_framework import serializers
from .models import (
    Conversation, ConversationReply, ActionItem, Tag, 
    Bookmark, Reaction, Badge, Document
)
from apps.decisions.models import Decision
from apps.organizations.models import User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'full_name', 'email', 'avatar']


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ['id', 'name', 'color', 'usage_count']


class ActionItemSerializer(serializers.ModelSerializer):
    assignee = UserSerializer(read_only=True)
    
    class Meta:
        model = ActionItem
        fields = [
            'id', 'title', 'description', 'status', 'priority',
            'assignee', 'due_date', 'created_at', 'completed_at'
        ]


class ConversationReplySerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)
    mentioned_users = UserSerializer(many=True, read_only=True)
    
    class Meta:
        model = ConversationReply
        fields = [
            'id', 'content', 'author', 'created_at', 'updated_at',
            'is_ai_generated', 'parent_reply', 'mentioned_users'
        ]


class ConversationListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for conversation lists"""
    author = UserSerializer(read_only=True)
    tags = TagSerializer(many=True, read_only=True)
    
    class Meta:
        model = Conversation
        fields = [
            'id', 'title', 'content', 'post_type', 'priority',
            'author', 'created_at', 'reply_count', 'view_count',
            'ai_summary', 'ai_keywords', 'is_pinned', 'status_label',
            'tags', 'memory_health_score'
        ]


class ConversationDetailSerializer(serializers.ModelSerializer):
    """Full serializer for conversation detail view"""
    author = UserSerializer(read_only=True)
    owner = UserSerializer(read_only=True)
    mentioned_users = UserSerializer(many=True, read_only=True)
    tags = TagSerializer(many=True, read_only=True)
    replies = ConversationReplySerializer(many=True, read_only=True)
    action_items = ActionItemSerializer(many=True, read_only=True)
    
    class Meta:
        model = Conversation
        fields = [
            'id', 'title', 'content', 'post_type', 'priority',
            'author', 'owner', 'created_at', 'updated_at',
            'reply_count', 'view_count', 'is_pinned', 'is_closed',
            'closed_at', 'closure_summary', 'next_steps',
            'ai_summary', 'ai_action_items', 'ai_keywords',
            'why_this_matters', 'context_reason', 'key_takeaway',
            'emotional_context', 'status_label', 'memory_health_score',
            'mentioned_users', 'tags', 'replies', 'action_items',
            'alternatives_considered', 'tradeoffs', 'code_links',
            'plain_language_summary', 'dev_simple_summary',
            'dev_technical_decision', 'dev_action_items',
            'dev_agile_context', 'dev_future_note', 'dev_warnings'
        ]


class DecisionListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for decision lists"""
    decision_maker = UserSerializer(read_only=True)
    
    class Meta:
        model = Decision
        fields = [
            'id', 'title', 'description', 'status', 'impact_level',
            'decision_maker', 'created_at', 'decided_at',
            'confidence_level', 'is_locked'
        ]


class DecisionDetailSerializer(serializers.ModelSerializer):
    """Full serializer for decision detail view"""
    decision_maker = UserSerializer(read_only=True)
    stakeholders = UserSerializer(many=True, read_only=True)
    locked_by = UserSerializer(read_only=True)
    conversation = ConversationListSerializer(read_only=True)
    
    class Meta:
        model = Decision
        fields = [
            'id', 'title', 'description', 'rationale', 'status',
            'impact_level', 'impact_assessment', 'decision_maker',
            'stakeholders', 'created_at', 'decided_at',
            'implementation_deadline', 'implemented_at',
            'context_reason', 'if_this_fails', 'confidence_level',
            'confidence_votes', 'alternatives_considered', 'tradeoffs',
            'code_links', 'plain_language_summary', 'outcome_notes',
            'success_metrics', 'is_locked', 'locked_at', 'locked_by',
            'lock_reason', 'review_scheduled_at', 'review_completed_at',
            'was_successful', 'impact_review_notes', 'lessons_learned',
            'conversation', 'reminder_enabled', 'reminder_days'
        ]


class BookmarkSerializer(serializers.ModelSerializer):
    conversation = ConversationListSerializer(read_only=True)
    
    class Meta:
        model = Bookmark
        fields = ['id', 'conversation', 'note', 'created_at']


class ReactionSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = Reaction
        fields = ['id', 'reaction_type', 'user', 'created_at']


class DocumentSerializer(serializers.ModelSerializer):
    uploaded_by = UserSerializer(read_only=True)
    
    class Meta:
        model = Document
        fields = [
            'id', 'filename', 'file', 'file_size', 'file_type',
            'comment', 'uploaded_by', 'created_at'
        ]


class BadgeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Badge
        fields = ['id', 'badge_type', 'earned_at', 'conversation']


class ConversationContextSerializer(serializers.Serializer):
    """Serializer for conversation context response"""
    conversation = serializers.DictField()
    metadata = serializers.DictField()
    engagement = serializers.DictField()
    related = serializers.DictField()


class DecisionContextSerializer(serializers.Serializer):
    """Serializer for decision context response"""
    decision = serializers.DictField()
    rationale = serializers.DictField()
    implementation = serializers.DictField()
    confidence = serializers.DictField()
    related = serializers.DictField()


class TimelineEventSerializer(serializers.Serializer):
    """Serializer for timeline events"""
    type = serializers.CharField()
    date = serializers.DateTimeField()
    title = serializers.CharField()
    author = serializers.CharField(required=False)
    details = serializers.CharField(required=False)
    status = serializers.CharField(required=False)


class ImplementationStatusSerializer(serializers.Serializer):
    """Serializer for implementation status"""
    decision_id = serializers.IntegerField()
    title = serializers.CharField()
    status = serializers.CharField()
    progress = serializers.IntegerField()
    milestones = serializers.ListField()
    blockers = serializers.ListField()
    code_links = serializers.ListField()


class ContextSummarySerializer(serializers.Serializer):
    """Serializer for context summary"""
    title = serializers.CharField()
    summary = serializers.CharField()
    key_takeaway = serializers.CharField()
    decisions_count = serializers.IntegerField()
    action_items_count = serializers.IntegerField()
    engagement_score = serializers.IntegerField()


class ConversationCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating conversations"""
    class Meta:
        model = Conversation
        fields = [
            'title', 'content', 'post_type', 'priority',
            'why_this_matters', 'context_reason', 'key_takeaway',
            'emotional_context', 'is_draft'
        ]
    
    def validate_title(self, value):
        if len(value) < 5:
            raise serializers.ValidationError("Title must be at least 5 characters")
        return value
    
    def validate_content(self, value):
        if len(value) < 10:
            raise serializers.ValidationError("Content must be at least 10 characters")
        return value


class ConversationUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating conversations"""
    class Meta:
        model = Conversation
        fields = [
            'title', 'content', 'priority', 'why_this_matters',
            'context_reason', 'key_takeaway', 'emotional_context',
            'status_label', 'is_draft', 'is_pinned', 'is_closed',
            'closure_summary', 'next_steps'
        ]


class DecisionCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating decisions"""
    class Meta:
        model = Decision
        fields = [
            'title', 'description', 'rationale', 'impact_level',
            'context_reason', 'if_this_fails', 'alternatives_considered',
            'tradeoffs', 'implementation_deadline'
        ]
    
    def validate_title(self, value):
        if len(value) < 5:
            raise serializers.ValidationError("Title must be at least 5 characters")
        return value


class DecisionUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating decisions"""
    class Meta:
        model = Decision
        fields = [
            'status', 'rationale', 'impact_assessment', 'context_reason',
            'if_this_fails', 'implementation_deadline', 'outcome_notes',
            'success_metrics', 'is_locked', 'lock_reason',
            'review_scheduled_at', 'was_successful', 'impact_review_notes',
            'lessons_learned'
        ]


class ActionItemCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating action items"""
    class Meta:
        model = ActionItem
        fields = ['title', 'description', 'priority', 'due_date']


class ActionItemUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating action items"""
    class Meta:
        model = ActionItem
        fields = ['title', 'description', 'status', 'priority', 'due_date']
