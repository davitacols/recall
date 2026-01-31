from django.db import models
from apps.organizations.models import Organization, User
from apps.conversations.models import Conversation

class FAQ(models.Model):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, db_index=True)
    question = models.CharField(max_length=500)
    answer = models.TextField()
    source_conversation = models.ForeignKey(Conversation, on_delete=models.SET_NULL, null=True, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    
    helpful_count = models.IntegerField(default=0)
    unhelpful_count = models.IntegerField(default=0)
    view_count = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'faqs'
        ordering = ['-helpful_count', '-view_count']
        indexes = [
            models.Index(fields=['organization', '-created_at']),
        ]

class FAQFeedback(models.Model):
    faq = models.ForeignKey(FAQ, on_delete=models.CASCADE, related_name='feedback')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    is_helpful = models.BooleanField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'faq_feedback'
        unique_together = ['faq', 'user']
