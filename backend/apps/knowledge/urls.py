from django.urls import path
from . import views, unified_views
from .ai_suggestions import ai_suggestions
from .ai_intelligence import ai_recommendations, ai_summarize as ai_summarize_v2, ai_extract_action_items
from .advanced_ai import check_similar_failures, get_success_rates, detect_bottlenecks, detect_knowledge_gaps, detect_patterns
from .enhanced_features import daily_digest, team_expertise, trend_analysis, auto_tag_content, metrics_tracking, sentiment_analysis
from .export_views import export_knowledge
from apps.decisions.phase2_views import knowledge_health
from .ai_views import ai_search, ai_insights, ai_summarize

urlpatterns = [
    # AI Intelligence endpoints
    path('ai/recommendations/', ai_recommendations, name='ai_recommendations'),
    path('ai/summarize-v2/', ai_summarize_v2, name='ai_summarize_v2'),
    path('ai/action-items/', ai_extract_action_items, name='ai_action_items'),
    path('ai/check-failures/', check_similar_failures, name='check_similar_failures'),
    path('ai/success-rates/', get_success_rates, name='get_success_rates'),
    path('ai/bottlenecks/', detect_bottlenecks, name='detect_bottlenecks'),
    path('ai/knowledge-gaps/', detect_knowledge_gaps, name='detect_knowledge_gaps'),
    path('ai/patterns/', detect_patterns, name='detect_patterns'),
    
    # Enhanced features
    path('daily-digest/', daily_digest, name='daily_digest'),
    path('team-expertise/', team_expertise, name='team_expertise'),
    path('trends/', trend_analysis, name='trend_analysis'),
    path('auto-tag/', auto_tag_content, name='auto_tag'),
    path('metrics/', metrics_tracking, name='metrics_tracking'),
    path('sentiment/', sentiment_analysis, name='sentiment_analysis'),
    
    # Unified platform endpoints
    path('context/<str:content_type_name>/<int:object_id>/', unified_views.get_context_panel, name='context_panel'),
    path('link/', unified_views.create_link, name='create_link'),
    path('timeline/', unified_views.get_unified_timeline, name='timeline'),
    path('search-all/', unified_views.search_everything, name='search_all'),
    path('graph/', unified_views.get_knowledge_graph, name='knowledge_graph'),
    path('ai-suggestions/', ai_suggestions, name='ai_suggestions'),
    path('export/', export_knowledge, name='export_knowledge'),
    
    # Existing endpoints
    path('ai/search/', ai_search, name='ai_search'),
    path('ai/insights/', ai_insights, name='ai_insights'),
    path('ai/summarize/', ai_summarize, name='ai_summarize'),
    path('health/', knowledge_health, name='knowledge_health'),
    path('search/', views.search_knowledge, name='search_knowledge'),
    path('search/suggestions/', views.search_suggestions, name='search_suggestions'),
    path('recent_decisions/', views.recent_decisions, name='recent_decisions'),
    path('trending_topics/', views.trending_topics, name='trending_topics'),
    path('trending/', views.trending_topics, name='trending_topics_alias'),
    path('stats/', views.knowledge_stats, name='knowledge_stats'),
    path('memory-score/', views.memory_score, name='memory_score'),
    path('onboarding/', views.onboarding_package, name='onboarding_package'),
    path('before-you-ask/', views.before_you_ask, name='before_you_ask'),
    path('memory-gaps/', views.memory_gaps, name='memory_gaps'),
    path('faq/', views.faq, name='faq'),
    path('forgotten/', views.forgotten_knowledge, name='forgotten_knowledge'),
    path('suggestions/', views.personalized_suggestions, name='personalized_suggestions'),
    path('time-comparison/', views.time_comparison, name='time_comparison'),
    path('cultural-memory/', views.cultural_memory, name='cultural_memory'),
    path('legacy/', views.legacy_content, name='legacy_content'),
    path('reflection/', views.personal_reflection, name='personal_reflection'),
]