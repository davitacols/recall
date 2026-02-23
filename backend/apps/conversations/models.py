from django.db import models
from django.core.validators import MinLengthValidator
from django.db.models.signals import post_save
from django.dispatch import receiver
from apps.organizations.models import User, Organization

class Tag(models.Model):
    name = models.CharField(max_length=50, db_index=True)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    color = models.CharField(max_length=7, default='#000000')
    usage_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'tags'
        unique_together = ['name', 'organization']
        ordering = ['-usage_count', 'name']
    
    def __str__(self):
        return f"#{self.name}"

class Conversation(models.Model):
    POST_TYPES = [
        ('update', 'Update'),
        ('decision', 'Decision'),
        ('question', 'Question'),
        ('proposal', 'Proposal'),
    ]
    
    PRIORITY_LEVELS = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]
    
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, db_index=True)
    author = models.ForeignKey(User, on_delete=models.CASCADE, db_index=True)
    post_type = models.CharField(max_length=20, choices=POST_TYPES, db_index=True)
    title = models.CharField(
        max_length=255, 
        validators=[MinLengthValidator(5)],
        db_index=True
    )
    content = models.TextField(validators=[MinLengthValidator(10)])
    priority = models.CharField(max_length=10, choices=PRIORITY_LEVELS, default='medium')
    why_this_matters = models.TextField(blank=True)
    
    context_reason = models.TextField(blank=True)
    key_takeaway = models.CharField(max_length=255, blank=True)
    emotional_context = models.CharField(max_length=20, blank=True, choices=[
        ('urgent', '🚨 Urgent'),
        ('consensus', '🤝 Consensus'),
        ('risky', '⚠️ Risky'),
        ('experimental', '💡 Experimental'),
    ])
    
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    ai_summary = models.TextField(blank=True)
    ai_action_items = models.JSONField(default=list, blank=True)
    ai_keywords = models.JSONField(default=list, blank=True)
    ai_processed = models.BooleanField(default=False, db_index=True)
    ai_processing_error = models.TextField(blank=True)
    
    view_count = models.PositiveIntegerField(default=0)
    reply_count = models.PositiveIntegerField(default=0)
    
    is_archived = models.BooleanField(default=False, db_index=True)
    is_pinned = models.BooleanField(default=False)
    is_closed = models.BooleanField(default=False, db_index=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    closure_summary = models.TextField(blank=True)
    next_steps = models.TextField(blank=True)
    owner = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='owned_conversations')
    is_crisis = models.BooleanField(default=False, db_index=True)
    
    is_draft = models.BooleanField(default=False, db_index=True)
    draft_saved_at = models.DateTimeField(null=True, blank=True)
    
    memory_health_score = models.IntegerField(default=50)
    
    alternatives_considered = models.TextField(blank=True)
    tradeoffs = models.TextField(blank=True)
    code_links = models.JSONField(default=list, blank=True)
    plain_language_summary = models.TextField(blank=True)
    
    dev_simple_summary = models.TextField(blank=True)
    dev_technical_decision = models.JSONField(default=dict, blank=True)
    dev_action_items = models.JSONField(default=list, blank=True)
    dev_agile_context = models.JSONField(default=list, blank=True)
    dev_future_note = models.TextField(blank=True)
    dev_warnings = models.JSONField(default=dict, blank=True)
    
    STATUS_LABELS = [
        ('open', 'Open'),
        ('good_example', 'Good Example'),
        ('needs_followup', 'Needs Follow-up'),
        ('resolved', 'Resolved'),
        ('in_progress', 'In Progress'),
    ]
    status_label = models.CharField(max_length=20, choices=STATUS_LABELS, default='open', db_index=True)
    
    mentioned_users = models.ManyToManyField(User, related_name='mentioned_in', blank=True)
    tags = models.ManyToManyField(Tag, related_name='conversations', blank=True)
    
    class Meta:
        db_table = 'conversations'
        ordering = ['-is_pinned', '-created_at']
        indexes = [
            models.Index(fields=['organization', 'post_type', '-created_at']),
            models.Index(fields=['organization', 'author', '-created_at']),
            models.Index(fields=['organization', 'ai_processed']),
            models.Index(fields=['organization', 'is_archived', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.get_post_type_display()}: {self.title}"
    
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        try:
            from apps.organizations.automation_engine import trigger_automation
            trigger_automation(self, 'conversation_created', self.author)
        except Exception:
            pass

class ConversationReply(models.Model):
    conversation = models.ForeignKey(
        Conversation, 
        on_delete=models.CASCADE, 
        related_name='replies',
        db_index=True
    )
    author = models.ForeignKey(User, on_delete=models.CASCADE, db_index=True)
    content = models.TextField(validators=[MinLengthValidator(3)])
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    is_ai_generated = models.BooleanField(default=False)
    parent_reply = models.ForeignKey(
        'self', 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        related_name='child_replies'
    )
    mentioned_users = models.ManyToManyField(User, related_name='mentioned_in_replies', blank=True)
    
    class Meta:
        db_table = 'conversation_replies'
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['conversation', 'created_at']),
        ]
    
    def __str__(self):
        return f"Reply by {self.author.get_full_name()} on {self.conversation.title}"
    
    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        
        if is_new:
            try:
                from apps.organizations.automation_engine import trigger_automation
                from apps.notifications.helpers import notify_conversation_reply, notify_mentioned_users
                
                trigger_automation(self, 'comment_added', self.author)
                
                # Notify conversation author
                notify_conversation_reply(self, self.conversation)
                
                # Notify mentioned users
                mentioned_ids = list(self.mentioned_users.values_list('id', flat=True))
                if mentioned_ids:
                    notify_mentioned_users(self.conversation, mentioned_ids)
            except Exception:
                pass

