from django.db import models
from apps.organizations.models import Organization
from apps.conversations.models import Conversation

class ConversationThread(models.Model):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, db_index=True)
    parent_conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='threads')
    child_conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='parent_threads')
    
    link_type = models.CharField(max_length=50, choices=[
        ('related', 'Related'),
        ('duplicate', 'Duplicate'),
        ('follow_up', 'Follow Up'),
        ('blocked_by', 'Blocked By'),
        ('blocks', 'Blocks'),
    ], default='related')
    
    similarity_score = models.FloatField(default=0.0)  # 0-1 semantic similarity
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'conversation_threads'
        unique_together = ['parent_conversation', 'child_conversation']
        ordering = ['-similarity_score']
        indexes = [
            models.Index(fields=['organization', 'parent_conversation']),
        ]

class ConversationHistory(models.Model):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, db_index=True)
    topic = models.CharField(max_length=255, db_index=True)
    
    conversations = models.ManyToManyField(Conversation, related_name='history_records')
    
    first_occurrence = models.DateTimeField()
    last_occurrence = models.DateTimeField()
    occurrence_count = models.IntegerField(default=1)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'conversation_histories'
        ordering = ['-last_occurrence']
        indexes = [
            models.Index(fields=['organization', 'topic']),
        ]
