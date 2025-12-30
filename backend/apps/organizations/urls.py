from django.urls import path
from .views import OrganizationDetailView
from .activity_views import activity_feed, activity_stats
from .analytics_views import analytics
from .invitation_views import invite_user, verify_invitation, accept_invitation, list_invitations, create_organization, revoke_invitation
from .settings_views import (
    user_profile, change_password, user_stats, notification_settings,
    organization_settings, update_organization, organization_members,
    update_member_role, remove_member, invite_member, api_keys,
    generate_api_key, export_data, delete_account, activity_log, security_log
)

urlpatterns = [
    path('current/', OrganizationDetailView.as_view(), name='current-org'),
    path('activity/', activity_feed, name='activity-feed'),
    path('activity/stats/', activity_stats, name='activity-stats'),
    path('analytics/', analytics, name='analytics'),
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
    path('settings/export/', export_data, name='export-data'),
    path('settings/delete-account/', delete_account, name='delete-account'),
    path('settings/activity-log/', activity_log, name='activity-log'),
    path('settings/security-log/', security_log, name='security-log'),
]