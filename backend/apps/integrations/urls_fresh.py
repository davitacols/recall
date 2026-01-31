from django.urls import path
from . import github_endpoints

app_name = 'integrations'

urlpatterns = [
    # GitHub Integration
    path('github/config/', github_endpoints.github_config, name='github-config'),
    path('github/decisions/<int:decision_id>/commits/', github_endpoints.link_commit_to_decision, name='link-commit'),
    path('github/decisions/<int:decision_id>/code-links/', github_endpoints.decision_code_links, name='code-links'),
    path('github/decisions/<int:decision_id>/prs/', github_endpoints.link_pr_to_decision, name='link-pr'),
    path('github/prs/<int:pr_id>/status/', github_endpoints.update_pr_status, name='update-pr-status'),
    path('github/decisions/<int:decision_id>/deployments/', github_endpoints.record_deployment, name='record-deployment'),
    path('github/decisions/<int:decision_id>/implementation-status/', github_endpoints.decision_implementation_status, name='implementation-status'),
]
