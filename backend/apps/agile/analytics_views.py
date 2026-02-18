from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Count, Q, Avg
from django.utils import timezone
from datetime import timedelta
from apps.conversations.models import Conversation
from apps.decisions.models import Decision
from apps.agile.models import Issue, Sprint, Project

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def analytics_overview(request):
    org = request.user.organization
    now = timezone.now()
    last_30_days = now - timedelta(days=30)
    
    # Conversations
    total_conversations = Conversation.objects.filter(organization=org).count()
    recent_conversations = Conversation.objects.filter(organization=org, created_at__gte=last_30_days).count()
    
    # Decisions
    total_decisions = Decision.objects.filter(organization=org).count()
    recent_decisions = Decision.objects.filter(organization=org, created_at__gte=last_30_days).count()
    decisions_by_status = Decision.objects.filter(organization=org).values('status').annotate(count=Count('id'))
    
    # Projects
    total_projects = Project.objects.filter(organization=org).count()
    total_issues = Issue.objects.filter(project__organization=org).count()
    completed_issues = Issue.objects.filter(project__organization=org, status='done').count()
    
    # Sprints
    active_sprints = Sprint.objects.filter(project__organization=org, status='active').count()
    
    return Response({
        'conversations': {
            'total': total_conversations,
            'last_30_days': recent_conversations
        },
        'decisions': {
            'total': total_decisions,
            'last_30_days': recent_decisions,
            'by_status': list(decisions_by_status)
        },
        'projects': {
            'total': total_projects,
            'total_issues': total_issues,
            'completed_issues': completed_issues,
            'completion_rate': round((completed_issues / total_issues * 100) if total_issues > 0 else 0, 1)
        },
        'sprints': {
            'active': active_sprints
        }
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def team_analytics(request):
    org = request.user.organization
    
    # User activity
    from apps.organizations.models import User
    users = User.objects.filter(organization=org)
    
    user_stats = []
    for user in users:
        conversations_count = Conversation.objects.filter(created_by=user).count()
        decisions_count = Decision.objects.filter(created_by=user).count()
        issues_assigned = Issue.objects.filter(assignee=user).count()
        issues_completed = Issue.objects.filter(assignee=user, status='done').count()
        
        user_stats.append({
            'user_id': user.id,
            'username': user.username,
            'full_name': user.full_name,
            'conversations': conversations_count,
            'decisions': decisions_count,
            'issues_assigned': issues_assigned,
            'issues_completed': issues_completed
        })
    
    return Response({'team_members': user_stats})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def project_analytics(request, project_id):
    try:
        project = Project.objects.get(id=project_id, organization=request.user.organization)
    except Project.DoesNotExist:
        return Response({'error': 'Project not found'}, status=404)
    
    # Issue metrics
    total_issues = Issue.objects.filter(project=project).count()
    issues_by_status = Issue.objects.filter(project=project).values('status').annotate(count=Count('id'))
    issues_by_priority = Issue.objects.filter(project=project).values('priority').annotate(count=Count('id'))
    
    # Sprint metrics
    sprints = Sprint.objects.filter(project=project)
    sprint_stats = []
    for sprint in sprints:
        sprint_issues = Issue.objects.filter(sprint=sprint)
        completed = sprint_issues.filter(status='done').count()
        total = sprint_issues.count()
        
        sprint_stats.append({
            'id': sprint.id,
            'name': sprint.name,
            'status': sprint.status,
            'total_issues': total,
            'completed_issues': completed,
            'completion_rate': round((completed / total * 100) if total > 0 else 0, 1)
        })
    
    return Response({
        'project': {
            'id': project.id,
            'name': project.name,
            'key': project.key
        },
        'issues': {
            'total': total_issues,
            'by_status': list(issues_by_status),
            'by_priority': list(issues_by_priority)
        },
        'sprints': sprint_stats
    })
