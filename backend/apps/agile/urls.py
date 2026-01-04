from django.urls import path
from . import views, kanban_views
from apps.conversations import linking_views

urlpatterns = [
    # Sprint endpoints
    path('current-sprint/', views.current_sprint_summary, name='current_sprint_summary'),
    path('sprint/current/', views.current_sprint_summary, name='sprint_current_alias'),
    path('sprint-updates/', views.sprint_updates, name='sprint_updates'),
    path('sprint-history/', views.sprint_history, name='sprint_history'),
    path('blockers/', views.blockers, name='blockers'),
    path('blockers/<int:blocker_id>/', views.blocker_detail, name='blocker_detail'),
    path('blockers/<int:blocker_id>/resolve/', views.resolve_blocker, name='resolve_blocker'),
    path('retrospective-insights/', views.retrospective_insights, name='retrospective_insights'),
    path('sprints/', views.create_sprint, name='create_sprint'),
    path('sprints/<int:sprint_id>/', views.sprint_detail, name='sprint_detail'),
    path('sprints/<int:sprint_id>/detail/', kanban_views.sprint_detail, name='sprint_detail_kanban'),
    path('sprints/<int:sprint_id>/decisions/', views.sprint_decisions, name='sprint_decisions'),
    path('sprints/<int:sprint_id>/end/', views.end_sprint, name='end_sprint'),
    
    # Project/Kanban endpoints
    path('projects/', kanban_views.projects, name='projects'),
    path('projects/<int:project_id>/', kanban_views.project_detail, name='project_detail'),
    path('projects/<int:project_id>/issues/', kanban_views.issues, name='issues'),
    path('projects/<int:project_id>/issues/unified/', views.project_issues_unified, name='project_issues_unified'),
    path('projects/<int:project_id>/roadmap/', views.project_roadmap, name='project_roadmap'),
    path('projects/<int:project_id>/labels/', kanban_views.labels, name='labels'),
    path('projects/<int:project_id>/sprints/', kanban_views.sprints, name='project_sprints'),
    path('boards/<int:board_id>/', kanban_views.board_view, name='board_view'),
    path('issues/<int:issue_id>/', kanban_views.issue_detail, name='issue_detail'),
    path('issues/<int:issue_id>/move/', kanban_views.move_issue, name='move_issue'),
    path('issues/<int:issue_id>/comments/', kanban_views.add_comment, name='add_comment'),
    path('issues/<int:issue_id>/assign-sprint/', kanban_views.assign_issue_to_sprint, name='assign_issue_to_sprint'),
    
    # Unified linking endpoints
    path('decisions/<int:decision_id>/link-issue/', linking_views.link_decision_to_issue, name='link_decision_to_issue'),
    path('conversations/<int:conversation_id>/link-issue/', linking_views.link_conversation_to_issue, name='link_conversation_to_issue'),
    path('blockers/<int:blocker_id>/link-issue/', linking_views.link_blocker_to_issue, name='link_blocker_to_issue'),
]
