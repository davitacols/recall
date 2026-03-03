from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from apps.users.auth_utils import check_rate_limit
import cloudinary.uploader
import os

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
        # Upload to Cloudinary with public access
        result = cloudinary.uploader.upload(
            file,
            folder=f"recall/{request.user.organization.slug}",
            resource_type="auto",
            type="upload",
            access_mode="public"
        )
        
        return Response({
            'url': result['secure_url'],
            'public_id': result['public_id'],
            'format': result.get('format'),
            'size': result.get('bytes'),
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

    org_prefix = f"recall/{request.user.organization.slug}/"
    if not public_id.startswith(org_prefix):
        return Response({'error': 'Invalid file reference'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        cloudinary.uploader.destroy(public_id)
        return Response({'message': 'File deleted'}, status=status.HTTP_200_OK)
    except Exception:
        return Response({'error': 'Delete failed'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
