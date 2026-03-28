from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Count, Q, Prefetch
from datetime import timedelta
from apps.agile.models import (
    Sprint, Blocker, Retrospective, SprintUpdate, Issue, Project, 
    Board, Column, IssueComment, IssueLabel, DecisionIssueLink, 
    ConversationIssueLink, BlockerIssueLink, Backlog, WorkflowTransition,
    DecisionImpact, IssueDecisionHistory, SprintDecisionSummary
)
from apps.agile.serializers import (
    ProjectSerializer, SprintSerializer, IssueSerializer,
    BlockerSerializer, IssueCommentSerializer, IssueLabelSerializer,
    BacklogSerializer, WorkflowTransitionSerializer, DecisionImpactSerializer,
    IssueDecisionHistorySerializer, SprintDecisionSummarySerializer
)
from apps.agile.permissions import (
    IsOrgMember, CanDeleteProject, CanEditIssue, CanEditSprint
)
from apps.agile.ai_service import generate_sprint_update_summary
from apps.conversations.models import Conversation
from apps.decisions.models import Decision
from apps.organizations.models import User
import logging

logger = logging.getLogger(__name__)

def _check_org(request):
    if not hasattr(request.user, 'organization') or not request.user.organization:
        return None
    return request.user.organization


def _resolve_issue_by_ref(organization, issue_ref):
    """
    Resolve by DB id, exact issue key, then by unique key suffix (e.g. KEY-113 for ref=113).
    """
    ref = str(issue_ref).strip()
    if not ref:
        return None

    org_filter = Q(organization=organization) | Q(project__organization=organization)
    base_qs = Issue.objects.select_related('assignee', 'reporter', 'sprint', 'project').filter(org_filter)

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


def _apply_delay_shift(org, issue, decision, delay_days):
    """
    Apply a delay impact to issue due dates and record history for traceability.
    Propagates across related dependencies (parent/subtasks, blocker-linked issues,
    and issues linked by the same blocking/delaying decision).
    Returns number of issues shifted.
    """
    if delay_days <= 0:
        return 0

    today = timezone.now().date()
    visited_ids = set()
    queue = [(issue, 'Direct decision delay impact')]
    shifted_count = 0

    while queue:
        current_issue, reason = queue.pop(0)
        if current_issue.id in visited_ids:
            continue
        visited_ids.add(current_issue.id)

        if current_issue.status != 'done':
            old_due_date = current_issue.due_date
            base_due_date = old_due_date or (current_issue.sprint.end_date if current_issue.sprint else today)
            new_due_date = base_due_date + timedelta(days=delay_days)

            current_issue.due_date = new_due_date
            current_issue.save(update_fields=['due_date'])
            shifted_count += 1

            IssueDecisionHistory.objects.create(
                organization=org,
                issue=current_issue,
                decision=decision,
                change_type='status_changed',
                old_value=old_due_date.isoformat() if old_due_date else '',
                new_value=new_due_date.isoformat(),
                reason=f'{reason} (+{delay_days}d)',
            )

        neighbor_reasons = {}

        if current_issue.parent_issue_id:
            neighbor_reasons.setdefault(
                current_issue.parent_issue_id,
                f'Propagated from child dependency {current_issue.key}',
            )

        for subtask_id in current_issue.subtasks.exclude(status='done').values_list('id', flat=True):
            neighbor_reasons.setdefault(
                subtask_id,
                f'Inherited parent delay impact from issue {current_issue.key}',
            )

        blocker_ids = list(
            BlockerIssueLink.objects.filter(issue=current_issue).values_list('blocker_id', flat=True)
        )
        if blocker_ids:
            linked_issue_ids = BlockerIssueLink.objects.filter(
                blocker_id__in=blocker_ids,
                issue__organization=org,
            ).exclude(issue_id=current_issue.id).exclude(issue__status='done').values_list('issue_id', flat=True)
            for linked_issue_id in linked_issue_ids:
                neighbor_reasons.setdefault(
                    linked_issue_id,
                    f'Propagated through shared blocker from issue {current_issue.key}',
                )

        if decision:
            impacted_issue_ids = DecisionImpact.objects.filter(
                organization=org,
                decision=decision,
                impact_type__in=['blocks', 'delays'],
            ).exclude(issue_id=current_issue.id).exclude(issue__status='done').values_list('issue_id', flat=True)
            for impacted_issue_id in impacted_issue_ids:
                neighbor_reasons.setdefault(
                    impacted_issue_id,
                    f'Propagated through decision impact from issue {current_issue.key}',
                )

            linked_decision_issue_ids = DecisionIssueLink.objects.filter(
                decision=decision,
                impact_type='blocks',
                issue__organization=org,
            ).exclude(issue_id=current_issue.id).exclude(issue__status='done').values_list('issue_id', flat=True)
            for linked_decision_issue_id in linked_decision_issue_ids:
                neighbor_reasons.setdefault(
                    linked_decision_issue_id,
                    f'Propagated through decision link from issue {current_issue.key}',
                )

        if not neighbor_reasons:
            continue

        for related_issue in Issue.objects.filter(
            organization=org,
            id__in=list(neighbor_reasons.keys()),
        ).exclude(status='done').select_related('sprint'):
            if related_issue.id not in visited_ids:
                queue.append((related_issue, neighbor_reasons[related_issue.id]))

    return shifted_count

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated, IsOrgMember])
def projects(request):
    org = _check_org(request)
    if not org:
        return Response({'error': 'User does not have an organization'}, status=400)
    
    if request.method == 'GET':
        projects = Project.objects.filter(organization=org).select_related('lead')
        serializer = ProjectSerializer(projects, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        serializer = ProjectSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'error': serializer.errors}, status=400)
        
        # Auto-generate key from project name
        name = serializer.validated_data['name']
        base_key = ''.join(word[0].upper() for word in name.split()[:3])
        key = base_key
        counter = 1
        while Project.objects.filter(key=key).exists():
            key = f"{base_key}{counter}"
            counter += 1

        lead = request.user
        lead_ref = request.data.get('lead_id', request.data.get('lead'))
        if lead_ref not in (None, ''):
            lead = User.objects.filter(id=lead_ref, organization=org).first()
            if not lead:
                return Response({'error': 'Lead user not found in organization'}, status=400)
        
        try:
            project = Project.objects.create(
                organization=org,
                name=name,
                key=key,
                description=serializer.validated_data.get('description', ''),
                lead=lead
            )
            
            board = Board.objects.create(
                organization=org,
                project=project,
                name='Backlog',
                board_type='kanban'
            )
            
            for i, col_name in enumerate(['To Do', 'In Progress', 'In Review', 'Done']):
                Column.objects.create(board=board, name=col_name, order=i)
            
            return Response({
                'id': project.id,
                'name': project.name,
                'key': project.key,
                'board_id': board.id
            }, status=201)
        except Exception as e:
            return Response({'error': str(e)}, status=400)

