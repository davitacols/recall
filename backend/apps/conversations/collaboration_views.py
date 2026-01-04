from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Q
from apps.conversations.models import Conversation, ConversationReply, Reaction
from apps.organizations.models import User, Organization
from apps.notifications.models import Notification
import re

@api_view(['GET', 'POST'])
def conversation_replies(request, conversation_id):
    """Get or create replies for a conversation"""
    try:
        conversation = Conversation.objects.get(
            id=conversation_id,
            organization=request.user.organization
        )
    except Conversation.DoesNotExist:
        return Response({'error': 'Conversation not found'}, status=404)
    
    if request.method == 'GET':
        replies = conversation.replies.all().select_related('author')
        data = [
            {
                'id': r.id,
                'author': r.author.get_full_name(),
                'author_id': r.author.id,
                'content': r.content,
                'created_at': r.created_at,
                'updated_at': r.updated_at,
                'mentioned_users': [u.id for u in r.mentioned_users.all()]
            } for r in replies
        ]
        return Response(data)
    
    elif request.method == 'POST':
        content = request.data.get('content', '')
        
        reply = ConversationReply.objects.create(
            conversation=conversation,
            author=request.user,
            content=content
        )
        
        mentioned_ids = extract_mentions(content)
        if mentioned_ids:
            mentioned_users = User.objects.filter(id__in=mentioned_ids)
            reply.mentioned_users.set(mentioned_users)
            
            for user in mentioned_users:
                if user.id != request.user.id:
                    Notification.objects.create(
                        user=user,
                        notification_type='mention',
                        title=f'{request.user.get_full_name()} mentioned you',
                        message=f'in "{conversation.title}"',
                        link=f'/conversations/{conversation.id}'
                    )
        
        # Notify conversation author if not the replier
        if conversation.author.id != request.user.id:
            Notification.objects.create(
                user=conversation.author,
                notification_type='reply',
                title=f'{request.user.get_full_name()} replied',
                message=f'to "{conversation.title}"',
                link=f'/conversations/{conversation.id}'
            )
        
        return Response({
            'id': reply.id,
            'author': reply.author.get_full_name(),
            'content': reply.content,
            'created_at': reply.created_at,
            'mentioned_users': [u.id for u in reply.mentioned_users.all()]
        })

@api_view(['POST'])
def add_reaction(request, conversation_id):
    """Add reaction to conversation"""
    try:
        conversation = Conversation.objects.get(
            id=conversation_id,
            organization=request.user.organization
        )
    except Conversation.DoesNotExist:
        return Response({'error': 'Conversation not found'}, status=404)
    
    reaction_type = request.data.get('reaction_type')
    
    reaction, created = Reaction.objects.update_or_create(
        conversation=conversation,
        user=request.user,
        defaults={'reaction_type': reaction_type}
    )
    
    # Notify conversation author
    if created and conversation.author.id != request.user.id:
        Notification.objects.create(
            user=conversation.author,
            notification_type='reaction',
            title=f'{request.user.get_full_name()} reacted',
            message=f'{reaction_type} to "{conversation.title}"',
            link=f'/conversations/{conversation.id}'
        )
    
    return Response({
        'id': reaction.id,
        'reaction_type': reaction.reaction_type,
        'created': created
    })

@api_view(['GET'])
def conversation_reactions(request, conversation_id):
    """Get all reactions for a conversation"""
    try:
        conversation = Conversation.objects.get(
            id=conversation_id,
            organization=request.user.organization
        )
    except Conversation.DoesNotExist:
        return Response({'error': 'Conversation not found'}, status=404)
    
    reactions = conversation.reactions.all().select_related('user')
    
    reaction_summary = {}
    for reaction in reactions:
        if reaction.reaction_type not in reaction_summary:
            reaction_summary[reaction.reaction_type] = {
                'count': 0,
                'users': []
            }
        reaction_summary[reaction.reaction_type]['count'] += 1
        reaction_summary[reaction.reaction_type]['users'].append({
            'id': reaction.user.id,
            'name': reaction.user.get_full_name()
        })
    
    return Response(reaction_summary)

@api_view(['GET'])
def activity_feed(request):
    """Get activity feed for user's organization"""
    org = request.user.organization
    
    conversations = Conversation.objects.filter(
        organization=org
    ).select_related('author').order_by('-created_at')[:50]
    
    replies = ConversationReply.objects.filter(
        conversation__organization=org
    ).select_related('author', 'conversation').order_by('-created_at')[:50]
    
    activity = []
    
    for conv in conversations:
        activity.append({
            'type': 'conversation_created',
            'user': conv.author.get_full_name(),
            'user_id': conv.author.id,
            'title': conv.title,
            'conversation_id': conv.id,
            'timestamp': conv.created_at,
            'icon': '💬'
        })
    
    for reply in replies:
        activity.append({
            'type': 'reply_added',
            'user': reply.author.get_full_name(),
            'user_id': reply.author.id,
            'conversation': reply.conversation.title,
            'conversation_id': reply.conversation.id,
            'timestamp': reply.created_at,
            'icon': '↩️'
        })
    
    activity.sort(key=lambda x: x['timestamp'], reverse=True)
    
    return Response(activity[:100])

@api_view(['GET'])
def mention_suggestions(request):
    """Get user suggestions for mentions"""
    query = request.GET.get('q', '')
    org = request.user.organization
    
    if len(query) < 2:
        return Response([])
    
    users = User.objects.filter(
        organization=org,
        full_name__icontains=query
    ).exclude(id=request.user.id)[:10]
    
    data = [
        {
            'id': u.id,
            'name': u.get_full_name(),
            'email': u.email
        } for u in users
    ]
    
    return Response(data)

def extract_mentions(content):
    """Extract user IDs from @mentions in content"""
    pattern = r'@(\d+)'
    matches = re.findall(pattern, content)
    return [int(m) for m in matches]
