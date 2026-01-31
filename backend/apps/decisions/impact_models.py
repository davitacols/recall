from django.db import models
from apps.organizations.models import Organization, User
from apps.decisions.models import Decision

class DecisionMetric(models.Model):
    METRIC_TYPES = [
        ('performance', 'Performance'),
        ('revenue', 'Revenue'),
        ('cost', 'Cost'),
        ('efficiency', 'Efficiency'),
        ('quality', 'Quality'),
        ('adoption', 'Adoption'),
        ('custom', 'Custom'),
    ]
    
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, db_index=True)
    decision = models.ForeignKey(Decision, on_delete=models.CASCADE, related_name='metrics')
    
    name = models.CharField(max_length=255)
    metric_type = models.CharField(max_length=20, choices=METRIC_TYPES)
    description = models.TextField(blank=True)
    
    baseline_value = models.FloatField()
    baseline_date = models.DateField()
    
    current_value = models.FloatField(null=True, blank=True)
    current_date = models.DateField(null=True, blank=True)
    
    target_value = models.FloatField(null=True, blank=True)
    target_date = models.DateField(null=True, blank=True)
    
    unit = models.CharField(max_length=50, blank=True)  # %, $, ms, etc
    
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'decision_metrics'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['organization', 'decision', '-created_at']),
        ]

class MetricDataPoint(models.Model):
    metric = models.ForeignKey(DecisionMetric, on_delete=models.CASCADE, related_name='data_points')
    value = models.FloatField()
    recorded_date = models.DateField()
    recorded_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'metric_data_points'
        unique_together = ['metric', 'recorded_date']
        ordering = ['recorded_date']