class ActionItem(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    
    conversation = models.ForeignKey(
        Conversation, 
        on_delete=models.CASCADE, 
        related_name='action_items'
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    assignee = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='assigned_actions'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    priority = models.CharField(max_length=10, choices=Conversation.PRIORITY_LEVELS, default='medium')
    due_date = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    extracted_by_ai = models.BooleanField(default=False)
    confidence_score = models.FloatField(null=True, blank=True)
    
    class Meta:
        db_table = 'action_items'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['assignee', 'status']),
            models.Index(fields=['conversation', 'status']),
        ]
    
    def __str__(self):
        return self.title

class ConversationEditHistory(models.Model):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='edit_history')
    edited_by = models.ForeignKey(User, on_delete=models.CASCADE)
    edited_at = models.DateTimeField(auto_now_add=True)
    field_changed = models.CharField(max_length=50)
    old_value = models.TextField()
    new_value = models.TextField()
    
    class Meta:
        db_table = 'conversation_edit_history'
        ordering = ['-edited_at']

class Bookmark(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bookmarks')
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='bookmarks')
    created_at = models.DateTimeField(auto_now_add=True)
    note = models.TextField(blank=True)
    
    class Meta:
        db_table = 'bookmarks'
        unique_together = ['user', 'conversation']
        ordering = ['-created_at']

class Reaction(models.Model):
    REACTION_TYPES = [
        ('agree', '👍 Agree'),
        ('unsure', '🤔 Unsure'),
        ('concern', '👎 Concern'),
    ]
    
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='reactions')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    reaction_type = models.CharField(max_length=10, choices=REACTION_TYPES)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'reactions'
        unique_together = ['conversation', 'user']
        ordering = ['-created_at']

class UserPreferences(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='preferences')
    quiet_mode = models.BooleanField(default=False)
    muted_topics = models.JSONField(default=list)
    muted_post_types = models.JSONField(default=list)
    offline_mode = models.BooleanField(default=False)
    low_data_mode = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'user_preferences'

class Badge(models.Model):
    BADGE_TYPES = [
        ('decision_owner', 'Decision Owner'),
        ('context_contributor', 'Context Contributor'),
        ('knowledge_builder', 'Knowledge Builder'),
        ('crisis_responder', 'Crisis Responder'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='badges')
    badge_type = models.CharField(max_length=30, choices=BADGE_TYPES)
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, null=True, blank=True)
    earned_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'badges'
        ordering = ['-earned_at']

class CulturalMemory(models.Model):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    story = models.TextField()
    year = models.IntegerField()
    category = models.CharField(max_length=50)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'cultural_memories'
        ordering = ['-year']

class Document(models.Model):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, db_index=True)
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE, db_index=True)
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, null=True, blank=True, related_name='documents')
    
    file = models.FileField(upload_to='documents/%Y/%m/')
    filename = models.CharField(max_length=255)
    file_size = models.PositiveIntegerField()
    file_type = models.CharField(max_length=100)
    comment = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    
    class Meta:
        db_table = 'documents'
        ordering = ['-created_at']

# Auto-linking signal for conversations
@receiver(post_save, sender=Conversation)
def auto_link_conversation(sender, instance, created, **kwargs):
    if created and instance.ai_processed:
        try:
            from apps.knowledge.context_engine import ContextEngine
            engine = ContextEngine()
            engine.auto_link_content('conversations.conversation', instance.id, instance.organization)
        except Exception:
            pass
