from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta
from .models import Goal, Meeting, Task

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def business_analytics(request):
    org = request.user.organization
    now = timezone.now()
    week_ago = now - timedelta(days=7)
    
    # Goals stats
    goals = Goal.objects.filter(organization=org)
    goals_by_status = goals.values('status').annotate(count=Count('id'))
    
    # Meetings stats
    meetings = Meeting.objects.filter(organization=org)
    upcoming_meetings = meetings.filter(meeting_date__gte=now).count()
    past_meetings = meetings.filter(meeting_date__lt=now).count()
    
    # Tasks stats
    tasks = Task.objects.filter(organization=org)
    tasks_by_status = tasks.values('status').annotate(count=Count('id'))
    tasks_by_priority = tasks.values('priority').annotate(count=Count('id'))
    
    # Recent activity
    recent_goals = goals.filter(created_at__gte=week_ago).count()
    recent_meetings = meetings.filter(created_at__gte=week_ago).count()
    recent_tasks = tasks.filter(created_at__gte=week_ago).count()
    
    return Response({
        'goals': {
            'total': goals.count(),
            'by_status': {item['status']: item['count'] for item in goals_by_status},
            'recent': recent_goals
        },
        'meetings': {
            'total': meetings.count(),
            'upcoming': upcoming_meetings,
            'past': past_meetings,
            'recent': recent_meetings
        },
        'tasks': {
            'total': tasks.count(),
            'by_status': {item['status']: item['count'] for item in tasks_by_status},
            'by_priority': {item['priority']: item['count'] for item in tasks_by_priority},
            'recent': recent_tasks
        }
    })
