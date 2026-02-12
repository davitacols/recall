from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import User


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_team_members(request):
    """Get all team members in the user's organization"""
    if not hasattr(request.user, 'organization') or not request.user.organization:
        return Response({'error': 'User does not have an organization'}, status=400)
    
    members = User.objects.filter(organization=request.user.organization).values(
        'id', 'username', 'email', 'full_name', 'is_active'
    )
    
    return Response(list(members))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_role_info(request, user_id):
    return Response({'role': 'member', 'permissions': []})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_user_role(request, user_id):
    return Response({'message': 'Role updated'})

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def remove_user(request, user_id):
    return Response({'message': 'User removed'})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_audit_logs(request):
    return Response([])

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_activity(request, user_id):
    return Response([])

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_team_workflow(request):
    return Response({'message': 'Workflow created'})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def activate_workflow(request, workflow_id):
    return Response({'message': 'Workflow activated'})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_team_workflows(request):
    return Response([])

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_workflow_instances(request, workflow_id):
    return Response([])

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def approve_workflow_step(request, instance_id):
    return Response({'message': 'Step approved'})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reject_workflow_step(request, instance_id):
    return Response({'message': 'Step rejected'})


def log_action(organization, user, action, details=None):
    """Helper function to log user actions"""
    pass
