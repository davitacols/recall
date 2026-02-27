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


class CompliancePolicy(models.Model):
    """Enterprise governance, residency, and compliance controls."""
    REGION_CHOICES = [
        ('us', 'United States'),
        ('eu', 'European Union'),
        ('uk', 'United Kingdom'),
        ('ca', 'Canada'),
        ('apac', 'Asia Pacific'),
    ]

    organization = models.OneToOneField(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='compliance_policy',
    )
    data_residency_region = models.CharField(max_length=20, choices=REGION_CHOICES, default='us')
    require_sso = models.BooleanField(default=False)
    require_mfa = models.BooleanField(default=False)
    audit_export_enabled = models.BooleanField(default=True)
    third_party_app_approval_required = models.BooleanField(default=True)
    retention_days = models.PositiveIntegerField(default=365)
    ip_allowlist = models.JSONField(default=list, blank=True)
    allowed_integrations = models.JSONField(default=list, blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.organization.name} Compliance Policy"


class MarketplaceApp(models.Model):
    """Installable app metadata for organization marketplace."""
    APP_CATEGORY_CHOICES = [
        ('engineering', 'Engineering'),
        ('knowledge', 'Knowledge'),
        ('security', 'Security'),
        ('automation', 'Automation'),
        ('reporting', 'Reporting'),
    ]

    slug = models.SlugField(unique=True)
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    vendor = models.CharField(max_length=120, default='Knoledgr')
    category = models.CharField(max_length=30, choices=APP_CATEGORY_CHOICES, default='engineering')
    pricing = models.CharField(max_length=40, default='free')
    docs_url = models.URLField(blank=True)
    launch_path = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class InstalledMarketplaceApp(models.Model):
    """Installed app records per organization."""
    STATUS_CHOICES = [
        ('installed', 'Installed'),
        ('disabled', 'Disabled'),
    ]

    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='installed_marketplace_apps',
    )
    app = models.ForeignKey(
        MarketplaceApp,
        on_delete=models.CASCADE,
        related_name='installations',
    )
    installed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='installed_marketplace_apps',
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='installed')
    config = models.JSONField(default=dict, blank=True)
    installed_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['organization', 'app']
        ordering = ['-installed_at']

    def __str__(self):
        return f"{self.organization.name} - {self.app.name}"


class RolePermissionPolicy(models.Model):
    """Organization-level permission overrides by role."""
    organization = models.OneToOneField(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='role_permission_policy',
    )
    role_overrides = models.JSONField(default=dict, blank=True)
    require_admin_approval_for_delete = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.organization.name} Role Permission Policy"


class EnterpriseIncident(models.Model):
    """Incident and SLA automation events for enterprise operations."""
    TYPE_CHOICES = [
        ('sla_risk', 'SLA Risk'),
        ('blocker_spike', 'Blocker Spike'),
        ('delivery_risk', 'Delivery Risk'),
    ]
    SEVERITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]
    STATUS_CHOICES = [
        ('open', 'Open'),
        ('resolved', 'Resolved'),
    ]

    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='enterprise_incidents',
    )
    source_key = models.CharField(max_length=200)
    incident_type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default='medium')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    source_payload = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = ['organization', 'source_key', 'status']

    def __str__(self):
        return f"{self.organization.name}: {self.title}"


class ProjectPermissionScope(models.Model):
    """Project-level permission scope overrides by role."""
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('manager', 'Manager'),
        ('contributor', 'Contributor'),
    ]

    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='project_permission_scopes',
    )
    project = models.ForeignKey(
        'agile.Project',
        on_delete=models.CASCADE,
        related_name='permission_scopes',
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    allowed_permissions = models.JSONField(default=list, blank=True)
    denied_permissions = models.JSONField(default=list, blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['organization', 'project', 'role']
        ordering = ['project__name', 'role']

    def __str__(self):
        return f"{self.organization.name} {self.project.key} {self.role}"


class SLARule(models.Model):
    """Rule builder for SLA risk detection and policy actions."""
    METRIC_CHOICES = [
        ('uptime', 'Uptime'),
        ('response_time', 'Response Time'),
        ('resolution_time', 'Issue Resolution Time'),
        ('support_response', 'Support Response Time'),
    ]

    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='sla_rules',
    )
    name = models.CharField(max_length=120)
    metric = models.CharField(max_length=30, choices=METRIC_CHOICES)
    threshold_percent = models.DecimalField(max_digits=5, decimal_places=2, default=99.90)
    lookback_days = models.PositiveIntegerField(default=30)
    severity = models.CharField(max_length=20, choices=EnterpriseIncident.SEVERITY_CHOICES, default='high')
    enabled = models.BooleanField(default=True)
    auto_notify_admins = models.BooleanField(default=True)
    auto_create_incident = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.organization.name}: {self.name}"


class IncidentEscalationRule(models.Model):
    """Escalation workflow rules for enterprise incidents."""
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='incident_escalation_rules',
    )
    name = models.CharField(max_length=120)
    enabled = models.BooleanField(default=True)
    incident_type = models.CharField(max_length=30, blank=True, help_text='Empty means all incident types')
    min_severity = models.CharField(max_length=20, choices=EnterpriseIncident.SEVERITY_CHOICES, default='high')
    escalation_delay_minutes = models.PositiveIntegerField(default=0)
    create_task = models.BooleanField(default=True)
    create_blocker = models.BooleanField(default=False)
    notify_admins = models.BooleanField(default=True)
    assign_to_role = models.CharField(max_length=20, default='admin')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['escalation_delay_minutes', 'name']

    def __str__(self):
        return f"{self.organization.name}: {self.name}"


class EnterpriseIncidentEscalation(models.Model):
    """Execution record to avoid duplicate escalations per incident/rule."""
    incident = models.ForeignKey(
        EnterpriseIncident,
        on_delete=models.CASCADE,
        related_name='escalations',
    )
    rule = models.ForeignKey(
        IncidentEscalationRule,
        on_delete=models.CASCADE,
        related_name='executions',
    )
    task_id = models.IntegerField(null=True, blank=True)
    blocker_id = models.IntegerField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['incident', 'rule']
        ordering = ['-created_at']

    def __str__(self):
        return f"Escalation {self.incident_id} via {self.rule_id}"
