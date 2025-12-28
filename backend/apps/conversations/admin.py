from django.contrib import admin
from .models import Conversation, ConversationReply, ActionItem

@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ['title', 'post_type', 'author', 'organization', 'priority', 'ai_processed', 'created_at']
    list_filter = ['post_type', 'priority', 'ai_processed', 'is_archived', 'organization']
    search_fields = ['title', 'content', 'author__username']
    readonly_fields = ['created_at', 'updated_at', 'view_count', 'reply_count']
    
    fieldsets = [
        ('Content', {
            'fields': ['title', 'content', 'post_type', 'priority']
        }),
        ('Metadata', {
            'fields': ['author', 'organization', 'is_pinned', 'is_archived']
        }),
        ('AI Processing', {
            'fields': ['ai_summary', 'ai_action_items', 'ai_keywords', 'ai_processed', 'ai_processing_error'],
            'classes': ['collapse']
        }),
        ('Metrics', {
            'fields': ['view_count', 'reply_count'],
            'classes': ['collapse']
        }),
        ('Timestamps', {
            'fields': ['created_at', 'updated_at'],
            'classes': ['collapse']
        }),
    ]

@admin.register(ConversationReply)
class ConversationReplyAdmin(admin.ModelAdmin):
    list_display = ['conversation', 'author', 'is_ai_generated', 'created_at']
    list_filter = ['is_ai_generated', 'created_at']
    search_fields = ['content', 'author__username', 'conversation__title']

@admin.register(ActionItem)
class ActionItemAdmin(admin.ModelAdmin):
    list_display = ['title', 'assignee', 'status', 'priority', 'due_date', 'extracted_by_ai']
    list_filter = ['status', 'priority', 'extracted_by_ai', 'created_at']
    search_fields = ['title', 'description', 'assignee__username']