from django.db import models
from django.utils import timezone
import uuid

class Invitation(models.Model):
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('manager', 'Manager'),
        ('contributor', 'Contributor')
    ]
    
    organization = models.ForeignKey('Organization', on_delete=models.CASCADE, related_name='invitations')
    email = models.EmailField()
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='contributor')
    token = models.UUIDField(default=uuid.uuid4, unique=True)
    invited_by = models.ForeignKey('User', on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    accepted_at = models.DateTimeField(null=True, blank=True)
    is_accepted = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'invitations'
        unique_together = ['organization', 'email']
    
    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timezone.timedelta(days=7)
        super().save(*args, **kwargs)
    
    def is_valid(self):
        return not self.is_accepted and timezone.now() < self.expires_at
