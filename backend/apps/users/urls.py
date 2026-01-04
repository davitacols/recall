from django.urls import path
from . import views
from .profile_views import update_profile, change_password, profile_stats

urlpatterns = [
    path('login/', views.login, name='login'),
    path('register/', views.register, name='register'),
    path('profile/', views.profile, name='profile'),
    path('profile/update/', update_profile, name='update_profile'),
    path('profile/change-password/', change_password, name='change_password'),
    path('profile/stats/', profile_stats, name='profile_stats'),
    path('team/', views.team, name='team'),
]