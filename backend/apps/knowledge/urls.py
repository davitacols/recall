from django.urls import path
from . import views
from apps.decisions.phase2_views import knowledge_health
from .ai_views import ai_search, ai_insights, ai_summarize

urlpatterns = [
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