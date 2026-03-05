from django.urls import path
from . import views
from .profile_views import update_profile, change_password, profile_stats

urlpatterns = [
    path('login/', views.login, name='login'),
    path('google/', views.google_login, name='google_login'),
    path('logout/', views.logout, name='logout'),
    path('logout-all/', views.logout_all, name='logout_all'),
    path('workspaces/', views.workspaces, name='workspaces'),
    path('workspaces/switch/request-code/', views.request_workspace_switch_code, name='request_workspace_switch_code'),
    path('workspaces/switch/', views.switch_workspace, name='switch_workspace'),
    path('register/', views.register, name='register'),
    path('forgot-password/', views.forgot_password, name='forgot_password'),
    path('reset-password/', views.reset_password, name='reset_password'),
    path('profile/', views.profile, name='profile'),
    path('profile/update/', update_profile, name='update_profile'),
    path('profile/change-password/', change_password, name='change_password'),
    path('profile/stats/', profile_stats, name='profile_stats'),
    path('team/', views.team, name='team'),
]
