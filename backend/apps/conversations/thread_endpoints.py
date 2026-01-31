from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from apps.conversations.thread_models import ConversationThread, ConversationHistory
from apps.conversations.models import Conversation

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def link_conversations(request):
    """Link two conversations as related"""
    parent_id = request.data.get('parent_id')
    child_id = request.data.get('child_id')
    link_type = request.data.get('link_type', 'related')
    
    try:
        parent = Conversation.objects.get(id=parent_id, organization=request.user.organization)
        child = Conversation.objects.get(id=child_id, organization=request.user.organization)
    except Conversation.DoesNotExist:
        return Response({'error': 'Conversation not found'}, status=404)
    
    thread, created = ConversationThread.objects.get_or_create(
        organization=request.user.organization,
        parent_conversation=parent,
        child_conversation=child,
        defaults={'link_type': link_type}
    )
    
    if not created:
        thread.link_type = link_type
        thread.save()
    
    return Response({'id': thread.id, 'link_type': link_type})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def conversation_threads(request, conversation_id):
    """Get all related conversations"""
    try:
        conversation = Conversation.objects.get(id=conversation_id, organization=request.user.organization)
    except Conversation.DoesNotExist:
        return Response({'error': 'Conversation not found'}, status=404)
    
    # Get child threads (conversations linked from this one)
    child_threads = ConversationThread.objects.filter(
        parent_conversation=conversation
    ).select_related('child_conversation')
    
    # Get parent threads (conversations this one is linked to)
    parent_threads = ConversationThread.objects.filter(
        child_conversation=conversation
    ).select_related('parent_conversation')
    
    return Response({
        'conversation_id': conversation.id,
        'related_conversations': [
            {
                'id': t.child_conversation.id,
                'title': t.child_conversation.title,
                'link_type': t.link_type,
                'similarity': round(t.similarity_score, 2),
                'created_at': t.created_at.isoformat()
            } for t in child_threads
        ] + [
            {
                'id': t.parent_conversation.id,
                'title': t.parent_conversation.title,
                'link_type': t.link_type,
                'similarity': round(t.similarity_score, 2),
                'created_at': t.created_at.isoformat()
            } for t in parent_threads
        ]
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def auto_link_similar_conversations(request, conversation_id):
    """Auto-link similar conversations using semantic similarity"""
    try:
        conversation = Conversation.objects.get(id=conversation_id, organization=request.user.organization)
    except Conversation.DoesNotExist:
        return Response({'error': 'Conversation not found'}, status=404)
    
    # Simple keyword-based similarity (can be enhanced with embeddings)
    keywords = set(conversation.title.lower().split())
    
    similar_conversations = Conversation.objects.filter(
        organization=request.user.organization,
        is_archived=False
    ).exclude(id=conversation_id)
    
    linked_count = 0
    for conv in similar_conversations:
        conv_keywords = set(conv.title.lower().split())
        
        # Calculate Jaccard similarity
        if len(keywords | conv_keywords) > 0:
            similarity = len(keywords & conv_keywords) / len(keywords | conv_keywords)
            
            if similarity >= 0.3:  # 30% similarity threshold
                thread, created = ConversationThread.objects.get_or_create(
                    organization=request.user.organization,
                    parent_conversation=conversation,
                    child_conversation=conv,
                    defaults={
                        'link_type': 'related',
                        'similarity_score': similarity
                    }
                )
                if created:
                    linked_count += 1
    
    return Response({
        'message': f'Linked {linked_count} similar conversations',
        'linked_count': linked_count
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def conversation_history(request):
    """Get conversation history by topic"""
    topic = request.GET.get('topic')
    
    if topic:
        histories = ConversationHistory.objects.filter(
            organization=request.user.organization,
            topic__icontains=topic
        )
    else:
        histories = ConversationHistory.objects.filter(
            organization=request.user.organization
        ).order_by('-last_occurrence')[:20]
    
    return Response([{
        'topic': h.topic,
        'occurrence_count': h.occurrence_count,
        'first_occurrence': h.first_occurrence.isoformat(),
        'last_occurrence': h.last_occurrence.isoformat(),
        'conversations': [{
            'id': c.id,
            'title': c.title,
            'created_at': c.created_at.isoformat()
        } for c in h.conversations.all()[:5]]
    } for h in histories])

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def record_conversation_topic(request):
    """Record conversation topic for history tracking"""
    topic = request.data.get('topic')
    conversation_id = request.data.get('conversation_id')
    
    if not topic or not conversation_id:
        return Response({'error': 'topic and conversation_id required'}, status=400)
    
    try:
        conversation = Conversation.objects.get(id=conversation_id, organization=request.user.organization)
    except Conversation.DoesNotExist:
        return Response({'error': 'Conversation not found'}, status=404)
    
    history, created = ConversationHistory.objects.get_or_create(
        organization=request.user.organization,
        topic=topic,
        defaults={
            'first_occurrence': timezone.now(),
            'last_occurrence': timezone.now()
        }
    )
    
    if not created:
        history.last_occurrence = timezone.now()
        history.occurrence_count += 1
        history.save()
    
    history.conversations.add(conversation)
    
    return Response({'id': history.id, 'topic': topic})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def recurring_topics(request):
    """Get recurring conversation topics"""
    days = int(request.GET.get('days', 30))
    limit = int(request.GET.get('limit', 10))
    
    from datetime import timedelta
    cutoff_date = timezone.now() - timedelta(days=days)
    
    histories = ConversationHistory.objects.filter(
        organization=request.user.organization,
        last_occurrence__gte=cutoff_date,
        occurrence_count__gte=2
    ).order_by('-occurrence_count')[:limit]
    
    return Response({
        'period_days': days,
        'recurring_topics': [{
            'topic': h.topic,
            'occurrences': h.occurrence_count,
            'first_seen': h.first_occurrence.isoformat(),
            'last_seen': h.last_occurrence.isoformat(),
            'conversation_count': h.conversations.count()
        } for h in histories]
    })
