from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.http import HttpResponse
import base64
from .document_models import Document, DocumentComment

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def documents_list(request):
    if request.method == 'GET':
        documents = Document.objects.filter(organization=request.user.organization)
        doc_type = request.GET.get('type')
        if doc_type:
            documents = documents.filter(document_type=doc_type)
        
        data = [{
            'id': d.id,
            'title': d.title,
            'description': d.description,
            'document_type': d.document_type,
            'content': d.content,
            'file_url': d.file_url,
            'has_file': bool(d.file_data),
            'file_name': d.file_name,
            'file_type': d.file_type,
            'version': d.version,
            'created_by': {'id': d.created_by.id, 'full_name': d.created_by.full_name} if d.created_by else None,
            'updated_by': {'id': d.updated_by.id, 'full_name': d.updated_by.full_name} if d.updated_by else None,
            'tags': d.tags,
            'created_at': d.created_at,
            'updated_at': d.updated_at
        } for d in documents]
        return Response(data)
    
    elif request.method == 'POST':
        file_data = None
        file_name = ''
        file_type = ''
        
        if 'file' in request.FILES:
            uploaded_file = request.FILES['file']
            # Validate file size (10MB limit)
            if uploaded_file.size > 10 * 1024 * 1024:
                return Response({'error': 'File size exceeds 10MB limit'}, status=status.HTTP_400_BAD_REQUEST)
            file_data = uploaded_file.read()
            file_name = uploaded_file.name
            file_type = uploaded_file.content_type
        
        document = Document.objects.create(
            organization=request.user.organization,
            title=request.data['title'],
            description=request.data.get('description', ''),
            document_type=request.data.get('document_type', 'other'),
            content=request.data.get('content', ''),
            file_data=file_data,
            file_name=file_name,
            file_type=file_type,
            version=request.data.get('version', '1.0'),
            created_by=request.user,
            updated_by=request.user,
            goal_id=request.data.get('goal_id'),
            meeting_id=request.data.get('meeting_id'),
            task_id=request.data.get('task_id'),
            tags=request.data.get('tags', [])
        )
        return Response({'id': document.id}, status=status.HTTP_201_CREATED)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def document_detail(request, pk):
    document = get_object_or_404(Document, pk=pk, organization=request.user.organization)
    
    if request.method == 'GET':
        return Response({
            'id': document.id,
            'title': document.title,
            'description': document.description,
            'document_type': document.document_type,
            'content': document.content,
            'file_url': document.file_url,
            'has_file': bool(document.file_data),
            'file_name': document.file_name,
            'file_type': document.file_type,
            'version': document.version,
            'created_by': {'id': document.created_by.id, 'full_name': document.created_by.full_name} if document.created_by else None,
            'updated_by': {'id': document.updated_by.id, 'full_name': document.updated_by.full_name} if document.updated_by else None,
            'tags': document.tags,
            'created_at': document.created_at,
            'updated_at': document.updated_at
        })
    
    elif request.method == 'PUT':
        document.title = request.data.get('title', document.title)
        document.description = request.data.get('description', document.description)
        document.document_type = request.data.get('document_type', document.document_type)
        document.content = request.data.get('content', document.content)
        document.file_url = request.data.get('file_url', document.file_url)
        document.version = request.data.get('version', document.version)
        document.tags = request.data.get('tags', document.tags)
        document.updated_by = request.user
        document.save()
        return Response({'message': 'Document updated'})
    
    elif request.method == 'DELETE':
        document.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def document_search(request):
    query = request.GET.get('q', '')
    documents = Document.objects.filter(
        organization=request.user.organization,
        title__icontains=query
    ) | Document.objects.filter(
        organization=request.user.organization,
        content__icontains=query
    )
    
    data = [{
        'id': d.id,
        'title': d.title,
        'document_type': d.document_type,
        'updated_at': d.updated_at
    } for d in documents[:20]]
    return Response(data)

@api_view(['GET'])
@permission_classes([AllowAny])
def document_file(request, pk):
    document = get_object_or_404(Document, pk=pk)
    
    if not document.file_data:
        return Response({'error': 'No file attached'}, status=status.HTTP_404_NOT_FOUND)
    
    response = HttpResponse(bytes(document.file_data), content_type=document.file_type or 'application/octet-stream')
    response['Content-Disposition'] = f'inline; filename="{document.file_name}"'
    return response

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def document_comments(request, pk):
    document = get_object_or_404(Document, pk=pk, organization=request.user.organization)
    
    if request.method == 'GET':
        comments = DocumentComment.objects.filter(document=document)
        data = [{
            'id': c.id,
            'content': c.content,
            'user': {'id': c.user.id, 'full_name': c.user.full_name},
            'created_at': c.created_at
        } for c in comments]
        return Response(data)
    
    elif request.method == 'POST':
        content = request.data['content']
        comment = DocumentComment.objects.create(
            document=document,
            user=request.user,
            content=content
        )
        
        # Parse @mentions
        import re
        mentions = re.findall(r'@(\w+)', content)
        if mentions:
            from apps.organizations.models import User
            mentioned_users = User.objects.filter(
                organization=request.user.organization,
                username__in=mentions
            )
            comment.mentioned_users.set(mentioned_users)
            
            # Send notifications
            from apps.notifications.utils import create_notification
            for user in mentioned_users:
                if user != request.user:
                    create_notification(
                        user=user,
                        notification_type='mention',
                        title=f'{request.user.full_name} mentioned you',
                        message=f'In document: {document.title}',
                        link=f'/business/documents/{document.id}'
                    )
        
        return Response({
            'id': comment.id,
            'content': comment.content,
            'user': {'id': request.user.id, 'full_name': request.user.full_name},
            'created_at': comment.created_at
        }, status=status.HTTP_201_CREATED)
