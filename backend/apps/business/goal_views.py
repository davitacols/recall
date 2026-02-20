from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from .models import Goal
from apps.organizations.models import User

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
        goal = Goal.objects.create(
            organization=request.user.organization,
            title=request.data['title'],
            description=request.data.get('description', ''),
            status=request.data.get('status', 'not_started'),
            owner_id=request.data.get('owner_id'),
            conversation_id=request.data.get('conversation_id'),
            decision_id=request.data.get('decision_id'),
            target_date=request.data.get('target_date'),
            progress=request.data.get('progress', 0),
        )
        return Response({'id': goal.id, 'title': goal.title}, status=status.HTTP_201_CREATED)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def goal_detail(request, pk):
    goal = get_object_or_404(Goal, pk=pk, organization=request.user.organization)
    
    if request.method == 'GET':
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
        goal.title = request.data.get('title', goal.title)
        goal.description = request.data.get('description', goal.description)
        goal.status = request.data.get('status', goal.status)
        goal.progress = request.data.get('progress', goal.progress)
        goal.target_date = request.data.get('target_date', goal.target_date)
        if 'owner_id' in request.data:
            goal.owner_id = request.data['owner_id']
        goal.save()
        return Response({'message': 'Goal updated'})
    
    elif request.method == 'DELETE':
        goal.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