@api_view(['GET', 'PUT', 'PATCH'])
@permission_classes([IsAuthenticated, IsOrgMember])
def project_detail(request, project_id):
    org = _check_org(request)
    if not org:
        return Response({'error': 'User does not have an organization'}, status=400)
    
    try:
        project = Project.objects.select_related('lead').get(id=project_id, organization=org)
    except Project.DoesNotExist:
        return Response({'error': 'Project not found'}, status=404)

    if request.method in ['PUT', 'PATCH']:
        if getattr(request.user, 'role', '') != 'admin' and project.lead_id != request.user.id:
            return Response({'error': 'Permission denied for this project'}, status=403)

        if 'name' in request.data:
            project.name = (request.data.get('name') or '').strip()

        if 'description' in request.data:
            project.description = request.data.get('description') or ''

        if 'lead_id' in request.data or 'lead' in request.data:
            lead_ref = request.data.get('lead_id', request.data.get('lead'))
            if lead_ref in (None, ''):
                project.lead = None
            else:
                lead = User.objects.filter(id=lead_ref, organization=org).first()
                if not lead:
                    return Response({'error': 'Lead user not found in organization'}, status=400)
                project.lead = lead

        if not project.name:
            return Response({'error': 'Project name is required'}, status=400)

        project.save()

    boards = project.boards.prefetch_related('columns__issues').all()
    sprints = project.sprints.all().order_by('-start_date')

    board_data = [{
        'id': b.id,
        'name': b.name,
        'type': b.board_type,
        'columns': [{
            'id': col.id,
            'name': col.name,
            'order': col.order,
            'issue_count': col.issues.count()
        } for col in b.columns.all()]
    } for b in boards]

    sprint_serializer = SprintSerializer(sprints, many=True)

    return Response({
        'id': project.id,
        'name': project.name,
        'key': project.key,
        'description': project.description,
        'lead': project.lead.get_full_name() if project.lead else None,
        'lead_id': project.lead_id,
        'lead_name': project.lead.get_full_name() if project.lead else None,
        'boards': board_data,
        'sprints': sprint_serializer.data,
        'issue_count': project.issues.count(),
        'sprint_count': project.sprints.count()
    })

