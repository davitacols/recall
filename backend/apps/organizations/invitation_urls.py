from django.urls import path
from .invitation_views import invite_user, list_invitations, revoke_invitation

# Shorthand routes for frontend
urlpatterns = [
    path('api/invite/', invite_user, name='invite'),
    path('api/invitations/', list_invitations, name='invitations-list'),
    path('api/invitations/<int:invitation_id>/', revoke_invitation, name='revoke-invitation'),
]
