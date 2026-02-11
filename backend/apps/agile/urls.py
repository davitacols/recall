from django.urls import path
from . import views, kanban_views, views_missing_features

urlpatterns = [
    # Projects
    path('projects/', views.projects, name='projects'),
    path('projects/<int:project_id>/', views.project_detail, name='project_detail'),
    path('projects/<int:project_id>/delete/', views.delete_project, name='delete_project'),
    path('projects/<int:project_id>/roadmap/', views.project_roadmap, name='project_roadmap'),
    path('projects/<int:project_id>/issues/', views.issues, name='issues'),
    path('projects/<int:project_id>/issues-unified/', views.project_issues_unified, name='project_issues_unified'),
    path('projects/<int:project_id>/backlog/', views.backlog, name='backlog'),
    
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
    
    # Attachments
    path('issues/<int:issue_id>/attachments/', views_missing_features.upload_attachment, name='upload_attachment'),
    path('issues/<int:issue_id>/attachments/list/', views_missing_features.list_attachments, name='list_attachments'),
    path('attachments/<int:attachment_id>/', views_missing_features.delete_attachment, name='delete_attachment'),
    
    # Watchers
    path('issues/<int:issue_id>/watch/', views_missing_features.watch_issue, name='watch_issue'),
    path('issues/<int:issue_id>/unwatch/', views_missing_features.unwatch_issue, name='unwatch_issue'),
    
    # Bulk Operations
    path('issues/bulk-update/', views_missing_features.bulk_update_issues, name='bulk_update_issues'),
    
    # Saved Filters
    path('filters/', views_missing_features.saved_filters, name='saved_filters'),
    path('filters/<int:filter_id>/', views_missing_features.delete_saved_filter, name='delete_saved_filter'),
    
    # Issue Templates
    path('templates/', views_missing_features.issue_templates, name='issue_templates'),
    
    # Releases
    path('projects/<int:project_id>/releases/', views_missing_features.releases, name='releases'),
    path('releases/<int:release_id>/', views_missing_features.update_release, name='update_release'),
    
    # Components
    path('projects/<int:project_id>/components/', views_missing_features.components, name='components'),
    
    # Project Categories
    path('categories/', views_missing_features.project_categories, name='project_categories'),
    
    # WIP Limits
    path('columns/<int:column_id>/wip-check/', views_missing_features.check_wip_limit, name='check_wip_limit'),
    
    # Workflow
    path('workflow/transitions/', views.workflow_transitions, name='workflow_transitions'),
    path('issues/<int:issue_id>/validate-transition/', views.validate_transition, name='validate_transition'),
    
    # Decision Impact Tracking (Unique Feature)
    path('issues/<int:issue_id>/link-decision/', views.link_decision_to_issue, name='link_decision_to_issue'),
    path('issues/<int:issue_id>/decision-impacts/', views.issue_decision_impacts, name='issue_decision_impacts'),
    path('sprints/<int:sprint_id>/decision-analysis/', views.sprint_decision_analysis, name='sprint_decision_analysis'),
    path('decisions/impact-report/', views.decision_impact_report, name='decision_impact_report'),
    
    # Board
    path('boards/<int:board_id>/', kanban_views.board_view, name='board'),
    
    # Labels
    path('projects/<int:project_id>/labels/', kanban_views.labels, name='labels'),
    
    # Blockers
    path('blockers/', views.blockers, name='blockers'),
    path('blockers/<int:blocker_id>/resolve/', views.resolve_blocker, name='resolve_blocker'),
]
