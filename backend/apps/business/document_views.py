from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.http import HttpResponse
from django.utils import timezone
from django.db.models import Q
from datetime import timedelta
from django.contrib.contenttypes.models import ContentType
from .document_models import Document, DocumentComment
from apps.knowledge.unified_models import UnifiedActivity

VALID_DOCUMENT_TYPES = {choice[0] for choice in Document.DOCUMENT_TYPES}


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


def _normalize_tags(raw_tags):
    if raw_tags in (None, "", []):
        return []
    if isinstance(raw_tags, list):
        values = raw_tags
    else:
        values = str(raw_tags).split(",")
    normalized = []
    for tag in values:
        cleaned = str(tag).strip()
        if cleaned:
            normalized.append(cleaned[:50])
    return normalized[:20]


def _validate_document_payload(data, partial=False):
    title = (data.get("title") or "").strip()
    document_type = (data.get("document_type") or "other").strip()
    content = data.get("content")

    if not partial or "title" in data:
        if not title:
            return {"error": "Title is required"}
        if len(title) > 255:
            return {"error": "Title must be 255 characters or fewer"}

    if document_type not in VALID_DOCUMENT_TYPES:
        return {"error": "Document type is invalid"}

    if content is not None and not isinstance(content, str):
        return {"error": "Content must be text"}

    if "tags" in data:
        tags = data.get("tags")
        if tags not in (None, "", []) and not isinstance(tags, (list, str)):
            return {"error": "Tags must be a list or comma-separated string"}

    return None

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
        validation_error = _validate_document_payload(request.data)
        if validation_error:
            return Response(validation_error, status=status.HTTP_400_BAD_REQUEST)

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
            title=(request.data.get('title') or '').strip(),
            description=request.data.get('description', ''),
            document_type=(request.data.get('document_type') or 'other').strip(),
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
            tags=_normalize_tags(request.data.get('tags', []))
        )
        return Response({'id': document.id}, status=status.HTTP_201_CREATED)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def document_detail(request, pk):
    document = get_object_or_404(Document, pk=pk, organization=request.user.organization)
    
    if request.method == 'GET':
        _track_view_activity(
            request,
            document,
            document.title,
            document.description,
        )
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
        validation_error = _validate_document_payload(request.data, partial=True)
        if validation_error:
            return Response(validation_error, status=status.HTTP_400_BAD_REQUEST)

        document.title = (request.data.get('title', document.title) or '').strip()
        document.description = request.data.get('description', document.description)
        document.document_type = request.data.get('document_type', document.document_type)
        document.content = request.data.get('content', document.content)
        document.file_url = request.data.get('file_url', document.file_url)
        document.version = request.data.get('version', document.version)
        document.tags = _normalize_tags(request.data.get('tags', document.tags))
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
        organization=request.user.organization
    ).filter(
        Q(title__icontains=query)
        | Q(description__icontains=query)
        | Q(content__icontains=query)
    ).distinct()
    
    data = [{
        'id': d.id,
        'title': d.title,
        'document_type': d.document_type,
        'updated_at': d.updated_at
    } for d in documents[:20]]
    return Response(data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def document_file(request, pk):
    document = get_object_or_404(Document, pk=pk, organization=request.user.organization)
    
    if not document.file_data:
        return Response({'error': 'No file attached'}, status=status.HTTP_404_NOT_FOUND)
    
    response = HttpResponse(bytes(document.file_data), content_type=document.file_type or 'application/octet-stream')
    response['Content-Disposition'] = f'inline; filename="{document.file_name}"'
    return response

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def extract_pdf_text(request, pk):
    document = get_object_or_404(Document, pk=pk, organization=request.user.organization)
    
    if not document.file_data:
        return Response({'text': ''}, status=status.HTTP_200_OK)
    
    if not document.file_type or 'pdf' not in document.file_type.lower():
        return Response({'text': ''}, status=status.HTTP_200_OK)
    
    try:
        import PyPDF2
        import io
        pdf_file = io.BytesIO(bytes(document.file_data))
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        text = ''
        for page in pdf_reader.pages:
            text += page.extract_text() + '\n'
        return Response({'text': text.strip()})
    except ImportError:
        return Response({'text': '', 'error': 'PyPDF2 not installed'})
    except Exception as e:
        return Response({'text': '', 'error': str(e)})

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
