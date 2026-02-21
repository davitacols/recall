from django.db import models
from apps.organizations.models import Organization, User

class DocumentComment(models.Model):
    document = models.ForeignKey('Document', on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.TextField()
    mentioned_users = models.ManyToManyField(User, related_name='document_mentions', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'document_comments'
        ordering = ['created_at']

class Document(models.Model):
    DOCUMENT_TYPES = [
        ('policy', 'Policy'),
        ('procedure', 'Procedure'),
        ('guide', 'Guide'),
        ('report', 'Report'),
        ('other', 'Other'),
    ]
    
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='business_documents')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    document_type = models.CharField(max_length=20, choices=DOCUMENT_TYPES, default='other')
    content = models.TextField()
    file_data = models.BinaryField(null=True, blank=True)
    file_name = models.CharField(max_length=255, blank=True)
    file_type = models.CharField(max_length=100, blank=True)
    file_url = models.URLField(blank=True)
    version = models.CharField(max_length=50, default='1.0')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_documents')
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='updated_documents')
    goal_id = models.IntegerField(null=True, blank=True)
    meeting_id = models.IntegerField(null=True, blank=True)
    task_id = models.IntegerField(null=True, blank=True)
    tags = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'business_documents'
        ordering = ['-updated_at']
