from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from .models import Blocker

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def blockers_list(request):
    if request.method == 'GET':
        blockers = Blocker.objects.filter(organization=request.user.organization).order_by('-created_at')
        data = [{
            'id': b.id,
            'title': b.title,
            'description': b.description,
            'status': b.status,
            'severity': b.severity,
            'issue': {'id': b.issue.id, 'title': b.issue.title} if b.issue else None,
            'reported_by': {'id': b.reported_by.id, 'full_name': b.reported_by.full_name} if b.reported_by else None,
            'assigned_to': {'id': b.assigned_to.id, 'full_name': b.assigned_to.full_name} if b.assigned_to else None,
            'created_at': b.created_at,
            'resolved_at': b.resolved_at
        } for b in blockers]
        return Response(data)
    
    elif request.method == 'POST':
        blocker = Blocker.objects.create(
            organization=request.user.organization,
            title=request.data['title'],
            description=request.data.get('description', ''),
            severity=request.data.get('severity', 'medium'),
            issue_id=request.data.get('issue_id'),
            reported_by=request.user,
            assigned_to_id=request.data.get('assigned_to_id'),
            status='open'
        )
        return Response({'id': blocker.id}, status=status.HTTP_201_CREATED)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def blocker_detail(request, pk):
    blocker = get_object_or_404(Blocker, pk=pk, organization=request.user.organization)
    
    if request.method == 'GET':
        return Response({
            'id': blocker.id,
            'title': blocker.title,
            'description': blocker.description,
            'status': blocker.status,
            'severity': blocker.severity,
            'issue': {'id': blocker.issue.id, 'title': blocker.issue.title} if blocker.issue else None,
            'reported_by': {'id': blocker.reported_by.id, 'full_name': blocker.reported_by.full_name} if blocker.reported_by else None,
            'assigned_to': {'id': blocker.assigned_to.id, 'full_name': blocker.assigned_to.full_name} if blocker.assigned_to else None,
            'created_at': blocker.created_at,
            'resolved_at': blocker.resolved_at
        })
    
    elif request.method == 'PUT':
        blocker.title = request.data.get('title', blocker.title)
        blocker.description = request.data.get('description', blocker.description)
        blocker.status = request.data.get('status', blocker.status)
        blocker.severity = request.data.get('severity', blocker.severity)
        blocker.assigned_to_id = request.data.get('assigned_to_id', blocker.assigned_to_id)
        if request.data.get('status') == 'resolved' and not blocker.resolved_at:
            from django.utils import timezone
            blocker.resolved_at = timezone.now()
        blocker.save()
        return Response({'message': 'Blocker updated'})
    
    elif request.method == 'DELETE':
        blocker.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
