from django.db import models
from apps.organizations.models import Organization, User
import secrets

class APIKey(models.Model):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='api_keys')
    name = models.CharField(max_length=200)
    key = models.CharField(max_length=64, unique=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_used_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'api_keys'
        ordering = ['-created_at']
    
    @staticmethod
    def generate_key():
        return f"recall_{secrets.token_urlsafe(32)}"
    
    def __str__(self):
        return f"{self.name} - {self.key[:20]}..."
