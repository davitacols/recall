from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import Organization, User
from .enterprise_models import (
    SSOConfig,
    AccountManager,
    TrainingProgram,
    SLAGuarantee,
    OnPremiseDeployment,
    CompliancePolicy,
    MarketplaceApp,
    InstalledMarketplaceApp,
    RolePermissionPolicy,
    EnterpriseIncident,
    ProjectPermissionScope,
    SLARule,
    IncidentEscalationRule,
    EnterpriseIncidentEscalation,
)

@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'max_users', 'ai_processing_enabled', 'is_active', 'created_at']
    list_filter = ['is_active', 'ai_processing_enabled', 'created_at']
    search_fields = ['name', 'slug']
    readonly_fields = ['created_at']
    
    fieldsets = [
        ('Basic Information', {
            'fields': ['name', 'slug', 'is_active']
        }),
        ('Limits & Features', {
            'fields': ['max_users', 'ai_processing_enabled']
        }),
        ('Timestamps', {
            'fields': ['created_at'],
            'classes': ['collapse']
        }),
    ]

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['username', 'organization', 'role', 'full_name', 'is_active', 'last_active']
    list_filter = ['role', 'is_active', 'organization', 'date_joined']
    search_fields = ['username', 'full_name', 'email']
    
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Organization', {
            'fields': ['organization', 'role']
        }),
        ('Profile', {
            'fields': ['full_name', 'avatar_url', 'timezone']
        }),
        ('Activity', {
            'fields': ['last_active'],
            'classes': ['collapse']
        }),
    )
    
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Organization', {
            'fields': ['organization', 'role']
        }),
    )

@admin.register(SSOConfig)
class SSOConfigAdmin(admin.ModelAdmin):
    list_display = ['organization', 'provider', 'enabled', 'created_at']
    list_filter = ['provider', 'enabled']

@admin.register(AccountManager)
class AccountManagerAdmin(admin.ModelAdmin):
    list_display = ['user', 'phone', 'timezone']

@admin.register(TrainingProgram)
class TrainingProgramAdmin(admin.ModelAdmin):
    list_display = ['title', 'organization', 'training_date', 'status']
    list_filter = ['status', 'training_date']

@admin.register(SLAGuarantee)
class SLAGuaranteeAdmin(admin.ModelAdmin):
    list_display = ['organization', 'metric', 'guaranteed_value', 'actual_value', 'met']
    list_filter = ['metric', 'met']

@admin.register(OnPremiseDeployment)
class OnPremiseDeploymentAdmin(admin.ModelAdmin):
    list_display = ['organization', 'status', 'server_location', 'deployment_date']
    list_filter = ['status']


@admin.register(CompliancePolicy)
class CompliancePolicyAdmin(admin.ModelAdmin):
    list_display = [
        'organization',
        'data_residency_region',
        'require_sso',
        'require_mfa',
        'third_party_app_approval_required',
        'updated_at',
    ]
    list_filter = ['data_residency_region', 'require_sso', 'require_mfa', 'third_party_app_approval_required']


@admin.register(MarketplaceApp)
class MarketplaceAppAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'vendor', 'category', 'pricing', 'is_active']
    list_filter = ['category', 'is_active', 'vendor']
    search_fields = ['name', 'slug', 'vendor']


@admin.register(InstalledMarketplaceApp)
class InstalledMarketplaceAppAdmin(admin.ModelAdmin):
    list_display = ['organization', 'app', 'status', 'installed_by', 'installed_at']
    list_filter = ['status', 'app__category', 'app__vendor']
    search_fields = ['organization__name', 'app__name', 'app__slug']


@admin.register(RolePermissionPolicy)
class RolePermissionPolicyAdmin(admin.ModelAdmin):
    list_display = ['organization', 'require_admin_approval_for_delete', 'updated_at']
    search_fields = ['organization__name']


@admin.register(EnterpriseIncident)
class EnterpriseIncidentAdmin(admin.ModelAdmin):
    list_display = ['organization', 'incident_type', 'severity', 'status', 'title', 'created_at']
    list_filter = ['incident_type', 'severity', 'status']
    search_fields = ['organization__name', 'title', 'source_key']


@admin.register(ProjectPermissionScope)
class ProjectPermissionScopeAdmin(admin.ModelAdmin):
    list_display = ['organization', 'project', 'role', 'updated_at']
    list_filter = ['role']
    search_fields = ['organization__name', 'project__name', 'project__key']


@admin.register(SLARule)
class SLARuleAdmin(admin.ModelAdmin):
    list_display = ['organization', 'name', 'metric', 'threshold_percent', 'lookback_days', 'severity', 'enabled']
    list_filter = ['metric', 'severity', 'enabled']
    search_fields = ['organization__name', 'name']


@admin.register(IncidentEscalationRule)
class IncidentEscalationRuleAdmin(admin.ModelAdmin):
    list_display = ['organization', 'name', 'incident_type', 'min_severity', 'escalation_delay_minutes', 'enabled']
    list_filter = ['incident_type', 'min_severity', 'enabled']
    search_fields = ['organization__name', 'name']


@admin.register(EnterpriseIncidentEscalation)
class EnterpriseIncidentEscalationAdmin(admin.ModelAdmin):
    list_display = ['incident', 'rule', 'task_id', 'blocker_id', 'created_at']
    list_filter = ['rule__name']
