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