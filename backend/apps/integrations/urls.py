from django.urls import path
from . import views, integration_endpoints
from .github_integration import github_webhook, connect_github, github_commits, github_prs, list_integrations, github_activity

urlpatterns = [
    # Webhooks
    path('webhooks/', integration_endpoints.webhooks, name='webhooks'),
    path('webhooks/<int:webhook_id>/', integration_endpoints.webhook_detail, name='webhook_detail'),
    path('webhooks/<int:webhook_id>/test/', integration_endpoints.test_webhook, name='test_webhook'),
    path('webhooks/<int:webhook_id>/deliveries/', integration_endpoints.webhook_deliveries, name='webhook_deliveries'),
    
    # Integrations
    path('integrations/', integration_endpoints.integrations, name='integrations_list'),
    path('integrations/<int:integration_id>/', integration_endpoints.integration_detail, name='integration_detail'),
    
    # Slack
    path('slack/', views.slack_integration, name='slack_integration'),
    path('slack/test/', integration_endpoints.slack_test, name='slack_test'),
    
    # Teams
    path('teams/test/', integration_endpoints.teams_test, name='teams_test'),
    
    # GitLab
    path('gitlab/commits/', integration_endpoints.gitlab_commits, name='gitlab_commits'),
    
    # Bitbucket
    path('bitbucket/commits/', integration_endpoints.bitbucket_commits, name='bitbucket_commits'),
    
    # GitHub (existing)
    path('github/search/<int:decision_id>/', views.search_github_prs, name='search_github_prs'),
    path('github/link/<int:decision_id>/', views.link_github_pr, name='link_github_pr'),
    path('github/', views.github_integration, name='github_integration'),
    path('github/webhook/', github_webhook, name='github_webhook'),
    path('github/connect/', connect_github, name='connect_github'),
    path('github/commits/<int:issue_id>/', github_commits, name='github_commits'),
    path('github/prs/<int:issue_id>/', github_prs, name='github_prs'),
    path('github/activity/', github_activity, name='github_activity'),
    
    # Jira
    path('jira/create/<int:blocker_id>/', views.create_jira_issue, name='create_jira_issue'),
    path('jira/', views.jira_integration, name='jira_integration'),
    
    # Testing
    path('test/<str:integration_type>/', views.test_integration, name='test_integration'),
    path('list/', list_integrations, name='list_integrations'),
]
