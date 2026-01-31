from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Count, Q
from datetime import timedelta
from apps.conversations.models import Conversation, Reaction
from apps.decisions.models import Decision

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def team_sentiment(request):
    """Get team sentiment from reactions and conversations"""
    days = int(request.GET.get('days', 7))
    cutoff_date = timezone.now() - timedelta(days=days)
    
    # Get reactions
    reactions = Reaction.objects.filter(
        conversation__organization=request.user.organization,
        created_at__gte=cutoff_date
    )
    
    agree_count = reactions.filter(reaction_type='agree').count()
    unsure_count = reactions.filter(reaction_type='unsure').count()
    concern_count = reactions.filter(reaction_type='concern').count()
    total_reactions = reactions.count()
    
    # Calculate sentiment score (-1 to 1)
    if total_reactions > 0:
        sentiment_score = (agree_count - concern_count) / total_reactions
    else:
        sentiment_score = 0
    
    # Sentiment level
    if sentiment_score >= 0.5:
        sentiment_level = 'very_positive'
    elif sentiment_score >= 0.2:
        sentiment_level = 'positive'
    elif sentiment_score >= -0.2:
        sentiment_level = 'neutral'
    elif sentiment_score >= -0.5:
        sentiment_level = 'negative'
    else:
        sentiment_level = 'very_negative'
    
    # Conversations with concerns
    concern_conversations = Conversation.objects.filter(
        organization=request.user.organization,
        created_at__gte=cutoff_date,
        reactions__reaction_type='concern'
    ).distinct().count()
    
    return Response({
        'period_days': days,
        'sentiment_score': round(sentiment_score, 2),
        'sentiment_level': sentiment_level,
        'agree': agree_count,
        'unsure': unsure_count,
        'concern': concern_count,
        'total_reactions': total_reactions,
        'conversations_with_concerns': concern_conversations
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def team_health_metrics(request):
    """Get overall team health metrics"""
    days = int(request.GET.get('days', 30))
    cutoff_date = timezone.now() - timedelta(days=days)
    
    # Engagement
    active_users = Conversation.objects.filter(
        organization=request.user.organization,
        created_at__gte=cutoff_date
    ).values('author').distinct().count()
    
    total_conversations = Conversation.objects.filter(
        organization=request.user.organization,
        created_at__gte=cutoff_date
    ).count()
    
    # Decision making
    decisions_made = Decision.objects.filter(
        organization=request.user.organization,
        created_at__gte=cutoff_date
    ).count()
    
    # Sentiment
    reactions = Reaction.objects.filter(
        conversation__organization=request.user.organization,
        created_at__gte=cutoff_date
    )
    
    agree = reactions.filter(reaction_type='agree').count()
    concern = reactions.filter(reaction_type='concern').count()
    total_reactions = reactions.count()
    
    sentiment_score = (agree - concern) / total_reactions if total_reactions > 0 else 0
    
    # Closed conversations (resolved issues)
    closed_conversations = Conversation.objects.filter(
        organization=request.user.organization,
        is_closed=True,
        closed_at__gte=cutoff_date
    ).count()
    
    resolution_rate = (closed_conversations / total_conversations * 100) if total_conversations > 0 else 0
    
    return Response({
        'period_days': days,
        'active_users': active_users,
        'total_conversations': total_conversations,
        'decisions_made': decisions_made,
        'sentiment_score': round(sentiment_score, 2),
        'resolution_rate': round(resolution_rate, 1),
        'avg_conversations_per_user': round(total_conversations / active_users, 1) if active_users > 0 else 0
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_sentiment(request, user_id):
    """Get sentiment for specific user"""
    from apps.organizations.models import User
    
    try:
        user = User.objects.get(id=user_id, organization=request.user.organization)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=404)
    
    days = int(request.GET.get('days', 30))
    cutoff_date = timezone.now() - timedelta(days=days)
    
    # User's reactions
    reactions = Reaction.objects.filter(
        user=user,
        created_at__gte=cutoff_date
    )
    
    agree = reactions.filter(reaction_type='agree').count()
    unsure = reactions.filter(reaction_type='unsure').count()
    concern = reactions.filter(reaction_type='concern').count()
    total = reactions.count()
    
    sentiment_score = (agree - concern) / total if total > 0 else 0
    
    # User's conversations
    conversations = Conversation.objects.filter(
        author=user,
        created_at__gte=cutoff_date
    ).count()
    
    # User's decisions
    decisions = Decision.objects.filter(
        decision_maker=user,
        created_at__gte=cutoff_date
    ).count()
    
    return Response({
        'user_id': user.id,
        'user_name': user.get_full_name(),
        'period_days': days,
        'sentiment_score': round(sentiment_score, 2),
        'reactions': {
            'agree': agree,
            'unsure': unsure,
            'concern': concern,
            'total': total
        },
        'conversations_created': conversations,
        'decisions_made': decisions
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def concern_detection(request):
    """Detect conversations with high concern levels"""
    days = int(request.GET.get('days', 7))
    cutoff_date = timezone.now() - timedelta(days=days)
    
    conversations = Conversation.objects.filter(
        organization=request.user.organization,
        created_at__gte=cutoff_date
    )
    
    concern_list = []
    
    for conv in conversations:
        reactions = conv.reactions.all()
        concern_count = reactions.filter(reaction_type='concern').count()
        total_reactions = reactions.count()
        
        if total_reactions > 0:
            concern_percentage = (concern_count / total_reactions * 100)
            if concern_percentage >= 30:  # 30% or more concerns
                concern_list.append({
                    'conversation_id': conv.id,
                    'title': conv.title,
                    'concern_percentage': round(concern_percentage, 1),
                    'concern_count': concern_count,
                    'total_reactions': total_reactions,
                    'author': conv.author.get_full_name(),
                    'created_at': conv.created_at.isoformat()
                })
    
    return Response({
        'period_days': days,
        'high_concern_conversations': sorted(concern_list, key=lambda x: x['concern_percentage'], reverse=True)
    })
