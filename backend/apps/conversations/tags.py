from django.db import models
from apps.organizations.models import Organization

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
