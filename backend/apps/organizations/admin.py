from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import Organization, User

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