from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q, F
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from .models import Conversation, ConversationReply, ActionItem, Tag
from .tasks import process_conversation_ai
from .mention_parser import parse_mentions_and_tags
from apps.organizations.activity import log_activity
from apps.organizations.models import User

class ConversationPagination(PageNumberPagination):
    page_size = 20

@csrf_exempt
@api_view(['GET', 'POST'])
def conversations(request):
    if request.method == 'GET':
        # Role-based filtering
        queryset = Conversation.objects.filter(
            organization=request.user.organization,
            is_archived=False
        )
        
        # Check for drafts
        draft_param = request.GET.get('drafts')
        if draft_param == 'true':
            queryset = queryset.filter(is_draft=True, author=request.user)
        else:
            queryset = queryset.filter(is_draft=False)
        
        # Search and filters
        search = request.GET.get('search')
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) | Q(content__icontains=search)
            )
        
        post_type = request.GET.get('type')
        if post_type:
            queryset = queryset.filter(post_type=post_type)
        
        paginator = ConversationPagination()
        page = paginator.paginate_queryset(queryset, request)
        
        conversations_data = []
        for conv in page:
            conversations_data.append({
                'id': conv.id,
                'title': conv.title,
                'content': conv.content[:200] + '...' if len(conv.content) > 200 else conv.content,
                'post_type': conv.post_type,
                'priority': conv.priority,
                'author': conv.author.get_full_name(),
                'author_avatar': conv.author.avatar.url if conv.author.avatar else None,
                'created_at': conv.created_at,
                'reply_count': conv.reply_count,
                'ai_summary': conv.ai_summary,
                'ai_keywords': conv.ai_keywords,
                'is_pinned': conv.is_pinned,
                'status_label': conv.status_label
            })
        
        return paginator.get_paginated_response(conversations_data)
    
    elif request.method == 'POST':
        data = request.data
        is_draft = data.get('is_draft', False)
        
        conversation = Conversation.objects.create(
            organization=request.user.organization,
            author=request.user,
            title=data.get('title', 'Untitled'),
            content=data.get('content', ''),
            post_type=data.get('post_type', 'update'),
            priority=data.get('priority', 'medium'),
            why_this_matters=data.get('why_this_matters', ''),
            is_draft=is_draft,
            draft_saved_at=timezone.now() if is_draft else None
        )
        
        # Parse mentions and tags
        if not is_draft:
            mentioned_users, tags = parse_mentions_and_tags(
                data.get('content', ''), 
                request.user.organization
            )
            conversation.mentioned_users.set(mentioned_users)
            conversation.tags.set(tags)
            
            # Create notifications for mentions
            from apps.notifications.utils import create_notification
            for mentioned_user in mentioned_users:
                if mentioned_user != request.user:
                    create_notification(
                        user=mentioned_user,
                        notification_type='mention',
                        title=f'{request.user.get_full_name()} mentioned you',
                        message=f'In: {conversation.title}',
                        link=f'/conversations/{conversation.id}'
                    )
            
            # Log activity
            log_activity(
                organization=request.user.organization,
                actor=request.user,
                action_type='conversation_created',
                content_object=conversation,
                title=conversation.title,
                post_type=conversation.post_type
            )
            
            # Update onboarding progress
            if not request.user.first_conversation_created:
                request.user.first_conversation_created = True
                request.user.save(update_fields=['first_conversation_created'])
            
            # Trigger AI processing
            try:
                process_conversation_ai.delay(conversation.id)
            except Exception as e:
                print(f"AI processing skipped (Celery not running): {e}")
        
        return Response({
            'id': conversation.id,
            'title': conversation.title,
            'post_type': conversation.post_type,
            'is_draft': conversation.is_draft,
            'created_at': conversation.created_at
        }, status=status.HTTP_201_CREATED)

