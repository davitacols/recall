from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Count, Q
from datetime import datetime, timedelta
from apps.conversations.models import Conversation
from apps.decisions.models import Decision
from apps.knowledge.unified_models import ContentLink, UnifiedActivity

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ai_recommendations(request):
    """Generate AI-powered recommendations for user"""
    org = request.user.organization
    user = request.user
    
    # Get user's recent activity
    recent_views = UnifiedActivity.objects.filter(
        organization=org,
        user=user,
        activity_type='viewed',
        created_at__gte=datetime.now() - timedelta(days=7)
    ).values_list('content_type', 'object_id')[:10]
    
    # Find related content
    recommendations = []
    
    # 1. Trending conversations
    trending = Conversation.objects.filter(
        organization=org,
        created_at__gte=datetime.now() - timedelta(days=3)
    ).annotate(
        activity_count=Count('id')
    ).order_by('-activity_count')[:3]
    
    for conv in trending:
        recommendations.append({
            'type': 'conversation',
            'id': conv.id,
            'title': conv.title,
            'reason': 'Trending in your organization',
            'score': 0.9
        })
    
    # 2. Pending decisions
    pending = Decision.objects.filter(
        organization=org,
        status='proposed'
    ).order_by('-created_at')[:3]
    
    for dec in pending:
        recommendations.append({
            'type': 'decision',
            'id': dec.id,
            'title': dec.title,
            'reason': 'Needs your input',
            'score': 0.85
        })
    
    # 3. Related content based on links
    if recent_views:
        for content_type, object_id in recent_views:
            links = ContentLink.objects.filter(
                Q(source_content_type=content_type, source_object_id=object_id) |
                Q(target_content_type=content_type, target_object_id=object_id)
            )[:2]
            
            for link in links:
                target_type = link.target_content_type if link.source_object_id == object_id else link.source_content_type
                target_id = link.target_object_id if link.source_object_id == object_id else link.source_object_id
                
                recommendations.append({
                    'type': target_type.model,
                    'id': target_id,
                    'title': f'Related {target_type.model}',
                    'reason': 'Connected to your recent activity',
                    'score': 0.75
                })
    
    # Sort by score and limit
    recommendations.sort(key=lambda x: x['score'], reverse=True)
    
    return Response({
        'recommendations': recommendations[:8],
        'generated_at': datetime.now().isoformat()
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ai_summarize(request):
    """Generate AI summary of content"""
    content = request.data.get('content', '')
    content_type = request.data.get('type', 'text')
    
    # Simple extractive summary (first 3 sentences)
    sentences = content.split('. ')
    summary = '. '.join(sentences[:3]) + '.'
    
    # Extract key points (sentences with keywords)
    keywords = ['important', 'critical', 'key', 'must', 'should', 'decision', 'action']
    key_points = [s for s in sentences if any(k in s.lower() for k in keywords)][:3]
    
    return Response({
        'summary': summary,
        'key_points': key_points,
        'word_count': len(content.split()),
        'reading_time': len(content.split()) // 200  # avg reading speed
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ai_extract_action_items(request):
    """Extract action items from content"""
    content = request.data.get('content', '')
    
    # Simple pattern matching for action items
    action_patterns = ['TODO:', 'Action:', '- [ ]', 'Need to', 'Must', 'Should']
    sentences = content.split('\n')
    
    actions = []
    for sentence in sentences:
        if any(pattern.lower() in sentence.lower() for pattern in action_patterns):
            actions.append({
                'text': sentence.strip(),
                'priority': 'high' if 'urgent' in sentence.lower() or 'asap' in sentence.lower() else 'medium'
            })
    
    return Response({
        'action_items': actions[:10],
        'count': len(actions)
    })
