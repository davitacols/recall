from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.utils import timezone
from datetime import timedelta
from django.contrib.contenttypes.models import ContentType
from .models import Goal
from apps.organizations.models import User
from apps.conversations.models import Conversation
from apps.decisions.models import Decision
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


def _goal_related_objects(request, data):
    organization = request.user.organization
    owner = None
    conversation = None
    decision = None

    if data.get('owner_id') not in (None, ''):
        owner = User.objects.filter(id=data.get('owner_id'), organization=organization).first()
        if owner is None:
            return None, Response({'error': 'Owner must belong to your organization'}, status=status.HTTP_400_BAD_REQUEST)

    if data.get('conversation_id') not in (None, ''):
        conversation = Conversation.objects.filter(id=data.get('conversation_id'), organization=organization).first()
        if conversation is None:
            return None, Response({'error': 'Conversation must belong to your organization'}, status=status.HTTP_400_BAD_REQUEST)

    if data.get('decision_id') not in (None, ''):
        decision = Decision.objects.filter(id=data.get('decision_id'), organization=organization).first()
        if decision is None:
            return None, Response({'error': 'Decision must belong to your organization'}, status=status.HTTP_400_BAD_REQUEST)

    return {
        'owner': owner,
        'conversation': conversation,
        'decision': decision,
    }, None

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def goals_list(request):
    if request.method == 'GET':
        goals = Goal.objects.filter(organization=request.user.organization)
        data = [{
            'id': g.id,
            'title': g.title,
            'description': g.description,
            'status': g.status,
            'owner': {'id': g.owner.id, 'full_name': g.owner.full_name} if g.owner else None,
            'target_date': g.target_date,
            'progress': g.progress,
            'created_at': g.created_at,
            'updated_at': g.updated_at,
        } for g in goals]
        return Response(data)
    
    elif request.method == 'POST':
        resolved, error_response = _goal_related_objects(request, request.data)
        if error_response:
            return error_response

        goal = Goal.objects.create(
            organization=request.user.organization,
            title=request.data['title'],
            description=request.data.get('description', ''),
            status=request.data.get('status', 'not_started'),
            owner=resolved['owner'],
            conversation=resolved['conversation'],
            decision=resolved['decision'],
            target_date=request.data.get('target_date'),
            progress=request.data.get('progress', 0),
        )
        
        # Notify owner
        if goal.owner and goal.owner != request.user:
            from apps.notifications.utils import create_notification
            create_notification(
                user=goal.owner,
                notification_type='goal',
                title='New goal assigned',
                message=f'{request.user.full_name or request.user.username} assigned you a goal: {goal.title}',
                link=f'/business/goals/{goal.id}'
            )
        
        return Response({'id': goal.id, 'title': goal.title}, status=status.HTTP_201_CREATED)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def goal_detail(request, pk):
    goal = get_object_or_404(Goal, pk=pk, organization=request.user.organization)
    
    if request.method == 'GET':
        _track_view_activity(
            request,
            goal,
            goal.title,
            goal.description,
        )
        tasks = goal.tasks.all()
        return Response({
            'id': goal.id,
            'title': goal.title,
            'description': goal.description,
            'status': goal.status,
            'owner': {'id': goal.owner.id, 'full_name': goal.owner.full_name} if goal.owner else None,
            'target_date': goal.target_date,
            'progress': goal.progress,
            'created_at': goal.created_at,
            'updated_at': goal.updated_at,
            'tasks': [{'id': t.id, 'title': t.title, 'status': t.status} for t in tasks],
        })
    
    elif request.method == 'PUT':
        old_status = goal.status
        old_owner = goal.owner
        resolved, error_response = _goal_related_objects(request, request.data)
        if error_response:
            return error_response
        
        goal.title = request.data.get('title', goal.title)
        goal.description = request.data.get('description', goal.description)
        goal.status = request.data.get('status', goal.status)
        goal.progress = request.data.get('progress', goal.progress)
        goal.target_date = request.data.get('target_date', goal.target_date)
        if 'owner_id' in request.data:
            goal.owner = resolved['owner']
        if 'conversation_id' in request.data:
            goal.conversation = resolved['conversation']
        if 'decision_id' in request.data:
            goal.decision = resolved['decision']
        goal.save()
        
        # Notify on status change
        if old_status != goal.status and goal.owner and goal.owner != request.user:
            from apps.notifications.utils import create_notification
            create_notification(
                user=goal.owner,
                notification_type='goal',
                title='Goal status updated',
                message=f'{request.user.full_name or request.user.username} changed goal "{goal.title}" to {goal.status}',
                link=f'/business/goals/{goal.id}'
            )
        
        # Notify on reassignment
        if old_owner != goal.owner and goal.owner and goal.owner != request.user:
            from apps.notifications.utils import create_notification
            create_notification(
                user=goal.owner,
                notification_type='goal',
                title='Goal assigned to you',
                message=f'{request.user.full_name or request.user.username} assigned you goal: {goal.title}',
                link=f'/business/goals/{goal.id}'
            )
        
        return Response({'message': 'Goal updated'})
    
    elif request.method == 'DELETE':
        goal.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
