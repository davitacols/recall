from django.urls import path
from . import proposal_endpoints, template_endpoints, velocity_endpoints, impact_endpoints, vote_endpoints, ai_endpoints, views

app_name = 'decisions'

urlpatterns = [
    # Core Decisions
    path('', views.decisions, name='decisions'),
    path('<int:decision_id>/', views.decision_detail, name='decision_detail'),
    path('<int:decision_id>/approve/', views.approve_decision, name='approve_decision'),
    path('<int:decision_id>/implement/', views.implement_decision, name='implement_decision'),
    path('timeline/', views.decisions_timeline, name='decisions_timeline'),
    
    # Proposals
    path('proposals/', proposal_endpoints.proposals_list, name='proposals-list'),
    path('proposals/<int:proposal_id>/', proposal_endpoints.proposal_detail, name='proposal-detail'),
    path('proposals/<int:proposal_id>/submit/', proposal_endpoints.submit_proposal, name='submit-proposal'),
    path('proposals/<int:proposal_id>/approve/', proposal_endpoints.approve_proposal, name='approve-proposal'),
    path('proposals/<int:proposal_id>/convert/', proposal_endpoints.convert_to_decision, name='convert-proposal'),
    
    # Templates
    path('templates/', template_endpoints.templates_list, name='templates-list'),
    path('templates/<int:template_id>/', template_endpoints.template_detail, name='template-detail'),
    path('templates/defaults/', template_endpoints.default_templates, name='default-templates'),
    
    # Velocity & Analytics
    path('velocity/', velocity_endpoints.decision_velocity, name='velocity'),
    path('makers/', velocity_endpoints.decision_makers, name='decision-makers'),
    path('topics/', velocity_endpoints.decision_topics, name='decision-topics'),
    
    # Impact Tracking
    path('<int:decision_id>/metrics/', impact_endpoints.decision_metrics, name='decision-metrics'),
    path('metrics/<int:metric_id>/', impact_endpoints.metric_detail, name='metric-detail'),
    path('metrics/<int:metric_id>/record/', impact_endpoints.record_metric_data, name='record-metric'),
    path('<int:decision_id>/impact-report/', impact_endpoints.decision_impact_report, name='impact-report'),
    
    # Voting & Consensus
    path('<int:decision_id>/votes/', vote_endpoints.decision_votes, name='decision-votes'),
    path('<int:decision_id>/consensus/', vote_endpoints.consensus_report, name='consensus-report'),
    path('consensus/metrics/', vote_endpoints.organization_consensus_metrics, name='consensus-metrics'),
    
    # AI Assistant
    path('ai/suggest-similar/', ai_endpoints.suggest_similar_decisions, name='suggest-similar'),
    path('<int:decision_id>/ai/check-conflicts/', ai_endpoints.check_decision_conflicts, name='check-conflicts'),
    path('<int:decision_id>/ai/missing-stakeholders/', ai_endpoints.identify_missing_stakeholders, name='missing-stakeholders'),
    path('ai/draft-rationale/', ai_endpoints.draft_decision_rationale, name='draft-rationale'),
    path('<int:decision_id>/ai/context/', ai_endpoints.analyze_decision_context, name='analyze-context'),
    path('ai/recommendations/', ai_endpoints.decision_recommendations, name='recommendations'),
]
