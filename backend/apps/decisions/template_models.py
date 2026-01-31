from django.db import models
from apps.organizations.models import Organization, User

class DecisionTemplate(models.Model):
    TEMPLATE_TYPES = [
        ('technical', 'Technical Decision'),
        ('process', 'Process Decision'),
        ('hiring', 'Hiring Decision'),
        ('budget', 'Budget Decision'),
        ('strategy', 'Strategy Decision'),
        ('custom', 'Custom'),
    ]
    
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, db_index=True)
    name = models.CharField(max_length=255)
    template_type = models.CharField(max_length=20, choices=TEMPLATE_TYPES)
    description = models.TextField()
    
    # Template fields as JSON
    fields = models.JSONField(default=list)  # [{name, label, type, required, help_text}]
    
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'decision_templates'
        ordering = ['template_type', 'name']
        indexes = [
            models.Index(fields=['organization', 'template_type']),
        ]
