from django.urls import path
from . import views, integration_endpoints, github_endpoints, github_app_views
from .github_integration import list_integrations

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
    path('github/webhook/', github_endpoints.github_webhook, name='github_webhook'),
    path('github/connect/', github_endpoints.connect_github, name='connect_github'),
    path('github/commits/<int:issue_id>/', github_endpoints.issue_commits, name='github_commits'),
    path('github/prs/<int:issue_id>/', github_endpoints.issue_pull_requests, name='github_prs'),
    path('github/activity/', github_endpoints.github_activity, name='github_activity'),

    # GitHub App (new — replaces PAT flow over time)
    path('github/app/install-url/', github_app_views.github_app_install_url, name='github_app_install_url'),
    path('github/app/callback/', github_app_views.github_app_install_callback, name='github_app_install_callback'),
    path('github/app/', github_app_views.github_app_installation, name='github_app_installation'),
    path('github/app/repos/', github_app_views.github_app_repos, name='github_app_repos'),
    path('github/app/repos/<int:repo_pk>/', github_app_views.github_app_repo_toggle, name='github_app_repo_toggle'),
    path('github/app/resync/', github_app_views.github_app_resync, name='github_app_resync'),
    path('github/app/webhook/', github_app_views.github_app_webhook, name='github_app_webhook'),
    
    # Jira
    path('jira/create/<int:blocker_id>/', views.create_jira_issue, name='create_jira_issue'),
    path('jira/', views.jira_integration, name='jira_integration'),
    
    # Testing
    path('test/<str:integration_type>/', views.test_integration, name='test_integration'),
    path('list/', list_integrations, name='list_integrations'),
]
