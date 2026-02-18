from django.urls import path
from .analytics_views import analytics_overview, team_analytics, project_analytics

urlpatterns = [
    path('overview/', analytics_overview, name='analytics_overview'),
    path('team/', team_analytics, name='team_analytics'),
    path('projects/<int:project_id>/', project_analytics, name='project_analytics'),
]
