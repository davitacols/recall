from django.urls import path
from . import views

urlpatterns = [
    path('current-sprint/', views.current_sprint_summary, name='current_sprint_summary'),
    path('sprint-updates/', views.sprint_updates, name='sprint_updates'),
    path('blockers/', views.blockers, name='blockers'),
    path('blockers/<int:blocker_id>/', views.blocker_detail, name='blocker_detail'),
    path('blockers/<int:blocker_id>/resolve/', views.resolve_blocker, name='resolve_blocker'),
    path('retrospective-insights/', views.retrospective_insights, name='retrospective_insights'),
    path('sprints/', views.create_sprint, name='create_sprint'),
    path('sprints/<int:sprint_id>/', views.sprint_detail, name='sprint_detail'),
    path('sprints/<int:sprint_id>/decisions/', views.sprint_decisions, name='sprint_decisions'),
    path('sprints/<int:sprint_id>/end/', views.end_sprint, name='end_sprint'),
    path('sprint-history/', views.sprint_history, name='sprint_history'),
]
