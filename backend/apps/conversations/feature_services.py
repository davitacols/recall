from django.utils import timezone
from datetime import timedelta
from apps.conversations.feature_models import Favorite, EmailDigest, BulkAction, AuditTrail, TrendingTopic
from apps.conversations.models import Conversation, ConversationReply
from apps.decisions.models import Decision
from apps.organizations.models import User
import json

class FavoriteService:
    @staticmethod
    def toggle_favorite(user, conversation=None, decision=None):
        if conversation:
            fav, created = Favorite.objects.get_or_create(user=user, conversation=conversation)
            if not created:
                fav.delete()
                return False
            return True
        elif decision:
            fav, created = Favorite.objects.get_or_create(user=user, decision=decision)
            if not created:
                fav.delete()
                return False
            return True
    
    @staticmethod
    def get_user_favorites(user):
        return Favorite.objects.filter(user=user).select_related('conversation', 'decision')
    
    @staticmethod
    def is_favorite(user, conversation=None, decision=None):
        if conversation:
            return Favorite.objects.filter(user=user, conversation=conversation).exists()
        elif decision:
            return Favorite.objects.filter(user=user, decision=decision).exists()
        return False

class BulkActionService:
    @staticmethod
    def create_bulk_action(org, user, action_type, item_ids, changes):
        return BulkAction.objects.create(
            organization=org,
            user=user,
            action_type=action_type,
            item_ids=item_ids,
            changes=changes
        )
    
    @staticmethod
    def execute_bulk_action(bulk_action):
        bulk_action.status = 'processing'
        bulk_action.save()
        
        try:
            if bulk_action.action_type == 'update_status':
                BulkActionService._update_status(bulk_action)
            elif bulk_action.action_type == 'add_tag':
                BulkActionService._add_tag(bulk_action)
            elif bulk_action.action_type == 'archive':
                BulkActionService._archive_items(bulk_action)
            
            bulk_action.status = 'completed'
            bulk_action.completed_at = timezone.now()
        except Exception as e:
            bulk_action.status = 'failed'
        
        bulk_action.save()
    
    @staticmethod
    def _update_status(bulk_action):
        new_status = bulk_action.changes.get('status')
        for item_id in bulk_action.item_ids:
            try:
                conv = Conversation.objects.get(id=item_id)
                conv.status_label = new_status
                conv.save()
            except:
                pass
    
    @staticmethod
    def _add_tag(bulk_action):
        tag_name = bulk_action.changes.get('tag')
        for item_id in bulk_action.item_ids:
            try:
                conv = Conversation.objects.get(id=item_id)
                from apps.conversations.models import Tag
                tag, _ = Tag.objects.get_or_create(name=tag_name, organization=bulk_action.organization)
                conv.tags.add(tag)
            except:
                pass
    
    @staticmethod
    def _archive_items(bulk_action):
        for item_id in bulk_action.item_ids:
            try:
                conv = Conversation.objects.get(id=item_id)
                conv.is_archived = True
                conv.save()
            except:
                pass

class EmailDigestService:
    @staticmethod
    def get_digest_content(user, frequency='weekly'):
        cutoff_days = {'daily': 1, 'weekly': 7, 'monthly': 30}.get(frequency, 7)
        cutoff_date = timezone.now() - timedelta(days=cutoff_days)
        
        conversations = Conversation.objects.filter(
            organization=user.organization,
            created_at__gte=cutoff_date
        ).order_by('-created_at')[:10]
        
        decisions = Decision.objects.filter(
            organization=user.organization,
            created_at__gte=cutoff_date
        ).order_by('-created_at')[:10]
        
        return {
            'conversations': list(conversations.values('id', 'title', 'created_at')),
            'decisions': list(decisions.values('id', 'title', 'status', 'created_at')),
            'period': f'Last {cutoff_days} days'
        }
    
    @staticmethod
    def send_digest(user):
        try:
            digest = user.email_digest
        except:
            return False
        
        if not digest.enabled:
            return False
        
        content = EmailDigestService.get_digest_content(user, digest.frequency)
        
        # Send email (implement with your email service)
        digest.last_sent = timezone.now()
        digest.save()
        return True

class AuditTrailService:
    @staticmethod
    def log_change(org, user, action, model_name, object_id, old_values, new_values):
        return AuditTrail.objects.create(
            organization=org,
            user=user,
            action=action,
            model_name=model_name,
            object_id=object_id,
            old_values=old_values,
            new_values=new_values
        )
    
    @staticmethod
    def get_object_history(model_name, object_id, org):
        return AuditTrail.objects.filter(
            model_name=model_name,
            object_id=object_id,
            organization=org
        ).order_by('-created_at')

class TrendingService:
    @staticmethod
    def update_trending_topics(org):
        cutoff_date = timezone.now() - timedelta(days=7)
        
        conversations = Conversation.objects.filter(
            organization=org,
            created_at__gte=cutoff_date
        )
        
        topic_counts = {}
        for conv in conversations:
            for tag in conv.tags.all():
                topic_counts[tag.name] = topic_counts.get(tag.name, 0) + 1
        
        for topic, count in topic_counts.items():
            trend_score = count * (1 + (timezone.now() - cutoff_date).days / 7)
            TrendingTopic.objects.update_or_create(
                organization=org,
                topic=topic,
                defaults={'mention_count': count, 'trend_score': trend_score}
            )
    
    @staticmethod
    def get_trending_topics(org, limit=10):
        return TrendingTopic.objects.filter(
            organization=org
        ).order_by('-trend_score')[:limit]

class UndoRedoService:
    _undo_stack = {}
    _redo_stack = {}
    
    @staticmethod
    def record_action(user_id, action_data):
        if user_id not in UndoRedoService._undo_stack:
            UndoRedoService._undo_stack[user_id] = []
            UndoRedoService._redo_stack[user_id] = []
        
        UndoRedoService._undo_stack[user_id].append(action_data)
        UndoRedoService._redo_stack[user_id] = []
    
    @staticmethod
    def undo(user_id):
        if user_id not in UndoRedoService._undo_stack or not UndoRedoService._undo_stack[user_id]:
            return None
        
        action = UndoRedoService._undo_stack[user_id].pop()
        UndoRedoService._redo_stack[user_id].append(action)
        return action
    
    @staticmethod
    def redo(user_id):
        if user_id not in UndoRedoService._redo_stack or not UndoRedoService._redo_stack[user_id]:
            return None
        
        action = UndoRedoService._redo_stack[user_id].pop()
        UndoRedoService._undo_stack[user_id].append(action)
        return action
