from django.urls import path
from . import views

urlpatterns = [
    path('slack/', views.slack_integration, name='slack_integration'),
    path('github/search/<int:decision_id>/', views.search_github_prs, name='search_github_prs'),
    path('github/link/<int:decision_id>/', views.link_github_pr, name='link_github_pr'),
    path('github/', views.github_integration, name='github_integration'),
    path('jira/create/<int:blocker_id>/', views.create_jira_issue, name='create_jira_issue'),
    path('jira/', views.jira_integration, name='jira_integration'),
    path('test/<str:integration_type>/', views.test_integration, name='test_integration'),
]