@api_view(['DELETE'])
@permission_classes([IsAuthenticated, IsOrgMember, CanDeleteProject])
def delete_project(request, project_id):
    org = _check_org(request)
    if not org:
        return Response({'error': 'User does not have an organization'}, status=400)
    
    try:
        from django.db import connection
        from django.db.utils import ProgrammingError
        
        project = Project.objects.get(id=project_id, organization=org)
        project_name = project.name
        
        # Delete related data manually to avoid missing table errors
        with connection.cursor() as cursor:
            # Try to delete from tables that may not exist
            for table, column in [
                ('issue_templates', 'project_id'),
                ('releases', 'project_id'),
                ('components', 'project_id'),
            ]:
                try:
                    cursor.execute(f"DELETE FROM {table} WHERE {column} = %s", [project_id])
                except ProgrammingError:
                    logger.info("Skipping cleanup for missing table", extra={"table": table})
        
        # Delete DecisionImpacts
        DecisionImpact.objects.filter(issue__project=project).delete()
        
        # Delete the project
        project.delete()
        return Response({'message': f'Project {project_name} deleted successfully'})
    except Project.DoesNotExist:
        return Response({'error': 'Project not found'}, status=404)
    except Exception as e:
        return Response({'error': f'Failed to delete project: {str(e)}'}, status=500)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated, IsOrgMember])
def sprints(request, project_id):
    org = _check_org(request)
    if not org:
        return Response({'error': 'User does not have an organization'}, status=400)
    
    try:
        project = Project.objects.get(id=project_id, organization=org)
    except Project.DoesNotExist:
        return Response({'error': 'Project not found'}, status=404)
    
    if request.method == 'GET':
        sprints = project.sprints.filter(project__isnull=False).order_by('-start_date')
        serializer = SprintSerializer(sprints, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        serializer = SprintSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'error': serializer.errors}, status=400)
        
        try:
            start_date = serializer.validated_data.get('start_date', timezone.now().date())
            end_date = serializer.validated_data.get('end_date', (timezone.now() + timedelta(days=14)).date())
            
            sprint = Sprint.objects.create(
                organization=org,
                project=project,
                name=serializer.validated_data['name'],
                start_date=start_date,
                end_date=end_date,
                goal=serializer.validated_data.get('goal', '')
            )
            return Response(SprintSerializer(sprint).data, status=201)
        except Exception as e:
            return Response({'error': str(e)}, status=400)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated, IsOrgMember, CanEditSprint])
