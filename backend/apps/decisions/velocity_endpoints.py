from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Count, Q
from datetime import timedelta
from apps.decisions.models import Decision

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def decision_velocity(request):
    """Get decision velocity metrics"""
    days = int(request.GET.get('days', 30))
    cutoff_date = timezone.now() - timedelta(days=days)
    
    decisions = Decision.objects.filter(
        organization=request.user.organization,
        created_at__gte=cutoff_date
    )
    
    # Decisions by status
    status_breakdown = decisions.values('status').annotate(count=Count('id'))
    
    # Decisions by date
    daily_decisions = {}
    for i in range(days):
        date = (timezone.now() - timedelta(days=i)).date()
        count = decisions.filter(created_at__date=date).count()
        daily_decisions[date.isoformat()] = count
    
    # Approval time (average days from created to approved)
    approved_decisions = decisions.filter(status='approved', decided_at__isnull=False)
    approval_times = []
    for d in approved_decisions:
        if d.decided_at:
            days_to_approve = (d.decided_at - d.created_at).days
            approval_times.append(days_to_approve)
    
    avg_approval_time = sum(approval_times) / len(approval_times) if approval_times else 0
    
    # Implementation success rate
    total_approved = decisions.filter(status='approved').count()
    implemented = decisions.filter(status='implemented').count()
    success_rate = (implemented / total_approved * 100) if total_approved > 0 else 0
    
    # Decision reversals
    reversals = decisions.filter(status='cancelled').count()
    
    return Response({
        'period_days': days,
        'total_decisions': decisions.count(),
        'decisions_per_day': decisions.count() / days if days > 0 else 0,
        'status_breakdown': list(status_breakdown),
        'daily_decisions': daily_decisions,
        'avg_approval_time_days': round(avg_approval_time, 1),
        'implementation_success_rate': round(success_rate, 1),
        'decision_reversals': reversals,
        'reversals_percentage': round(reversals / decisions.count() * 100, 1) if decisions.count() > 0 else 0
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def decision_makers(request):
    """Get top decision makers"""
    days = int(request.GET.get('days', 30))
    cutoff_date = timezone.now() - timedelta(days=days)
    limit = int(request.GET.get('limit', 10))
    
    makers = Decision.objects.filter(
        organization=request.user.organization,
        created_at__gte=cutoff_date
    ).values('decision_maker__id', 'decision_maker__first_name', 'decision_maker__last_name').annotate(
        count=Count('id')
    ).order_by('-count')[:limit]
    
    return Response({
        'period_days': days,
        'decision_makers': [{
            'user_id': m['decision_maker__id'],
            'name': f"{m['decision_maker__first_name']} {m['decision_maker__last_name']}",
            'decisions_count': m['count']
        } for m in makers]
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def decision_topics(request):
    """Get most common decision topics"""
    days = int(request.GET.get('days', 30))
    cutoff_date = timezone.now() - timedelta(days=days)
    limit = int(request.GET.get('limit', 10))
    
    from apps.conversations.models import Tag
    
    # Get decisions linked to conversations with tags
    decisions = Decision.objects.filter(
        organization=request.user.organization,
        created_at__gte=cutoff_date,
        conversation__isnull=False
    )
    
    topic_counts = {}
    for d in decisions:
        if d.conversation:
            tags = d.conversation.tags.all()
            for tag in tags:
                topic_counts[tag.name] = topic_counts.get(tag.name, 0) + 1
    
    sorted_topics = sorted(topic_counts.items(), key=lambda x: x[1], reverse=True)[:limit]
    
    return Response({
        'period_days': days,
        'topics': [{'topic': t[0], 'count': t[1]} for t in sorted_topics]
    })
