from django.urls import path
from . import agile_fresh, retrospective_endpoints, views_missing_features, views, ai_endpoints, time_tracking_endpoints

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
    path('sprints/<int:sprint_id>/autopilot/', agile_fresh.sprint_autopilot, name='sprint_autopilot'),
    path('sprints/<int:sprint_id>/autopilot/apply/', agile_fresh.apply_sprint_autopilot_plan, name='apply_sprint_autopilot_plan'),
    path('sprints/<int:sprint_id>/assign-issues/', agile_fresh.assign_issues_to_sprint, name='assign_issues_to_sprint'),
    path('sprints/<int:sprint_id>/retrospective/', agile_fresh.retrospectives, name='retrospective'),
    path('sprints/<int:sprint_id>/decision-analysis/', agile_fresh.sprint_decision_analysis, name='sprint_decision_analysis'),
    path('sprint-history/', agile_fresh.sprint_history, name='sprint_history'),
    path('current-sprint/', agile_fresh.current_sprint, name='current_sprint'),
    
    # Issues
    path('issues/<int:issue_id>/', agile_fresh.issue_detail, name='issue_detail'),
    path('issues/<int:issue_id>/comments/', agile_fresh.add_comment, name='add_comment'),
    path('issues/<int:issue_id>/decision-impacts/', views.issue_decision_impacts, name='issue_decision_impacts'),
    path('issues/<int:issue_id>/link-decision/', views.link_decision_to_issue, name='link_decision_to_issue'),
    
    # Attachments
    path('issues/<int:issue_id>/attachments/', views_missing_features.upload_attachment, name='upload_attachment'),
    path('issues/<int:issue_id>/attachments/list/', views_missing_features.list_attachments, name='list_attachments'),
    path('attachments/<int:attachment_id>/', views_missing_features.delete_attachment, name='delete_attachment'),
    
    # Watchers
    path('issues/<int:issue_id>/watch/', views_missing_features.watch_issue, name='watch_issue'),
    path('issues/<int:issue_id>/unwatch/', views_missing_features.unwatch_issue, name='unwatch_issue'),

    # Time Tracking
    path('issues/<int:issue_id>/log-work/', time_tracking_endpoints.log_work, name='log_work'),
    path('issues/<int:issue_id>/work-logs/', time_tracking_endpoints.get_work_logs, name='get_work_logs'),
    path('issues/<int:issue_id>/time-estimate/', time_tracking_endpoints.set_time_estimate, name='set_time_estimate'),
    
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
    path('workflow/transitions/', views.workflow_transitions, name='workflow_transitions'),
    path('issues/<int:issue_id>/validate-transition/', views.validate_transition, name='validate_transition'),
    
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
    
    # AI Features
    path('ai/chat/', ai_endpoints.ai_chat, name='ai_chat'),
    path('ai/suggestions/', ai_endpoints.ai_suggestions, name='ai_suggestions'),
    path('ai/categorize/', ai_endpoints.ai_categorize, name='ai_categorize'),
    path('ai/search/', ai_endpoints.ai_smart_search, name='ai_smart_search'),
    path('ai/insights/', ai_endpoints.ai_insights, name='ai_insights'),
]
