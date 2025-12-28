from django.urls import path
from .views import OrganizationDetailView
from .activity_views import activity_feed, activity_stats
from .invitation_views import invite_user, verify_invitation, accept_invitation, list_invitations, create_organization

urlpatterns = [
    path('current/', OrganizationDetailView.as_view(), name='current-org'),
    path('activity/', activity_feed, name='activity-feed'),
    path('activity/stats/', activity_stats, name='activity-stats'),
    path('invitations/', list_invitations, name='list_invitations'),
    path('invitations/send/', invite_user, name='invite_user'),
    path('invitations/<uuid:token>/', verify_invitation, name='verify_invitation'),
    path('invitations/<uuid:token>/accept/', accept_invitation, name='accept_invitation'),
    path('signup/', create_organization, name='create_organization'),
]