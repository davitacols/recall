from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Count, Q
from django.db import IntegrityError
from datetime import timedelta
from django.contrib.contenttypes.models import ContentType
import re
from apps.agile.models import Project, Sprint, Issue, Board, Column, IssueComment, IssueLabel, Blocker, Retrospective, SprintUpdate, DecisionImpact, WorkflowTransition
from apps.decisions.models import Decision
from apps.organizations.models import User
from apps.organizations.permissions import has_project_permission, Permission
from apps.organizations.auditlog_models import AuditLog
from apps.conversations.models import Conversation
from apps.knowledge.unified_models import UnifiedActivity


def _track_view_activity(request, obj, title, description=""):
    try:
        content_type = ContentType.objects.get_for_model(obj)
        cutoff = timezone.now() - timedelta(minutes=30)
        exists = UnifiedActivity.objects.filter(
            organization=request.user.organization,
            user=request.user,
            activity_type='viewed',
            content_type=content_type,
            object_id=obj.id,
            created_at__gte=cutoff,
        ).exists()
        if not exists:
            UnifiedActivity.objects.create(
                organization=request.user.organization,
                user=request.user,
                activity_type='viewed',
                content_type=content_type,
                object_id=obj.id,
                title=title,
                description=description[:200] if description else '',
            )
    except Exception:
        pass


