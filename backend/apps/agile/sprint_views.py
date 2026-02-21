from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from .models import Sprint, Issue
from datetime import datetime

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def sprints_list(request):
    if request.method == 'GET':
        sprints = Sprint.objects.filter(organization=request.user.organization).order_by('-start_date')
        data = [{
            'id': s.id,
            'name': s.name,
            'goal': s.goal,
            'start_date': s.start_date,
            'end_date': s.end_date,
            'status': s.status,
            'created_at': s.created_at
        } for s in sprints]
        return Response(data)
    
    elif request.method == 'POST':
        sprint = Sprint.objects.create(
            organization=request.user.organization,
            name=request.data['name'],
            goal=request.data.get('goal', ''),
            start_date=request.data['start_date'],
            end_date=request.data['end_date'],
            status='planned'
        )
        return Response({'id': sprint.id}, status=status.HTTP_201_CREATED)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def sprint_detail(request, pk):
    sprint = get_object_or_404(Sprint, pk=pk, organization=request.user.organization)
    
    if request.method == 'GET':
        issues = Issue.objects.filter(sprint=sprint)
        return Response({
            'id': sprint.id,
            'name': sprint.name,
            'goal': sprint.goal,
            'start_date': sprint.start_date,
            'end_date': sprint.end_date,
            'status': sprint.status,
            'created_at': sprint.created_at,
            'issues': [{
                'id': i.id,
                'title': i.title,
                'status': i.status,
                'priority': i.priority,
                'assignee': {'id': i.assignee.id, 'full_name': i.assignee.full_name} if i.assignee else None
            } for i in issues]
        })
    
    elif request.method == 'PUT':
        sprint.name = request.data.get('name', sprint.name)
        sprint.goal = request.data.get('goal', sprint.goal)
        sprint.start_date = request.data.get('start_date', sprint.start_date)
        sprint.end_date = request.data.get('end_date', sprint.end_date)
        sprint.status = request.data.get('status', sprint.status)
        sprint.save()
        return Response({'message': 'Sprint updated'})
    
    elif request.method == 'DELETE':
        sprint.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_sprint(request):
    sprint = Sprint.objects.filter(
        organization=request.user.organization,
        status='active'
    ).first()
    
    if not sprint:
        return Response({'message': 'No active sprint'}, status=status.HTTP_404_NOT_FOUND)
    
    issues = Issue.objects.filter(sprint=sprint)
    return Response({
        'id': sprint.id,
        'name': sprint.name,
        'goal': sprint.goal,
        'start_date': sprint.start_date,
        'end_date': sprint.end_date,
        'issues': [{
            'id': i.id,
            'title': i.title,
            'status': i.status,
            'priority': i.priority,
            'assignee': {'id': i.assignee.id, 'full_name': i.assignee.full_name} if i.assignee else None
        } for i in issues]
    })
