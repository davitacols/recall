from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from apps.agile.models import Project, Board, Column, Issue, IssueComment, IssueLabel, Sprint

def _check_org(request):
    if not hasattr(request.user, 'organization') or not request.user.organization:
        return None
    return request.user.organization

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def board_view(request, board_id):
    org = _check_org(request)
    if not org:
        return Response({'error': 'User does not have an organization'}, status=400)
    
    try:
        board = Board.objects.select_related('project').prefetch_related('columns__issues__assignee').get(id=board_id)
        
        column_data = []
        for col in board.columns.all().order_by('order'):
            issues = col.issues.all().order_by('-created_at')
            issue_data = [{
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
            } for issue in issues]
            
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
def labels(request, project_id):
    org = _check_org(request)
    if not org:
        return Response({'error': 'User does not have an organization'}, status=400)
    
    try:
        project = Project.objects.get(id=project_id, organization=org)
    except Project.DoesNotExist:
        return Response({'error': 'Project not found'}, status=404)
    
    if request.method == 'GET':
        labels = IssueLabel.objects.filter(organization=org)
        data = [{
            'id': l.id,
            'name': l.name,
            'color': l.color
        } for l in labels]
        return Response(data)
    
    elif request.method == 'POST':
        try:
            if not request.data.get('name'):
                return Response({'error': 'name required'}, status=400)
            
            label = IssueLabel.objects.create(
                organization=org,
                name=request.data['name'],
                color=request.data.get('color', '#4F46E5')
            )
            return Response({
                'id': label.id,
                'name': label.name,
                'color': label.color
            })
        except Exception as e:
            return Response({'error': str(e)}, status=400)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def assign_issue_to_sprint(request, issue_id):
    org = _check_org(request)
    if not org:
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
