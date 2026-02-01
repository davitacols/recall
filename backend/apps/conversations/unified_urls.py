"""
Unified URL Configuration for Conversations, Decisions, and Knowledge
Organizes all endpoints with consistent patterns
"""
from django.urls import path
from . import unified_endpoints as endpoints

app_name = 'conversations'

urlpatterns = [
    # Conversations
    path('conversations/', endpoints.conversations_list, name='conversations-list'),
    path('conversations/new/', endpoints.conversations_list, name='create-conversation'),
    path('conversations/<int:conversation_id>/', endpoints.conversation_detail, name='conversation-detail'),
    path('conversations/<int:conversation_id>/context/', endpoints.conversation_context, name='conversation-context'),
    path('conversations/<int:conversation_id>/timeline/', endpoints.conversation_timeline, name='conversation-timeline'),
    path('conversations/<int:conversation_id>/summary/', endpoints.context_summary, name='context-summary'),
    path('conversations/<int:conversation_id>/close/', endpoints.close_conversation, name='close-conversation'),
    
    # Replies
    path('conversations/<int:conversation_id>/replies/', endpoints.conversation_replies, name='conversation-replies'),
    
    # Action Items
    path('conversations/<int:conversation_id>/action-items/', endpoints.action_items, name='action-items'),
    path('action-items/<int:action_item_id>/', endpoints.action_item_detail, name='action-item-detail'),
    
    # Reactions
    path('conversations/<int:conversation_id>/reactions/', endpoints.conversation_reactions, name='conversation-reactions'),
    path('conversations/<int:conversation_id>/reactions/add/', endpoints.add_reaction, name='add-reaction'),
    
    # Bookmarks
    path('bookmarks/', endpoints.bookmarks_list, name='bookmarks-list'),
    path('conversations/<int:conversation_id>/bookmark/', endpoints.create_bookmark, name='create-bookmark'),
    path('bookmarks/<int:bookmark_id>/', endpoints.delete_bookmark, name='delete-bookmark'),
    
    # Linking
    path('conversations/<int:conversation_id>/link-decision/', endpoints.link_conversation_to_decision, name='link-decision'),
    
    # Tags
    path('tags/', endpoints.tags_list, name='tags-list'),
    
    # Export
    path('export/conversation-pdf/', endpoints.export_conversation_pdf, name='export-conversation-pdf'),
    path('export/decision-pdf/', endpoints.export_decision_pdf, name='export-decision-pdf'),
]
