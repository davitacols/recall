from django.db import models
from apps.organizations.models import User
from .models import Decision

class DecisionLock(models.Model):
    """Track when locked decisions are overridden"""
    decision = models.ForeignKey(Decision, on_delete=models.CASCADE, related_name='lock_overrides')
    overridden_by = models.ForeignKey(User, on_delete=models.CASCADE)
    override_reason = models.TextField()
    overridden_at = models.DateTimeField(auto_now_add=True)
    previous_value = models.JSONField()
    new_value = models.JSONField()
    
    class Meta:
        db_table = 'decision_lock_overrides'
        ordering = ['-overridden_at']

class SimilarDecision(models.Model):
    """Track similar decisions for AI suggestions"""
    decision = models.ForeignKey(Decision, on_delete=models.CASCADE, related_name='similar_to')
    similar_decision = models.ForeignKey(Decision, on_delete=models.CASCADE, related_name='similar_from')
    similarity_score = models.FloatField()
    similarity_reason = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'similar_decisions'
        unique_together = ['decision', 'similar_decision']
        ordering = ['-similarity_score']
