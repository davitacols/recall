from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Count, Q
from datetime import timedelta
from apps.agile.models import Project, Sprint, Issue, Board, Column, IssueComment, IssueLabel, Blocker, Retrospective, SprintUpdate
from apps.organizations.models import User
from apps.conversations.models import Conversation

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def projects(request):
    """List or create projects"""
    if not hasattr(request.user, 'organization') or not request.user.organization:
        return Response({'error': 'User does not have an organization'}, status=400)
    
    if request.method == 'GET':
        projects = Project.objects.filter(organization=request.user.organization)
        return Response([{
            'id': p.id,
            'name': p.name,
            'key': p.key,
            'description': p.description,
            'lead': p.lead.get_full_name() if p.lead else None,
            'issue_count': p.issues.count(),
            'sprint_count': p.sprints.count(),
            'created_at': p.created_at.isoformat()
        } for p in projects])
    
    key = request.data['key'].upper()
    if Project.objects.filter(key=key).exists():
        return Response({'error': f'Project key "{key}" already exists'}, status=400)
    
    project = Project.objects.create(
        organization=request.user.organization,
        name=request.data['name'],
        key=key,
        description=request.data.get('description', ''),
        lead=request.user
    )
    
    board = Board.objects.create(
        organization=request.user.organization,
        project=project,
        name='Backlog',
        board_type='kanban'
    )
    
    for i, col_name in enumerate(['To Do', 'In Progress', 'In Review', 'Done']):
        Column.objects.create(board=board, name=col_name, order=i)
    
    return Response({'id': project.id, 'name': project.name, 'key': project.key})

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_project(request, project_id):
    """Delete a project"""
    if not hasattr(request.user, 'organization') or not request.user.organization:
        return Response({'error': 'User does not have an organization'}, status=400)
    
    try:
        project = Project.objects.get(id=project_id, organization=request.user.organization)
        project.delete()
        return Response({'message': 'Project deleted successfully'})
    except Project.DoesNotExist:
        return Response({'error': 'Project not found'}, status=404)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def project_detail(request, project_id):
    """Get project details with sprints and stats"""
    if not hasattr(request.user, 'organization') or not request.user.organization:
        return Response({'error': 'User does not have an organization'}, status=400)
    
    try:
        project = Project.objects.get(id=project_id, organization=request.user.organization)
        sprints = project.sprints.all().order_by('-start_date')
        
        return Response({
            'id': project.id,
            'name': project.name,
            'key': project.key,
            'description': project.description,
            'lead': project.lead.get_full_name() if project.lead else None,
            'issue_count': project.issues.count(),
            'completed_issues': project.issues.filter(status='done').count(),
            'active_issues': project.issues.filter(status__in=['todo', 'in_progress']).count(),
            'boards': [{
                'id': b.id,
                'name': b.name,
            } for b in project.boards.all()],
            'sprints': [{
                'id': s.id,
                'name': s.name,
                'start_date': s.start_date.isoformat(),
                'end_date': s.end_date.isoformat(),
                'status': s.status,
                'goal': s.goal,
                'issue_count': s.issues.count(),
                'completed_count': s.issues.filter(status='done').count(),
                'blocked_count': s.blocked_count,
            } for s in sprints]
        })
    except Project.DoesNotExist:
        return Response({'error': 'Project not found'}, status=404)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def sprints(request, project_id):
    """List or create sprints"""
    if not hasattr(request.user, 'organization') or not request.user.organization:
        return Response({'error': 'User does not have an organization'}, status=400)
    
    try:
        project = Project.objects.get(id=project_id, organization=request.user.organization)
    except Project.DoesNotExist:
        return Response({'error': 'Project not found'}, status=404)
    
    if request.method == 'GET':
        sprints = project.sprints.all().order_by('-start_date')
        return Response([{
            'id': s.id,
            'name': s.name,
            'start_date': s.start_date.isoformat(),
            'end_date': s.end_date.isoformat(),
            'status': s.status,
            'goal': s.goal,
            'issue_count': s.issues.count(),
            'completed_count': s.issues.filter(status='done').count(),
            'blocked_count': s.blocked_count,
        } for s in sprints])
    
    sprint = Sprint.objects.create(
        organization=request.user.organization,
        project=project,
        name=request.data['name'],
        start_date=request.data['start_date'],
        end_date=request.data['end_date'],
        goal=request.data.get('goal', '')
    )
    return Response({'id': sprint.id, 'name': sprint.name})

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def sprint_detail(request, sprint_id):
    """Get, update, or delete sprint with all issues"""
    if not hasattr(request.user, 'organization') or not request.user.organization:
        return Response({'error': 'User does not have an organization'}, status=400)
    
    try:
        sprint = Sprint.objects.get(id=sprint_id, organization=request.user.organization)
    except Sprint.DoesNotExist:
        return Response({'error': 'Sprint not found'}, status=404)
    
    if request.method == 'GET':
        issues = sprint.issues.all()
        return Response({
            'id': sprint.id,
            'name': sprint.name,
            'project_id': sprint.project.id,
            'project_name': sprint.project.name,
            'start_date': sprint.start_date.isoformat(),
            'end_date': sprint.end_date.isoformat(),
            'goal': sprint.goal,
            'status': sprint.status,
            'issue_count': issues.count(),
            'completed': issues.filter(status='done').count(),
            'in_progress': issues.filter(status='in_progress').count(),
            'todo': issues.filter(status='todo').count(),
            'blocked': sprint.blocked_count,
            'decisions': sprint.decisions_made,
            'issues': [{
                'id': i.id,
                'key': i.key,
                'title': i.title,
                'description': i.description,
                'status': i.status,
                'priority': i.priority,
                'assignee': i.assignee.get_full_name() if i.assignee else None,
                'assignee_id': i.assignee_id,
                'story_points': i.story_points,
                'due_date': i.due_date.isoformat() if i.due_date else None,
            } for i in issues]
        })
    
    if request.method == 'PUT':
        if 'name' in request.data:
            sprint.name = request.data['name']
        if 'goal' in request.data:
            sprint.goal = request.data['goal']
        if 'status' in request.data:
            sprint.status = request.data['status']
        if 'start_date' in request.data:
            sprint.start_date = request.data['start_date']
        if 'end_date' in request.data:
            sprint.end_date = request.data['end_date']
        
        sprint.save()
        issues = sprint.issues.all()
        return Response({
            'id': sprint.id,
            'name': sprint.name,
            'status': sprint.status,
            'issue_count': issues.count(),
            'issues': [{
                'id': i.id,
                'key': i.key,
                'title': i.title,
                'status': i.status,
            } for i in issues]
        })
    
    if request.method == 'DELETE':
        sprint.delete()
        return Response({'message': 'Sprint deleted'})

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def issues(request, project_id):
    """List or create issues"""
    if not hasattr(request.user, 'organization') or not request.user.organization:
        return Response({'error': 'User does not have an organization'}, status=400)
    
    try:
        project = Project.objects.get(id=project_id, organization=request.user.organization)
    except Project.DoesNotExist:
        return Response({'error': 'Project not found'}, status=404)
    
    if request.method == 'GET':
        issues = project.issues.all()
        
        sprint_id = request.GET.get('sprint_id')
        if sprint_id:
            issues = issues.filter(sprint_id=sprint_id)
        
        status_filter = request.GET.get('status')
        if status_filter:
            issues = issues.filter(status=status_filter)
        
        return Response([{
            'id': i.id,
            'key': i.key,
            'title': i.title,
            'description': i.description,
            'status': i.status,
            'priority': i.priority,
            'assignee': i.assignee.get_full_name() if i.assignee else None,
            'assignee_id': i.assignee_id,
            'reporter': i.reporter.get_full_name(),
            'story_points': i.story_points,
            'sprint_id': i.sprint_id,
            'sprint_name': i.sprint.name if i.sprint else None,
            'due_date': i.due_date.isoformat() if i.due_date else None,
            'created_at': i.created_at.isoformat(),
            'labels': [l.name for l in i.labels.all()]
        } for i in issues])
    
    board = project.boards.first()
    if not board:
        return Response({'error': 'No board found for project'}, status=400)
    
    column = board.columns.first()
    issue_count = project.issues.count() + 1
    
    issue = Issue.objects.create(
        organization=request.user.organization,
        project=project,
        board=board,
        column=column,
        key=f"{project.key}-{issue_count}",
        title=request.data['title'],
        description=request.data.get('description', ''),
        priority=request.data.get('priority', 'medium'),
        status='todo',
        reporter=request.user,
        assignee_id=request.data.get('assignee_id'),
        story_points=request.data.get('story_points'),
        sprint_id=request.data.get('sprint_id'),
        due_date=request.data.get('due_date')
    )
    
    return Response({'id': issue.id, 'key': issue.key, 'title': issue.title})

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def issue_detail(request, issue_id):
    """Get, update, or delete issue"""
    if not hasattr(request.user, 'organization') or not request.user.organization:
        return Response({'error': 'User does not have an organization'}, status=400)
    
    try:
        issue = Issue.objects.get(id=issue_id, organization=request.user.organization)
    except Issue.DoesNotExist:
        return Response({'error': 'Issue not found'}, status=404)
    
    if request.method == 'GET':
        comments = issue.comments.all()
        return Response({
            'id': issue.id,
            'key': issue.key,
            'title': issue.title,
            'description': issue.description,
            'status': issue.status,
            'priority': issue.priority,
            'assignee': issue.assignee.get_full_name() if issue.assignee else None,
            'assignee_id': issue.assignee_id,
            'reporter': issue.reporter.get_full_name(),
            'story_points': issue.story_points,
            'sprint_id': issue.sprint_id,
            'sprint_name': issue.sprint.name if issue.sprint else None,
            'project_id': issue.project.id,
            'due_date': issue.due_date.isoformat() if issue.due_date else None,
            'created_at': issue.created_at.isoformat(),
            'updated_at': issue.updated_at.isoformat(),
            'labels': [l.name for l in issue.labels.all()],
            'comments': [{
                'id': c.id,
                'author': c.author.get_full_name(),
                'content': c.content,
                'created_at': c.created_at.isoformat()
            } for c in comments]
        })
    
    if request.method == 'PUT':
        if 'title' in request.data:
            issue.title = request.data['title']
        if 'description' in request.data:
            issue.description = request.data['description']
        if 'status' in request.data:
            issue.status = request.data['status']
            # Update column based on status
            status_to_column = {
                'todo': 'To Do',
                'in_progress': 'In Progress',
                'in_review': 'In Review',
                'done': 'Done',
            }
            column_name = status_to_column.get(request.data['status'])
            if column_name and issue.board:
                try:
                    column = issue.board.columns.get(name=column_name)
                    issue.column = column
                except Column.DoesNotExist:
                    pass
        if 'priority' in request.data:
            issue.priority = request.data['priority']
        if 'assignee_id' in request.data:
            issue.assignee_id = request.data['assignee_id']
        if 'story_points' in request.data:
            issue.story_points = request.data['story_points']
        if 'due_date' in request.data:
            issue.due_date = request.data['due_date']
        if 'sprint_id' in request.data:
            sprint_id = request.data['sprint_id']
            if sprint_id:
                try:
                    sprint = Sprint.objects.get(id=sprint_id, project=issue.project, organization=request.user.organization)
                    issue.sprint = sprint
                except Sprint.DoesNotExist:
                    return Response({'error': 'Sprint not found in this project'}, status=400)
            else:
                issue.sprint = None
        
        issue.save()
        return Response({
            'message': 'Issue updated',
            'id': issue.id,
            'sprint_id': issue.sprint_id,
            'status': issue.status
        })
    
    if request.method == 'DELETE':
        issue.delete()
        return Response({'message': 'Issue deleted'})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_comment(request, issue_id):
    """Add comment to issue"""
    if not hasattr(request.user, 'organization') or not request.user.organization:
        return Response({'error': 'User does not have an organization'}, status=400)
    
    try:
        issue = Issue.objects.get(id=issue_id, organization=request.user.organization)
    except Issue.DoesNotExist:
        return Response({'error': 'Issue not found'}, status=404)
    
    comment = IssueComment.objects.create(
        issue=issue,
        author=request.user,
        content=request.data['content']
    )
    
    return Response({
        'id': comment.id,
        'author': comment.author.get_full_name(),
        'content': comment.content,
        'created_at': comment.created_at.isoformat()
    })

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def labels(request, project_id):
    """List or create labels"""
    if not hasattr(request.user, 'organization') or not request.user.organization:
        return Response({'error': 'User does not have an organization'}, status=400)
    
    try:
        project = Project.objects.get(id=project_id, organization=request.user.organization)
    except Project.DoesNotExist:
        return Response({'error': 'Project not found'}, status=404)
    
    if request.method == 'GET':
        labels = IssueLabel.objects.filter(organization=request.user.organization)
        return Response([{
            'id': l.id,
            'name': l.name,
            'color': l.color
        } for l in labels])
    
    label = IssueLabel.objects.create(
        organization=request.user.organization,
        name=request.data['name'],
        color=request.data.get('color', '#4F46E5')
    )
    return Response({'id': label.id, 'name': label.name, 'color': label.color})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def sprint_history(request):
    """Get past sprints"""
    if not hasattr(request.user, 'organization') or not request.user.organization:
        return Response({'error': 'User does not have an organization'}, status=400)
    
    project_id = request.GET.get('project_id')
    
    if project_id:
        sprints = Sprint.objects.filter(
            organization=request.user.organization,
            project_id=project_id,
            end_date__lt=timezone.now().date()
        ).order_by('-end_date')[:20]
    else:
        sprints = Sprint.objects.filter(
            organization=request.user.organization,
            end_date__lt=timezone.now().date()
        ).order_by('-end_date')[:20]
    
    return Response([{
        'id': s.id,
        'name': s.name,
        'project_id': s.project.id,
        'project_name': s.project.name,
        'start_date': s.start_date.isoformat(),
        'end_date': s.end_date.isoformat(),
        'completed': s.issues.filter(status='done').count(),
        'total': s.issues.count(),
        'blocked': s.blocked_count,
    } for s in sprints])

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def project_roadmap(request, project_id):
    """Get project roadmap"""
    if not hasattr(request.user, 'organization') or not request.user.organization:
        return Response({'error': 'User does not have an organization'}, status=400)
    
    try:
        project = Project.objects.get(id=project_id, organization=request.user.organization)
    except Project.DoesNotExist:
        return Response({'error': 'Project not found'}, status=404)
    
    sprints = project.sprints.all().order_by('start_date')
    return Response([{
        'id': s.id,
        'name': s.name,
        'start_date': s.start_date.isoformat(),
        'end_date': s.end_date.isoformat(),
        'status': s.status,
        'goal': s.goal,
        'issue_count': s.issues.count(),
        'completed': s.issues.filter(status='done').count(),
    } for s in sprints])

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def board_detail(request, board_id):
    """Get board with columns and issues"""
    if not hasattr(request.user, 'organization') or not request.user.organization:
        return Response({'error': 'User does not have an organization'}, status=400)
    
    try:
        board = Board.objects.get(id=board_id, organization=request.user.organization)
        columns = board.columns.all().order_by('order')
        
        columns_data = []
        for col in columns:
            issues = col.issues.all()
            columns_data.append({
                'id': col.id,
                'name': col.name,
                'order': col.order,
                'issue_count': issues.count(),
                'issues': [{
                    'id': i.id,
                    'key': i.key,
                    'title': i.title,
                    'status': i.status,
                    'priority': i.priority,
                    'assignee': i.assignee.get_full_name() if i.assignee else None,
                    'story_points': i.story_points,
                } for i in issues]
            })
        
        return Response({
            'id': board.id,
            'name': board.name,
            'project_id': board.project.id,
            'project_name': board.project.name,
            'columns': columns_data
        })
    except Board.DoesNotExist:
        return Response({'error': 'Board not found'}, status=404)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def blockers(request):
    """List or create blockers"""
    if not hasattr(request.user, 'organization') or not request.user.organization:
        return Response({'error': 'User does not have an organization'}, status=400)
    
    if request.method == 'GET':
        sprint_id = request.GET.get('sprint_id')
        blockers = Blocker.objects.filter(
            organization=request.user.organization,
            status='active'
        ).order_by('-created_at')
        
        if sprint_id:
            blockers = blockers.filter(sprint_id=sprint_id)
        
        return Response([{
            'id': b.id,
            'title': b.title,
            'description': b.description,
            'type': b.blocker_type,
            'status': b.status,
            'sprint_id': b.sprint.id if b.sprint else None,
            'sprint_name': b.sprint.name if b.sprint else None,
            'blocked_by': b.blocked_by.get_full_name(),
            'assigned_to': b.assigned_to.get_full_name() if b.assigned_to else None,
            'days_open': (timezone.now().date() - b.created_at.date()).days,
            'created_at': b.created_at.isoformat()
        } for b in blockers])
    
    sprint_id = request.data.get('sprint_id')
    if not sprint_id:
        return Response({'error': 'sprint_id required'}, status=400)
    
    try:
        sprint = Sprint.objects.get(id=sprint_id, organization=request.user.organization)
    except Sprint.DoesNotExist:
        return Response({'error': 'Sprint not found'}, status=404)
    
    conversation = Conversation.objects.create(
        organization=request.user.organization,
        author=request.user,
        title=request.data['title'],
        content=request.data.get('description', ''),
        post_type='blocker'
    )
    
    blocker = Blocker.objects.create(
        organization=request.user.organization,
        conversation=conversation,
        sprint=sprint,
        title=request.data['title'],
        description=request.data.get('description', ''),
        blocker_type=request.data.get('type', 'technical'),
        blocked_by=request.user
    )
    
    return Response({'id': blocker.id, 'title': blocker.title, 'sprint_id': sprint.id})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def resolve_blocker(request, blocker_id):
    """Mark blocker as resolved"""
    if not hasattr(request.user, 'organization') or not request.user.organization:
        return Response({'error': 'User does not have an organization'}, status=400)
    
    try:
        blocker = Blocker.objects.get(id=blocker_id, organization=request.user.organization)
        blocker.status = 'resolved'
        blocker.resolved_at = timezone.now()
        blocker.save()
        return Response({'message': 'Blocker resolved'})
    except Blocker.DoesNotExist:
        return Response({'error': 'Blocker not found'}, status=404)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def retrospectives(request, sprint_id):
    """Get or create retrospective for sprint"""
    if not hasattr(request.user, 'organization') or not request.user.organization:
        return Response({'error': 'User does not have an organization'}, status=400)
    
    try:
        sprint = Sprint.objects.get(id=sprint_id, organization=request.user.organization)
    except Sprint.DoesNotExist:
        return Response({'error': 'Sprint not found'}, status=404)
    
    if request.method == 'GET':
        retro = Retrospective.objects.filter(sprint=sprint).first()
        if not retro:
            return Response({'error': 'No retrospective found'}, status=404)
        
        return Response({
            'id': retro.id,
            'sprint_id': sprint.id,
            'sprint_name': sprint.name,
            'what_went_well': retro.what_went_well,
            'what_needs_improvement': retro.what_needs_improvement,
            'action_items': retro.action_items,
            'recurring_issues': retro.recurring_issues,
            'positive_trends': retro.positive_trends,
            'created_at': retro.created_at.isoformat(),
            'created_by': retro.created_by.get_full_name()
        })
    
    retro, created = Retrospective.objects.get_or_create(
        sprint=sprint,
        defaults={
            'organization': request.user.organization,
            'created_by': request.user,
            'what_went_well': request.data.get('what_went_well', []),
            'what_needs_improvement': request.data.get('what_needs_improvement', []),
            'action_items': request.data.get('action_items', [])
        }
    )
    
    if not created:
        retro.what_went_well = request.data.get('what_went_well', retro.what_went_well)
        retro.what_needs_improvement = request.data.get('what_needs_improvement', retro.what_needs_improvement)
        retro.action_items = request.data.get('action_items', retro.action_items)
        retro.save()
    
    return Response({
        'id': retro.id,
        'sprint_id': sprint.id,
        'message': 'Retrospective created' if created else 'Retrospective updated'
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def assign_issues_to_sprint(request, sprint_id):
    """Assign unlinked issues to sprint"""
    if not hasattr(request.user, 'organization') or not request.user.organization:
        return Response({'error': 'User does not have an organization'}, status=400)
    
    try:
        sprint = Sprint.objects.get(id=sprint_id, organization=request.user.organization)
    except Sprint.DoesNotExist:
        return Response({'error': 'Sprint not found'}, status=404)
    
    # Get all issues in the project that are not assigned to any sprint
    unlinked_issues = Issue.objects.filter(
        project=sprint.project,
        sprint__isnull=True
    )
    
    count = unlinked_issues.update(sprint=sprint)
    
    return Response({
        'message': f'Assigned {count} issues to sprint',
        'assigned_count': count
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_sprint(request):
    """Get current active sprint"""
    if not hasattr(request.user, 'organization') or not request.user.organization:
        return Response({'error': 'User does not have an organization'}, status=400)
    
    today = timezone.now().date()
    sprint = Sprint.objects.filter(
        organization=request.user.organization,
        start_date__lte=today,
        end_date__gte=today
    ).order_by('-start_date').first()
    
    if not sprint:
        return Response(None)
    
    issues = sprint.issues.all()
    return Response({
        'id': sprint.id,
        'name': sprint.name,
        'project_id': sprint.project.id if sprint.project else None,
        'project_name': sprint.project.name if sprint.project else None,
        'start_date': sprint.start_date.isoformat(),
        'end_date': sprint.end_date.isoformat(),
        'goal': sprint.goal,
        'status': sprint.status,
        'issue_count': issues.count(),
        'completed': issues.filter(status='done').count(),
        'in_progress': issues.filter(status='in_progress').count(),
        'todo': issues.filter(status='todo').count(),
        'blocked': sprint.blocked_count,
        'decisions': sprint.decisions_made
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def retrospective_insights(request):
    """Get aggregated retrospective insights"""
    if not hasattr(request.user, 'organization') or not request.user.organization:
        return Response({'error': 'User does not have an organization'}, status=400)
    
    retrospectives = Retrospective.objects.filter(
        organization=request.user.organization
    ).order_by('-created_at')[:10]
    
    recurring_issues = {}
    recent_action_items = []
    
    for retro in retrospectives:
        for issue in retro.recurring_issues:
            if isinstance(issue, dict):
                keyword = issue.get('keyword', issue)
                recurring_issues[keyword] = recurring_issues.get(keyword, 0) + 1
            else:
                recurring_issues[issue] = recurring_issues.get(issue, 0) + 1
        
        recent_action_items.extend(retro.action_items[:3])
    
    recurring_list = [
        {'keyword': k, 'count': v}
        for k, v in sorted(recurring_issues.items(), key=lambda x: x[1], reverse=True)
    ][:5]
    
    return Response({
        'recurring_issues': recurring_list,
        'recent_action_items': recent_action_items[:5]
    })
