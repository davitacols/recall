from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

class OrganizationDetailView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        org = request.user.organization
        return Response({
            'id': org.id,
            'name': org.name,
            'slug': org.slug,
            'user_count': org.users.count(),
            'user_role': request.user.role
        })