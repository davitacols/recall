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
    get_analytics, get_metrics, get_dashboard_data, create_report, get_reports, get_report_data, publish_report,
    create_dashboard, get_dashboards, get_dashboard, update_dashboard,
    create_integration, get_integrations, test_integration, delete_integration, get_integration_logs
)

from .apikey_views import api_keys_list, api_key_delete, api_key_toggle
from .auditlog_views import audit_logs_list, audit_log_stats
from .export_views import export_data_endpoint
from .search_views import global_search
from .bulk_operations import (
    bulk_delete_conversations, bulk_archive_conversations, bulk_update_status,
    bulk_delete_documents, bulk_assign_issues, bulk_update_priority
)
from .pdf_export import export_document_pdf, export_conversation_pdf, export_decision_pdf, export_bulk_pdf
from .ai_enhancements import (
    auto_summarize, smart_suggestions, sentiment_analysis, auto_tag, batch_ai_process, apply_ai_to_item
)
from . import subscription_views, stripe_views, ai_views, enterprise_views, import_export_views

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
    path('analytics/', get_analytics, name='analytics-overview'),
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
    
    # Subscription & Billing
    path('plans/', subscription_views.plans_list),
    path('subscription/', subscription_views.subscription_detail),
    path('subscription/upgrade/', subscription_views.upgrade_plan),
    path('subscription/cancel/', subscription_views.cancel_subscription),
    path('invoices/', subscription_views.invoices_list),
    path('usage/', subscription_views.usage_stats),
    path('check-limits/', subscription_views.check_limits),
    path('feature-access/', subscription_views.feature_access),
    path('subscription/conversion/', subscription_views.conversion_insights),
    
    # Stripe Payment
    path('stripe/checkout/', stripe_views.create_checkout_session),
    path('stripe/portal/', stripe_views.create_portal_session),
    path('stripe/webhook/', stripe_views.stripe_webhook),
    path('stripe/status/', stripe_views.subscription_status),
    
    # AI Features
    path('ai/summary/', ai_views.generate_summary),
    path('ai/suggestions/', ai_views.suggest_related),
    path('ai/actions/', ai_views.extract_actions),
    path('ai/tags/', ai_views.suggest_tags),
    
    # Enterprise Features
    path('enterprise/sso/', enterprise_views.sso_config),
    path('enterprise/account-manager/', enterprise_views.account_manager_info),
    path('enterprise/training/', enterprise_views.training_programs),
    path('enterprise/training/<int:pk>/', enterprise_views.training_program_detail),
    path('enterprise/sla/', enterprise_views.sla_guarantees),
    path('enterprise/on-premise/', enterprise_views.on_premise_deployment),
    path('enterprise/compliance/', enterprise_views.compliance_policy),
    path('enterprise/permissions/', enterprise_views.role_permission_policy),
    path('enterprise/permissions/project-scopes/', enterprise_views.project_permission_scopes),
    path('enterprise/marketplace/apps/', enterprise_views.marketplace_apps),
    path('enterprise/marketplace/apps/<int:app_id>/install/', enterprise_views.install_marketplace_app),
    path('enterprise/marketplace/apps/<int:app_id>/uninstall/', enterprise_views.uninstall_marketplace_app),
    path('enterprise/sla-rules/', enterprise_views.sla_rules),
    path('enterprise/sla-rules/<int:rule_id>/', enterprise_views.sla_rule_detail),
    path('enterprise/portfolio-report/', enterprise_views.portfolio_report),
    path('enterprise/incidents/', enterprise_views.incident_center),
    path('enterprise/incidents/escalation-rules/', enterprise_views.incident_escalation_rules),
    path('enterprise/incidents/escalation-rules/<int:rule_id>/', enterprise_views.incident_escalation_rule_detail),
    path('enterprise/incidents/run-automation/', enterprise_views.run_incident_automation),
    
    # Import/Export
    path('import/', import_export_views.import_data),
    path('data-export/', import_export_views.export_data),
    
    # Global Search
    path('search/', global_search, name='global-search'),
    
    # Bulk Operations
    path('bulk/conversations/delete/', bulk_delete_conversations),
    path('bulk/conversations/archive/', bulk_archive_conversations),
    path('bulk/decisions/status/', bulk_update_status),
    path('bulk/documents/delete/', bulk_delete_documents),
    path('bulk/issues/assign/', bulk_assign_issues),
    path('bulk/issues/priority/', bulk_update_priority),
    
    # PDF Export
    path('pdf/document/<int:pk>/', export_document_pdf),
    path('pdf/conversation/<int:pk>/', export_conversation_pdf),
    path('pdf/decision/<int:pk>/', export_decision_pdf),
    path('pdf/bulk/', export_bulk_pdf),
    
    # AI Enhancements
    path('ai/summarize/', auto_summarize),
    path('ai/suggestions/', smart_suggestions),
    path('ai/sentiment/', sentiment_analysis),
    path('ai/tags/', auto_tag),
    path('ai/batch/', batch_ai_process),
    path('ai/<str:item_type>/<int:item_id>/process/', apply_ai_to_item),
]
