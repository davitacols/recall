from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .apikey_models import APIKey

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def api_keys_list(request):
    if request.method == 'GET':
        keys = APIKey.objects.filter(organization=request.user.organization)
        data = [{
            'id': key.id,
            'name': key.name,
            'key': key.key[:20] + '...',  # Masked
            'created_at': key.created_at,
            'last_used_at': key.last_used_at,
            'is_active': key.is_active
        } for key in keys]
        return Response(data)
    
    elif request.method == 'POST':
        if request.user.role != 'admin':
            return Response({'error': 'Only admins can create API keys'}, status=status.HTTP_403_FORBIDDEN)
        
        name = request.data.get('name')
        if not name:
            return Response({'error': 'Name is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        key = APIKey.objects.create(
            organization=request.user.organization,
            name=name,
            key=APIKey.generate_key(),
            created_by=request.user
        )
        
        return Response({
            'id': key.id,
            'name': key.name,
            'key': key.key,  # Full key shown only once
            'created_at': key.created_at
        }, status=status.HTTP_201_CREATED)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def api_key_delete(request, key_id):
    if request.user.role != 'admin':
        return Response({'error': 'Only admins can delete API keys'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        key = APIKey.objects.get(id=key_id, organization=request.user.organization)
        key.delete()
        return Response({'message': 'API key deleted'})
    except APIKey.DoesNotExist:
        return Response({'error': 'API key not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def api_key_toggle(request, key_id):
    if request.user.role != 'admin':
        return Response({'error': 'Only admins can toggle API keys'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        key = APIKey.objects.get(id=key_id, organization=request.user.organization)
        key.is_active = not key.is_active
        key.save()
        return Response({'is_active': key.is_active})
    except APIKey.DoesNotExist:
        return Response({'error': 'API key not found'}, status=status.HTTP_404_NOT_FOUND)
