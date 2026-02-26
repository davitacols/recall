from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.utils import timezone
from datetime import timedelta
from django.contrib.contenttypes.models import ContentType
from .models import Meeting
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

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def meetings_list(request):
    if request.method == 'GET':
        meetings = Meeting.objects.filter(organization=request.user.organization)
        data = [{
            'id': m.id,
            'title': m.title,
            'description': m.description,
            'meeting_date': m.meeting_date,
            'duration_minutes': m.duration_minutes,
            'location': m.location,
            'attendees': [{'id': a.id, 'full_name': a.full_name} for a in m.attendees.all()],
            'created_at': m.created_at,
        } for m in meetings]
        return Response(data)
    
    elif request.method == 'POST':
        meeting = Meeting.objects.create(
            organization=request.user.organization,
            title=request.data['title'],
            description=request.data.get('description', ''),
            meeting_date=request.data['meeting_date'],
            duration_minutes=request.data.get('duration_minutes', 60),
            location=request.data.get('location', ''),
            notes=request.data.get('notes', ''),
            goal_id=request.data.get('goal_id'),
            conversation_id=request.data.get('conversation_id'),
            decision_id=request.data.get('decision_id'),
            created_by=request.user,
        )
        if 'attendee_ids' in request.data:
            meeting.attendees.set(request.data['attendee_ids'])
            
            # Notify attendees
            from apps.notifications.utils import create_notification
            for attendee in meeting.attendees.exclude(id=request.user.id):
                create_notification(
                    user=attendee,
                    notification_type='meeting',
                    title='New meeting invitation',
                    message=f'{request.user.full_name or request.user.username} invited you to: {meeting.title}',
                    link=f'/business/meetings/{meeting.id}'
                )
        
        return Response({'id': meeting.id}, status=status.HTTP_201_CREATED)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def meeting_detail(request, pk):
    meeting = get_object_or_404(Meeting, pk=pk, organization=request.user.organization)
    
    if request.method == 'GET':
        _track_view_activity(
            request,
            meeting,
            meeting.title,
            meeting.description,
        )
        action_items = meeting.action_items.all()
        return Response({
            'id': meeting.id,
            'title': meeting.title,
            'description': meeting.description,
            'meeting_date': meeting.meeting_date,
            'duration_minutes': meeting.duration_minutes,
            'location': meeting.location,
            'notes': meeting.notes,
            'attendees': [{'id': a.id, 'full_name': a.full_name} for a in meeting.attendees.all()],
            'action_items': [{'id': t.id, 'title': t.title, 'status': t.status, 'assigned_to': {'id': t.assigned_to.id, 'full_name': t.assigned_to.full_name} if t.assigned_to else None} for t in action_items],
            'created_at': meeting.created_at,
        })
    
    elif request.method == 'PUT':
        meeting.title = request.data.get('title', meeting.title)
        meeting.description = request.data.get('description', meeting.description)
        meeting.meeting_date = request.data.get('meeting_date', meeting.meeting_date)
        meeting.duration_minutes = request.data.get('duration_minutes', meeting.duration_minutes)
        meeting.location = request.data.get('location', meeting.location)
        meeting.notes = request.data.get('notes', meeting.notes)
        if 'attendee_ids' in request.data:
            meeting.attendees.set(request.data['attendee_ids'])
        meeting.save()
        return Response({'message': 'Meeting updated'})
    
    elif request.method == 'DELETE':
        meeting.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