def _resolve_issue_by_ref(organization, issue_ref):
    """
    Resolve by DB id, exact issue key, then by unique key suffix (e.g. KEY-113 for ref=113).
    """
    ref = str(issue_ref).strip()
    if not ref:
        return None

    org_filter = Q(organization=organization) | Q(project__organization=organization)
    base_qs = Issue.objects.filter(org_filter)

    if ref.isdigit():
        issue = base_qs.filter(id=int(ref)).first()
        if issue:
            return issue

    issue = base_qs.filter(key__iexact=ref).order_by('-updated_at').first()
    if issue:
        return issue

    if ref.isdigit():
        matches = base_qs.filter(key__iendswith=f'-{ref}').order_by('-updated_at')
        if matches.count() == 1:
            return matches.first()

    return None

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
    
    name = (request.data.get('name') or '').strip()
    if not name:
        return Response({'error': 'Project name is required'}, status=400)

    def normalize_key(value):
        token = re.sub(r'[^A-Z0-9]', '', (value or '').upper())
        return token[:10]

    raw_key = request.data.get('key')
    if raw_key:
        base_key = normalize_key(raw_key)
    else:
        # Derive a reasonable default key from project name.
        name_token = normalize_key(name)
        base_key = name_token[:6] if name_token else 'PRJ'

    if not base_key:
        base_key = 'PRJ'

    key = base_key
    suffix = 2
    while Project.objects.filter(key=key).exists():
        suffix_text = str(suffix)
        key = f"{base_key[:max(1, 10 - len(suffix_text))]}{suffix_text}"
        suffix += 1
        if suffix > 999:
            return Response({'error': 'Unable to generate unique project key'}, status=400)

    try:
        project = Project.objects.create(
            organization=request.user.organization,
            name=name,
            key=key,
            description=(request.data.get('description') or '').strip(),
            lead=request.user
        )
    except IntegrityError:
        return Response({'error': 'Project key already exists. Please try again.'}, status=400)
    
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
        _track_view_activity(
            request,
            project,
            project.name,
            project.description,
        )
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
        _track_view_activity(
            request,
            sprint,
            sprint.name,
            sprint.goal or '',
        )
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
                'issue_type': i.issue_type,
                'assignee': i.assignee.get_full_name() if i.assignee else None,
                'assignee_id': i.assignee_id,
                'story_points': i.story_points,
                'due_date': i.due_date.isoformat() if i.due_date else None,
            } for i in issues]
        })
    
    if request.method == 'PUT':
        if sprint.project_id and not has_project_permission(request.user, Permission.EDIT_SPRINT.value, sprint.project_id):
            return Response({'error': 'Permission denied for this project'}, status=403)
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
        if sprint.project_id and not has_project_permission(request.user, Permission.DELETE_SPRINT.value, sprint.project_id):
            return Response({'error': 'Permission denied for this project'}, status=403)
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
            'issue_type': i.issue_type,
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
    
    title = (request.data.get('title') or '').strip()
    if not title:
        return Response({'error': 'Title is required'}, status=400)
    if not has_project_permission(request.user, Permission.CREATE_ISSUE.value, project.id):
        return Response({'error': 'Permission denied for this project'}, status=403)

    board = project.boards.first()
    if not board:
        return Response({'error': 'No board found for project'}, status=400)

    column = board.columns.order_by('order').first()
    if not column:
        column = Column.objects.create(board=board, name='To Do', order=0)

    # Use max numeric suffix instead of count()+1 to avoid duplicate keys after deletions.
    prefix = f"{project.key}-"
    max_suffix = 0
    for existing_key in project.issues.filter(key__startswith=prefix).values_list('key', flat=True):
        suffix = existing_key[len(prefix):]
        if suffix.isdigit():
            max_suffix = max(max_suffix, int(suffix))
    issue_key = f"{project.key}-{max_suffix + 1}"

    def _optional_int(value, field_name):
        if value in (None, '', 'null'):
            return None
        try:
            return int(value)
        except (TypeError, ValueError):
            raise ValueError(f'{field_name} must be an integer')

    try:
        assignee_id = _optional_int(request.data.get('assignee_id'), 'assignee_id')
        sprint_id = _optional_int(request.data.get('sprint_id'), 'sprint_id')
        story_points = _optional_int(request.data.get('story_points'), 'story_points')
        parent_issue_id = _optional_int(request.data.get('parent_issue_id'), 'parent_issue_id')
    except ValueError as exc:
        return Response({'error': str(exc)}, status=400)

    if assignee_id and not User.objects.filter(id=assignee_id, organization=request.user.organization).exists():
        return Response({'error': 'Invalid assignee_id for this organization'}, status=400)

    if sprint_id and not Sprint.objects.filter(id=sprint_id, project=project).exists():
        return Response({'error': 'Invalid sprint_id for this project'}, status=400)

    if parent_issue_id and not Issue.objects.filter(id=parent_issue_id, project=project).exists():
        return Response({'error': 'Invalid parent_issue_id for this project'}, status=400)

    try:
        issue = Issue.objects.create(
            organization=request.user.organization,
            project=project,
            board=board,
            column=column,
            key=issue_key,
            title=title,
            description=request.data.get('description', ''),
            priority=request.data.get('priority', 'medium'),
            status='todo',
            reporter=request.user,
            assignee_id=assignee_id,
            story_points=story_points,
            issue_type=request.data.get('issue_type', 'task'),
            sprint_id=sprint_id,
            due_date=request.data.get('due_date'),
            parent_issue_id=parent_issue_id
        )
    except Exception as exc:
        return Response({'error': str(exc)}, status=400)

    return Response({'id': issue.id, 'key': issue.key, 'title': issue.title})

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def issue_detail(request, issue_id):
    """Get, update, or delete issue"""
    if not hasattr(request.user, 'organization') or not request.user.organization:
        return Response({'error': 'User does not have an organization'}, status=400)
    
    issue = _resolve_issue_by_ref(request.user.organization, issue_id)
    if not issue:
        return Response({'error': 'Issue not found'}, status=404)
    if request.method == 'GET':
        try:
            _track_view_activity(
                request,
                issue,
                issue.title,
                issue.description,
            )
            comments = issue.comments.all()
            time_estimate = None
            if hasattr(issue, 'time_estimate') and issue.time_estimate:
                time_estimate = {
                    'original_estimate_minutes': issue.time_estimate.original_estimate_minutes,
                    'remaining_estimate_minutes': issue.time_estimate.remaining_estimate_minutes,
                }
            try:
                is_watching = issue.watchers.filter(id=request.user.id).exists()
                watchers_count = issue.watchers.count()
            except Exception:
                is_watching = False
                watchers_count = 0

            return Response({
                'id': issue.id,
                'key': issue.key,
                'title': issue.title,
                'description': issue.description,
                'status': issue.status,
                'priority': issue.priority,
                'issue_type': issue.issue_type,
                'assignee': issue.assignee.get_full_name() if issue.assignee else None,
                'assignee_id': issue.assignee_id,
                'assignee_name': issue.assignee.get_full_name() if issue.assignee else None,
                'reporter': issue.reporter.get_full_name() if issue.reporter else None,
                'reporter_name': issue.reporter.get_full_name() if issue.reporter else None,
                'story_points': issue.story_points,
                'sprint_id': issue.sprint_id,
                'sprint_name': issue.sprint.name if issue.sprint else None,
                'project_id': issue.project.id if issue.project_id else None,
                'due_date': issue.due_date.isoformat() if issue.due_date else None,
                'created_at': issue.created_at.isoformat() if issue.created_at else None,
                'updated_at': issue.updated_at.isoformat() if issue.updated_at else None,
                'labels': [l.name for l in issue.labels.all()],
                'code_review_status': issue.code_review_status,
                'pr_url': issue.pr_url,
                'branch_name': issue.branch_name,
                'commit_hash': issue.commit_hash,
                'ci_status': issue.ci_status,
                'ci_url': issue.ci_url,
                'test_coverage': issue.test_coverage,
                'is_watching': is_watching,
                'watchers_count': watchers_count,
                'time_estimate': time_estimate,
                'comments': [{
                    'id': c.id,
                    'author': c.author.get_full_name() if getattr(c, 'author', None) else 'Unknown',
                    'content': c.content,
                    'created_at': c.created_at.isoformat() if c.created_at else None
                } for c in comments]
            })
        except Exception as exc:
            return Response({'error': f'Issue load failed: {str(exc)}'}, status=500)
    
    if request.method == 'PUT':
        if not has_project_permission(request.user, Permission.EDIT_ISSUE.value, issue.project_id):
            return Response({'error': 'Permission denied for this project'}, status=403)
        old_status = issue.status
        transition = None
        transition_comment = (request.data.get('transition_comment') or request.data.get('comment') or '').strip()

        if 'status' in request.data and request.data['status'] != issue.status:
            target_status = request.data['status']
            transitions = WorkflowTransition.objects.filter(
                organization=request.user.organization,
                from_status=issue.status,
                to_status=target_status
            ).filter(Q(issue_type=issue.issue_type) | Q(issue_type=''))

            if not transitions.exists():
                return Response({
                    'error': f'Cannot transition from {issue.status} to {target_status}',
                    'valid': False,
                }, status=400)

            transition = transitions.first()
            errors = []

            next_assignee_id = request.data.get('assignee_id', issue.assignee_id)
            next_story_points = request.data.get('story_points', issue.story_points)

            if transition.requires_assignee and not next_assignee_id:
                errors.append('Issue must be assigned')
            if transition.requires_story_points and not next_story_points:
                errors.append('Issue must have story points')
            if transition.requires_comment and not transition_comment:
                errors.append('Transition comment is required')

            if errors:
                return Response({'valid': False, 'errors': errors}, status=400)

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
        if transition and issue.status != old_status:
            if transition_comment:
                IssueComment.objects.create(
                    issue=issue,
                    author=request.user,
                    content=f"[Transition {old_status} -> {issue.status}] {transition_comment}",
                )
            AuditLog.log(
                organization=request.user.organization,
                user=request.user,
                action='update',
                resource_type='issue_status_transition',
                resource_id=issue.id,
                details={
                    'issue_key': issue.key,
                    'from_status': old_status,
                    'to_status': issue.status,
                    'transition_id': transition.id,
                    'requires_comment': transition.requires_comment,
                    'comment_provided': bool(transition_comment),
                },
                request=request,
            )
        return Response({
            'message': 'Issue updated',
            'id': issue.id,
            'sprint_id': issue.sprint_id,
            'status': issue.status
        })
    
    if request.method == 'DELETE':
        if not has_project_permission(request.user, Permission.DELETE_ISSUE.value, issue.project_id):
            return Response({'error': 'Permission denied for this project'}, status=403)
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
    if not has_project_permission(request.user, Permission.EDIT_ISSUE.value, issue.project_id):
        return Response({'error': 'Permission denied for this project'}, status=403)
    
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

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def backlog(request, project_id):
    """Get or add issues to backlog"""
    if not hasattr(request.user, 'organization') or not request.user.organization:
        return Response({'error': 'User does not have an organization'}, status=400)
    
    try:
        project = Project.objects.get(id=project_id, organization=request.user.organization)
    except Project.DoesNotExist:
        return Response({'error': 'Project not found'}, status=404)
    
    if request.method == 'GET':
        issues = project.issues.filter(in_backlog=True, sprint__isnull=True).select_related('assignee').order_by('-created_at')
        return Response({
            'project_id': project.id,
            'issue_count': issues.count(),
            'issues': [{
                'id': i.id,
                'key': i.key,
                'title': i.title,
                'description': i.description,
                'status': i.status,
                'priority': i.priority,
                'issue_type': i.issue_type,
                'assignee': i.assignee.get_full_name() if i.assignee else None,
                'assignee_id': i.assignee_id,
                'assignee_name': i.assignee.get_full_name() if i.assignee else None,
                'story_points': i.story_points,
                'created_at': i.created_at.isoformat(),
            } for i in issues]
        })
    
    issue_id = request.data.get('issue_id')
    if not issue_id:
        return Response({'error': 'issue_id required'}, status=400)
    
    try:
        issue = Issue.objects.get(id=issue_id, project=project)
        if not has_project_permission(request.user, Permission.EDIT_ISSUE.value, project.id):
            return Response({'error': 'Permission denied for this project'}, status=403)
        issue.in_backlog = True
        issue.sprint = None
        issue.save()
        return Response({'message': 'Issue added to backlog'})
    except Issue.DoesNotExist:
        return Response({'error': 'Issue not found'}, status=404)

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
    if sprint.project_id and not has_project_permission(request.user, Permission.EDIT_SPRINT.value, sprint.project_id):
        return Response({'error': 'Permission denied for this project'}, status=403)
    
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
        if blocker.sprint and blocker.sprint.project_id and not has_project_permission(request.user, Permission.EDIT_SPRINT.value, blocker.sprint.project_id):
            return Response({'error': 'Permission denied for this project'}, status=403)
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
    if sprint.project_id and not has_project_permission(request.user, Permission.EDIT_SPRINT.value, sprint.project_id):
        return Response({'error': 'Permission denied for this project'}, status=403)
    
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
    # Prefer explicit active status (source of truth in project/sprint management UI),
    # then fall back to date-window active sprint for older data.
    sprint = Sprint.objects.filter(
        organization=request.user.organization,
        status='active'
    ).order_by('-start_date').first()

    if not sprint:
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
def sprint_decision_analysis(request, sprint_id):
    """Get decision impact analysis for sprint"""
    if not hasattr(request.user, 'organization') or not request.user.organization:
        return Response({'error': 'User does not have an organization'}, status=400)
    
    try:
        sprint = Sprint.objects.get(id=sprint_id, organization=request.user.organization)
    except Sprint.DoesNotExist:
        return Response({'error': 'Sprint not found'}, status=404)
    
    impacts = DecisionImpact.objects.filter(sprint=sprint).select_related('decision', 'issue')
    
    total_effort_added = sum(i.estimated_effort_change for i in impacts if i.estimated_effort_change > 0)
    total_effort_removed = sum(abs(i.estimated_effort_change) for i in impacts if i.estimated_effort_change < 0)
    blocked_issues = impacts.filter(impact_type='blocks').count()
    enabled_issues = impacts.filter(impact_type='enables').count()
    
    return Response({
        'sprint_id': sprint.id,
        'sprint_name': sprint.name,
        'total_effort_added': total_effort_added,
        'total_effort_removed': total_effort_removed,
        'blocked_issues': blocked_issues,
        'enabled_issues': enabled_issues,
        'decisions_impacting_sprint': impacts.values('decision').distinct().count()
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def sprint_autopilot(request, sprint_id):
    """Decision-coupled sprint autopilot: score + scope swap suggestions."""
    if not hasattr(request.user, 'organization') or not request.user.organization:
        return Response({'error': 'User does not have an organization'}, status=400)

    try:
        sprint = Sprint.objects.get(id=sprint_id, organization=request.user.organization)
    except Sprint.DoesNotExist:
        return Response({'error': 'Sprint not found'}, status=404)
    if sprint.project_id and not has_project_permission(request.user, Permission.EDIT_SPRINT.value, sprint.project_id):
        return Response({'error': 'Permission denied for this project'}, status=403)

    today = timezone.now().date()
    total_days = max(1, (sprint.end_date - sprint.start_date).days + 1)
    elapsed_days = max(0, min(total_days, (today - sprint.start_date).days + 1))
    progress_time = elapsed_days / total_days

    issues = list(sprint.issues.all().select_related('assignee', 'reporter'))
    total_issues = len(issues)
    done_issues = [i for i in issues if i.status == 'done']
    in_progress_issues = [i for i in issues if i.status in ['in_progress', 'in_review', 'testing']]
    todo_issues = [i for i in issues if i.status in ['todo', 'backlog']]
    completion_ratio = (len(done_issues) / total_issues) if total_issues else 0.0

    blockers_count = Blocker.objects.filter(
        organization=request.user.organization,
        sprint=sprint,
        status='active'
    ).count()

    sprint_decisions = Decision.objects.filter(
        organization=request.user.organization,
        sprint=sprint
    )
    unresolved_decisions = sprint_decisions.filter(
        Q(status__in=['proposed', 'under_review', 'approved']) |
        Q(status='implemented', review_completed_at__isnull=True)
    )
    unresolved_count = unresolved_decisions.count()

    decision_impacts = list(
        DecisionImpact.objects.filter(organization=request.user.organization, sprint=sprint)
        .select_related('issue', 'decision')
    )
    issue_exposure = {}
    for impact in decision_impacts:
        issue_id = impact.issue_id
        if issue_id not in issue_exposure:
            issue_exposure[issue_id] = 0.0
        weight = 1.8 if impact.impact_type in ['blocks', 'delays'] else 1.1 if impact.impact_type == 'changes' else 0.7
        issue_exposure[issue_id] += weight
        if impact.decision and impact.decision.review_completed_at is None:
            issue_exposure[issue_id] += 0.7

    # Goal probability model (0-100): progress vs time + operational risk penalties.
    base_probability = 55.0
    base_probability += (completion_ratio - progress_time) * 60.0
    base_probability -= min(20.0, len(in_progress_issues) * 2.5)
    base_probability -= min(22.0, unresolved_count * 4.0)
    base_probability -= min(15.0, blockers_count * 5.0)
    goal_probability = max(3.0, min(98.0, base_probability))

    risks = []
    if completion_ratio + 0.15 < progress_time:
        risks.append('Delivery pace is behind elapsed sprint time')
    if unresolved_count > 0:
        risks.append(f'{unresolved_count} unresolved decisions may affect execution')
    if blockers_count > 0:
        risks.append(f'{blockers_count} active blockers are reducing sprint predictability')
    if len(in_progress_issues) > max(3, total_issues // 2):
        risks.append('High in-progress load indicates potential WIP bottleneck')

    heatmap = []
    for issue in issues:
        exposure = issue_exposure.get(issue.id, 0.0)
        score = min(100, int(exposure * 22))
        if issue.status in ['in_progress', 'in_review', 'testing']:
            score = min(100, score + 10)
        heatmap.append({
            'issue_id': issue.id,
            'key': issue.key,
            'title': issue.title,
            'status': issue.status,
            'decision_exposure_score': score,
        })
    heatmap.sort(key=lambda row: row['decision_exposure_score'], reverse=True)

    drop_candidates = []
    for issue in todo_issues + in_progress_issues:
        exposure = issue_exposure.get(issue.id, 0.0)
        priority_weight = {'highest': 0, 'high': 1, 'medium': 2, 'low': 3, 'lowest': 4}.get(issue.priority or 'medium', 2)
        candidate_score = (exposure * 1.9) + (priority_weight * 0.8)
        if issue.status in ['in_progress', 'in_review', 'testing']:
            candidate_score += 0.8
        drop_candidates.append((issue, candidate_score))
    drop_candidates.sort(key=lambda row: row[1], reverse=True)

    backlog_candidates = list(
        Issue.objects.filter(
            organization=request.user.organization,
            project=sprint.project,
            sprint__isnull=True
        ).order_by('-priority', '-created_at')[:80]
    )
    add_candidates = []
    for issue in backlog_candidates:
        exposure = issue_exposure.get(issue.id, 0.0)
        priority_bonus = {'highest': 3.0, 'high': 2.2, 'medium': 1.2, 'low': 0.7, 'lowest': 0.3}.get(issue.priority or 'medium', 1.2)
        candidate_score = priority_bonus - (exposure * 1.5)
        add_candidates.append((issue, candidate_score))
    add_candidates.sort(key=lambda row: row[1], reverse=True)

    suggested_drops = []
    for issue, score in drop_candidates[:3]:
        suggested_drops.append({
            'issue_id': issue.id,
            'key': issue.key,
            'title': issue.title,
            'status': issue.status,
            'priority': issue.priority,
            'score': round(score, 2),
            'reason': 'High decision risk exposure with lower delivery value this sprint',
        })

    suggested_adds = []
    for issue, score in add_candidates[:3]:
        suggested_adds.append({
            'issue_id': issue.id,
            'key': issue.key,
            'title': issue.title,
            'status': issue.status,
            'priority': issue.priority,
            'score': round(score, 2),
            'reason': 'Lower decision dependency with higher projected sprint-fit value',
        })

    return Response({
        'sprint_id': sprint.id,
        'goal_probability': round(goal_probability, 1),
        'confidence_band': 'high' if goal_probability >= 75 else 'medium' if goal_probability >= 50 else 'low',
        'signals': {
            'completion_ratio': round(completion_ratio * 100, 1),
            'time_elapsed_ratio': round(progress_time * 100, 1),
            'unresolved_decisions': unresolved_count,
            'active_blockers': blockers_count,
            'in_progress_issues': len(in_progress_issues),
            'total_issues': total_issues,
        },
        'risks': risks[:6],
        'scope_swap': {
            'suggested_drops': suggested_drops,
            'suggested_adds': suggested_adds,
        },
        'decision_dependency_heatmap': heatmap[:10],
    })


def _evaluate_goal_probability(completion_ratio, time_elapsed_ratio, in_progress_count, unresolved_count, blockers_count):
    score = 55.0
    score += (completion_ratio - time_elapsed_ratio) * 60.0
    score -= min(20.0, in_progress_count * 2.5)
    score -= min(22.0, unresolved_count * 4.0)
    score -= min(15.0, blockers_count * 5.0)
    return max(3.0, min(98.0, score))


def _confidence_from_probability(probability):
    if probability >= 75:
        return 'high'
    if probability >= 50:
        return 'medium'
    return 'low'


def _parse_decision_twin_policy(source):
    confidence_order = {'low': 1, 'medium': 2, 'high': 3}
    policy = {
        'min_confidence_band': str(source.get('min_confidence_band') or 'medium').lower(),
        'min_probability_delta': float(source.get('min_probability_delta') or 1.0),
        'max_scope_changes': int(source.get('max_scope_changes') or 4),
        'allow_backlog_adds': str(source.get('allow_backlog_adds') if source.get('allow_backlog_adds') is not None else 'true').lower() in ['1', 'true', 'yes'],
        'enforce_policy': str(source.get('enforce_policy') if source.get('enforce_policy') is not None else 'true').lower() in ['1', 'true', 'yes'],
    }
    if policy['min_confidence_band'] not in confidence_order:
        policy['min_confidence_band'] = 'medium'
    policy['min_probability_delta'] = max(-10.0, min(25.0, policy['min_probability_delta']))
    policy['max_scope_changes'] = max(0, min(20, policy['max_scope_changes']))
    return policy


def _evaluate_scenario_guardrails(scenario, policy):
    confidence_order = {'low': 1, 'medium': 2, 'high': 3}
    required_confidence = confidence_order.get(policy.get('min_confidence_band') or 'medium', 2)
    current_confidence = confidence_order.get(scenario.get('confidence_band') or 'low', 1)
    drops = len((scenario.get('plan') or {}).get('drop_issue_ids') or [])
    adds = len((scenario.get('plan') or {}).get('add_issue_ids') or [])
    scope_changes = drops + adds
    delta = float(scenario.get('delta_vs_baseline') or 0.0)
    violations = []
    if current_confidence < required_confidence:
        violations.append(f"Confidence {scenario.get('confidence_band')} below policy minimum {policy.get('min_confidence_band')}")
    if delta < float(policy.get('min_probability_delta') or 0.0):
        violations.append(f"Projected uplift {delta} below minimum {policy.get('min_probability_delta')}")
    if scope_changes > int(policy.get('max_scope_changes') or 0):
        violations.append(f"Scope changes {scope_changes} exceed max {policy.get('max_scope_changes')}")
    if not bool(policy.get('allow_backlog_adds', True)) and adds > 0:
        violations.append('Backlog adds are disallowed by policy')
    return {
        'auto_apply_eligible': len(violations) == 0,
        'violations': violations,
        'scope_changes': scope_changes,
        'drops': drops,
        'adds': adds,
    }


def _build_decision_twin_payload(user, sprint, policy):
    today = timezone.now().date()
    total_days = max(1, (sprint.end_date - sprint.start_date).days + 1)
    elapsed_days = max(0, min(total_days, (today - sprint.start_date).days + 1))
    time_elapsed_ratio = elapsed_days / total_days

    issues = list(sprint.issues.all().select_related('assignee', 'reporter'))
    total_issues = len(issues)
    done_issues = [i for i in issues if i.status == 'done']
    in_progress_issues = [i for i in issues if i.status in ['in_progress', 'in_review', 'testing']]
    active_issues = [i for i in issues if i.status in ['todo', 'backlog', 'in_progress', 'in_review', 'testing']]
    completion_ratio = (len(done_issues) / total_issues) if total_issues else 0.0

    blockers_count = Blocker.objects.filter(
        organization=user.organization,
        sprint=sprint,
        status='active'
    ).count()

    unresolved_count = Decision.objects.filter(
        organization=user.organization,
        sprint=sprint
    ).filter(
        Q(status__in=['proposed', 'under_review', 'approved']) |
        Q(status='implemented', review_completed_at__isnull=True)
    ).count()

    decision_impacts = list(
        DecisionImpact.objects.filter(organization=user.organization, sprint=sprint)
        .select_related('issue', 'decision')
    )
    issue_exposure = {}
    for impact in decision_impacts:
        issue_id = impact.issue_id
        if issue_id not in issue_exposure:
            issue_exposure[issue_id] = 0.0
        weight = 1.8 if impact.impact_type in ['blocks', 'delays'] else 1.1 if impact.impact_type == 'changes' else 0.7
        issue_exposure[issue_id] += weight
        if impact.decision and impact.decision.review_completed_at is None:
            issue_exposure[issue_id] += 0.7

    drop_candidates = []
    for issue in active_issues:
        exposure = issue_exposure.get(issue.id, 0.0)
        priority_weight = {'highest': 0, 'high': 1, 'medium': 2, 'low': 3, 'lowest': 4}.get(issue.priority or 'medium', 2)
        score = (exposure * 1.9) + (priority_weight * 0.8)
        if issue.status in ['in_progress', 'in_review', 'testing']:
            score += 0.8
        drop_candidates.append((issue, score))
    drop_candidates.sort(key=lambda row: row[1], reverse=True)

    backlog_candidates = list(
        Issue.objects.filter(
            organization=user.organization,
            project=sprint.project,
            sprint__isnull=True
        ).order_by('-priority', '-created_at')[:80]
    )
    add_candidates = []
    for issue in backlog_candidates:
        exposure = issue_exposure.get(issue.id, 0.0)
        priority_bonus = {'highest': 3.0, 'high': 2.2, 'medium': 1.2, 'low': 0.7, 'lowest': 0.3}.get(issue.priority or 'medium', 1.2)
        score = priority_bonus - (exposure * 1.5)
        add_candidates.append((issue, score))
    add_candidates.sort(key=lambda row: row[1], reverse=True)

    baseline_probability = _evaluate_goal_probability(
        completion_ratio=completion_ratio,
        time_elapsed_ratio=time_elapsed_ratio,
        in_progress_count=len(in_progress_issues),
        unresolved_count=unresolved_count,
        blockers_count=blockers_count,
    )

    def to_preview_rows(pairs):
        rows = []
        for issue, score in pairs:
            rows.append({
                'issue_id': issue.id,
                'key': issue.key,
                'title': issue.title,
                'status': issue.status,
                'priority': issue.priority,
                'score': round(score, 2),
            })
        return rows

    baseline = {
        'id': 'baseline',
        'name': 'Baseline Plan',
        'summary': 'Keep current sprint scope and execution order.',
        'projected_goal_probability': round(baseline_probability, 1),
        'delta_vs_baseline': 0.0,
        'confidence_band': _confidence_from_probability(baseline_probability),
        'tradeoffs': ['No scope churn', 'Decision risk remains unchanged'],
        'evidence': [
            f'Completion {round(completion_ratio * 100, 1)}% vs time elapsed {round(time_elapsed_ratio * 100, 1)}%',
            f'{unresolved_count} unresolved decisions and {blockers_count} active blockers currently open',
        ],
        'plan': {'drop_issue_ids': [], 'add_issue_ids': [], 'create_decision_followups': False},
        'preview': {'drops': [], 'adds': []},
    }

    swap_drop_pairs = drop_candidates[:2]
    swap_add_pairs = add_candidates[:2]
    swap_drop_ids = [issue.id for issue, _ in swap_drop_pairs]
    swap_add_ids = [issue.id for issue, _ in swap_add_pairs]
    swap_exposure_reduction = sum(issue_exposure.get(issue.id, 0.0) for issue, _ in swap_drop_pairs)
    swap_probability = _evaluate_goal_probability(
        completion_ratio=completion_ratio,
        time_elapsed_ratio=time_elapsed_ratio,
        in_progress_count=max(0, len(in_progress_issues) - len([i for i, _ in swap_drop_pairs if i.status in ['in_progress', 'in_review', 'testing']])),
        unresolved_count=max(0, int(round(unresolved_count - min(unresolved_count, swap_exposure_reduction / 2.6)))),
        blockers_count=max(0, blockers_count - (1 if swap_exposure_reduction >= 2.0 else 0)),
    )
    scope_swap = {
        'id': 'scope_swap',
        'name': 'Scope Swap',
        'summary': 'Drop decision-heavy items and add low-dependency backlog work.',
        'projected_goal_probability': round(swap_probability, 1),
        'delta_vs_baseline': round(swap_probability - baseline_probability, 1),
        'confidence_band': _confidence_from_probability(swap_probability),
        'tradeoffs': ['Reduces decision risk quickly', 'May defer strategically important work'],
        'evidence': [
            f'Removes {len(swap_drop_ids)} high-exposure issues and introduces {len(swap_add_ids)} lower-risk issues',
            f'Estimated decision exposure reduction: {round(swap_exposure_reduction, 1)} points',
        ],
        'plan': {
            'drop_issue_ids': swap_drop_ids,
            'add_issue_ids': swap_add_ids,
            'create_decision_followups': True,
        },
        'preview': {
            'drops': to_preview_rows(swap_drop_pairs),
            'adds': to_preview_rows(swap_add_pairs),
        },
    }

    focus_drop_pairs = drop_candidates[:3]
    focus_drop_ids = [issue.id for issue, _ in focus_drop_pairs]
    focus_exposure_reduction = sum(issue_exposure.get(issue.id, 0.0) for issue, _ in focus_drop_pairs)
    focus_probability = _evaluate_goal_probability(
        completion_ratio=completion_ratio,
        time_elapsed_ratio=time_elapsed_ratio,
        in_progress_count=max(0, len(in_progress_issues) - len([i for i, _ in focus_drop_pairs if i.status in ['in_progress', 'in_review', 'testing']])),
        unresolved_count=max(0, int(round(unresolved_count - min(unresolved_count, focus_exposure_reduction / 2.0)))),
        blockers_count=max(0, blockers_count - (1 if focus_exposure_reduction >= 2.5 else 0)),
    )
    focus_mode = {
        'id': 'focus_mode',
        'name': 'Focus Mode',
        'summary': 'De-scope non-critical work to maximize delivery certainty.',
        'projected_goal_probability': round(focus_probability, 1),
        'delta_vs_baseline': round(focus_probability - baseline_probability, 1),
        'confidence_band': _confidence_from_probability(focus_probability),
        'tradeoffs': ['Fastest path to sprint completion', 'Lower breadth of delivered scope'],
        'evidence': [
            f'Reduces active WIP by up to {len(focus_drop_ids)} issues',
            f'Projected blocker/decision pressure reduction from de-scoping high-exposure items',
        ],
        'plan': {
            'drop_issue_ids': focus_drop_ids,
            'add_issue_ids': [],
            'create_decision_followups': True,
        },
        'preview': {
            'drops': to_preview_rows(focus_drop_pairs),
            'adds': [],
        },
    }

    scenarios = [baseline, scope_swap, focus_mode]
    eligible_scenarios = []
    for scenario in scenarios:
        policy_result = _evaluate_scenario_guardrails(scenario, policy)
        scenario['policy_result'] = policy_result
        if policy_result['auto_apply_eligible']:
            eligible_scenarios.append(scenario)
    scenarios.sort(key=lambda item: item['projected_goal_probability'], reverse=True)
    recommended = scenarios[0] if scenarios else baseline
    recommended_auto_apply = sorted(eligible_scenarios, key=lambda item: item['projected_goal_probability'], reverse=True)[0] if eligible_scenarios else None

    return {
        'sprint_id': sprint.id,
        'objective': 'Maximize sprint goal probability while controlling decision risk.',
        'generated_at': timezone.now().isoformat(),
        'signals': {
            'completion_ratio': round(completion_ratio * 100, 1),
            'time_elapsed_ratio': round(time_elapsed_ratio * 100, 1),
            'unresolved_decisions': unresolved_count,
            'active_blockers': blockers_count,
            'in_progress_issues': len(in_progress_issues),
            'total_issues': total_issues,
        },
        'recommended_scenario_id': recommended['id'],
        'recommended_auto_apply_scenario_id': recommended_auto_apply['id'] if recommended_auto_apply else None,
        'policy': policy,
        'scenarios': scenarios,
        'explainability': {
            'model_version': 'decision_twin_v1',
            'assumptions': [
                'Higher unresolved decision load lowers execution predictability.',
                'High WIP lowers throughput and increases context switching risk.',
                'Lower-dependency backlog items are safer substitutes under schedule pressure.',
            ],
        },
    }


def _apply_scope_swap_plan(user, sprint, drop_issue_ids, add_issue_ids, create_decision_followups, source_label):
    dropped = []
    for issue in Issue.objects.filter(organization=user.organization, sprint=sprint, id__in=drop_issue_ids):
        issue.sprint = None
        issue.in_backlog = True
        if issue.status != 'done':
            issue.status = 'backlog'
        issue.save()
        dropped.append({'issue_id': issue.id, 'key': issue.key, 'title': issue.title})

    added = []
    for issue in Issue.objects.filter(
        organization=user.organization,
        project=sprint.project,
        sprint__isnull=True,
        id__in=add_issue_ids
    ):
        issue.sprint = sprint
        issue.in_backlog = False
        if issue.status == 'backlog':
            issue.status = 'todo'
        issue.save()
        added.append({'issue_id': issue.id, 'key': issue.key, 'title': issue.title})

    created_followups = []
    if create_decision_followups:
        from apps.business.models import Task
        from apps.notifications.utils import create_notification

        unresolved = Decision.objects.filter(
            organization=user.organization,
            sprint=sprint
        ).filter(
            Q(status__in=['proposed', 'under_review', 'approved']) |
            Q(status='implemented', review_completed_at__isnull=True)
        )[:5]

        for decision in unresolved:
            title = f"{source_label}: resolve decision #{decision.id}"
            if Task.objects.filter(organization=user.organization, decision=decision, title=title).exists():
                continue
            task = Task.objects.create(
                organization=user.organization,
                title=title,
                description=(
                    f"Auto-created while applying {source_label.lower()} plan for sprint '{sprint.name}'.\n\n"
                    f"Decision: {decision.title}\n"
                    f"Status: {decision.status}\n"
                    f"Action: provide resolution or updated outcome review."
                ),
                status='todo',
                priority='high' if decision.impact_level in ['high', 'critical'] else 'medium',
                assigned_to=decision.decision_maker,
                decision=decision,
                due_date=min(sprint.end_date, timezone.now().date() + timedelta(days=5)),
            )
            created_followups.append({'task_id': task.id, 'title': task.title, 'decision_id': decision.id})
            if decision.decision_maker and decision.decision_maker != user:
                create_notification(
                    user=decision.decision_maker,
                    notification_type='task',
                    title=f'{source_label} follow-up assigned',
                    message=f'Resolve decision "{decision.title}" for sprint "{sprint.name}"',
                    link='/business/tasks'
                )

    return {
        'dropped': dropped,
        'added': added,
        'decision_followups': created_followups,
    }


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def apply_sprint_autopilot_plan(request, sprint_id):
    """Apply suggested scope swap and create decision follow-up tasks."""
    if not hasattr(request.user, 'organization') or not request.user.organization:
        return Response({'error': 'User does not have an organization'}, status=400)

    try:
        sprint = Sprint.objects.get(id=sprint_id, organization=request.user.organization)
    except Sprint.DoesNotExist:
        return Response({'error': 'Sprint not found'}, status=404)

    drop_issue_ids = request.data.get('drop_issue_ids') or []
    add_issue_ids = request.data.get('add_issue_ids') or []
    create_decision_followups = bool(request.data.get('create_decision_followups', True))

    if not isinstance(drop_issue_ids, list) or not isinstance(add_issue_ids, list):
        return Response({'error': 'drop_issue_ids and add_issue_ids must be arrays'}, status=400)

    drop_issue_ids = [int(i) for i in drop_issue_ids[:10] if str(i).isdigit()]
    add_issue_ids = [int(i) for i in add_issue_ids[:10] if str(i).isdigit()]

    results = _apply_scope_swap_plan(
        user=request.user,
        sprint=sprint,
        drop_issue_ids=drop_issue_ids,
        add_issue_ids=add_issue_ids,
        create_decision_followups=create_decision_followups,
        source_label='Sprint Autopilot',
    )

    return Response({
        'message': 'Autopilot plan applied',
        'dropped_count': len(results['dropped']),
        'added_count': len(results['added']),
        'followups_created': len(results['decision_followups']),
        'dropped': results['dropped'],
        'added': results['added'],
        'decision_followups': results['decision_followups'],
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def sprint_decision_twin(request, sprint_id):
    """Counterfactual scenario engine for sprint execution tradeoffs."""
    if not hasattr(request.user, 'organization') or not request.user.organization:
        return Response({'error': 'User does not have an organization'}, status=400)

    try:
        sprint = Sprint.objects.get(id=sprint_id, organization=request.user.organization)
    except Sprint.DoesNotExist:
        return Response({'error': 'Sprint not found'}, status=404)
    if sprint.project_id and not has_project_permission(request.user, Permission.EDIT_SPRINT.value, sprint.project_id):
        return Response({'error': 'Permission denied for this project'}, status=403)

    policy = _parse_decision_twin_policy(request.GET)
    return Response(_build_decision_twin_payload(request.user, sprint, policy))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def apply_sprint_decision_twin(request, sprint_id):
    """Apply selected counterfactual scenario generated by sprint_decision_twin."""
    if not hasattr(request.user, 'organization') or not request.user.organization:
        return Response({'error': 'User does not have an organization'}, status=400)

    try:
        sprint = Sprint.objects.get(id=sprint_id, organization=request.user.organization)
    except Sprint.DoesNotExist:
        return Response({'error': 'Sprint not found'}, status=404)
    if sprint.project_id and not has_project_permission(request.user, Permission.EDIT_SPRINT.value, sprint.project_id):
        return Response({'error': 'Permission denied for this project'}, status=403)

    policy = _parse_decision_twin_policy(request.data)
    auto_apply = bool(request.data.get('auto_apply', False))
    scenario_id = request.data.get('scenario_id')
    create_decision_followups = bool(request.data.get('create_decision_followups', True))
    drop_issue_ids = request.data.get('drop_issue_ids')
    add_issue_ids = request.data.get('add_issue_ids')

    if auto_apply:
        twin_payload = _build_decision_twin_payload(request.user, sprint, policy)
        scenario_id = twin_payload.get('recommended_auto_apply_scenario_id')
        if not scenario_id:
            return Response({'error': 'No auto-apply eligible scenario under current policy'}, status=400)

    selected = None
    if not isinstance(drop_issue_ids, list) or not isinstance(add_issue_ids, list):
        twin_payload = _build_decision_twin_payload(request.user, sprint, policy)
        scenario_map = {row['id']: row for row in twin_payload.get('scenarios', [])}
        selected = scenario_map.get(scenario_id) if scenario_id else None
        if not selected:
            selected = scenario_map.get(twin_payload.get('recommended_scenario_id'))
        if not selected:
            return Response({'error': 'No applicable decision twin scenario available'}, status=400)
        plan = selected.get('plan') or {}
        drop_issue_ids = plan.get('drop_issue_ids') or []
        add_issue_ids = plan.get('add_issue_ids') or []
        create_decision_followups = bool(plan.get('create_decision_followups', create_decision_followups))
        scenario_id = selected.get('id')

    if selected is None:
        twin_payload = _build_decision_twin_payload(request.user, sprint, policy)
        scenario_map = {row['id']: row for row in twin_payload.get('scenarios', [])}
        selected = scenario_map.get(scenario_id) if scenario_id else None
    if selected and bool(policy.get('enforce_policy', True)):
        policy_result = selected.get('policy_result') or _evaluate_scenario_guardrails(selected, policy)
        if not policy_result.get('auto_apply_eligible'):
            return Response({
                'error': 'Scenario violates decision twin policy',
                'policy_violations': policy_result.get('violations') or [],
            }, status=400)

    drop_issue_ids = [int(i) for i in (drop_issue_ids or [])[:10] if str(i).isdigit()]
    add_issue_ids = [int(i) for i in (add_issue_ids or [])[:10] if str(i).isdigit()]

    results = _apply_scope_swap_plan(
        user=request.user,
        sprint=sprint,
        drop_issue_ids=drop_issue_ids,
        add_issue_ids=add_issue_ids,
        create_decision_followups=create_decision_followups,
        source_label='Decision Twin',
    )

    return Response({
        'message': 'Decision twin scenario applied',
        'scenario_id': scenario_id,
        'policy': policy,
        'dropped_count': len(results['dropped']),
        'added_count': len(results['added']),
        'followups_created': len(results['decision_followups']),
        'dropped': results['dropped'],
        'added': results['added'],
        'decision_followups': results['decision_followups'],
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
