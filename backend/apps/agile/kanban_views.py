from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Count, Q
from apps.agile.models import Project, Board, Column, Issue, IssueComment, IssueLabel, Sprint
from apps.organizations.models import User

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def projects(request):
    """List or create projects"""
    if not hasattr(request.user, 'organization') or not request.user.organization:
        return Response({'error': 'User does not have an organization'}, status=400)
    
    if request.method == 'GET':
        projects = Project.objects.filter(organization=request.user.organization)
        data = [{
            'id': p.id,
            'name': p.name,
            'key': p.key,
            'description': p.description,
            'lead': p.lead.get_full_name() if p.lead else None,
            'issue_count': p.issues.count(),
            'sprint_count': p.sprints.count(),
            'created_at': p.created_at
        } for p in projects]
        return Response(data)
    
    elif request.method == 'POST':
        key = request.data['key'].upper()
        
        if Project.objects.filter(key=key).exists():
            return Response({'error': f'Project key "{key}" already exists. Please use a different key.'}, status=400)
        
        try:
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
            
            columns_data = ['To Do', 'In Progress', 'In Review', 'Done']
            for i, col_name in enumerate(columns_data):
                Column.objects.create(board=board, name=col_name, order=i)
            
            return Response({
                'id': project.id,
                'name': project.name,
                'key': project.key,
                'board_id': board.id
            })
        except Exception as e:
            return Response({'error': str(e)}, status=400)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def project_detail(request, project_id):
    """Get project details with boards and sprints"""
    if not hasattr(request.user, 'organization') or not request.user.organization:
        return Response({'error': 'User does not have an organization'}, status=400)
    
    try:
        project = Project.objects.get(
            id=project_id,
            organization=request.user.organization
        )
        
        boards = project.boards.all()
        board_data = []
        for board in boards:
            columns = board.columns.all()
            column_data = []
            for col in columns:
                issues = col.issues.all()
                column_data.append({
                    'id': col.id,
                    'name': col.name,
                    'order': col.order,
                    'issue_count': issues.count()
                })
            board_data.append({
                'id': board.id,
                'name': board.name,
                'type': board.board_type,
                'columns': column_data
            })
        
        sprints = project.sprints.all().order_by('-start_date')
        sprint_data = [{
            'id': s.id,
            'name': s.name,
            'start_date': s.start_date,
            'end_date': s.end_date,
            'goal': s.goal,
            'issue_count': s.issues.count(),
            'completed_count': s.completed_count,
            'blocked_count': s.blocked_count
        } for s in sprints]
        
        return Response({
            'id': project.id,
            'name': project.name,
            'key': project.key,
            'description': project.description,
            'lead': project.lead.get_full_name() if project.lead else None,
            'boards': board_data,
            'sprints': sprint_data,
            'issue_count': project.issues.count(),
            'sprint_count': project.sprints.count()
        })
    except Project.DoesNotExist:
        return Response({'error': 'Project not found'}, status=404)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def board_view(request, board_id):
    """Get board with all columns and issues (Kanban view)"""
    if not hasattr(request.user, 'organization') or not request.user.organization:
        return Response({'error': 'User does not have an organization'}, status=400)
    
    try:
        board = Board.objects.get(id=board_id)
        
        columns = board.columns.all().order_by('order')
        column_data = []
        
        for col in columns:
            issues = col.issues.all().order_by('-created_at')
            issue_data = []
            for issue in issues:
                issue_data.append({
                    'id': issue.id,
                    'key': issue.key,
                    'title': issue.title,
                    'priority': issue.priority,
                    'status': issue.status,
                    'assignee': issue.assignee.get_full_name() if issue.assignee else None,
                    'story_points': issue.story_points,
                    'sprint': issue.sprint.name if issue.sprint else None,
                    'labels': [l.name for l in issue.labels.all()],
                    'due_date': issue.due_date
                })
            
            column_data.append({
                'id': col.id,
                'name': col.name,
                'order': col.order,
                'issues': issue_data
            })
        
        return Response({
            'id': board.id,
            'project_id': board.project.id,
            'name': board.name,
            'type': board.board_type,
            'columns': column_data
        })
    except Board.DoesNotExist:
        return Response({'error': 'Board not found'}, status=404)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def issues(request, project_id):
    """List or create issues"""
    if not hasattr(request.user, 'organization') or not request.user.organization:
        return Response({'error': 'User does not have an organization'}, status=400)
    
    try:
        project = Project.objects.get(
            id=project_id,
            organization=request.user.organization
        )
    except Project.DoesNotExist:
        return Response({'error': 'Project not found'}, status=404)
    
    if request.method == 'GET':
        issues = project.issues.all()
        
        status = request.GET.get('status')
        if status:
            issues = issues.filter(status=status)
        
        assignee = request.GET.get('assignee')
        if assignee:
            issues = issues.filter(assignee_id=assignee)
        
        sprint = request.GET.get('sprint')
        if sprint:
            issues = issues.filter(sprint_id=sprint)
        
        data = [{
            'id': i.id,
            'key': i.key,
            'title': i.title,
            'description': i.description,
            'priority': i.priority,
            'status': i.status,
            'assignee': i.assignee.get_full_name() if i.assignee else None,
            'reporter': i.reporter.get_full_name(),
            'story_points': i.story_points,
            'sprint': i.sprint.name if i.sprint else None,
            'created_at': i.created_at,
            'due_date': i.due_date,
            'labels': [l.name for l in i.labels.all()]
        } for i in issues]
        
        return Response(data)
    
    elif request.method == 'POST':
        board = project.boards.first()
        if not board:
            return Response({'error': 'No board found'}, status=400)
        
        column = board.columns.first()
        
        issue_count = project.issues.count() + 1
        issue_key = f"{project.key}-{issue_count}"
        
        issue = Issue.objects.create(
            organization=request.user.organization,
            project=project,
            board=board,
            column=column,
            key=issue_key,
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
        
        return Response({
            'id': issue.id,
            'key': issue.key,
            'title': issue.title,
            'status': issue.status
        })

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def issue_detail(request, issue_id):
    """Get, update, or delete an issue"""
    if not hasattr(request.user, 'organization') or not request.user.organization:
        return Response({'error': 'User does not have an organization'}, status=400)
    
    try:
        issue = Issue.objects.get(id=issue_id)
    except Issue.DoesNotExist:
        return Response({'error': 'Issue not found'}, status=404)
    
    if request.method == 'GET':
        comments = issue.comments.all()
        comment_data = [{
            'id': c.id,
            'author': c.author.get_full_name(),
            'content': c.content,
            'created_at': c.created_at
        } for c in comments]
        
        return Response({
            'id': issue.id,
            'key': issue.key,
            'title': issue.title,
            'description': issue.description,
            'priority': issue.priority,
            'status': issue.status,
            'assignee': issue.assignee.get_full_name() if issue.assignee else None,
            'reporter': issue.reporter.get_full_name(),
            'story_points': issue.story_points,
            'sprint': issue.sprint.name if issue.sprint else None,
            'project_id': issue.project.id,
            'created_at': issue.created_at,
            'updated_at': issue.updated_at,
            'due_date': issue.due_date,
            'labels': [l.name for l in issue.labels.all()],
            'comments': comment_data
        })
    
    elif request.method == 'PUT':
        if 'title' in request.data:
            issue.title = request.data['title']
        if 'description' in request.data:
            issue.description = request.data['description']
        if 'priority' in request.data:
            issue.priority = request.data['priority']
        if 'status' in request.data:
            issue.status = request.data['status']
        if 'assignee_id' in request.data:
            issue.assignee_id = request.data['assignee_id']
        if 'story_points' in request.data:
            issue.story_points = request.data['story_points']
        if 'sprint_id' in request.data:
            sprint_id = request.data['sprint_id']
            if sprint_id:
                try:
                    sprint = Sprint.objects.get(id=sprint_id, project=issue.project)
                    issue.sprint = sprint
                except Sprint.DoesNotExist:
                    return Response({'error': 'Sprint not found in this project'}, status=400)
            else:
                issue.sprint = None
        if 'due_date' in request.data:
            issue.due_date = request.data['due_date']
        
        issue.save()
        return Response({'message': 'Issue updated'})
    
    elif request.method == 'DELETE':
        issue.delete()
        return Response({'message': 'Issue deleted'})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def move_issue(request, issue_id):
    """Move issue to different column and auto-assign to active sprint if needed"""
    if not hasattr(request.user, 'organization') or not request.user.organization:
        return Response({'error': 'User does not have an organization'}, status=400)
    
    try:
        issue = Issue.objects.get(id=issue_id)
        column = Column.objects.get(id=request.data['column_id'])
        
        issue.column = column
        issue.status = request.data.get('status', issue.status)
        
        if not issue.sprint:
            today = timezone.now().date()
            active_sprint = Sprint.objects.filter(
                project=issue.project,
                start_date__lte=today,
                end_date__gte=today
            ).first()
            if active_sprint:
                issue.sprint = active_sprint
        
        issue.save()
        
        return Response({'message': 'Issue moved'})
    except (Issue.DoesNotExist, Column.DoesNotExist):
        return Response({'error': 'Issue or column not found'}, status=404)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_comment(request, issue_id):
    """Add comment to issue"""
    if not hasattr(request.user, 'organization') or not request.user.organization:
        return Response({'error': 'User does not have an organization'}, status=400)
    
    try:
        issue = Issue.objects.get(id=issue_id)
        
        comment = IssueComment.objects.create(
            issue=issue,
            author=request.user,
            content=request.data['content']
        )
        
        return Response({
            'id': comment.id,
            'author': comment.author.get_full_name(),
            'content': comment.content,
            'created_at': comment.created_at
        })
    except Issue.DoesNotExist:
        return Response({'error': 'Issue not found'}, status=404)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def labels(request, project_id):
    """List or create labels"""
    if not hasattr(request.user, 'organization') or not request.user.organization:
        return Response({'error': 'User does not have an organization'}, status=400)
    
    try:
        project = Project.objects.get(
            id=project_id,
            organization=request.user.organization
        )
    except Project.DoesNotExist:
        return Response({'error': 'Project not found'}, status=404)
    
    if request.method == 'GET':
        labels = IssueLabel.objects.filter(organization=request.user.organization)
        data = [{
            'id': l.id,
            'name': l.name,
            'color': l.color
        } for l in labels]
        return Response(data)
    
    elif request.method == 'POST':
        label = IssueLabel.objects.create(
            organization=request.user.organization,
            name=request.data['name'],
            color=request.data.get('color', '#4F46E5')
        )
        return Response({
            'id': label.id,
            'name': label.name,
            'color': label.color
        })

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def sprints(request, project_id):
    """List or create sprints for a project"""
    if not hasattr(request.user, 'organization') or not request.user.organization:
        return Response({'error': 'User does not have an organization'}, status=400)
    
    try:
        project = Project.objects.get(
            id=project_id,
            organization=request.user.organization
        )
    except Project.DoesNotExist:
        return Response({'error': 'Project not found'}, status=404)
    
    if request.method == 'GET':
        sprints = project.sprints.filter(project__isnull=False).order_by('-start_date')
        data = [{
            'id': s.id,
            'name': s.name,
            'start_date': s.start_date,
            'end_date': s.end_date,
            'goal': s.goal,
            'issue_count': s.issues.count(),
            'completed_count': s.completed_count,
            'blocked_count': s.blocked_count
        } for s in sprints]
        return Response(data)
    
    elif request.method == 'POST':
        from datetime import timedelta
        start_date = request.data.get('start_date', timezone.now().date())
        end_date = request.data.get('end_date', (timezone.now() + timedelta(days=14)).date())
        
        sprint = Sprint.objects.create(
            organization=request.user.organization,
            project=project,
            name=request.data['name'],
            start_date=start_date,
            end_date=end_date,
            goal=request.data.get('goal', '')
        )
        return Response({
            'id': sprint.id,
            'name': sprint.name,
            'start_date': sprint.start_date,
            'end_date': sprint.end_date,
            'goal': sprint.goal,
            'project_id': sprint.project.id
        })

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def sprint_detail(request, sprint_id):
    """Get, update, or delete a sprint"""
    if not hasattr(request.user, 'organization') or not request.user.organization:
        return Response({'error': 'User does not have an organization'}, status=400)
    
    try:
        sprint = Sprint.objects.get(id=sprint_id)
    except Sprint.DoesNotExist:
        return Response({'error': 'Sprint not found'}, status=404)
    
    if request.method == 'GET':
        issues = sprint.issues.all()
        return Response({
            'id': sprint.id,
            'name': sprint.name,
            'project_id': sprint.project.id,
            'project_name': sprint.project.name,
            'start_date': sprint.start_date,
            'end_date': sprint.end_date,
            'goal': sprint.goal,
            'issue_count': issues.count(),
            'completed': issues.filter(status='done').count(),
            'in_progress': issues.filter(status='in_progress').count(),
            'todo': issues.filter(status='todo').count(),
            'blocked': sprint.blocked_count,
            'issues': [{
                'id': i.id,
                'key': i.key,
                'title': i.title,
                'status': i.status,
                'assignee': i.assignee.get_full_name() if i.assignee else None,
                'story_points': i.story_points
            } for i in issues]
        })
    
    elif request.method == 'PUT':
        if 'name' in request.data:
            sprint.name = request.data['name']
        if 'goal' in request.data:
            sprint.goal = request.data['goal']
        if 'start_date' in request.data:
            sprint.start_date = request.data['start_date']
        if 'end_date' in request.data:
            sprint.end_date = request.data['end_date']
        if 'status' in request.data:
            sprint.status = request.data['status']
        sprint.save()
        return Response({'message': 'Sprint updated'})
    
    elif request.method == 'DELETE':
        sprint.delete()
        return Response({'message': 'Sprint deleted'})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def assign_issue_to_sprint(request, issue_id):
    """Assign issue to a sprint"""
    if not hasattr(request.user, 'organization') or not request.user.organization:
        return Response({'error': 'User does not have an organization'}, status=400)
    
    try:
        issue = Issue.objects.get(id=issue_id)
        sprint_id = request.data.get('sprint_id')
        
        if sprint_id:
            sprint = Sprint.objects.get(id=sprint_id, project=issue.project)
            issue.sprint = sprint
        else:
            issue.sprint = None
        
        issue.save()
        return Response({'message': 'Issue assigned to sprint'})
    except Issue.DoesNotExist:
        return Response({'error': 'Issue not found'}, status=404)
    except Sprint.DoesNotExist:
        return Response({'error': 'Sprint not found in this project'}, status=400)
