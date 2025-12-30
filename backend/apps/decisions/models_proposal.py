from django.db import models
from django.utils import timezone
from apps.organizations.models import User, Organization

class Proposal(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('open', 'Open for Discussion'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
    ]
    
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, db_index=True)
    title = models.CharField(max_length=255)
    description = models.TextField()
    rationale = models.TextField(blank=True)
    
    # Proposal details
    proposed_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='proposals_created')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft', db_index=True)
    
    # Discussion
    alternatives_considered = models.TextField(blank=True)
    risks = models.TextField(blank=True)
    
    # Decision outcome
    accepted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='proposals_accepted')
    accepted_at = models.DateTimeField(null=True, blank=True)
    decision = models.OneToOneField('decisions.Decision', on_delete=models.SET_NULL, null=True, blank=True, related_name='proposal')
    
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'proposals'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['organization', 'status', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.title} ({self.status})"
