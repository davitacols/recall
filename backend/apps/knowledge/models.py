from django.db import models
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey
from apps.organizations.models import Organization, User

class KnowledgeEntry(models.Model):
    """Unified knowledge storage for all content types"""
    CONTENT_TYPES = [
        ('conversation', 'Conversation'),
        ('decision', 'Decision'),
        ('action_item', 'Action Item'),
        ('summary', 'AI Summary'),
    ]
    
    # Organization isolation
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, db_index=True)
    
    # Content identification
    content_type = models.CharField(max_length=20, choices=CONTENT_TYPES, db_index=True)
    title = models.CharField(max_length=255, db_index=True)
    content = models.TextField()
    summary = models.TextField()
    
    # Semantic metadata
    keywords = models.JSONField(default=list, blank=True)
    topics = models.JSONField(default=list, blank=True)
    entities = models.JSONField(default=list, blank=True)  # People, places, concepts
    
    # Generic foreign key to source content
    content_type_fk = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    source_object = GenericForeignKey('content_type_fk', 'object_id')
    
    # Vector database reference
    vector_id = models.CharField(max_length=255, unique=True, db_index=True)
    
    # Timestamps and metadata
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    indexed_at = models.DateTimeField(null=True, blank=True)
    
    # Search and relevance metrics
    search_count = models.PositiveIntegerField(default=0)
    relevance_score = models.FloatField(default=0.0)
    
    class Meta:
        db_table = 'knowledge_entries'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['organization', 'content_type', '-created_at']),
            models.Index(fields=['organization', '-relevance_score']),
            models.Index(fields=['vector_id']),
        ]
        unique_together = ['content_type_fk', 'object_id', 'organization']
    
    def __str__(self):
        return f"{self.get_content_type_display()}: {self.title}"

class SearchQuery(models.Model):
    """Track search queries for analytics and improvement"""
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    query_text = models.TextField()
    
    # Search metadata
    results_count = models.PositiveIntegerField(default=0)
    search_type = models.CharField(max_length=20, choices=[
        ('semantic', 'Semantic Search'),
        ('keyword', 'Keyword Search'),
        ('hybrid', 'Hybrid Search'),
    ], default='semantic')
    
    # Performance metrics
    response_time_ms = models.PositiveIntegerField(null=True, blank=True)
    clicked_result_ids = models.JSONField(default=list, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'search_queries'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['organization', '-created_at']),
            models.Index(fields=['user', '-created_at']),
        ]

class TrendingTopic(models.Model):
    """Track trending topics and themes"""
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    topic = models.CharField(max_length=100, db_index=True)
    
    # Trend metrics
    mention_count = models.PositiveIntegerField(default=0)
    trend_score = models.FloatField(default=0.0)
    
    # Time windows
    week_mentions = models.PositiveIntegerField(default=0)
    month_mentions = models.PositiveIntegerField(default=0)
    
    # Related content
    related_conversations = models.PositiveIntegerField(default=0)
    related_decisions = models.PositiveIntegerField(default=0)
    
    last_updated = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'trending_topics'
        unique_together = ['organization', 'topic']
        ordering = ['-trend_score']
        indexes = [
            models.Index(fields=['organization', '-trend_score']),
        ]

class AgentRun(models.Model):
    """A multi-step Claude agent run within a workspace.

    The agent loops using Anthropic's tool-use API. Each iteration produces a
    list of `steps` (plan / tool_call / tool_result / thought / final) that
    the frontend renders as an inline trace. Write tools are not executed
    automatically — they accumulate in `pending_tool_calls` and the run pauses
    in `awaiting_approval` until a workspace member approves them.
    """

    STATUS_CHOICES = [
        ('running', 'Running'),
        ('awaiting_approval', 'Awaiting approval'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ]

    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, db_index=True, related_name='agent_runs')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='agent_runs')

    goal = models.TextField()
    status = models.CharField(max_length=24, choices=STATUS_CHOICES, default='running', db_index=True)
    profile_slug = models.CharField(max_length=40, default='general', db_index=True)

    # Anthropic Messages API conversation history. Replayed to resume the loop.
    messages = models.JSONField(default=list, blank=True)

    # Render-ready trace: [{kind, payload, ts}, ...].
    steps = models.JSONField(default=list, blank=True)

    # Write tool calls awaiting human approval: [{id, name, input}, ...].
    pending_tool_calls = models.JSONField(default=list, blank=True)

    final_answer = models.TextField(blank=True)
    error = models.TextField(blank=True)

    iterations = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'agent_runs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['organization', '-created_at']),
            models.Index(fields=['organization', 'status']),
        ]

    def __str__(self):
        return f"AgentRun #{self.pk} ({self.status})"


class AgentStep(models.Model):
    """One frame in an AgentRun's reasoning trace.

    Stored as its own table (not just JSON on AgentRun) so that:
      - Long runs can be paginated by the frontend.
      - The DB can index by kind (e.g. count tool calls per run, find runs
        where a specific tool failed).
      - We can push a single step over websocket without re-serializing
        the entire run.

    The legacy JSON `steps` field on AgentRun is kept in sync during the
    transition window so existing serializers don't break; new readers should
    prefer this table.
    """

    KIND_CHOICES = [
        ('plan', 'Plan'),
        ('thought', 'Thought'),
        ('tool_call', 'Tool call'),
        ('tool_result', 'Tool result'),
        ('final', 'Final'),
    ]

    run = models.ForeignKey(AgentRun, on_delete=models.CASCADE, related_name='step_rows')
    ordinal = models.PositiveIntegerField()
    kind = models.CharField(max_length=20, choices=KIND_CHOICES, db_index=True)
    payload = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'agent_steps'
        ordering = ['ordinal']
        unique_together = [('run', 'ordinal')]
        indexes = [
            models.Index(fields=['run', 'ordinal']),
            models.Index(fields=['run', 'kind']),
        ]

    def __str__(self):
        return f"AgentStep run={self.run_id} #{self.ordinal} {self.kind}"
