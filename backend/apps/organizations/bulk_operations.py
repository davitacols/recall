from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from apps.conversations.models import Conversation
from apps.decisions.models import Decision
from apps.business.document_models import Document
from apps.agile.models import Issue

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_delete_conversations(request):
    ids = request.data.get('ids', [])
    if not ids:
        return Response({'error': 'No IDs provided'}, status=status.HTTP_400_BAD_REQUEST)
    
    deleted = Conversation.objects.filter(
        id__in=ids,
        organization=request.user.organization,
        author=request.user
    ).delete()
    
    return Response({'deleted': deleted[0], 'message': f'Deleted {deleted[0]} conversations'})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_archive_conversations(request):
    ids = request.data.get('ids', [])
    if not ids:
        return Response({'error': 'No IDs provided'}, status=status.HTTP_400_BAD_REQUEST)
    
    updated = Conversation.objects.filter(
        id__in=ids,
        organization=request.user.organization
    ).update(is_archived=True)
    
    return Response({'updated': updated, 'message': f'Archived {updated} conversations'})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_update_status(request):
    ids = request.data.get('ids', [])
    status_value = request.data.get('status')
    
    if not ids or not status_value:
        return Response({'error': 'IDs and status required'}, status=status.HTTP_400_BAD_REQUEST)
    
    updated = Decision.objects.filter(
        id__in=ids,
        organization=request.user.organization
    ).update(status=status_value)
    
    return Response({'updated': updated, 'message': f'Updated {updated} decisions'})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_delete_documents(request):
    ids = request.data.get('ids', [])
    if not ids:
        return Response({'error': 'No IDs provided'}, status=status.HTTP_400_BAD_REQUEST)
    
    deleted = Document.objects.filter(
        id__in=ids,
        organization=request.user.organization,
        created_by=request.user
    ).delete()
    
    return Response({'deleted': deleted[0], 'message': f'Deleted {deleted[0]} documents'})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_assign_issues(request):
    ids = request.data.get('ids', [])
    assignee_id = request.data.get('assignee_id')
    
    if not ids or not assignee_id:
        return Response({'error': 'IDs and assignee required'}, status=status.HTTP_400_BAD_REQUEST)
    
    updated = Issue.objects.filter(
        id__in=ids,
        project__organization=request.user.organization
    ).update(assignee_id=assignee_id)
    
    return Response({'updated': updated, 'message': f'Assigned {updated} issues'})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_update_priority(request):
    ids = request.data.get('ids', [])
    priority = request.data.get('priority')
    
    if not ids or not priority:
        return Response({'error': 'IDs and priority required'}, status=status.HTTP_400_BAD_REQUEST)
    
    updated = Issue.objects.filter(
        id__in=ids,
        project__organization=request.user.organization
    ).update(priority=priority)
    
    return Response({'updated': updated, 'message': f'Updated {updated} issues'})
