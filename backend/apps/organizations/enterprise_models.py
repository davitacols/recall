from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class SSOConfig(models.Model):
    """SAML/SSO configuration for enterprise organizations"""
    PROVIDER_CHOICES = [
        ('saml', 'SAML 2.0'),
        ('okta', 'Okta'),
        ('azure', 'Azure AD'),
        ('google', 'Google Workspace'),
    ]
    
    organization = models.OneToOneField('organizations.Organization', on_delete=models.CASCADE, related_name='sso_config')
    provider = models.CharField(max_length=20, choices=PROVIDER_CHOICES)
    enabled = models.BooleanField(default=False)
    
    # SAML Configuration
    entity_id = models.CharField(max_length=500, blank=True)
    sso_url = models.URLField(blank=True)
    x509_cert = models.TextField(blank=True)
    
    # Additional settings
    auto_provision_users = models.BooleanField(default=True)
    default_role = models.CharField(max_length=20, default='member')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.organization.name} - {self.provider}"


class AccountManager(models.Model):
    """Dedicated account manager for enterprise customers"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='managed_account')
    organizations = models.ManyToManyField('organizations.Organization', related_name='account_manager')
    
    phone = models.CharField(max_length=20, blank=True)
    timezone = models.CharField(max_length=50, default='UTC')
    availability = models.TextField(blank=True, help_text="Working hours and availability")
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.user.full_name} - Account Manager"


class TrainingProgram(models.Model):
    """Custom training programs for enterprise customers"""
    STATUS_CHOICES = [
        ('scheduled', 'Scheduled'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    
    organization = models.ForeignKey('organizations.Organization', on_delete=models.CASCADE, related_name='training_programs')
    title = models.CharField(max_length=200)
    description = models.TextField()
    
    training_date = models.DateTimeField()
    duration_hours = models.IntegerField(default=2)
    location = models.CharField(max_length=200, blank=True, help_text="Virtual or physical location")
    
    trainer = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='training_sessions')
    attendees = models.ManyToManyField(User, related_name='attended_trainings', blank=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled')
    materials_url = models.URLField(blank=True)
    recording_url = models.URLField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.title} - {self.organization.name}"


class SLAGuarantee(models.Model):
    """SLA guarantees and tracking for enterprise customers"""
    METRIC_CHOICES = [
        ('uptime', 'Uptime'),
        ('response_time', 'Response Time'),
        ('resolution_time', 'Issue Resolution Time'),
        ('support_response', 'Support Response Time'),
    ]
    
    organization = models.ForeignKey('organizations.Organization', on_delete=models.CASCADE, related_name='sla_guarantees')
    metric = models.CharField(max_length=30, choices=METRIC_CHOICES)
    
    guaranteed_value = models.DecimalField(max_digits=5, decimal_places=2, help_text="e.g., 99.9 for uptime %")
    actual_value = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    
    period_start = models.DateField()
    period_end = models.DateField()
    
    met = models.BooleanField(null=True, blank=True)
    notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-period_start']
    
    def __str__(self):
        return f"{self.organization.name} - {self.metric} SLA"


class OnPremiseDeployment(models.Model):
    """On-premise deployment configurations and tracking"""
    STATUS_CHOICES = [
        ('requested', 'Requested'),
        ('in_progress', 'In Progress'),
        ('deployed', 'Deployed'),
        ('maintenance', 'Maintenance'),
        ('decommissioned', 'Decommissioned'),
    ]
    
    organization = models.OneToOneField('organizations.Organization', on_delete=models.CASCADE, related_name='on_premise')
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='requested')
    
    # Infrastructure details
    server_location = models.CharField(max_length=200)
    server_specs = models.TextField(blank=True)
    database_type = models.CharField(max_length=50, default='PostgreSQL')
    
    # Deployment info
    version = models.CharField(max_length=20, blank=True)
    deployment_date = models.DateField(null=True, blank=True)
    last_update = models.DateField(null=True, blank=True)
    
    # Support
    technical_contact = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='on_premise_deployments')
    support_email = models.EmailField(blank=True)
    support_phone = models.CharField(max_length=20, blank=True)
    
    notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.organization.name} - On-Premise ({self.status})"
