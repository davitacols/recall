from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.conf import settings
import cloudinary.uploader

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_file(request):
    if 'file' not in request.FILES:
        return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
    
    file = request.FILES['file']
    
    try:
        # Upload to Cloudinary
        result = cloudinary.uploader.upload(
            file,
            folder=f"recall/{request.user.organization.slug}",
            resource_type="auto"
        )
        
        return Response({
            'url': result['secure_url'],
            'public_id': result['public_id'],
            'format': result.get('format'),
            'size': result.get('bytes'),
            'filename': file.name
        }, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_file(request, public_id):
    try:
        cloudinary.uploader.destroy(public_id)
        return Response({'message': 'File deleted'}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
