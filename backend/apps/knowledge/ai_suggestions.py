from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from apps.conversations.models import Conversation
from apps.decisions.models import Decision

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ai_suggestions(request):
    """Get AI-powered suggestions based on content"""
    text = request.data.get('text', '')
    content_type = request.data.get('type', 'conversation')
    
    if len(text) < 10:
        return Response({'suggestions': []})
    
    # Extract keywords from text
    words = [w.lower() for w in text.split() if len(w) > 3][:5]
    
    suggestions = []
    
    # Search conversations
    for word in words:
        convs = Conversation.objects.filter(
            organization=request.user.organization,
            title__icontains=word
        )[:2]
        for conv in convs:
            suggestions.append({
                'id': conv.id,
                'type': 'conversation',
                'title': conv.title,
                'excerpt': conv.content[:150],
                'url': f'/conversations/{conv.id}',
                'relevance': 0.8,
                'reason': f'Similar topic: {word}'
            })
    
    # Search decisions
    for word in words:
        decisions = Decision.objects.filter(
            organization=request.user.organization,
            title__icontains=word
        )[:2]
        for decision in decisions:
            suggestions.append({
                'id': decision.id,
                'type': 'decision',
                'title': decision.title,
                'excerpt': decision.description[:150],
                'url': f'/decisions/{decision.id}',
                'relevance': 0.7,
                'reason': f'Related decision: {word}'
            })
    
    # Sort by relevance and deduplicate
    seen = set()
    unique_suggestions = []
    for s in sorted(suggestions, key=lambda x: x['relevance'], reverse=True):
        key = f"{s['type']}_{s['id']}"
        if key not in seen:
            seen.add(key)
            unique_suggestions.append(s)
    
    return Response({'suggestions': unique_suggestions[:5]})