def sprint_detail(request, sprint_id):
    org = _check_org(request)
    if not org:
        return Response({'error': 'User does not have an organization'}, status=400)
    
    try:
        sprint = Sprint.objects.get(id=sprint_id, organization=org)
    except Sprint.DoesNotExist:
        return Response({'error': 'Sprint not found'}, status=404)
    
    if request.method == 'GET':
        issues = sprint.issues.select_related('assignee').all()
        return Response({
            'id': sprint.id,
            'name': sprint.name,
            'project_id': sprint.project.id,
            'project_name': sprint.project.name,
            'start_date': sprint.start_date,
            'end_date': sprint.end_date,
            'goal': sprint.goal,
            'status': sprint.status,
            'issue_count': issues.count(),
            'completed': issues.filter(status='done').count(),
            'in_progress': issues.filter(status='in_progress').count(),
            'todo': issues.filter(status='todo').count(),
            'blocked': sprint.blocked_count,
            'issues': IssueSerializer(issues, many=True).data
        })
    
    elif request.method == 'PUT':
        serializer = SprintSerializer(sprint, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response({'error': serializer.errors}, status=400)
        serializer.save()
        return Response({'message': 'Sprint updated'})
    
    elif request.method == 'DELETE':
        sprint.delete()
        return Response({'message': 'Sprint deleted'})

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated, IsOrgMember])
def issues(request, project_id):
    org = _check_org(request)
    if not org:
        return Response({'error': 'User does not have an organization'}, status=400)
    
    try:
        project = Project.objects.get(id=project_id, organization=org)
    except Project.DoesNotExist:
        return Response({'error': 'Project not found'}, status=404)
    
    if request.method == 'GET':
        issues = project.issues.select_related('assignee', 'reporter', 'sprint').prefetch_related('labels')
        
        if request.GET.get('status'):
            issues = issues.filter(status=request.GET['status'])
        if request.GET.get('assignee'):
            issues = issues.filter(assignee_id=request.GET['assignee'])
        if request.GET.get('sprint'):
            issues = issues.filter(sprint_id=request.GET['sprint'])
        
        serializer = IssueSerializer(issues, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        serializer = IssueSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'error': serializer.errors}, status=400)
        
        try:
            board = project.boards.first()
            if not board:
                return Response({'error': 'No board found'}, status=400)
            
            column = board.columns.first()
            issue_count = project.issues.count() + 1
            issue_key = f"{project.key}-{issue_count}"
            
            issue = Issue.objects.create(
                organization=org,
                project=project,
                board=board,
                column=column,
                key=issue_key,
                title=serializer.validated_data['title'],
                description=serializer.validated_data.get('description', ''),
                issue_type=serializer.validated_data.get('issue_type', 'task'),
                priority=serializer.validated_data.get('priority', 'medium'),
                status='todo',
                reporter=request.user,
                assignee_id=serializer.validated_data.get('assignee_id'),
                story_points=serializer.validated_data.get('story_points'),
                sprint_id=serializer.validated_data.get('sprint_id'),
                due_date=serializer.validated_data.get('due_date')
            )
            
            # Send notification if assigned
            if issue.assignee_id:
                from apps.notifications.models import Notification
                Notification.objects.create(
                    user_id=issue.assignee_id,
                    notification_type='issue_assigned',
                    title=f'Issue {issue.key} assigned to you',
                    message=f'{request.user.get_full_name() or request.user.username} assigned {issue.title} to you',
                    link=f'/issues/{issue.id}'
                )
            
            return Response(IssueSerializer(issue).data, status=201)
        except Exception as e:
            return Response({'error': str(e)}, status=400)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated, IsOrgMember, CanEditIssue])
