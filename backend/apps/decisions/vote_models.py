from django.db import models
from apps.organizations.models import Organization, User
from apps.decisions.models import Decision

class DecisionVote(models.Model):
    VOTE_CHOICES = [
        ('approve', 'Approve'),
        ('reject', 'Reject'),
        ('abstain', 'Abstain'),
    ]
    
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, db_index=True)
    decision = models.ForeignKey(Decision, on_delete=models.CASCADE, related_name='votes')
    voter = models.ForeignKey(User, on_delete=models.CASCADE)
    
    vote = models.CharField(max_length=20, choices=VOTE_CHOICES)
    confidence = models.IntegerField(default=5, help_text='1-10 confidence level')
    comment = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'decision_votes'
        unique_together = ['decision', 'voter']
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['organization', 'decision', '-created_at']),
        ]

class ConsensusSnapshot(models.Model):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, db_index=True)
    decision = models.ForeignKey(Decision, on_delete=models.CASCADE, related_name='consensus_snapshots')
    
    total_votes = models.IntegerField()
    approve_count = models.IntegerField()
    reject_count = models.IntegerField()
    abstain_count = models.IntegerField()
    
    approval_percentage = models.FloatField()
    avg_confidence = models.FloatField()
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'consensus_snapshots'
        ordering = ['-created_at']
