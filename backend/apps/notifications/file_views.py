from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from apps.users.auth_utils import check_rate_limit
from django.core.files.storage import default_storage
import os
import uuid

MAX_UPLOAD_SIZE = 10 * 1024 * 1024
ALLOWED_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".pdf", ".txt", ".csv",
    ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx"
}

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_file(request):
    if not check_rate_limit(f"file_upload:{request.user.id}", limit=30, window=3600):
        return Response(
            {"error": "Too many upload attempts. Try again later."},
            status=status.HTTP_429_TOO_MANY_REQUESTS,
        )

    if 'file' not in request.FILES:
        return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
    
    file = request.FILES['file']
    ext = os.path.splitext(file.name or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        return Response({'error': 'Unsupported file type'}, status=status.HTTP_400_BAD_REQUEST)
    if file.size > MAX_UPLOAD_SIZE:
        return Response({'error': 'File exceeds 10MB limit'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        safe_name = os.path.basename((file.name or "upload").replace("\\", "/"))
        storage_name = default_storage.save(
            f"recall/{request.user.organization.slug}/{uuid.uuid4().hex}_{safe_name}",
            file,
        )

        return Response({
            'url': request.build_absolute_uri(default_storage.url(storage_name)),
            'public_id': storage_name,
            'format': ext.lstrip('.'),
            'size': file.size,
            'filename': file.name
        }, status=status.HTTP_201_CREATED)
    except Exception:
        return Response({'error': 'Upload failed'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_file(request, public_id):
    if not check_rate_limit(f"file_delete:{request.user.id}", limit=60, window=3600):
        return Response(
            {"error": "Too many delete attempts. Try again later."},
            status=status.HTTP_429_TOO_MANY_REQUESTS,
        )

    normalized_id = public_id.replace('\\', '/')
    org_prefix = f"recall/{request.user.organization.slug}/"
    if (
        not normalized_id.startswith(org_prefix)
        or normalized_id.startswith('/')
        or '..' in normalized_id.split('/')
    ):
        return Response({'error': 'Invalid file reference'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        default_storage.delete(normalized_id)
        return Response({'message': 'File deleted'}, status=status.HTTP_200_OK)
    except Exception:
        return Response({'error': 'Delete failed'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
