from django.urls import path
from .views import OrganizationDetailView
from .activity_views import activity_feed, activity_stats
from .invitation_views import invite_user, verify_invitation, accept_invitation, list_invitations, create_organization, revoke_invitation
from .settings_views import (
    user_profile, change_password, user_stats, notification_settings,
    organization_settings, update_organization, organization_members,
    update_member_role, remove_member, invite_member, api_keys,
    generate_api_key, export_data, delete_account, activity_log, security_log, get_invitation_link,
    get_invitation_links
)
from .team_views import (
    get_team_members, get_user_role_info, change_user_role, remove_user,
    get_audit_logs, get_user_activity, create_team_workflow, activate_workflow,
    get_team_workflows, get_workflow_instances, approve_workflow_step, reject_workflow_step
)
from .automation_views import (
    get_automation_rules, create_automation_rule, activate_automation_rule, pause_automation_rule,
    delete_automation_rule, get_automation_executions, get_automation_templates,
    create_rule_from_template, get_rule_details, update_automation_rule
)
from .analytics_views import (
    get_metrics, get_dashboard_data, create_report, get_reports, get_report_data, publish_report,
    create_dashboard, get_dashboards, get_dashboard, update_dashboard,
    create_integration, get_integrations, test_integration, delete_integration, get_integration_logs
)

from .apikey_views import api_keys_list, api_key_delete, api_key_toggle
from .auditlog_views import audit_logs_list, audit_log_stats
from .export_views import export_data_endpoint

urlpatterns = [
    path('current/', OrganizationDetailView.as_view(), name='current-org'),
    path('me/', OrganizationDetailView.as_view(), name='org-me'),
    path('activity/feed/', activity_feed, name='activity-feed-explicit'),
    path('activity/stats/', activity_stats, name='activity-stats'),
    path('activity/', activity_feed, name='activity-feed'),
    path('invitations/', list_invitations, name='list_invitations'),
    path('invitations/send/', invite_user, name='invite_user'),
    path('invitations/<uuid:token>/', verify_invitation, name='verify_invitation'),
    path('invitations/<uuid:token>/accept/', accept_invitation, name='accept_invitation'),
    path('invitations/<int:invitation_id>/revoke/', revoke_invitation, name='revoke_invitation'),
    path('signup/', create_organization, name='create_organization'),
    
    # Settings endpoints
    path('settings/profile/', user_profile, name='user-profile'),
    path('settings/password/', change_password, name='change-password'),
    path('settings/stats/', user_stats, name='user-stats'),
    path('settings/notifications/', notification_settings, name='notification-settings'),
    path('settings/organization/', organization_settings, name='organization-settings'),
    path('settings/organization/update/', update_organization, name='update-organization'),
    path('settings/members/', organization_members, name='organization-members'),
    path('settings/members/<int:user_id>/role/', update_member_role, name='update-member-role'),
    path('settings/members/<int:user_id>/remove/', remove_member, name='remove-member'),
    path('settings/members/invite/', invite_member, name='invite-member'),
    path('settings/api-keys/', api_keys, name='api-keys'),
    path('settings/api-keys/generate/', generate_api_key, name='generate-api-key'),
    path('api-keys/', api_keys_list, name='api-keys-list'),
    path('api-keys/<int:key_id>/', api_key_delete, name='api-key-delete'),
    path('api-keys/<int:key_id>/toggle/', api_key_toggle, name='api-key-toggle'),
    path('settings/export/', export_data, name='export-data'),
    path('export/', export_data_endpoint, name='export-endpoint'),
    path('settings/delete-account/', delete_account, name='delete-account'),
    path('settings/activity-log/', activity_log, name='activity-log'),
    path('settings/security-log/', security_log, name='security-log'),
    path('settings/test-invitation/', get_invitation_link, name='test-invitation'),
    path('settings/invitation-links/', get_invitation_links, name='invitation-links'),
    
    # Shorthand routes for frontend (more specific patterns first)
    path('members/invite/', invite_member, name='members-invite'),
    path('members/<int:user_id>/', remove_member, name='member-detail'),
    path('members/', organization_members, name='members-list'),
    path('team/members/', get_team_members, name='team-members'),
    path('team/users/<int:user_id>/', get_user_role_info, name='user-role-info'),
    path('team/users/<int:user_id>/role/', change_user_role, name='change-user-role'),
    path('team/users/<int:user_id>/remove/', remove_user, name='remove-user'),
    path('team/activity/<int:user_id>/', get_user_activity, name='user-activity'),
    
    # Audit log endpoints
    path('audit-logs/', get_audit_logs, name='audit-logs'),
    path('audit/', audit_logs_list, name='audit-logs-list'),
    path('audit/stats/', audit_log_stats, name='audit-stats'),
    
    # Workflow endpoints
    path('workflows/', get_team_workflows, name='workflows-list'),
    path('workflows/create/', create_team_workflow, name='create-workflow'),
    path('workflows/<int:workflow_id>/activate/', activate_workflow, name='activate-workflow'),
    path('workflows/<int:workflow_id>/instances/', get_workflow_instances, name='workflow-instances'),
    path('workflows/instances/<int:instance_id>/approve/', approve_workflow_step, name='approve-workflow'),
    path('workflows/instances/<int:instance_id>/reject/', reject_workflow_step, name='reject-workflow'),
    
    # Automation endpoints
    path('automation/rules/', get_automation_rules, name='automation-rules'),
    path('automation/rules/create/', create_automation_rule, name='create-automation-rule'),
    path('automation/rules/<int:rule_id>/', get_rule_details, name='rule-details'),
    path('automation/rules/<int:rule_id>/update/', update_automation_rule, name='update-automation-rule'),
    path('automation/rules/<int:rule_id>/activate/', activate_automation_rule, name='activate-automation-rule'),
    path('automation/rules/<int:rule_id>/pause/', pause_automation_rule, name='pause-automation-rule'),
    path('automation/rules/<int:rule_id>/delete/', delete_automation_rule, name='delete-automation-rule'),
    path('automation/rules/<int:rule_id>/executions/', get_automation_executions, name='automation-executions'),
    path('automation/templates/', get_automation_templates, name='automation-templates'),
    path('automation/templates/<int:template_id>/create/', create_rule_from_template, name='create-from-template'),
    
    # Analytics endpoints
    path('analytics/metrics/', get_metrics, name='analytics-metrics'),
    path('analytics/dashboard/', get_dashboard_data, name='dashboard-data'),
    path('analytics/reports/', get_reports, name='reports-list'),
    path('analytics/reports/create/', create_report, name='create-report'),
    path('analytics/reports/<int:report_id>/', get_report_data, name='report-data'),
    path('analytics/reports/<int:report_id>/publish/', publish_report, name='publish-report'),
    
    # Dashboard endpoints
    path('analytics/dashboards/', get_dashboards, name='dashboards-list'),
    path('analytics/dashboards/create/', create_dashboard, name='create-dashboard'),
    path('analytics/dashboards/<int:dashboard_id>/', get_dashboard, name='dashboard-detail'),
    path('analytics/dashboards/<int:dashboard_id>/update/', update_dashboard, name='update-dashboard'),
    
    # Integration endpoints
    path('integrations/', get_integrations, name='integrations-list'),
    path('integrations/create/', create_integration, name='create-integration'),
    path('integrations/<int:integration_id>/test/', test_integration, name='test-integration'),
    path('integrations/<int:integration_id>/delete/', delete_integration, name='delete-integration'),
    path('integrations/<int:integration_id>/logs/', get_integration_logs, name='integration-logs'),
]