def issue_detail(request, issue_id):
    org = _check_org(request)
    if not org:
        return Response({'error': 'User does not have an organization'}, status=400)
    
    issue = _resolve_issue_by_ref(org, issue_id)
    if not issue:
        return Response({'error': 'Issue not found'}, status=404)
    
    if request.method == 'GET':
        try:
            comments = issue.comments.select_related('author').all()
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
                'project_id': issue.project_id,
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
                'comments': [{
                    'id': c.id,
                    'author': c.author.get_full_name() if getattr(c, 'author', None) else 'Unknown',
                    'content': c.content,
                    'created_at': c.created_at.isoformat() if c.created_at else None
                } for c in comments]
            })
        except Exception as exc:
            return Response({'error': f'Issue load failed: {str(exc)}'}, status=500)
    
    elif request.method == 'PUT':
        old_assignee_id = issue.assignee_id
        serializer = IssueSerializer(issue, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response({'error': serializer.errors}, status=400)
        serializer.save()
        
        # Send notification if assignee changed
        new_assignee_id = issue.assignee_id
        if new_assignee_id and new_assignee_id != old_assignee_id:
            from apps.notifications.models import Notification
            Notification.objects.create(
                user_id=new_assignee_id,
                notification_type='issue_assigned',
                title=f'Issue {issue.key} assigned to you',
                message=f'{request.user.get_full_name() or request.user.username} assigned {issue.title} to you',
                link=f'/issues/{issue.id}'
            )
        
        return Response({'message': 'Issue updated', 'sprint_id': issue.sprint_id})
    
    elif request.method == 'DELETE':
        issue.delete()
        return Response({'message': 'Issue deleted'})

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsOrgMember])
def move_issue(request, issue_id):
    org = _check_org(request)
    if not org:
        return Response({'error': 'User does not have an organization'}, status=400)
    
    try:
        issue = Issue.objects.get(id=issue_id, organization=org)
        column = Column.objects.get(id=request.data['column_id'], board__organization=org)
        if issue.board_id != column.board_id:
            return Response({'error': 'Column must belong to the issue board'}, status=400)
        
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
@permission_classes([IsAuthenticated, IsOrgMember])
def add_comment(request, issue_id):
    org = _check_org(request)
    if not org:
        return Response({'error': 'User does not have an organization'}, status=400)
    
    try:
        issue = Issue.objects.get(id=issue_id, organization=org)
        if not request.data.get('content'):
            return Response({'error': 'content required'}, status=400)
        
        comment = IssueComment.objects.create(
            issue=issue,
            author=request.user,
            content=request.data['content']
        )

        # Notify issue participants about new comment activity.
        try:
            from apps.notifications.models import Notification

            recipients = set(issue.watchers.exclude(id=request.user.id).values_list('id', flat=True))
            if issue.assignee_id and issue.assignee_id != request.user.id:
                recipients.add(issue.assignee_id)
            if issue.reporter_id and issue.reporter_id != request.user.id:
                recipients.add(issue.reporter_id)

            actor = request.user.get_full_name() or request.user.username
            for user_id in recipients:
                Notification.objects.create(
                    user_id=user_id,
                    notification_type='reply',
                    title=f'New comment on {issue.key}',
                    message=f'{actor} commented on "{issue.title}"',
                    link=f'/issues/{issue.id}',
                )
        except Exception:
            logger.exception(
                "Failed to send issue comment notifications",
                extra={"issue_id": issue.id, "actor_id": request.user.id},
            )

        return Response(IssueCommentSerializer(comment).data, status=201)
    except Issue.DoesNotExist:
        return Response({'error': 'Issue not found'}, status=404)

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsOrgMember])
def current_sprint_summary(request):
    org = _check_org(request)
    if not org:
        return Response({'error': 'User does not have an organization'}, status=400)
    
    try:
        today = timezone.now().date()
        sprint = Sprint.objects.filter(
            organization=org,
            status='active',
        ).select_related('project').prefetch_related('issues', 'blockers').order_by('-start_date').first()

        if not sprint:
            sprint = Sprint.objects.filter(
                organization=org,
                start_date__lte=today,
                end_date__gte=today
            ).select_related('project').prefetch_related('issues', 'blockers').order_by('-start_date').first()
        
        if not sprint:
            return Response(None)
        
        issues = sprint.issues.all()
        blockers = sprint.blockers.filter(status='active')
        decisions = Decision.objects.filter(
            organization=org,
            created_at__date__gte=sprint.start_date,
            created_at__date__lte=sprint.end_date
        )
        
        completed = issues.filter(status='done').count()
        return Response({
            'id': sprint.id,
            'name': sprint.name,
            'project_id': sprint.project.id if sprint.project else None,
            'project_name': sprint.project.name if sprint.project else None,
            'start_date': sprint.start_date,
            'end_date': sprint.end_date,
            'goal': sprint.goal,
            'days_remaining': max(0, (sprint.end_date - today).days),
            'issue_count': issues.count(),
            'completed': completed,
            'in_progress': issues.filter(status='in_progress').count(),
            'todo': issues.filter(status='todo').count(),
            'blockers': [{
                'id': b.id,
                'title': b.title,
                'type': b.blocker_type,
                'days_open': (today - b.created_at.date()).days
            } for b in blockers[:5]],
            'blocker_count': blockers.count(),
            'decisions_made': decisions.count()
        })
    except Exception as e:
        return Response({'error': str(e)}, status=500)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated, IsOrgMember])
