from django.urls import path
from . import views
from . import linking_views

urlpatterns = [
    path('', views.decisions, name='decisions'),
    path('outcomes/stats/', views.outcome_stats, name='outcome_stats'),
    path('outcomes/pending/', views.pending_outcome_reviews, name='pending_outcome_reviews'),
    path('outcomes/pending/notify/', views.notify_pending_outcome_reviews, name='notify_pending_outcome_reviews'),
    path('outcomes/follow-up/run/', views.run_followup_orchestrator, name='run_followup_orchestrator'),
    path('outcomes/drift-alerts/', views.decision_drift_alerts, name='decision_drift_alerts'),
    path('outcomes/calibration/', views.team_calibration_analytics, name='team_calibration_analytics'),
    path('<int:decision_id>/related-sprints/', linking_views.decision_related_sprints, name='decision_related_sprints'),
    path('<int:decision_id>/', views.decision_detail, name='decision_detail'),
    path('<int:decision_id>/impact-trail/', views.decision_impact_trail, name='decision_impact_trail'),
    path('<int:decision_id>/replay-simulator/', views.decision_replay_simulator, name='decision_replay_simulator'),
    path('<int:decision_id>/replay-simulator/create-follow-up/', views.create_replay_followup_tasks, name='create_replay_followup_tasks'),
    path('<int:decision_id>/outcome-review/', views.outcome_review, name='outcome_review'),
    path('<int:decision_id>/approve/', views.approve_decision, name='approve_decision'),
    path('<int:decision_id>/implement/', views.implement_decision, name='implement_decision'),
    path('<int:decision_id>/reminded/', views.mark_reminded, name='mark_reminded'),
    path('<int:decision_id>/link-pr/', views.link_pr, name='link_pr'),
    path('timeline/', views.decisions_timeline, name='decisions_timeline'),
    path('reminders/', views.decisions_needing_reminders, name='decisions_reminders'),
    path('convert/<int:conversation_id>/', views.convert_to_decision, name='convert_to_decision'),
    path('proposals/', views.proposals, name='proposals'),
    path('proposals/<int:proposal_id>/accept/', views.accept_proposal, name='accept_proposal'),
    path('proposals/<int:proposal_id>/reject/', views.reject_proposal, name='reject_proposal'),
]
