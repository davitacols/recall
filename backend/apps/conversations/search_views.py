from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def advanced_search(request):
    return Response([])

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_suggestions(request):
    return Response([])

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def save_search(request):
    return Response({'id': 1})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def saved_searches(request):
    return Response([])

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_saved_search(request, search_id):
    return Response({'message': 'Deleted'})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_analytics(request):
    return Response({})
