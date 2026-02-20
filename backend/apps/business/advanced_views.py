from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.utils import timezone
from .advanced_models import Milestone, Template, Reminder, Comment
from .models import Goal

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def milestones_list(request, goal_id):
    goal = get_object_or_404(Goal, pk=goal_id, organization=request.user.organization)
    
    if request.method == 'GET':
        milestones = goal.milestones.all()
        data = [{
            'id': m.id,
            'title': m.title,
            'description': m.description,
            'due_date': m.due_date,
            'completed': m.completed,
            'completed_at': m.completed_at,
            'order': m.order
        } for m in milestones]
        return Response(data)
    
    elif request.method == 'POST':
        milestone = Milestone.objects.create(
            goal=goal,
            title=request.data['title'],
            description=request.data.get('description', ''),
            due_date=request.data.get('due_date'),
            order=request.data.get('order', 0)
        )
        return Response({'id': milestone.id}, status=status.HTTP_201_CREATED)

@api_view(['PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def milestone_detail(request, goal_id, pk):
    milestone = get_object_or_404(Milestone, pk=pk, goal_id=goal_id, goal__organization=request.user.organization)
    
    if request.method == 'PUT':
        milestone.title = request.data.get('title', milestone.title)
        milestone.description = request.data.get('description', milestone.description)
        milestone.due_date = request.data.get('due_date', milestone.due_date)
        milestone.completed = request.data.get('completed', milestone.completed)
        if milestone.completed and not milestone.completed_at:
            milestone.completed_at = timezone.now()
        elif not milestone.completed:
            milestone.completed_at = None
        milestone.save()
        return Response({'message': 'Milestone updated'})
    
    elif request.method == 'DELETE':
        milestone.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def templates_list(request):
    if request.method == 'GET':
        templates = Template.objects.filter(organization=request.user.organization)
        template_type = request.GET.get('type')
        if template_type:
            templates = templates.filter(template_type=template_type)
        
        data = [{
            'id': t.id,
            'name': t.name,
            'template_type': t.template_type,
            'content': t.content,
            'created_by': t.created_by.full_name if t.created_by else None
        } for t in templates]
        return Response(data)
    
    elif request.method == 'POST':
        template = Template.objects.create(
            organization=request.user.organization,
            name=request.data['name'],
            template_type=request.data['template_type'],
            content=request.data['content'],
            created_by=request.user
        )
        return Response({'id': template.id}, status=status.HTTP_201_CREATED)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def template_delete(request, pk):
    template = get_object_or_404(Template, pk=pk, organization=request.user.organization)
    template.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def comments_list(request):
    if request.method == 'GET':
        comments = Comment.objects.filter(organization=request.user.organization)
        goal_id = request.GET.get('goal_id')
        meeting_id = request.GET.get('meeting_id')
        task_id = request.GET.get('task_id')
        
        if goal_id:
            comments = comments.filter(goal_id=goal_id)
        if meeting_id:
            comments = comments.filter(meeting_id=meeting_id)
        if task_id:
            comments = comments.filter(task_id=task_id)
        
        data = [{
            'id': c.id,
            'author': {'id': c.author.id, 'full_name': c.author.full_name},
            'content': c.content,
            'created_at': c.created_at,
            'updated_at': c.updated_at
        } for c in comments]
        return Response(data)
    
    elif request.method == 'POST':
        comment = Comment.objects.create(
            organization=request.user.organization,
            author=request.user,
            content=request.data['content'],
            goal_id=request.data.get('goal_id'),
            meeting_id=request.data.get('meeting_id'),
            task_id=request.data.get('task_id')
        )
        return Response({'id': comment.id}, status=status.HTTP_201_CREATED)

@api_view(['PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def comment_detail(request, pk):
    comment = get_object_or_404(Comment, pk=pk, organization=request.user.organization)
    
    if request.method == 'PUT':
        if comment.author != request.user:
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
        comment.content = request.data.get('content', comment.content)
        comment.save()
        return Response({'message': 'Comment updated'})
    
    elif request.method == 'DELETE':
        if comment.author != request.user:
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
        comment.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def reminders_list(request):
    if request.method == 'GET':
        reminders = Reminder.objects.filter(
            organization=request.user.organization,
            user=request.user,
            sent=False,
            remind_at__gte=timezone.now()
        )
        data = [{
            'id': r.id,
            'title': r.title,
            'message': r.message,
            'remind_at': r.remind_at
        } for r in reminders]
        return Response(data)
    
    elif request.method == 'POST':
        reminder = Reminder.objects.create(
            organization=request.user.organization,
            user=request.user,
            title=request.data['title'],
            message=request.data['message'],
            remind_at=request.data['remind_at'],
            goal_id=request.data.get('goal_id'),
            meeting_id=request.data.get('meeting_id'),
            task_id=request.data.get('task_id')
        )
        return Response({'id': reminder.id}, status=status.HTTP_201_CREATED)
