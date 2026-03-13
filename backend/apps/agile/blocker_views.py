from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from .models import Blocker
from apps.organizations.models import User


def _resolve_blocker_assignee(request, data, current_assignee_id=None):
    assigned_to_id = data.get('assigned_to_id', current_assignee_id)
    if assigned_to_id in ('', None, 'null'):
        return None, None
    try:
        assigned_to_id = int(assigned_to_id)
    except (TypeError, ValueError):
        return None, Response({'error': 'assigned_to_id must be an integer'}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.filter(id=assigned_to_id, organization=request.user.organization).first()
    if user is None:
        return None, Response({'error': 'Assignee must belong to your organization'}, status=status.HTTP_400_BAD_REQUEST)
    return user.id, None

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
            'blocker_type': b.blocker_type,
            'issue': {'id': b.issue.id, 'title': b.issue.title} if b.issue else None,
            'reported_by': {'id': b.reported_by.id, 'full_name': b.reported_by.full_name} if b.reported_by else None,
            'assigned_to': {'id': b.assigned_to.id, 'full_name': b.assigned_to.full_name} if b.assigned_to else None,
            'created_at': b.created_at,
            'resolved_at': b.resolved_at
        } for b in blockers]
        return Response(data)
    
    elif request.method == 'POST':
        assignee_id, error_response = _resolve_blocker_assignee(request, request.data)
        if error_response:
            return error_response

        blocker = Blocker.objects.create(
            organization=request.user.organization,
            title=request.data['title'],
            description=request.data.get('description', ''),
            blocker_type=request.data.get('blocker_type', request.data.get('type', 'technical')),
            issue_id=request.data.get('issue_id'),
            reported_by=request.user,
            assigned_to_id=assignee_id,
            status='active'
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
            'blocker_type': blocker.blocker_type,
            'issue': {'id': blocker.issue.id, 'title': blocker.issue.title} if blocker.issue else None,
            'reported_by': {'id': blocker.reported_by.id, 'full_name': blocker.reported_by.full_name} if blocker.reported_by else None,
            'assigned_to': {'id': blocker.assigned_to.id, 'full_name': blocker.assigned_to.full_name} if blocker.assigned_to else None,
            'created_at': blocker.created_at,
            'resolved_at': blocker.resolved_at
        })
    
    elif request.method == 'PUT':
        assignee_id, error_response = _resolve_blocker_assignee(request, request.data, blocker.assigned_to_id)
        if error_response:
            return error_response

        blocker.title = request.data.get('title', blocker.title)
        blocker.description = request.data.get('description', blocker.description)
        blocker.status = request.data.get('status', blocker.status)
        blocker.blocker_type = request.data.get('blocker_type', request.data.get('type', blocker.blocker_type))
        blocker.assigned_to_id = assignee_id
        if request.data.get('status') == 'resolved' and not blocker.resolved_at:
            from django.utils import timezone
            blocker.resolved_at = timezone.now()
        blocker.save()
        return Response({'message': 'Blocker updated'})
    
    elif request.method == 'DELETE':
        blocker.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