def blockers(request):
    org = _check_org(request)
    if not org:
        return Response({'error': 'User does not have an organization'}, status=400)
    
    if request.method == 'GET':
        sprint_id = request.GET.get('sprint_id')
        blockers = Blocker.objects.filter(organization=org).select_related('sprint', 'blocked_by', 'assigned_to')
        
        if sprint_id:
            blockers = blockers.filter(sprint_id=sprint_id)
        else:
            blockers = blockers.filter(status='active')
        
        serializer = BlockerSerializer(blockers, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        serializer = BlockerSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'error': serializer.errors}, status=400)
        
        try:
            sprint_id = serializer.validated_data.get('sprint_id')
            if not sprint_id:
                return Response({'error': 'sprint_id required'}, status=400)
            
            sprint = Sprint.objects.get(id=sprint_id, organization=org)
            
            conversation = Conversation.objects.create(
                organization=org,
                author=request.user,
                title=serializer.validated_data['title'],
                content=serializer.validated_data.get('description', ''),
                post_type='blocker'
            )
            
            blocker = Blocker.objects.create(
                organization=org,
                conversation=conversation,
                sprint=sprint,
                title=serializer.validated_data['title'],
                description=serializer.validated_data.get('description', ''),
                blocker_type=serializer.validated_data.get('blocker_type', 'technical'),
                blocked_by=request.user,
                ticket_url=serializer.validated_data.get('ticket_url', '')
            )
            return Response(BlockerSerializer(blocker).data, status=201)
        except Sprint.DoesNotExist:
            return Response({'error': 'Sprint not found'}, status=404)
        except Exception as e:
            return Response({'error': str(e)}, status=400)

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsOrgMember])
def resolve_blocker(request, blocker_id):
    org = _check_org(request)
    if not org:
        return Response({'error': 'User does not have an organization'}, status=400)
    
    try:
        blocker = Blocker.objects.get(id=blocker_id, organization=org)
        blocker.status = 'resolved'
        blocker.resolved_at = timezone.now()
        blocker.save()
        return Response({'message': 'Blocker resolved'})
    except Blocker.DoesNotExist:
        return Response({'error': 'Blocker not found'}, status=404)

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsOrgMember])
def sprint_history(request):
    org = _check_org(request)
    if not org:
        return Response({'error': 'User does not have an organization'}, status=400)
    
    project_id = request.GET.get('project_id')
    sprints = Sprint.objects.filter(
        organization=org,
        end_date__lt=timezone.now().date(),
        project__isnull=False
    ).select_related('project').order_by('-end_date')[:10]
    
    if project_id:
        sprints = sprints.filter(project_id=project_id)
    
    serializer = SprintSerializer(sprints, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsOrgMember])
def project_roadmap(request, project_id):
    org = _check_org(request)
    if not org:
        return Response({'error': 'User does not have an organization'}, status=400)
    
    try:
        sprints = Sprint.objects.filter(
            project_id=project_id,
            organization=org
        ).prefetch_related('issues').order_by('start_date')
        
        serializer = SprintSerializer(sprints, many=True)
        return Response(serializer.data)
    except Exception as e:
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsOrgMember])
def project_issues_unified(request, project_id):
    org = _check_org(request)
    if not org:
        return Response({'error': 'User does not have an organization'}, status=400)
    
    try:
        issues = Issue.objects.filter(
            project_id=project_id,
            organization=org
        ).select_related('assignee', 'sprint').prefetch_related(
            'labels',
            Prefetch('decisionissuelink_set', queryset=DecisionIssueLink.objects.all()),
            Prefetch('conversationissuelink_set', queryset=ConversationIssueLink.objects.all()),
            Prefetch('blockerissulink_set', queryset=BlockerIssueLink.objects.all())
        )
        
        data = []
        for issue in issues:
            data.append({
                **IssueSerializer(issue).data,
                'linked_decisions': [link.decision_id for link in issue.decisionissuelink_set.all()],
                'linked_conversations': [link.conversation_id for link in issue.conversationissuelink_set.all()],
                'blocking_blockers': [link.blocker_id for link in issue.blockerissulink_set.all()],
            })
        return Response(data)
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated, IsOrgMember])
def backlog(request, project_id):
    org = _check_org(request)
    if not org:
        return Response({'error': 'User does not have an organization'}, status=400)
    
    try:
        project = Project.objects.get(id=project_id, organization=org)
    except Project.DoesNotExist:
        return Response({'error': 'Project not found'}, status=404)
    
    if request.method == 'GET':
        issues = project.issues.filter(in_backlog=True, sprint__isnull=True).select_related('assignee').order_by('-created_at')
        return Response({
            'project_id': project.id,
            'issue_count': issues.count(),
            'issues': IssueSerializer(issues, many=True).data
        })
    
    elif request.method == 'POST':
        issue_id = request.data.get('issue_id')
        if not issue_id:
            return Response({'error': 'issue_id required'}, status=400)
        
        try:
            issue = Issue.objects.get(id=issue_id, project=project)
            issue.in_backlog = True
            issue.sprint = None
            issue.save()
            return Response({'message': 'Issue added to backlog'})
        except Issue.DoesNotExist:
            return Response({'error': 'Issue not found'}, status=404)

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsOrgMember])
def workflow_transitions(request):
    org = _check_org(request)
    if not org:
        return Response({'error': 'User does not have an organization'}, status=400)
    
    from_status = request.GET.get('from_status')
    issue_type = request.GET.get('issue_type', '')
    
    transitions = WorkflowTransition.objects.filter(organization=org)
    
    if from_status:
        transitions = transitions.filter(from_status=from_status)
    
    if issue_type:
        transitions = transitions.filter(Q(issue_type=issue_type) | Q(issue_type=''))
    
    serializer = WorkflowTransitionSerializer(transitions, many=True)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsOrgMember])
