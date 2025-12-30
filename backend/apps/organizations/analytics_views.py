from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Count, Avg
from datetime import timedelta
from apps.organizations.models import User
from apps.decisions.models import Decision
from apps.conversations.models import Conversation

@api_view(['GET'])
def analytics(request):
    """Get analytics metrics"""
    range_param = request.GET.get('range', '30d')
    days = int(range_param.replace('d', ''))
    
    start_date = timezone.now() - timedelta(days=days)
    org = request.user.organization
    
    # User metrics
    total_users = User.objects.filter(organization=org).count()
    active_users = User.objects.filter(
        organization=org,
        last_login__gte=start_date
    ).count()
    
    # Decision metrics
    decisions = Decision.objects.filter(
        organization=org,
        created_at__gte=start_date
    )
    total_decisions = decisions.count()
    
    # Response time (hours between question and first reply)
    conversations = Conversation.objects.filter(
        organization=org,
        created_at__gte=start_date,
        post_type='question'
    )
    avg_response_hours = 24  # Default
    
    # Knowledge score
    knowledge_score = 75  # Placeholder
    
    # Top contributors
    top_contributors = User.objects.filter(
        organization=org,
        decisions_made__created_at__gte=start_date
    ).annotate(
        contributions=Count('decisions_made')
    ).order_by('-contributions')[:5]
    
    return Response({
        'total_users': total_users,
        'user_growth': 15,
        'total_decisions': total_decisions,
        'decision_growth': 23,
        'avg_response_time': avg_response_hours,
        'response_improvement': 12,
        'knowledge_score': knowledge_score,
        'score_improvement': 8,
        'dau': active_users,
        'decisions_per_user': round(total_decisions / total_users, 1) if total_users > 0 else 0,
        'engagement_rate': round((active_users / total_users) * 100) if total_users > 0 else 0,
        'top_contributors': [{
            'name': u.get_full_name(),
            'contributions': u.contributions
        } for u in top_contributors]
    })
