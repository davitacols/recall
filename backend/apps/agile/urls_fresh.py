from django.urls import path
from . import agile_fresh, retrospective_endpoints

urlpatterns = [
    # Projects
    path('projects/', agile_fresh.projects, name='projects'),
    path('projects/<int:project_id>/', agile_fresh.project_detail, name='project_detail'),
    path('projects/<int:project_id>/delete/', agile_fresh.delete_project, name='delete_project'),
    path('projects/<int:project_id>/sprints/', agile_fresh.sprints, name='sprints'),
    path('projects/<int:project_id>/issues/', agile_fresh.issues, name='issues'),
    path('projects/<int:project_id>/labels/', agile_fresh.labels, name='labels'),
    path('projects/<int:project_id>/roadmap/', agile_fresh.project_roadmap, name='project_roadmap'),
    path('projects/<int:project_id>/backlog/', agile_fresh.backlog, name='backlog'),
    
    # Sprints
    path('sprints/<int:sprint_id>/detail/', agile_fresh.sprint_detail, name='sprint_detail'),
    path('sprints/<int:sprint_id>/assign-issues/', agile_fresh.assign_issues_to_sprint, name='assign_issues_to_sprint'),
    path('sprints/<int:sprint_id>/retrospective/', agile_fresh.retrospectives, name='retrospective'),
    path('sprints/<int:sprint_id>/decision-analysis/', agile_fresh.sprint_decision_analysis, name='sprint_decision_analysis'),
    path('sprint-history/', agile_fresh.sprint_history, name='sprint_history'),
    path('current-sprint/', agile_fresh.current_sprint, name='current_sprint'),
    
    # Issues
    path('issues/<int:issue_id>/', agile_fresh.issue_detail, name='issue_detail'),
    path('issues/<int:issue_id>/comments/', agile_fresh.add_comment, name='add_comment'),
    
    # Boards
    path('boards/<int:board_id>/', agile_fresh.board_detail, name='board_detail'),
    
    # Blockers
    path('blockers/', agile_fresh.blockers, name='blockers'),
    path('blockers/<int:blocker_id>/resolve/', agile_fresh.resolve_blocker, name='resolve_blocker'),
    
    # Retrospectives
    path('retrospective-insights/', agile_fresh.retrospective_insights, name='retrospective_insights'),
    path('sprints/<int:sprint_id>/auto-retrospective/', retrospective_endpoints.auto_generate_retrospective, name='auto-retrospective'),
    path('sprints/<int:sprint_id>/analytics/', retrospective_endpoints.sprint_analytics, name='sprint-analytics'),
    path('sprints/trends/', retrospective_endpoints.sprint_trends, name='sprint-trends'),
]
