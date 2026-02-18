from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from datetime import datetime, timedelta
from django.db.models import Q, Count
from .models import Issue, Sprint
from apps.decisions.models import Decision
from apps.conversations.models import Conversation
from apps.organizations.models import User

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ai_chat(request):
    message = request.data.get('message', '').lower()
    org = request.user.organization
    
    # Blockers
    if 'block' in message or 'blocker' in message:
        blockers = Issue.objects.filter(
            organization=org,
            status__in=['in_progress', 'in_review'],
            priority__in=['high', 'highest']
        ).count()
        return Response({
            'response': f"You have {blockers} high-priority issues that might be blockers. These need immediate attention.",
            'actions': [{'label': 'View Blockers', 'url': '/blockers'}]
        })
    
    # Decisions
    elif 'decision' in message:
        recent = Decision.objects.filter(
            organization=org,
            created_at__gte=datetime.now() - timedelta(days=7)
        ).count()
        return Response({
            'response': f"You've made {recent} decisions in the past week. I can help you track their impact.",
            'actions': [
                {'label': 'View Decisions', 'url': '/decisions'},
                {'label': 'My Decisions', 'url': '/my-decisions'}
            ]
        })
    
    # Bugs
    elif 'bug' in message or 'issue' in message:
        bugs = Issue.objects.filter(
            organization=org,
            issue_type='bug',
            status__in=['todo', 'in_progress']
        ).count()
        return Response({
            'response': f"You have {bugs} open bugs. Would you like me to help prioritize them?",
            'actions': [{'label': 'View Bugs', 'url': '/projects'}]
        })
    
    # Sprint
    elif 'sprint' in message:
        active = Sprint.objects.filter(organization=org, status='active').first()
        if active:
            issues = active.issues.count()
            done = active.issues.filter(status='done').count()
            progress = int((done / issues * 100)) if issues > 0 else 0
            return Response({
                'response': f"Sprint '{active.name}' is {progress}% complete with {done}/{issues} issues done.",
                'actions': [{'label': 'View Sprint', 'url': '/sprint'}]
            })
        return Response({
            'response': "No active sprint. Would you like to start one?",
            'actions': [{'label': 'Sprint Planning', 'url': '/sprint-history'}]
        })
    
    # My tasks
    elif 'my' in message or 'assigned' in message:
        my_issues = Issue.objects.filter(
            organization=org,
            assignee=request.user,
            status__in=['todo', 'in_progress']
        ).count()
        return Response({
            'response': f"You have {my_issues} active tasks assigned to you.",
            'actions': [{'label': 'View My Tasks', 'url': '/projects'}]
        })
    
    # Default
    return Response({
        'response': "I can help you with:\n• Finding blockers\n• Tracking decisions\n• Managing bugs\n• Sprint progress\n• Your assigned tasks\n\nWhat would you like to know?",
        'actions': []
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ai_suggestions(request):
    context = request.data.get('context', {})
    suggestions = []
    org = request.user.organization
    
    # Assignee suggestions
    if context.get('type') == 'assignee':
        users = User.objects.filter(organization=org)
        for user in users[:3]:
            workload = Issue.objects.filter(
                assignee=user,
                status__in=['todo', 'in_progress']
            ).count()
            if workload < 5:
                suggestions.append({
                    'title': f'Assign to {user.full_name}',
                    'reason': f'Low workload ({workload} active issues)',
                    'value': user.id
                })
    
    # Priority suggestions
    elif context.get('type') == 'priority':
        text = context.get('text', '').lower()
        if any(w in text for w in ['urgent', 'critical', 'asap', 'immediately']):
            suggestions.append({
                'title': 'Set as Highest Priority',
                'reason': 'Detected urgent keywords',
                'value': 'highest'
            })
        elif any(w in text for w in ['bug', 'error', 'crash', 'broken']):
            suggestions.append({
                'title': 'Set as High Priority',
                'reason': 'Bug-related issue',
                'value': 'high'
            })
    
    return Response({'suggestions': suggestions[:3]})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ai_categorize(request):
    text = request.data.get('text', '').lower()
    
    # Priority detection
    priority = 'medium'
    if any(w in text for w in ['urgent', 'critical', 'asap', 'immediately', 'emergency']):
        priority = 'highest'
    elif any(w in text for w in ['important', 'soon', 'high']):
        priority = 'high'
    elif any(w in text for w in ['minor', 'low', 'whenever']):
        priority = 'low'
    
    # Type detection
    issue_type = 'task'
    if any(w in text for w in ['bug', 'error', 'crash', 'broken', 'not working']):
        issue_type = 'bug'
    elif any(w in text for w in ['feature', 'add', 'new', 'implement']):
        issue_type = 'story'
    
    # Label detection
    labels = []
    if any(w in text for w in ['frontend', 'ui', 'ux', 'design', 'css']):
        labels.append('frontend')
    if any(w in text for w in ['backend', 'api', 'database', 'server']):
        labels.append('backend')
    if any(w in text for w in ['security', 'auth', 'permission']):
        labels.append('security')
    if any(w in text for w in ['performance', 'slow', 'optimize']):
        labels.append('performance')
    
    return Response({
        'priority': priority,
        'type': issue_type,
        'labels': labels
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ai_smart_search(request):
    query = request.data.get('query', '').lower()
    org = request.user.organization
    
    results = {'issues': [], 'decisions': [], 'conversations': []}
    
    # My tasks
    if 'my' in query or 'assigned to me' in query:
        issues = Issue.objects.filter(
            organization=org,
            assignee=request.user
        )[:5]
        results['issues'] = [{'id': i.id, 'title': i.title, 'key': i.key} for i in issues]
    
    # High priority
    elif 'high priority' in query or 'urgent' in query:
        issues = Issue.objects.filter(
            organization=org,
            priority__in=['high', 'highest']
        )[:5]
        results['issues'] = [{'id': i.id, 'title': i.title, 'key': i.key} for i in issues]
    
    # Bugs
    elif 'bug' in query:
        issues = Issue.objects.filter(
            organization=org,
            issue_type='bug'
        )[:5]
        results['issues'] = [{'id': i.id, 'title': i.title, 'key': i.key} for i in issues]
    
    # Decisions
    elif 'decision' in query:
        decisions = Decision.objects.filter(organization=org)[:5]
        results['decisions'] = [{'id': d.id, 'title': d.title} for d in decisions]
    
    return Response(results)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ai_insights(request):
    org = request.user.organization
    insights = []
    
    # Sprint velocity
    completed_sprints = Sprint.objects.filter(
        organization=org,
        status='completed'
    ).order_by('-end_date')[:3]
    
    if completed_sprints.count() >= 2:
        velocities = [s.completed_count for s in completed_sprints]
        avg = sum(velocities) / len(velocities)
        insights.append({
            'type': 'velocity',
            'title': 'Sprint Velocity',
            'message': f'Average velocity: {avg:.1f} issues per sprint',
            'action': 'View History',
            'url': '/sprint-history'
        })
    
    # Blockers
    blockers = Issue.objects.filter(
        organization=org,
        status__in=['in_progress', 'in_review'],
        priority='highest'
    ).count()
    
    if blockers > 0:
        insights.append({
            'type': 'blocker',
            'title': 'Potential Blockers',
            'message': f'{blockers} high-priority issues need attention',
            'action': 'View Issues',
            'url': '/projects'
        })
    
    # Recent decisions
    recent_decisions = Decision.objects.filter(
        organization=org,
        created_at__gte=datetime.now() - timedelta(days=7)
    ).count()
    
    if recent_decisions > 5:
        insights.append({
            'type': 'decision',
            'title': 'High Decision Activity',
            'message': f'{recent_decisions} decisions made this week',
            'action': 'View Decisions',
            'url': '/decisions'
        })
    
    return Response({'insights': insights})
