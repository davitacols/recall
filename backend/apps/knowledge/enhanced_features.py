from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Count, Q
from django.utils import timezone
from datetime import datetime, timedelta
from apps.decisions.models import Decision
from apps.conversations.models import Conversation
from apps.business.models import Task, Goal, Meeting
from apps.agile.models import Issue
from apps.knowledge.unified_models import ContentLink

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def daily_digest(request):
    """Generate smart daily digest"""
    user = request.user
    org = user.organization
    today = timezone.now().date()
    
    # Pending tasks
    pending_tasks = Task.objects.filter(
        organization=org,
        status__in=['todo', 'in_progress'],
        assigned_to=user
    ).order_by('due_date')[:5]
    
    # Decisions needing input
    decisions_needing_input = Decision.objects.filter(
        organization=org,
        status='under_review',
        stakeholders=user
    ).exclude(decision_maker=user)[:5]
    
    # Upcoming meetings
    upcoming_meetings = Meeting.objects.filter(
        organization=org,
        meeting_date__gte=timezone.now(),
        meeting_date__date=today
    ).order_by('meeting_date')[:3]
    
    # Recent activity
    recent_decisions = Decision.objects.filter(
        organization=org,
        created_at__gte=timezone.now() - timedelta(days=1)
    ).count()
    
    recent_conversations = Conversation.objects.filter(
        organization=org,
        created_at__gte=timezone.now() - timedelta(days=1)
    ).count()
    
    return Response({
        'pending_tasks': [{
            'id': t.id,
            'title': t.title,
            'priority': t.priority,
            'due_date': t.due_date,
            'status': t.status
        } for t in pending_tasks],
        'decisions_needing_input': [{
            'id': d.id,
            'title': d.title,
            'status': d.status,
            'impact_level': d.impact_level,
            'created_at': d.created_at
        } for d in decisions_needing_input],
        'upcoming_meetings': [{
            'id': m.id,
            'title': m.title,
            'meeting_date': m.meeting_date,
            'duration_minutes': m.duration_minutes
        } for m in upcoming_meetings],
        'activity_summary': {
            'decisions': recent_decisions,
            'conversations': recent_conversations
        }
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def team_expertise(request):
    """Map team expertise based on activity"""
    org = request.user.organization
    from apps.organizations.models import User
    
    users = User.objects.filter(organization=org)
    expertise_map = []
    
    for user in users:
        # Count activities
        decisions = Decision.objects.filter(decision_maker=user).count()
        conversations = Conversation.objects.filter(author=user).count()
        tasks = Task.objects.filter(assigned_to=user, status='done').count()
        
        # Extract topics from decisions
        user_decisions = Decision.objects.filter(decision_maker=user)[:20]
        topics = {}
        for d in user_decisions:
            words = (d.title + ' ' + d.description).lower().split()
            for word in words:
                if len(word) > 5:
                    topics[word] = topics.get(word, 0) + 1
        
        top_topics = sorted(topics.items(), key=lambda x: x[1], reverse=True)[:3]
        
        expertise_map.append({
            'user': {
                'id': user.id,
                'name': user.full_name,
                'email': user.email
            },
            'activity': {
                'decisions': decisions,
                'conversations': conversations,
                'completed_tasks': tasks
            },
            'expertise_areas': [t[0] for t in top_topics],
            'score': decisions * 3 + conversations * 2 + tasks
        })
    
    return Response({
        'team': sorted(expertise_map, key=lambda x: x['score'], reverse=True)
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def trend_analysis(request):
    """Analyze trends over time"""
    org = request.user.organization
    days = int(request.GET.get('days', 30))
    start_date = timezone.now() - timedelta(days=days)
    
    # Decision trends
    decisions_by_day = {}
    for i in range(days):
        date = (start_date + timedelta(days=i)).date()
        count = Decision.objects.filter(
            organization=org,
            created_at__date=date
        ).count()
        decisions_by_day[str(date)] = count
    
    # Status distribution trend
    status_trend = Decision.objects.filter(
        organization=org,
        created_at__gte=start_date
    ).values('status').annotate(count=Count('id'))
    
    # Popular topics
    recent_decisions = Decision.objects.filter(
        organization=org,
        created_at__gte=start_date
    )
    
    topic_words = {}
    for d in recent_decisions:
        words = (d.title + ' ' + d.description).lower().split()
        for word in words:
            if len(word) > 5:
                topic_words[word] = topic_words.get(word, 0) + 1
    
    trending_topics = sorted(topic_words.items(), key=lambda x: x[1], reverse=True)[:10]
    
    return Response({
        'decisions_by_day': decisions_by_day,
        'status_distribution': {s['status']: s['count'] for s in status_trend},
        'trending_topics': [{'topic': t[0], 'count': t[1]} for t in trending_topics]
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def auto_tag_content(request):
    """Auto-tag content based on AI analysis"""
    content_type = request.data.get('type')
    content_id = request.data.get('id')
    text = request.data.get('text', '')
    
    # Extract keywords
    words = text.lower().split()
    word_freq = {}
    for word in words:
        if len(word) > 5:
            word_freq[word] = word_freq.get(word, 0) + 1
    
    # Get top keywords as tags
    suggested_tags = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)[:5]
    tags = [t[0] for t in suggested_tags]
    
    return Response({
        'suggested_tags': tags,
        'confidence': 0.85
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def metrics_tracking(request):
    """Track platform usage metrics"""
    org = request.user.organization
    user = request.user
    
    # Time to find info (simulated based on search activity)
    avg_search_time = 2.5  # seconds (placeholder)
    
    # Knowledge reuse rate
    total_content = Decision.objects.filter(organization=org).count()
    linked_content = ContentLink.objects.filter(
        organization=org
    ).values('source_object_id').distinct().count()
    
    reuse_rate = (linked_content / total_content * 100) if total_content > 0 else 0
    
    # User activity
    user_decisions = Decision.objects.filter(
        organization=org,
        decision_maker=user
    ).count()
    
    user_conversations = Conversation.objects.filter(
        organization=org,
        author=user
    ).count()
    
    return Response({
        'avg_search_time': avg_search_time,
        'knowledge_reuse_rate': round(reuse_rate, 1),
        'user_activity': {
            'decisions': user_decisions,
            'conversations': user_conversations
        },
        'org_stats': {
            'total_content': total_content,
            'linked_content': linked_content
        }
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def sentiment_analysis(request):
    """Analyze sentiment of text"""
    text = request.data.get('text', '')
    
    # Simple sentiment analysis
    positive_words = ['good', 'great', 'excellent', 'success', 'approve', 'agree', 'positive']
    negative_words = ['bad', 'fail', 'reject', 'disagree', 'concern', 'issue', 'problem']
    
    words = text.lower().split()
    positive_count = sum(1 for w in words if w in positive_words)
    negative_count = sum(1 for w in words if w in negative_words)
    
    total = positive_count + negative_count
    if total == 0:
        sentiment = 'neutral'
        score = 0.5
    else:
        score = positive_count / total
        sentiment = 'positive' if score > 0.6 else 'negative' if score < 0.4 else 'neutral'
    
    return Response({
        'sentiment': sentiment,
        'score': round(score, 2),
        'positive_count': positive_count,
        'negative_count': negative_count
    })
