from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def custom_fields(request, project_id):
    return Response([])

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_custom_field(request, field_id):
    return Response(status=status.HTTP_204_NO_CONTENT)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def set_custom_field_value(request, issue_id):
    return Response({'success': True})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_issue_custom_fields(request, issue_id):
    return Response([])

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def custom_issue_types(request, project_id):
    return Response([])

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_custom_issue_type(request, type_id):
    return Response(status=status.HTTP_204_NO_CONTENT)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def filter_issues(request):
    return Response([])

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def saved_filters(request):
    return Response([])

@api_view(['PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def manage_saved_filter(request, filter_id):
    if request.method == 'DELETE':
        return Response(status=status.HTTP_204_NO_CONTENT)
    return Response({'success': True})

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def board_filters(request, board_id):
    return Response([])
