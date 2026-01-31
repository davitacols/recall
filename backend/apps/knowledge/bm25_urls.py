"""
BM25 Search URL Configuration
Routes for search endpoints
"""
from django.urls import path
from . import bm25_endpoints, faq_endpoints

app_name = 'bm25_search'

urlpatterns = [
    # Main search endpoint
    path('search/', bm25_endpoints.search, name='search'),
    path('search/filtered/', bm25_endpoints.search_filtered, name='search-filtered'),
    
    # Search suggestions
    path('suggestions/', bm25_endpoints.search_suggestions, name='suggestions'),
    
    # Search by type
    path('conversations/', bm25_endpoints.search_conversations_only, name='search-conversations'),
    path('decisions/', bm25_endpoints.search_decisions_only, name='search-decisions'),
    
    # Search by tag
    path('tags/<str:tag_name>/', bm25_endpoints.search_by_tag, name='search-by-tag'),
    
    # Analytics
    path('trending/', bm25_endpoints.search_trending, name='trending'),
    path('analytics/', bm25_endpoints.search_analytics, name='analytics'),
    
    # FAQ endpoints
    path('faq/', faq_endpoints.faq_list, name='faq-list'),
    path('faq/<int:faq_id>/', faq_endpoints.faq_detail, name='faq-detail'),
    path('faq/<int:faq_id>/feedback/', faq_endpoints.faq_feedback, name='faq-feedback'),
]
