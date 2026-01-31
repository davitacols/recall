"""
Context Manager for Conversations, Decisions, and Knowledge
Handles contextual relationships and recall patterns
"""
from django.core.cache import cache
from django.db.models import Q, Count, F
from django.utils import timezone
from datetime import timedelta
from .models import Conversation, ConversationReply, ActionItem
from apps.decisions.models import Decision
from apps.knowledge.models import KnowledgeEntry, SearchQuery
import json


class ContextManager:
    """Manages context for conversations with decisions and knowledge"""
    
    CACHE_TTL = 3600  # 1 hour
    
    @staticmethod
    def get_conversation_context(conversation_id, org_id):
        """Get full context for a conversation"""
        cache_key = f"conv_context:{conversation_id}:{org_id}"
        cached = cache.get(cache_key)
        if cached:
            return cached
        
        try:
            conv = Conversation.objects.get(id=conversation_id)
        except Conversation.DoesNotExist:
            return None
        
        context = {
            'conversation': {
                'id': conv.id,
                'title': conv.title,
                'content': conv.content,
                'post_type': conv.post_type,
                'priority': conv.priority,
                'status': conv.status_label,
                'created_at': conv.created_at.isoformat(),
                'author': conv.author.get_full_name(),
                'author_id': conv.author.id,
            },
            'metadata': {
                'why_this_matters': conv.why_this_matters,
                'context_reason': conv.context_reason,
                'key_takeaway': conv.key_takeaway,
                'emotional_context': conv.emotional_context,
                'ai_keywords': conv.ai_keywords,
                'ai_summary': conv.ai_summary,
            },
            'engagement': {
                'reply_count': conv.reply_count,
                'view_count': conv.view_count,
                'reaction_count': conv.reactions.count(),
                'bookmark_count': conv.bookmarks.count(),
            },
            'related': {
                'decisions': [],
                'related_conversations': [],
                'action_items': [],
            }
        }
        
        # Get related decisions
        decisions = Decision.objects.filter(conversation=conv)
        for dec in decisions:
            context['related']['decisions'].append({
                'id': dec.id,
                'title': dec.title,
                'status': dec.status,
                'impact_level': dec.impact_level,
            })
        
        # Get related conversations (same keywords)
        if conv.ai_keywords:
            related_convs = Conversation.objects.filter(
                organization=conv.organization,
                ai_processed=True
            ).exclude(id=conv.id).filter(
                Q(ai_keywords__overlap=conv.ai_keywords) |
                Q(title__icontains=conv.title[:30])
            )[:5]
            
            for rel_conv in related_convs:
                context['related']['related_conversations'].append({
                    'id': rel_conv.id,
                    'title': rel_conv.title,
                    'post_type': rel_conv.post_type,
                    'created_at': rel_conv.created_at.isoformat(),
                })
        
        # Get action items
        action_items = ActionItem.objects.filter(conversation=conv)
        for item in action_items:
            context['related']['action_items'].append({
                'id': item.id,
                'title': item.title,
                'status': item.status,
                'assignee': item.assignee.get_full_name() if item.assignee else None,
                'due_date': item.due_date.isoformat() if item.due_date else None,
            })
        
        cache.set(cache_key, context, ContextManager.CACHE_TTL)
        return context
    
    @staticmethod
    def get_decision_context(decision_id, org_id):
        """Get full context for a decision"""
        cache_key = f"dec_context:{decision_id}:{org_id}"
        cached = cache.get(cache_key)
        if cached:
            return cached
        
        try:
            dec = Decision.objects.get(id=decision_id)
        except Decision.DoesNotExist:
            return None
        
        context = {
            'decision': {
                'id': dec.id,
                'title': dec.title,
                'description': dec.description,
                'status': dec.status,
                'impact_level': dec.impact_level,
                'created_at': dec.created_at.isoformat(),
                'decided_at': dec.decided_at.isoformat() if dec.decided_at else None,
                'decision_maker': dec.decision_maker.get_full_name() if dec.decision_maker else None,
            },
            'rationale': {
                'rationale': dec.rationale,
                'context_reason': dec.context_reason,
                'if_this_fails': dec.if_this_fails,
                'alternatives_considered': dec.alternatives_considered,
                'tradeoffs': dec.tradeoffs,
            },
            'implementation': {
                'status': dec.status,
                'deadline': dec.implementation_deadline.isoformat() if dec.implementation_deadline else None,
                'implemented_at': dec.implemented_at.isoformat() if dec.implemented_at else None,
                'code_links': dec.code_links,
            },
            'confidence': {
                'level': dec.confidence_level,
                'votes': dec.confidence_votes,
                'stakeholders': [s.get_full_name() for s in dec.stakeholders.all()],
            },
            'related': {
                'conversation': None,
                'related_decisions': [],
                'action_items': [],
            }
        }
        
        # Get related conversation
        if dec.conversation:
            context['related']['conversation'] = {
                'id': dec.conversation.id,
                'title': dec.conversation.title,
                'post_type': dec.conversation.post_type,
            }
        
        # Get related decisions (same impact level or stakeholders)
        related_decs = Decision.objects.filter(
            organization=dec.organization,
            status__in=['approved', 'implemented']
        ).exclude(id=dec.id).filter(
            Q(impact_level=dec.impact_level) |
            Q(stakeholders__in=dec.stakeholders.all())
        ).distinct()[:5]
        
        for rel_dec in related_decs:
            context['related']['related_decisions'].append({
                'id': rel_dec.id,
                'title': rel_dec.title,
                'status': rel_dec.status,
                'impact_level': rel_dec.impact_level,
            })
        
        cache.set(cache_key, context, ContextManager.CACHE_TTL)
        return context
    
    @staticmethod
    def link_conversation_to_decision(conversation_id, decision_id, org_id):
        """Link a conversation to a decision"""
        try:
            conv = Conversation.objects.get(id=conversation_id)
            dec = Decision.objects.get(id=decision_id)
            
            if conv.organization_id != org_id or dec.organization_id != org_id:
                return False
            
            dec.conversation = conv
            dec.save()
            
            # Clear cache
            cache.delete(f"conv_context:{conversation_id}:{org_id}")
            cache.delete(f"dec_context:{decision_id}:{org_id}")
            
            return True
        except (Conversation.DoesNotExist, Decision.DoesNotExist):
            return False
    
    @staticmethod
    def get_conversation_timeline(conversation_id, org_id):
        """Get comprehensive timeline for a conversation"""
        try:
            conv = Conversation.objects.get(id=conversation_id)
        except Conversation.DoesNotExist:
            return []
        
        timeline = []
        
        # Original creation
        timeline.append({
            'type': 'created',
            'date': conv.created_at,
            'title': 'Conversation created',
            'author': conv.author.get_full_name(),
            'details': conv.title,
        })
        
        # Replies
        replies = ConversationReply.objects.filter(conversation=conv).order_by('created_at')
        for reply in replies:
            timeline.append({
                'type': 'reply',
                'date': reply.created_at,
                'title': f'Reply by {reply.author.get_full_name()}',
                'author': reply.author.get_full_name(),
                'details': reply.content[:100],
            })
        
        # Related decisions
        decisions = Decision.objects.filter(conversation=conv)
        for dec in decisions:
            timeline.append({
                'type': 'decision',
                'date': dec.decided_at or dec.created_at,
                'title': f'Decision: {dec.title}',
                'status': dec.status,
                'details': dec.description[:100],
            })
        
        # Status changes
        if conv.is_closed:
            timeline.append({
                'type': 'closed',
                'date': conv.closed_at,
                'title': 'Conversation closed',
                'details': conv.closure_summary[:100] if conv.closure_summary else '',
            })
        
        timeline.sort(key=lambda x: x['date'])
        return timeline
    
    @staticmethod
    def get_decision_implementation_status(decision_id, org_id):
        """Get implementation status and progress"""
        try:
            dec = Decision.objects.get(id=decision_id)
        except Decision.DoesNotExist:
            return None
        
        status_info = {
            'decision_id': dec.id,
            'title': dec.title,
            'status': dec.status,
            'progress': 0,
            'milestones': [],
            'blockers': [],
            'code_links': dec.code_links or [],
        }
        
        # Calculate progress based on status
        status_progress = {
            'proposed': 10,
            'under_review': 25,
            'approved': 50,
            'implemented': 100,
            'rejected': 0,
            'cancelled': 0,
        }
        status_info['progress'] = status_progress.get(dec.status, 0)
        
        # Get related action items
        if dec.conversation:
            action_items = ActionItem.objects.filter(conversation=dec.conversation)
            for item in action_items:
                if item.status == 'completed':
                    status_info['milestones'].append({
                        'title': item.title,
                        'completed_at': item.completed_at.isoformat() if item.completed_at else None,
                    })
                elif item.status == 'pending':
                    status_info['blockers'].append({
                        'title': item.title,
                        'assignee': item.assignee.get_full_name() if item.assignee else None,
                        'due_date': item.due_date.isoformat() if item.due_date else None,
                    })
        
        return status_info
    
    @staticmethod
    def record_search_query(query, org_id, user_id=None, results_count=0, response_time_ms=0):
        """Record search query for analytics"""
        SearchQuery.objects.create(
            organization_id=org_id,
            user_id=user_id,
            query_text=query,
            results_count=results_count,
            response_time_ms=response_time_ms,
            search_type='semantic'
        )
    
    @staticmethod
    def get_context_summary(conversation_id, org_id):
        """Get concise summary of conversation context"""
        context = ContextManager.get_conversation_context(conversation_id, org_id)
        if not context:
            return None
        
        return {
            'title': context['conversation']['title'],
            'summary': context['metadata']['ai_summary'],
            'key_takeaway': context['metadata']['key_takeaway'],
            'decisions_count': len(context['related']['decisions']),
            'action_items_count': len(context['related']['action_items']),
            'engagement_score': (
                context['engagement']['reply_count'] * 2 +
                context['engagement']['view_count'] +
                context['engagement']['reaction_count'] * 3
            ),
        }
