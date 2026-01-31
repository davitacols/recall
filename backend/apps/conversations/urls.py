from django.urls import path
from . import views
from .reply_views import reply_detail
from . import linking_views
from . import search_views
from . import sentiment_endpoints

urlpatterns = [
    path('search/', search_views.advanced_search, name='advanced_search'),
    path('search/suggestions/', search_views.search_suggestions, name='search_suggestions'),
    path('search/save/', search_views.save_search, name='save_search'),
    path('search/saved/', search_views.saved_searches, name='saved_searches'),
    path('search/saved/<int:search_id>/', search_views.delete_saved_search, name='delete_saved_search'),
    path('search/analytics/', search_views.search_analytics, name='search_analytics'),
    path('', views.conversations, name='conversations'),
    path('templates/', views.templates_list, name='templates_list'),
    path('templates/<str:template_key>/', views.template_detail, name='template_detail'),
    path('bookmarks/', views.bookmarks, name='bookmarks'),
    path('bookmarks/<int:bookmark_id>/', views.bookmark_detail, name='bookmark_detail'),
    path('users/', views.users_list, name='users_list'),
    path('tags/', views.tags_list, name='tags_list'),
    path('tags/<str:tag_name>/', views.tag_conversations, name='tag_conversations'),
    path('preferences/', views.user_preferences, name='user_preferences'),
    path('badges/', views.user_badges, name='user_badges'),
    path('replies/<int:reply_id>/', reply_detail, name='reply_detail'),
    path('<int:conversation_id>/replies/', views.conversation_replies, name='conversation_replies'),
    path('<int:conversation_id>/history/', views.conversation_history, name='conversation_history'),
    path('<int:conversation_id>/bookmark-status/', views.conversation_bookmark_status, name='conversation_bookmark_status'),
    path('<int:conversation_id>/status/', views.update_status_label, name='update_status_label'),
    path('<int:conversation_id>/explain/', views.explain_simply, name='explain_simply'),
    path('<int:conversation_id>/reactions/', views.conversation_reactions, name='conversation_reactions'),
    path('<int:conversation_id>/reactions/add/', views.add_reaction, name='add_reaction'),
    path('<int:conversation_id>/reactions/remove/', views.remove_reaction, name='remove_reaction'),
    path('<int:conversation_id>/complexity/', views.check_complexity, name='check_complexity'),
    path('<int:conversation_id>/timeline/', views.conversation_timeline, name='conversation_timeline'),
    path('<int:conversation_id>/close/', views.close_conversation, name='close_conversation'),
    path('<int:conversation_id>/crisis/', views.mark_crisis, name='mark_crisis'),
    path('<int:conversation_id>/share/', views.generate_share_link, name='generate_share_link'),
    path('<int:conversation_id>/vote_confidence/', views.vote_confidence, name='vote_confidence'),
    path('<int:conversation_id>/export-adr/', views.export_adr, name='export_adr'),
    path('<int:conversation_id>/plain-language/', views.generate_plain_language, name='generate_plain_language'),
    path('<int:conversation_id>/code-links/', views.add_code_link, name='add_code_link'),
    path('<int:conversation_id>/developer-mode/', views.process_developer_mode, name='process_developer_mode'),
    path('<int:conversation_id>/developer-insights/', views.developer_insights, name='developer_insights'),
    path('<int:conversation_id>/documents/', views.conversation_documents, name='conversation_documents'),
    path('<int:conversation_id>/documents/upload/', views.upload_document, name='upload_document'),
    path('documents/<int:document_id>/', views.delete_document, name='delete_document'),
    path('<int:conversation_id>/related-decisions/', linking_views.conversation_related_decisions, name='conversation_related_decisions'),
    
    # Sentiment & Team Pulse
    path('sentiment/team/', sentiment_endpoints.team_sentiment, name='team-sentiment'),
    path('sentiment/health/', sentiment_endpoints.team_health_metrics, name='team-health'),
    path('sentiment/user/<int:user_id>/', sentiment_endpoints.user_sentiment, name='user-sentiment'),
    path('sentiment/concerns/', sentiment_endpoints.concern_detection, name='concern-detection'),
    
    path('<int:conversation_id>/', views.conversation_detail, name='conversation_detail'),
]
