from django.urls import path
from . import views, kanban_views

urlpatterns = [
    # Projects
    path('projects/', views.projects, name='projects'),
    path('projects/<int:project_id>/', views.project_detail, name='project_detail'),
    path('projects/<int:project_id>/delete/', views.delete_project, name='delete_project'),
    path('projects/<int:project_id>/roadmap/', views.project_roadmap, name='project_roadmap'),
    path('projects/<int:project_id>/issues/', views.issues, name='issues'),
    path('projects/<int:project_id>/issues-unified/', views.project_issues_unified, name='project_issues_unified'),
    
    # Sprints
    path('projects/<int:project_id>/sprints/', views.sprints, name='sprints'),
    path('sprints/<int:sprint_id>/', views.sprint_detail, name='sprint_detail'),
    path('current-sprint/', views.current_sprint_summary, name='current_sprint'),
    path('sprint-history/', views.sprint_history, name='sprint_history'),
    
    # Issues
    path('issues/<int:issue_id>/', views.issue_detail, name='issue_detail'),
    path('issues/<int:issue_id>/move/', views.move_issue, name='move_issue'),
    path('issues/<int:issue_id>/comments/', views.add_comment, name='add_comment'),
    path('issues/<int:issue_id>/assign-sprint/', kanban_views.assign_issue_to_sprint, name='assign_issue_to_sprint'),
    
    # Board
    path('boards/<int:board_id>/', kanban_views.board_view, name='board'),
    
    # Labels
    path('projects/<int:project_id>/labels/', kanban_views.labels, name='labels'),
    
    # Blockers
    path('blockers/', views.blockers, name='blockers'),
    path('blockers/<int:blocker_id>/resolve/', views.resolve_blocker, name='resolve_blocker'),
]
