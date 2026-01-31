from django.db import models
from apps.organizations.models import Organization, User
from apps.decisions.models import Decision

class DecisionProposal(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('submitted', 'Submitted'),
        ('under_review', 'Under Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('implemented', 'Implemented'),
    ]
    
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, db_index=True)
    decision = models.OneToOneField(Decision, on_delete=models.CASCADE, related_name='decision_proposal', null=True, blank=True)
    
    title = models.CharField(max_length=255)
    description = models.TextField()
    rationale = models.TextField()
    
    proposer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='proposed_decisions')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    
    required_approvers = models.ManyToManyField(User, related_name='decisions_to_approve')
    approvals = models.JSONField(default=dict)  # {user_id: {'approved': bool, 'comment': str, 'at': datetime}}
    
    created_at = models.DateTimeField(auto_now_add=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    decided_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'decision_proposals'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['organization', 'status', '-created_at']),
        ]

class ProposalApproval(models.Model):
    proposal = models.ForeignKey(DecisionProposal, on_delete=models.CASCADE, related_name='approval_records')
    approver = models.ForeignKey(User, on_delete=models.CASCADE)
    approved = models.BooleanField()
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'proposal_approvals'
        unique_together = ['proposal', 'approver']
