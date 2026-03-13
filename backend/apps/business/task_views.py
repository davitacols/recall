from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.utils import timezone
from datetime import timedelta
from django.contrib.contenttypes.models import ContentType
from .models import Task
from apps.business.models import Goal, Meeting
from apps.conversations.models import Conversation
from apps.decisions.models import Decision
from apps.organizations.models import User
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


def _task_related_objects(request, data):
    organization = request.user.organization
    assigned_to = None
    goal = None
    meeting = None
    conversation = None
    decision = None

    if data.get('assigned_to_id') not in (None, ''):
        assigned_to = User.objects.filter(id=data.get('assigned_to_id'), organization=organization).first()
        if assigned_to is None:
            return None, Response({'error': 'Assignee must belong to your organization'}, status=status.HTTP_400_BAD_REQUEST)

    if data.get('goal_id') not in (None, ''):
        goal = Goal.objects.filter(id=data.get('goal_id'), organization=organization).first()
        if goal is None:
            return None, Response({'error': 'Goal must belong to your organization'}, status=status.HTTP_400_BAD_REQUEST)

    if data.get('meeting_id') not in (None, ''):
        meeting = Meeting.objects.filter(id=data.get('meeting_id'), organization=organization).first()
        if meeting is None:
            return None, Response({'error': 'Meeting must belong to your organization'}, status=status.HTTP_400_BAD_REQUEST)

    if data.get('conversation_id') not in (None, ''):
        conversation = Conversation.objects.filter(id=data.get('conversation_id'), organization=organization).first()
        if conversation is None:
            return None, Response({'error': 'Conversation must belong to your organization'}, status=status.HTTP_400_BAD_REQUEST)

    if data.get('decision_id') not in (None, ''):
        decision = Decision.objects.filter(id=data.get('decision_id'), organization=organization).first()
        if decision is None:
            return None, Response({'error': 'Decision must belong to your organization'}, status=status.HTTP_400_BAD_REQUEST)

    return {
        'assigned_to': assigned_to,
        'goal': goal,
        'meeting': meeting,
        'conversation': conversation,
        'decision': decision,
    }, None

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def tasks_list(request):
    if request.method == 'GET':
        tasks = Task.objects.filter(organization=request.user.organization)
        status_filter = request.GET.get('status')
        if status_filter:
            tasks = tasks.filter(status=status_filter)
        
        data = [{
            'id': t.id,
            'title': t.title,
            'description': t.description,
            'status': t.status,
            'priority': t.priority,
            'assigned_to': {'id': t.assigned_to.id, 'full_name': t.assigned_to.full_name} if t.assigned_to else None,
            'goal': {'id': t.goal.id, 'title': t.goal.title} if t.goal else None,
            'meeting': {'id': t.meeting.id, 'title': t.meeting.title} if t.meeting else None,
            'conversation': {'id': t.conversation.id, 'title': t.conversation.title} if t.conversation else None,
            'decision': {'id': t.decision.id, 'title': t.decision.title} if t.decision else None,
            'due_date': t.due_date,
            'created_at': t.created_at,
        } for t in tasks]
        return Response(data)
    
    elif request.method == 'POST':
        resolved, error_response = _task_related_objects(request, request.data)
        if error_response:
            return error_response

        task = Task.objects.create(
            organization=request.user.organization,
            title=request.data['title'],
            description=request.data.get('description', ''),
            status=request.data.get('status', 'todo'),
            priority=request.data.get('priority', 'medium'),
            assigned_to=resolved['assigned_to'],
            goal=resolved['goal'],
            meeting=resolved['meeting'],
            conversation=resolved['conversation'],
            decision=resolved['decision'],
            due_date=request.data.get('due_date'),
        )
        
        # Notify assignee
        if task.assigned_to and task.assigned_to != request.user:
            from apps.notifications.utils import create_notification
            create_notification(
                user=task.assigned_to,
                notification_type='task',
                title='New task assigned',
                message=f'{request.user.full_name or request.user.username} assigned you: {task.title}',
                link=f'/business/tasks'
            )
        
        return Response({'id': task.id}, status=status.HTTP_201_CREATED)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def task_detail(request, pk):
    task = get_object_or_404(Task, pk=pk, organization=request.user.organization)
    
    if request.method == 'GET':
        _track_view_activity(
            request,
            task,
            task.title,
            task.description,
        )
        return Response({
            'id': task.id,
            'title': task.title,
            'description': task.description,
            'status': task.status,
            'priority': task.priority,
            'assigned_to': {'id': task.assigned_to.id, 'full_name': task.assigned_to.full_name} if task.assigned_to else None,
            'goal': {'id': task.goal.id, 'title': task.goal.title} if task.goal else None,
            'meeting': {'id': task.meeting.id, 'title': task.meeting.title} if task.meeting else None,
            'due_date': task.due_date,
            'completed_at': task.completed_at,
            'created_at': task.created_at,
        })
    
    elif request.method == 'PUT':
        old_assignee = task.assigned_to
        old_status = task.status
        resolved, error_response = _task_related_objects(request, request.data)
        if error_response:
            return error_response
        
        task.title = request.data.get('title', task.title)
        task.description = request.data.get('description', task.description)
        task.status = request.data.get('status', task.status)
        task.priority = request.data.get('priority', task.priority)
        task.due_date = request.data.get('due_date', task.due_date)
        if 'assigned_to_id' in request.data:
            task.assigned_to = resolved['assigned_to']
        if 'goal_id' in request.data:
            task.goal = resolved['goal']
        if 'meeting_id' in request.data:
            task.meeting = resolved['meeting']
        if 'conversation_id' in request.data:
            task.conversation = resolved['conversation']
        if 'decision_id' in request.data:
            task.decision = resolved['decision']
        
        if old_status != 'done' and task.status == 'done':
            task.completed_at = timezone.now()
        elif old_status == 'done' and task.status != 'done':
            task.completed_at = None
        
        task.save()
        
        # Notify on reassignment
        if old_assignee != task.assigned_to and task.assigned_to and task.assigned_to != request.user:
            from apps.notifications.utils import create_notification
            create_notification(
                user=task.assigned_to,
                notification_type='task',
                title='Task assigned to you',
                message=f'{request.user.full_name or request.user.username} assigned you: {task.title}',
                link=f'/business/tasks'
            )
        
        return Response({'message': 'Task updated'})
    
    elif request.method == 'DELETE':
        task.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def tasks_board(request):
    tasks = Task.objects.filter(organization=request.user.organization)
    
    board = {
        'todo': [],
        'in_progress': [],
        'done': [],
    }
    
    for task in tasks:
        board[task.status].append({
            'id': task.id,
            'title': task.title,
            'priority': task.priority,
            'assigned_to': {'id': task.assigned_to.id, 'full_name': task.assigned_to.full_name} if task.assigned_to else None,
            'due_date': task.due_date,
        })
    
    return Response(board)
