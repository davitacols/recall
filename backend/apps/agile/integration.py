"""
Unified integration layer connecting Decisions, Conversations, and Issues
"""
from django.db import models
from apps.decisions.models import Decision
from apps.conversations.models import Conversation
from .models import Issue, Blocker, Sprint

class DecisionIssueLink(models.Model):
    """Links decisions to issues they impact"""
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
