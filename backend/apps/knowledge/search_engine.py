from django.db.models import Q
from django.utils import timezone
from datetime import datetime, timedelta
from apps.conversations.models import Conversation
from apps.decisions.models import Decision

class EnhancedSearchEngine:
    def search(self, query, organization_id, filters=None, limit=10):
        filters = filters or {}
        results = {'conversations': [], 'decisions': [], 'total': 0}
        
        # Build base queries
        conv_q = Q(organization_id=organization_id)
        dec_q = Q(conversation__organization_id=organization_id)
        
        # Text search
        if query:
            conv_q &= (Q(title__icontains=query) | Q(content__icontains=query))
            dec_q &= (Q(title__icontains=query) | Q(conversation__content__icontains=query))
        
        # Date filters
        if filters.get('date_from'):
            date_from = datetime.fromisoformat(filters['date_from'].replace('Z', '+00:00'))
            conv_q &= Q(created_at__gte=date_from)
            dec_q &= Q(created_at__gte=date_from)
            
        if filters.get('date_to'):
            date_to = datetime.fromisoformat(filters['date_to'].replace('Z', '+00:00'))
            conv_q &= Q(created_at__lte=date_to)
            dec_q &= Q(created_at__lte=date_to)
        
        # Type filter
        if filters.get('post_type'):
            conv_q &= Q(post_type=filters['post_type'])
        
        # Author filter
        if filters.get('author'):
            conv_q &= Q(author__username__icontains=filters['author'])
            dec_q &= Q(conversation__author__username__icontains=filters['author'])
        
        # Status filter
        if filters.get('status'):
            conv_q &= Q(status_label=filters['status'])
            dec_q &= Q(status=filters['status'])
        
        # Execute searches
        conversations = Conversation.objects.filter(conv_q).select_related('author').order_by('-created_at')[:limit]
        decisions = Decision.objects.filter(dec_q).select_related('conversation__author').order_by('-created_at')[:limit]
        
        results['conversations'] = [{
            'id': c.id,
            'title': c.title,
            'content': c.content[:200] + '...' if len(c.content) > 200 else c.content,
            'post_type': c.post_type,
            'author': c.author.username,
            'created_at': c.created_at.isoformat(),
            'status_label': c.status_label
        } for c in conversations]
        
        results['decisions'] = [{
            'id': d.id,
            'title': d.title,
            'status': d.status,
            'impact_level': d.impact_level,
            'author': d.conversation.author.username,
            'created_at': d.created_at.isoformat()
        } for d in decisions]
        
        results['total'] = len(results['conversations']) + len(results['decisions'])
        return results
    
    def get_suggestions(self, query, organization_id, limit=5):
        """Get search suggestions based on partial query"""
        if len(query) < 2:
            return []
            
        suggestions = set()
        
        # Get title suggestions
        conversations = Conversation.objects.filter(
            organization_id=organization_id,
            title__icontains=query
        ).values_list('title', flat=True)[:limit]
        
        for title in conversations:
            suggestions.add(title)
            
        return list(suggestions)[:limit]

def get_search_engine():
    return EnhancedSearchEngine()
