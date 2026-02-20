from django.urls import path
from . import github_views

urlpatterns = [
    path('github/link/<int:decision_id>/', github_views.link_pr_to_decision),
    path('github/prs/<int:decision_id>/', github_views.get_decision_prs),
    path('github/webhook/', github_views.github_webhook),
]
