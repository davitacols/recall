from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.utils import timezone
from .models import Task

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
        task = Task.objects.create(
            organization=request.user.organization,
            title=request.data['title'],
            description=request.data.get('description', ''),
            status=request.data.get('status', 'todo'),
            priority=request.data.get('priority', 'medium'),
            assigned_to_id=request.data.get('assigned_to_id'),
            goal_id=request.data.get('goal_id'),
            meeting_id=request.data.get('meeting_id'),
            conversation_id=request.data.get('conversation_id'),
            decision_id=request.data.get('decision_id'),
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
        
        task.title = request.data.get('title', task.title)
        task.description = request.data.get('description', task.description)
        task.status = request.data.get('status', task.status)
        task.priority = request.data.get('priority', task.priority)
        task.due_date = request.data.get('due_date', task.due_date)
        if 'assigned_to_id' in request.data:
            task.assigned_to_id = request.data['assigned_to_id']
        if 'goal_id' in request.data:
            task.goal_id = request.data['goal_id']
        
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
