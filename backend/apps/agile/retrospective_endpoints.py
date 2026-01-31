from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Count, Q, Avg
from apps.agile.models import Sprint, Issue, Blocker, Retrospective
from apps.conversations.models import Conversation

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def auto_generate_retrospective(request, sprint_id):
    """Auto-generate retrospective from sprint data"""
    try:
        sprint = Sprint.objects.get(id=sprint_id, organization=request.user.organization)
    except Sprint.DoesNotExist:
        return Response({'error': 'Sprint not found'}, status=404)
    
    # Check if retrospective already exists
    retro = Retrospective.objects.filter(sprint=sprint).first()
    if retro:
        return Response({'error': 'Retrospective already exists'}, status=400)
    
    # Analyze sprint data
    issues = sprint.issues.all()
    total_issues = issues.count()
    completed_issues = issues.filter(status='done').count()
    in_progress = issues.filter(status='in_progress').count()
    
    # Calculate velocity
    completed_points = sum([i.story_points or 0 for i in completed_issues])
    total_points = sum([i.story_points or 0 for i in issues])
    
    # Get blockers
    blockers = sprint.blockers.all()
    active_blockers = blockers.filter(status='active').count()
    resolved_blockers = blockers.filter(status='resolved').count()
    
    # Get sprint updates/conversations
    updates = sprint.updates.all()
    
    # Analyze what went well
    what_went_well = []
    if completed_issues > total_issues * 0.8:
        what_went_well.append('High completion rate - team delivered most planned work')
    if active_blockers == 0:
        what_went_well.append('No active blockers - smooth execution')
    if resolved_blockers > 0:
        what_went_well.append(f'Resolved {resolved_blockers} blockers - good problem solving')
    
    # Analyze what needs improvement
    what_needs_improvement = []
    if in_progress > 0:
        what_needs_improvement.append(f'{in_progress} issues still in progress - consider better estimation')
    if active_blockers > 0:
        what_needs_improvement.append(f'{active_blockers} active blockers - need faster resolution')
    if completed_issues < total_issues * 0.6:
        what_needs_improvement.append('Low completion rate - review capacity planning')
    
    # Extract action items from updates
    action_items = []
    for update in updates:
        if 'action' in update.content.lower() or 'todo' in update.content.lower():
            action_items.append(update.content[:100])
    
    # Detect recurring issues
    recurring_issues = []
    blocker_types = blockers.values('blocker_type').annotate(count=Count('id')).order_by('-count')
    for bt in blocker_types:
        if bt['count'] > 1:
            recurring_issues.append({
                'keyword': bt['blocker_type'],
                'count': bt['count']
            })
    
    # Create retrospective
    retro = Retrospective.objects.create(
        organization=request.user.organization,
        sprint=sprint,
        created_by=request.user,
        what_went_well=what_went_well,
        what_needs_improvement=what_needs_improvement,
        action_items=action_items,
        recurring_issues=recurring_issues
    )
    
    return Response({
        'id': retro.id,
        'sprint_id': sprint.id,
        'summary': {
            'total_issues': total_issues,
            'completed': completed_issues,
            'completion_rate': round(completed_issues / total_issues * 100, 1) if total_issues > 0 else 0,
            'story_points_completed': completed_points,
            'story_points_total': total_points,
            'blockers_resolved': resolved_blockers,
            'blockers_active': active_blockers
        },
        'what_went_well': what_went_well,
        'what_needs_improvement': what_needs_improvement,
        'action_items': action_items,
        'recurring_issues': recurring_issues
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def sprint_analytics(request, sprint_id):
    """Get detailed sprint analytics"""
    try:
        sprint = Sprint.objects.get(id=sprint_id, organization=request.user.organization)
    except Sprint.DoesNotExist:
        return Response({'error': 'Sprint not found'}, status=404)
    
    issues = sprint.issues.all()
    
    # Issue breakdown
    by_status = issues.values('status').annotate(count=Count('id'))
    by_priority = issues.values('priority').annotate(count=Count('id'))
    
    # Story points
    total_points = sum([i.story_points or 0 for i in issues])
    completed_points = sum([i.story_points or 0 for i in issues.filter(status='done')])
    
    # Blockers
    blockers = sprint.blockers.all()
    blocker_types = blockers.values('blocker_type').annotate(count=Count('id'))
    
    # Team performance
    assignees = issues.values('assignee__id', 'assignee__first_name', 'assignee__last_name').annotate(
        assigned_count=Count('id'),
        completed_count=Count('id', filter=Q(status='done'))
    )
    
    # Velocity trend
    from apps.agile.models import SprintVelocity
    velocity = SprintVelocity.objects.filter(sprint=sprint).first()
    
    return Response({
        'sprint_id': sprint.id,
        'sprint_name': sprint.name,
        'start_date': sprint.start_date.isoformat(),
        'end_date': sprint.end_date.isoformat(),
        'status': sprint.status,
        'issues': {
            'total': issues.count(),
            'by_status': list(by_status),
            'by_priority': list(by_priority)
        },
        'story_points': {
            'total': total_points,
            'completed': completed_points,
            'completion_percentage': round(completed_points / total_points * 100, 1) if total_points > 0 else 0
        },
        'blockers': {
            'total': blockers.count(),
            'active': blockers.filter(status='active').count(),
            'resolved': blockers.filter(status='resolved').count(),
            'by_type': list(blocker_types)
        },
        'team_performance': list(assignees),
        'velocity': {
            'planned_points': velocity.planned_points if velocity else 0,
            'completed_points': velocity.completed_points if velocity else 0,
            'velocity': velocity.velocity if velocity else 0
        }
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def sprint_trends(request):
    """Get sprint trends over time"""
    from apps.agile.models import SprintVelocity
    
    limit = int(request.GET.get('limit', 10))
    
    sprints = Sprint.objects.filter(
        organization=request.user.organization,
        status='completed'
    ).order_by('-end_date')[:limit]
    
    trends = []
    for sprint in sprints:
        issues = sprint.issues.all()
        completed = issues.filter(status='done').count()
        total = issues.count()
        
        velocity = SprintVelocity.objects.filter(sprint=sprint).first()
        
        trends.append({
            'sprint_id': sprint.id,
            'sprint_name': sprint.name,
            'end_date': sprint.end_date.isoformat(),
            'completion_rate': round(completed / total * 100, 1) if total > 0 else 0,
            'issues_completed': completed,
            'issues_total': total,
            'velocity': velocity.velocity if velocity else 0,
            'blockers': sprint.blockers.count()
        })
    
    return Response({
        'sprints': trends,
        'avg_completion_rate': round(sum([t['completion_rate'] for t in trends]) / len(trends), 1) if trends else 0,
        'avg_velocity': round(sum([t['velocity'] for t in trends]) / len(trends), 1) if trends else 0
    })
