from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from apps.organizations.models import User

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def team_members(request):
    members = User.objects.filter(organization=request.user.organization)
    data = [{'id': m.id, 'full_name': m.full_name, 'email': m.email} for m in members]
    return Response(data)
