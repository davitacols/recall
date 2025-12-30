from django.urls import path
from . import views

urlpatterns = [
    path('slack/', views.slack_integration, name='slack_integration'),
    path('github/', views.github_integration, name='github_integration'),
    path('jira/', views.jira_integration, name='jira_integration'),
    path('test/<str:integration_type>/', views.test_integration, name='test_integration'),
]