def validate_transition(request, issue_id):
    org = _check_org(request)
    if not org:
        return Response({'error': 'User does not have an organization'}, status=400)
    
    try:
        issue = Issue.objects.get(id=issue_id, organization=org)
    except Issue.DoesNotExist:
        return Response({'error': 'Issue not found'}, status=404)
    
    new_status = request.data.get('status')
    if not new_status:
        return Response({'error': 'status required'}, status=400)
    
    transitions = WorkflowTransition.objects.filter(
        organization=org,
        from_status=issue.status,
        to_status=new_status
    ).filter(Q(issue_type=issue.issue_type) | Q(issue_type=''))
    
    if not transitions.exists():
        has_rules_for_from_status = WorkflowTransition.objects.filter(
            organization=org,
            from_status=issue.status
        ).filter(Q(issue_type=issue.issue_type) | Q(issue_type='')).exists()

        default_transitions = {
            'backlog': {'todo'},
            'todo': {'in_progress', 'done', 'backlog'},
            'in_progress': {'in_review', 'testing', 'done', 'todo'},
            'in_review': {'testing', 'done', 'in_progress'},
            'testing': {'done', 'in_progress'},
            'done': {'in_progress'},
        }

        allowed_by_default = new_status in default_transitions.get(issue.status, set())
        if has_rules_for_from_status or not allowed_by_default:
            return Response({
                'valid': False,
                'message': f'Cannot transition from {issue.status} to {new_status}'
            })
        return Response({'valid': True})
    
    transition = transitions.first()
    errors = []
    
    if transition.requires_assignee and not issue.assignee:
        errors.append('Issue must be assigned')
    
    if transition.requires_story_points and not issue.story_points:
        errors.append('Issue must have story points')
    
    transition_comment = (request.data.get('transition_comment') or request.data.get('comment') or '').strip()
    if transition.requires_comment and not transition_comment:
        errors.append('Transition comment is required')
    
    if errors:
        return Response({
            'valid': False,
            'errors': errors
        })
    
    return Response({'valid': True})


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsOrgMember])
def link_decision_to_issue(request, issue_id):
    org = _check_org(request)
    if not org:
        return Response({'error': 'User does not have an organization'}, status=400)
    
    try:
        issue = Issue.objects.get(id=issue_id, organization=org)
    except Issue.DoesNotExist:
        return Response({'error': 'Issue not found'}, status=404)
    
    decision_id = request.data.get('decision_id')
    impact_type = request.data.get('impact_type')
    description = request.data.get('description', '')
    try:
        effort_change = int(request.data.get('estimated_effort_change', 0) or 0)
    except (TypeError, ValueError):
        return Response({'error': 'estimated_effort_change must be an integer'}, status=400)

    try:
        delay_days = int(request.data.get('estimated_delay_days', 0) or 0)
    except (TypeError, ValueError):
        return Response({'error': 'estimated_delay_days must be an integer'}, status=400)
    
    if not decision_id or not impact_type:
        return Response({'error': 'decision_id and impact_type required'}, status=400)
    
    try:
        from apps.decisions.models import Decision
        decision = Decision.objects.get(id=decision_id, organization=org)
        
        existing_impact = DecisionImpact.objects.filter(decision=decision, issue=issue).first()
        previous_delay_days = existing_impact.estimated_delay_days if existing_impact else 0

        impact, created = DecisionImpact.objects.update_or_create(
            decision=decision,
            issue=issue,
            defaults={
                'organization': org,
                'impact_type': impact_type,
                'description': description,
                'estimated_effort_change': effort_change,
                'estimated_delay_days': delay_days,
                'created_by': request.user
            }
        )
        
        # Update issue story points if effort changed
        if effort_change != 0 and issue.story_points:
            old_points = issue.story_points
            issue.story_points = max(0, issue.story_points + effort_change)
            issue.save()
            
            # Record history
            IssueDecisionHistory.objects.create(
                organization=org,
                issue=issue,
                decision=decision,
                change_type='points_changed',
                old_value=str(old_points),
                new_value=str(issue.story_points),
                reason=f'Decision impact: {impact_type}'
            )

        timeline_adjustments = {'issues_shifted': 0, 'delay_days_applied': 0}
        incremental_delay = max(0, delay_days - previous_delay_days)
        if impact_type in {'blocks', 'delays'} and incremental_delay > 0:
            shifted = _apply_delay_shift(
                org=org,
                issue=issue,
                decision=decision,
                delay_days=incremental_delay,
            )
            timeline_adjustments = {
                'issues_shifted': shifted,
                'delay_days_applied': incremental_delay,
            }
        
        response_data = DecisionImpactSerializer(impact).data
        response_data['timeline_adjustments'] = timeline_adjustments
        return Response(response_data, status=201 if created else 200)
    except Exception as e:
        return Response({'error': str(e)}, status=400)

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsOrgMember])
def issue_decision_impacts(request, issue_id):
    org = _check_org(request)
    if not org:
        return Response({'error': 'User does not have an organization'}, status=400)
    
    try:
        issue = Issue.objects.get(id=issue_id, organization=org)
        impacts = issue.decision_impacts.select_related('decision', 'created_by')
        history = issue.decision_history.select_related('decision').order_by('-created_at')
        
        return Response({
            'impacts': DecisionImpactSerializer(impacts, many=True).data,
            'history': IssueDecisionHistorySerializer(history, many=True).data
        })
    except Issue.DoesNotExist:
        return Response({'error': 'Issue not found'}, status=404)

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsOrgMember])
def sprint_decision_analysis(request, sprint_id):
    org = _check_org(request)
    if not org:
        return Response({'error': 'User does not have an organization'}, status=400)
    
    try:
        sprint = Sprint.objects.get(id=sprint_id, organization=org)
        
        # Get all decision impacts for this sprint
        impacts = DecisionImpact.objects.filter(
            organization=org,
            sprint=sprint
        ).select_related('decision', 'issue', 'created_by')
        
        # Calculate metrics
        total_effort_added = sum(i.estimated_effort_change for i in impacts if i.estimated_effort_change > 0)
        total_effort_removed = sum(abs(i.estimated_effort_change) for i in impacts if i.estimated_effort_change < 0)
        blocked_issues = impacts.filter(impact_type='blocks').count()
        enabled_issues = impacts.filter(impact_type='enables').count()
        
        # Get or create summary
        summary, _ = SprintDecisionSummary.objects.get_or_create(sprint=sprint)
        summary.total_effort_added = total_effort_added
        summary.total_effort_removed = total_effort_removed
        summary.issues_blocked_by_decisions = blocked_issues
        summary.issues_enabled_by_decisions = enabled_issues
        summary.decisions_impacting_sprint = impacts.values('decision').distinct().count()
        summary.save()
        
        return Response({
            'sprint_id': sprint.id,
            'sprint_name': sprint.name,
            'summary': SprintDecisionSummarySerializer(summary).data,
            'impacts': DecisionImpactSerializer(impacts, many=True).data,
            'blocked_issues': blocked_issues,
            'enabled_issues': enabled_issues,
            'total_effort_added': total_effort_added,
            'total_effort_removed': total_effort_removed
        })
    except Sprint.DoesNotExist:
        return Response({'error': 'Sprint not found'}, status=404)

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsOrgMember])
def decision_impact_report(request):
    org = _check_org(request)
    if not org:
        return Response({'error': 'User does not have an organization'}, status=400)
    
    from apps.decisions.models import Decision
    
    # Get all decisions and their impacts
    decisions = Decision.objects.filter(organization=org).prefetch_related('impacts')
    
    report_data = []
    for decision in decisions:
        impacts = decision.impacts.all()
        if impacts.exists():
            report_data.append({
                'decision_id': decision.id,
                'decision_title': decision.title,
                'decision_status': decision.status,
                'impact_count': impacts.count(),
                'total_effort_change': sum(i.estimated_effort_change for i in impacts),
                'blocked_issues': impacts.filter(impact_type='blocks').count(),
                'enabled_issues': impacts.filter(impact_type='enables').count(),
                'impacts': DecisionImpactSerializer(impacts, many=True).data
            })
    
    return Response({
        'total_decisions_with_impacts': len(report_data),
        'decisions': report_data
    })