@api_view(['GET', 'POST'])
def conversation_replies(request, conversation_id):
    try:
        conversation = Conversation.objects.get(
            id=conversation_id,
            organization=request.user.organization
        )
    except Conversation.DoesNotExist:
        return Response({'error': 'Conversation not found'}, 
                       status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'GET':
        replies = ConversationReply.objects.filter(conversation=conversation)
        replies_data = []
        for reply in replies:
            replies_data.append({
                'id': reply.id,
                'content': reply.content,
                'author': reply.author.get_full_name(),
                'author_id': reply.author.id,
                'author_avatar': reply.author.avatar.url if reply.author.avatar else None,
                'created_at': reply.created_at,
                'is_ai_generated': reply.is_ai_generated,
                'parent_reply': reply.parent_reply_id
            })
        
        return Response(replies_data)
    
    elif request.method == 'POST':
        reply = ConversationReply.objects.create(
            conversation=conversation,
            author=request.user,
            content=request.data['content'],
            parent_reply_id=request.data.get('parent_reply_id')
        )
        
        # Parse mentions
        mentioned_users, _ = parse_mentions_and_tags(
            request.data['content'],
            request.user.organization
        )
        reply.mentioned_users.set(mentioned_users)
        
        # Create notifications for mentions
        from apps.notifications.utils import create_notification
        for mentioned_user in mentioned_users:
            if mentioned_user != request.user:
                create_notification(
                    user=mentioned_user,
                    notification_type='mention',
                    title=f'{request.user.get_full_name()} mentioned you',
                    message=f'In: {conversation.title}',
                    link=f'/conversations/{conversation.id}'
                )
        
        # Notify conversation author of reply
        if conversation.author != request.user:
            create_notification(
                user=conversation.author,
                notification_type='reply',
                title=f'{request.user.get_full_name()} replied',
                message=f'To: {conversation.title}',
                link=f'/conversations/{conversation.id}'
            )
        
        # Log activity
        log_activity(
            organization=request.user.organization,
            actor=request.user,
            action_type='conversation_replied',
            content_object=conversation,
            title=conversation.title
        )
        
        # Update reply count
        Conversation.objects.filter(id=conversation_id).update(
            reply_count=F('reply_count') + 1
        )
        
        return Response({
            'id': reply.id,
            'content': reply.content,
            'author': reply.author.get_full_name(),
            'created_at': reply.created_at
        }, status=status.HTTP_201_CREATED)

@api_view(['GET', 'PUT', 'DELETE'])
def conversation_detail(request, conversation_id):
    try:
        conversation = Conversation.objects.get(
            id=conversation_id,
            organization=request.user.organization
        )
        
        if request.method == 'GET':
            # Update view count
            Conversation.objects.filter(id=conversation_id).update(
                view_count=F('view_count') + 1
            )
            
            return Response({
                'id': conversation.id,
                'title': conversation.title,
                'content': conversation.content,
                'post_type': conversation.post_type,
                'priority': conversation.priority,
                'author': conversation.author.get_full_name(),
                'author_id': conversation.author.id,
                'author_avatar': conversation.author.avatar.url if conversation.author.avatar else None,
                'created_at': conversation.created_at,
                'updated_at': conversation.updated_at,
                'ai_summary': conversation.ai_summary,
                'ai_action_items': conversation.ai_action_items,
                'ai_keywords': conversation.ai_keywords,
                'view_count': conversation.view_count,
                'reply_count': conversation.reply_count,
                'is_pinned': conversation.is_pinned,
                'why_this_matters': conversation.why_this_matters,
                'status_label': conversation.status_label,
                'context_reason': conversation.context_reason,
                'key_takeaway': conversation.key_takeaway,
                'emotional_context': conversation.emotional_context,
                'memory_health_score': conversation.memory_health_score
            })
        
        elif request.method == 'PUT':
            if conversation.author != request.user:
                return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
            
            from .models import ConversationEditHistory
            
            # Track changes
            if 'title' in request.data and request.data['title'] != conversation.title:
                ConversationEditHistory.objects.create(
                    conversation=conversation,
                    edited_by=request.user,
                    field_changed='title',
                    old_value=conversation.title,
                    new_value=request.data['title']
                )
                conversation.title = request.data['title']
            
            if 'content' in request.data and request.data['content'] != conversation.content:
                ConversationEditHistory.objects.create(
                    conversation=conversation,
                    edited_by=request.user,
                    field_changed='content',
                    old_value=conversation.content,
                    new_value=request.data['content']
                )
                conversation.content = request.data['content']
            
            if 'why_this_matters' in request.data:
                conversation.why_this_matters = request.data['why_this_matters']
            
            if 'status_label' in request.data:
                conversation.status_label = request.data['status_label']
            
            if 'context_reason' in request.data:
                conversation.context_reason = request.data['context_reason']
            
            if 'key_takeaway' in request.data:
                conversation.key_takeaway = request.data['key_takeaway']
            
            if 'emotional_context' in request.data:
                conversation.emotional_context = request.data['emotional_context']
            
            if 'is_draft' in request.data:
                conversation.is_draft = request.data['is_draft']
                if request.data['is_draft']:
                    conversation.draft_saved_at = timezone.now()
                else:
                    conversation.draft_saved_at = None
            
            conversation.save()
            
            # Recalculate memory health
            from .memory_health import calculate_memory_health_score
            conversation.memory_health_score = calculate_memory_health_score(conversation)
            conversation.save()
            
            return Response({'message': 'Updated'})
        
        elif request.method == 'DELETE':
            if conversation.author != request.user:
                return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
            
            conversation.delete()
            return Response({'message': 'Deleted'})
            
    except Conversation.DoesNotExist:
        return Response({'error': 'Conversation not found'}, 
                       status=status.HTTP_404_NOT_FOUND)

@csrf_exempt
@api_view(['GET'])
def users_list(request):
    """Get list of users for @mention autocomplete"""
    # Get organization from user or use default
    if request.user and request.user.is_authenticated:
        org = request.user.organization
    else:
        from apps.organizations.models import Organization
        org = Organization.objects.first()
    
    if not org:
        return Response([])
    
    users = User.objects.filter(
        organization=org,
        is_active=True
    ).values('id', 'username', 'full_name')[:20]
    
    return Response(list(users))

@csrf_exempt
@api_view(['GET'])
def tags_list(request):
    """Get list of tags for #tag autocomplete"""
    # Get organization from user or use default
    if request.user and request.user.is_authenticated:
        org = request.user.organization
    else:
        from apps.organizations.models import Organization
        org = Organization.objects.first()
    
    if not org:
        return Response([])
    
    tags = Tag.objects.filter(
        organization=org
    ).values('id', 'name', 'color', 'usage_count')[:50]
    
    return Response(list(tags))

@api_view(['GET'])
def tag_conversations(request, tag_name):
    """Get conversations with specific tag"""
    try:
        tag = Tag.objects.get(
            name=tag_name.lower(),
            organization=request.user.organization
        )
        conversations = tag.conversations.filter(is_archived=False)[:20]
        
        conversations_data = []
        for conv in conversations:
            conversations_data.append({
                'id': conv.id,
                'title': conv.title,
                'post_type': conv.post_type,
                'author': conv.author.get_full_name(),
                'created_at': conv.created_at,
            })
        
        return Response({
            'tag': tag.name,
            'conversations': conversations_data
        })
    except Tag.DoesNotExist:
        return Response({'error': 'Tag not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
def conversation_history(request, conversation_id):
    """Get edit history for a conversation"""
    from .models import ConversationEditHistory
    
    try:
        conversation = Conversation.objects.get(
            id=conversation_id,
            organization=request.user.organization
        )
        
        history = ConversationEditHistory.objects.filter(conversation=conversation)[:20]
        
        history_data = [{
            'id': h.id,
            'edited_by': h.edited_by.get_full_name(),
            'edited_at': h.edited_at,
            'field_changed': h.field_changed,
            'old_value': h.old_value[:100] + '...' if len(h.old_value) > 100 else h.old_value,
            'new_value': h.new_value[:100] + '...' if len(h.new_value) > 100 else h.new_value
        } for h in history]
        
        return Response(history_data)
    except Conversation.DoesNotExist:
        return Response({'error': 'Conversation not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['GET', 'POST'])
def bookmarks(request):
    """Get user's bookmarks or create new bookmark"""
    from .models import Bookmark
    
    if request.method == 'GET':
        user_bookmarks = Bookmark.objects.filter(user=request.user).select_related('conversation')
        
        bookmarks_data = [{
            'id': b.id,
            'conversation_id': b.conversation.id,
            'conversation_title': b.conversation.title,
            'conversation_type': b.conversation.post_type,
            'note': b.note,
            'created_at': b.created_at
        } for b in user_bookmarks]
        
        return Response(bookmarks_data)
    
    elif request.method == 'POST':
        conversation_id = request.data.get('conversation_id')
        note = request.data.get('note', '')
        
        try:
            conversation = Conversation.objects.get(
                id=conversation_id,
                organization=request.user.organization
            )
            
            bookmark, created = Bookmark.objects.get_or_create(
                user=request.user,
                conversation=conversation,
                defaults={'note': note}
            )
            
            if not created:
                bookmark.note = note
                bookmark.save()
            
            return Response({
                'id': bookmark.id,
                'message': 'Bookmarked' if created else 'Updated'
            }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
            
        except Conversation.DoesNotExist:
            return Response({'error': 'Conversation not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['DELETE'])
def bookmark_detail(request, bookmark_id):
    """Delete a bookmark"""
    from .models import Bookmark
    
    try:
        bookmark = Bookmark.objects.get(id=bookmark_id, user=request.user)
        bookmark.delete()
        return Response({'message': 'Bookmark removed'})
    except Bookmark.DoesNotExist:
        return Response({'error': 'Bookmark not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
def conversation_bookmark_status(request, conversation_id):
    """Check if conversation is bookmarked by user"""
    from .models import Bookmark
    
    try:
        bookmark = Bookmark.objects.get(
            user=request.user,
            conversation_id=conversation_id
        )
        return Response({
            'bookmarked': True,
            'bookmark_id': bookmark.id,
            'note': bookmark.note
        })
    except Bookmark.DoesNotExist:
        return Response({'bookmarked': False})

@api_view(['POST'])
def update_status_label(request, conversation_id):
    """Update conversation status label"""
    try:
        conversation = Conversation.objects.get(
            id=conversation_id,
            organization=request.user.organization
        )
        
        status_label = request.data.get('status_label')
        if status_label:
            conversation.status_label = status_label
            conversation.save()
            return Response({'message': 'Status updated', 'status_label': status_label})
        
        return Response({'error': 'Status label required'}, status=status.HTTP_400_BAD_REQUEST)
    except Conversation.DoesNotExist:
        return Response({'error': 'Conversation not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
def explain_simply(request, conversation_id):
    """Generate simple explanation of conversation"""
    try:
        conversation = Conversation.objects.get(
            id=conversation_id,
            organization=request.user.organization
        )
        
        from apps.conversations.ai_processor import generate_simple_explanation
        
        simple_text = generate_simple_explanation(
            title=conversation.title,
            content=conversation.content,
            summary=conversation.ai_summary
        )
        
        return Response({'simple_explanation': simple_text})
    except Conversation.DoesNotExist:
        return Response({'error': 'Conversation not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def add_reaction(request, conversation_id):
    """Add or update reaction to conversation"""
    from .models import Reaction
    
    try:
        conversation = Conversation.objects.get(
            id=conversation_id,
            organization=request.user.organization
        )
        
        reaction_type = request.data.get('reaction_type')
        if reaction_type not in ['agree', 'unsure', 'concern']:
            return Response({'error': 'Invalid reaction type'}, status=status.HTTP_400_BAD_REQUEST)
        
        reaction, created = Reaction.objects.update_or_create(
            conversation=conversation,
            user=request.user,
            defaults={'reaction_type': reaction_type}
        )
        
        return Response({'message': 'Reaction added', 'reaction_type': reaction_type})
    except Conversation.DoesNotExist:
        return Response({'error': 'Conversation not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['DELETE'])
def remove_reaction(request, conversation_id):
    """Remove reaction from conversation"""
    from .models import Reaction
    
    try:
        reaction = Reaction.objects.get(
            conversation_id=conversation_id,
            user=request.user
        )
        reaction.delete()
        return Response({'message': 'Reaction removed'})
    except Reaction.DoesNotExist:
        return Response({'error': 'Reaction not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
def conversation_reactions(request, conversation_id):
    """Get reaction summary for conversation"""
    from .models import Reaction
    from django.db.models import Count
    
    try:
        conversation = Conversation.objects.get(
            id=conversation_id,
            organization=request.user.organization
        )
        
        reactions = Reaction.objects.filter(conversation=conversation).values('reaction_type').annotate(count=Count('id'))
        
        user_reaction = None
        try:
            user_reaction = Reaction.objects.get(conversation=conversation, user=request.user).reaction_type
        except Reaction.DoesNotExist:
            pass
        
        return Response({
            'reactions': list(reactions),
            'user_reaction': user_reaction
        })
    except Conversation.DoesNotExist:
        return Response({'error': 'Conversation not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
def check_complexity(request, conversation_id):
    """Check if conversation is too complex for new team members"""
    try:
        conversation = Conversation.objects.get(
            id=conversation_id,
            organization=request.user.organization
        )
        
        from apps.conversations.ai_processor import AIProcessor
        processor = AIProcessor()
        
        complexity = processor.check_complexity(
            title=conversation.title,
            content=conversation.content
        )
        
        return Response(complexity)
    except Conversation.DoesNotExist:
        return Response({'error': 'Conversation not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def conversation_timeline(request, conversation_id):
    """Get comprehensive timeline: related discussions, decisions, changes"""
    try:
        conversation = Conversation.objects.get(
            id=conversation_id,
            organization=request.user.organization
        )
        
        from apps.decisions.models import Decision
        from .models import ConversationEditHistory
        
        timeline = []
        
        # Original conversation
        timeline.append({
            'type': 'created',
            'date': conversation.created_at,
            'title': 'Conversation created',
            'author': conversation.author.get_full_name(),
            'id': conversation.id
        })
        
        # Edit history
        edits = ConversationEditHistory.objects.filter(conversation=conversation)
        for edit in edits:
            timeline.append({
                'type': 'edited',
                'date': edit.edited_at,
                'title': f'{edit.field_changed} updated',
                'author': edit.edited_by.get_full_name(),
                'details': f'{edit.old_value[:50]}... → {edit.new_value[:50]}...'
            })
        
        # Related decisions
        if conversation.post_type == 'decision':
            decision = Decision.objects.filter(conversation=conversation).first()
            if decision:
                timeline.append({
                    'type': 'decision',
                    'date': decision.decided_at or decision.created_at,
                    'title': 'Decision made',
                    'author': decision.decision_maker.get_full_name() if decision.decision_maker else None,
                    'id': decision.id,
                    'status': decision.status
                })
        
        # Related conversations (same keywords)
        if conversation.ai_keywords:
            related = Conversation.objects.filter(
                organization=request.user.organization,
                ai_processed=True
            ).exclude(id=conversation.id)
            
            for conv in related[:20]:
                if any(kw in conv.ai_keywords for kw in conversation.ai_keywords[:3]):
                    timeline.append({
                        'type': 'related',
                        'date': conv.created_at,
                        'title': conv.title,
                        'author': conv.author.get_full_name(),
                        'id': conv.id,
                        'post_type': conv.post_type
                    })
        
        # Sort by date
        timeline.sort(key=lambda x: x['date'], reverse=True)
        
        return Response({'timeline': timeline[:30]})
    except Conversation.DoesNotExist:
        return Response({'error': 'Conversation not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
def close_conversation(request, conversation_id):
    """Close conversation with summary and next steps"""
    try:
        conversation = Conversation.objects.get(
            id=conversation_id,
            organization=request.user.organization
        )
        
        from django.utils import timezone
        conversation.is_closed = True
        conversation.closed_at = timezone.now()
        conversation.closure_summary = request.data.get('summary', '')
        conversation.next_steps = request.data.get('next_steps', '')
        conversation.owner_id = request.data.get('owner_id')
        conversation.save()
        
        # Award badge
        from .models import Badge
        Badge.objects.create(
            user=request.user,
            badge_type='decision_owner',
            conversation=conversation
        )
        
        # Notify user of badge
        from apps.notifications.utils import create_notification
        create_notification(
            user=request.user,
            notification_type='badge',
            title='Badge Earned: Decision Owner',
            message='You closed a conversation with clear next steps',
            link='/settings'
        )
        
        return Response({'message': 'Conversation closed'})
    except Conversation.DoesNotExist:
        return Response({'error': 'Conversation not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
def mark_crisis(request, conversation_id):
    """Mark conversation as crisis"""
    try:
        conversation = Conversation.objects.get(
            id=conversation_id,
            organization=request.user.organization
        )
        conversation.is_crisis = request.data.get('is_crisis', True)
        conversation.save()
        
        if conversation.is_crisis:
            from .models import Badge
            Badge.objects.create(
                user=request.user,
                badge_type='crisis_responder',
                conversation=conversation
            )
            
            # Notify user of badge
            from apps.notifications.utils import create_notification
            create_notification(
                user=request.user,
                notification_type='badge',
                title='Badge Earned: Crisis Responder',
                message='You marked a conversation as crisis',
                link='/settings'
            )
        
        return Response({'message': 'Crisis status updated', 'is_crisis': conversation.is_crisis})
    except Conversation.DoesNotExist:
        return Response({'error': 'Conversation not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['GET', 'PUT'])
def user_preferences(request):
    """Get or update user preferences"""
    from .models import UserPreferences
    
    prefs, _ = UserPreferences.objects.get_or_create(user=request.user)
    
    if request.method == 'GET':
        return Response({
            'quiet_mode': prefs.quiet_mode,
            'muted_topics': prefs.muted_topics,
            'muted_post_types': prefs.muted_post_types,
            'offline_mode': prefs.offline_mode,
            'low_data_mode': prefs.low_data_mode
        })
    
    elif request.method == 'PUT':
        if 'quiet_mode' in request.data:
            prefs.quiet_mode = request.data['quiet_mode']
        if 'muted_topics' in request.data:
            prefs.muted_topics = request.data['muted_topics']
        if 'muted_post_types' in request.data:
            prefs.muted_post_types = request.data['muted_post_types']
        if 'offline_mode' in request.data:
            prefs.offline_mode = request.data['offline_mode']
        if 'low_data_mode' in request.data:
            prefs.low_data_mode = request.data['low_data_mode']
        prefs.save()
        return Response({'message': 'Preferences updated'})

@api_view(['GET'])
def user_badges(request):
    """Get user badges"""
    from .models import Badge
    
    badges = Badge.objects.filter(user=request.user)
    return Response([{
        'badge_type': b.badge_type,
        'earned_at': b.earned_at,
        'conversation_id': b.conversation_id
    } for b in badges])

@api_view(['POST'])
def generate_share_link(request, conversation_id):
    """Generate shareable link"""
    try:
        conversation = Conversation.objects.get(
            id=conversation_id,
            organization=request.user.organization
        )
        
        import hashlib
        import time
        token = hashlib.sha256(f"{conversation.id}{time.time()}".encode()).hexdigest()[:16]
        
        return Response({
            'share_url': f"/share/{token}",
            'title': conversation.title,
            'summary': conversation.ai_summary or conversation.content[:200]
        })
    except Conversation.DoesNotExist:
        return Response({'error': 'Conversation not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
def vote_confidence(request, conversation_id):
    """Vote on decision confidence (1-10)"""
    try:
        conversation = Conversation.objects.get(
            id=conversation_id,
            organization=request.user.organization
        )
        
        from apps.decisions.models import Decision
        decision = Decision.objects.filter(conversation=conversation).first()
        
        if not decision:
            return Response({'error': 'No decision found'}, status=status.HTTP_404_NOT_FOUND)
        
        confidence = request.data.get('confidence')
        if not confidence or not (1 <= int(confidence) <= 10):
            return Response({'error': 'Confidence must be 1-10'}, status=status.HTTP_400_BAD_REQUEST)
        
        from django.utils import timezone
        
        # Add vote
        votes = decision.confidence_votes or []
        votes.append({
            'user_id': request.user.id,
            'user_name': request.user.get_full_name(),
            'vote': int(confidence),
            'timestamp': timezone.now().isoformat()
        })
        decision.confidence_votes = votes
        
        # Calculate average
        avg = sum(v['vote'] for v in votes) / len(votes)
        decision.confidence_level = round(avg)
        decision.save()
        
        return Response({
            'message': 'Vote recorded',
            'average_confidence': round(avg, 1),
            'total_votes': len(votes)
        })
    except Conversation.DoesNotExist:
        return Response({'error': 'Conversation not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
def templates_list(request):
    """List all technical decision templates"""
    from .templates import list_templates
    return Response(list_templates())

@api_view(['GET'])
def template_detail(request, template_key):
    """Get specific template"""
    from .templates import get_template
    template = get_template(template_key)
    if not template:
        return Response({'error': 'Template not found'}, status=status.HTTP_404_NOT_FOUND)
    return Response(template)

@api_view(['GET'])
def export_adr(request, conversation_id):
    """Export conversation as ADR markdown"""
    try:
        conversation = Conversation.objects.get(
            id=conversation_id,
            organization=request.user.organization
        )
        
        from apps.decisions.models import Decision
        decision = Decision.objects.filter(conversation=conversation).first()
        
        from .adr_export import export_to_adr, generate_adr_filename
        
        adr_content = export_to_adr(conversation, decision)
        filename = generate_adr_filename(conversation)
        
        return Response({
            'content': adr_content,
            'filename': filename
        })
    except Conversation.DoesNotExist:
        return Response({'error': 'Conversation not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
def generate_plain_language(request, conversation_id):
    """Generate plain language explanation"""
    try:
        conversation = Conversation.objects.get(
            id=conversation_id,
            organization=request.user.organization
        )
        
        from .ai_processor import generate_simple_explanation
        
        plain_text = generate_simple_explanation(
            title=conversation.title,
            content=conversation.content,
            summary=conversation.ai_summary
        )
        
        # Save to conversation
        conversation.plain_language_summary = plain_text
        conversation.save()
        
        return Response({'plain_language_summary': plain_text})
    except Conversation.DoesNotExist:
        return Response({'error': 'Conversation not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def add_code_link(request, conversation_id):
    """Add code link (PR, commit, doc) to conversation"""
    try:
        conversation = Conversation.objects.get(
            id=conversation_id,
            organization=request.user.organization
        )
        
        link = {
            'title': request.data.get('title'),
            'url': request.data.get('url'),
            'type': request.data.get('type', 'other'),  # pr, commit, doc, other
            'added_by': request.user.get_full_name(),
            'added_at': timezone.now().isoformat()
        }
        
        links = conversation.code_links or []
        links.append(link)
        conversation.code_links = links
        conversation.save()
        
        return Response({'message': 'Link added', 'links': links})
    except Conversation.DoesNotExist:
        return Response({'error': 'Conversation not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
def process_developer_mode(request, conversation_id):
    """Process conversation with Developer Productivity Assistant"""
    try:
        conversation = Conversation.objects.get(
            id=conversation_id,
            organization=request.user.organization
        )
        
        from .developer_assistant import process_as_developer_conversation
        
        result = process_as_developer_conversation(conversation)
        
        # Save to conversation
        conversation.dev_simple_summary = result.get('simple_summary', '')
        conversation.dev_technical_decision = result.get('technical_decision', {})
        conversation.dev_action_items = result.get('action_items', [])
        conversation.dev_agile_context = result.get('agile_context', [])
        conversation.dev_future_note = result.get('future_developer_note', '')
        conversation.dev_warnings = result.get('warnings', {})
        conversation.save()
        
        return Response(result)
    except Conversation.DoesNotExist:
        return Response({'error': 'Conversation not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def developer_insights(request, conversation_id):
    """Get Developer Assistant insights for conversation"""
    try:
        conversation = Conversation.objects.get(
            id=conversation_id,
            organization=request.user.organization
        )
        
        return Response({
            'simple_summary': conversation.dev_simple_summary,
            'technical_decision': conversation.dev_technical_decision,
            'action_items': conversation.dev_action_items,
            'agile_context': conversation.dev_agile_context,
            'future_developer_note': conversation.dev_future_note,
            'warnings': conversation.dev_warnings
        })
    except Conversation.DoesNotExist:
        return Response({'error': 'Conversation not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
def upload_document(request, conversation_id):
    """Upload document to conversation"""
    from .models import Document
    
    if 'file' not in request.FILES:
        return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
    
    file = request.FILES['file']
    
    # Validate file size (max 10MB)
    if file.size > 10 * 1024 * 1024:
        return Response({'error': 'File too large (max 10MB)'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        conversation = Conversation.objects.get(
            id=conversation_id,
            organization=request.user.organization
        )
    except Conversation.DoesNotExist:
        return Response({'error': 'Conversation not found'}, status=status.HTTP_404_NOT_FOUND)
    
    document = Document.objects.create(
        organization=request.user.organization,
        uploaded_by=request.user,
        conversation=conversation,
        file=file,
        filename=file.name,
        file_size=file.size,
        file_type=file.content_type,
        comment=request.data.get('comment', '')
    )
    
    return Response({
        'id': document.id,
        'filename': document.filename,
        'file_url': document.file.url,
        'file_size': document.file_size,
        'comment': document.comment,
        'uploaded_by': request.user.get_full_name(),
        'created_at': document.created_at
    }, status=status.HTTP_201_CREATED)

@api_view(['GET'])
def conversation_documents(request, conversation_id):
    """Get documents for conversation"""
    from .models import Document
    
    try:
        conversation = Conversation.objects.get(
            id=conversation_id,
            organization=request.user.organization
        )
        
        documents = Document.objects.filter(conversation=conversation)
        
        return Response([{
            'id': doc.id,
            'filename': doc.filename,
            'file_url': doc.file.url,
            'file_size': doc.file_size,
            'file_type': doc.file_type,
            'comment': doc.comment,
            'uploaded_by': doc.uploaded_by.get_full_name(),
            'created_at': doc.created_at
        } for doc in documents])
    except Conversation.DoesNotExist:
        return Response({'error': 'Conversation not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['DELETE'])
def delete_document(request, document_id):
    """Delete document"""
    from .models import Document
    
    try:
        document = Document.objects.get(
            id=document_id,
            organization=request.user.organization
        )
        
        if document.uploaded_by != request.user:
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
        
        document.file.delete()
        document.delete()
        
        return Response({'message': 'Document deleted'})
    except Document.DoesNotExist:
        return Response({'error': 'Document not found'}, status=status.HTTP_404_NOT_FOUND)
