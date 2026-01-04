from django.urls import path
from . import views
from .github_integration import github_webhook, connect_github, github_commits, github_prs, list_integrations, github_activity

urlpatterns = [
    path('slack/', views.slack_integration, name='slack_integration'),
    path('github/search/<int:decision_id>/', views.search_github_prs, name='search_github_prs'),
    path('github/link/<int:decision_id>/', views.link_github_pr, name='link_github_pr'),
    path('github/', views.github_integration, name='github_integration'),
    path('github/webhook/', github_webhook, name='github_webhook'),
    path('github/connect/', connect_github, name='connect_github'),
    path('github/commits/<int:issue_id>/', github_commits, name='github_commits'),
    path('github/prs/<int:issue_id>/', github_prs, name='github_prs'),
    path('github/activity/', github_activity, name='github_activity'),
    path('jira/create/<int:blocker_id>/', views.create_jira_issue, name='create_jira_issue'),
    path('jira/', views.jira_integration, name='jira_integration'),
    path('test/<str:integration_type>/', views.test_integration, name='test_integration'),
    path('list/', list_integrations, name='list_integrations'),
]
