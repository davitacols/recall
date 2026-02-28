from django.urls import path
from . import views, kanban_views, views_missing_features, ml_endpoints, time_tracking_endpoints, custom_fields_endpoints, ai_endpoints, sprint_views, blocker_views, retrospective_views

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
    path('sprints/', sprint_views.sprints_list, name='sprints_list'),
    path('sprints/<int:pk>/', sprint_views.sprint_detail, name='sprint_detail_new'),
    path('sprints/current/', sprint_views.current_sprint, name='current_sprint_new'),
    path('current-sprint/', views.current_sprint_summary, name='current_sprint'),
    path('sprint-history/', views.sprint_history, name='sprint_history'),
    
    # Issues
    path('issues/<int:issue_id>/', views.issue_detail, name='issue_detail'),
    path('issues/<int:issue_id>/move/', views.move_issue, name='move_issue'),
    path('issues/<int:issue_id>/comments/', views.add_comment, name='add_comment'),
    path('issues/<int:issue_id>/assign-sprint/', kanban_views.assign_issue_to_sprint, name='assign_issue_to_sprint'),
    
    # ML/AI Features
    path('ml/suggest-assignee/', ml_endpoints.suggest_assignee, name='ml_suggest_assignee'),
    path('ml/predict-sprint/<int:sprint_id>/', ml_endpoints.predict_sprint, name='ml_predict_sprint'),
    path('ml/auto-tag/', ml_endpoints.auto_tag, name='ml_auto_tag'),
    path('ml/analyze-issue/', ml_endpoints.analyze_issue, name='ml_analyze_issue'),
    path('ml/sprint-insights/<int:sprint_id>/', ml_endpoints.sprint_insights, name='ml_sprint_insights'),
    
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
    
    # Service Desk
    path('service-desk/', views_missing_features.service_desk_overview, name='service_desk_overview'),
    path('service-desk/requests/', views_missing_features.create_service_request, name='create_service_request'),
    
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
    path('blockers/', blocker_views.blockers_list, name='blockers_list'),
    path('blockers/<int:pk>/', blocker_views.blocker_detail, name='blocker_detail'),
    
    # Retrospectives
    path('retrospectives/', retrospective_views.retrospectives_list, name='retrospectives_list'),
    path('retrospectives/<int:pk>/', retrospective_views.retrospective_detail, name='retrospective_detail'),
    path('retrospectives/<int:pk>/items/', retrospective_views.retrospective_add_item, name='retrospective_add_item'),
    
    # Time Tracking
    path('issues/<int:issue_id>/log-work/', time_tracking_endpoints.log_work, name='log_work'),
    path('issues/<int:issue_id>/work-logs/', time_tracking_endpoints.get_work_logs, name='get_work_logs'),
    path('issues/<int:issue_id>/time-estimate/', time_tracking_endpoints.set_time_estimate, name='set_time_estimate'),
    path('sprints/<int:sprint_id>/burndown/', time_tracking_endpoints.get_burndown_chart, name='get_burndown_chart'),
    path('sprints/<int:sprint_id>/time-tracking/', time_tracking_endpoints.get_sprint_time_tracking, name='get_sprint_time_tracking'),
    
    # Custom Fields
    path('projects/<int:project_id>/custom-fields/', custom_fields_endpoints.custom_fields, name='custom_fields'),
    path('custom-fields/<int:field_id>/', custom_fields_endpoints.delete_custom_field, name='delete_custom_field'),
    path('issues/<int:issue_id>/custom-fields/', custom_fields_endpoints.get_issue_custom_fields, name='get_issue_custom_fields'),
    path('issues/<int:issue_id>/set-custom-field/', custom_fields_endpoints.set_custom_field_value, name='set_custom_field_value'),
    
    # Custom Issue Types
    path('projects/<int:project_id>/issue-types/', custom_fields_endpoints.custom_issue_types, name='custom_issue_types'),
    path('issue-types/<int:type_id>/', custom_fields_endpoints.delete_custom_issue_type, name='delete_custom_issue_type'),
    
    # Advanced Filters
    path('filter-issues/', custom_fields_endpoints.filter_issues, name='filter_issues'),
    path('saved-filters/', custom_fields_endpoints.saved_filters, name='saved_filters'),
    path('saved-filters/<int:filter_id>/', custom_fields_endpoints.manage_saved_filter, name='manage_saved_filter'),
    path('boards/<int:board_id>/filters/', custom_fields_endpoints.board_filters, name='board_filters'),
    
    # AI Features
    path('ai/chat/', ai_endpoints.ai_chat, name='ai_chat'),
    path('ai/suggestions/', ai_endpoints.ai_suggestions, name='ai_suggestions'),
    path('ai/categorize/', ai_endpoints.ai_categorize, name='ai_categorize'),
    path('ai/search/', ai_endpoints.ai_smart_search, name='ai_smart_search'),
    path('ai/insights/', ai_endpoints.ai_insights, name='ai_insights'),
]
