from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from .models import Invitation, Organization, User

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def invite_user(request):
    if request.user.role != 'admin':
        return Response({'error': 'Only admins can invite users'}, status=status.HTTP_403_FORBIDDEN)
    
    email = request.data.get('email')
    role = request.data.get('role', 'contributor')
    
    # Check if user already exists
    if User.objects.filter(email=email, organization=request.user.organization).exists():
        return Response({'error': 'User already exists'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Create or update invitation
    invitation, created = Invitation.objects.update_or_create(
        organization=request.user.organization,
        email=email,
        defaults={
            'role': role,
            'invited_by': request.user,
            'expires_at': timezone.now() + timezone.timedelta(days=7),
            'is_accepted': False
        }
    )
    
    return Response({
        'message': 'Invitation sent',
        'token': str(invitation.token),
        'invite_link': f'/invite/{invitation.token}'
    })

@csrf_exempt
@api_view(['GET'])
def verify_invitation(request, token):
    try:
        invitation = Invitation.objects.get(token=token)
        if not invitation.is_valid():
            return Response({'error': 'Invitation expired or already used'}, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({
            'organization': invitation.organization.name,
            'email': invitation.email,
            'role': invitation.role
        })
    except Invitation.DoesNotExist:
        return Response({'error': 'Invalid invitation'}, status=status.HTTP_404_NOT_FOUND)

@csrf_exempt
@api_view(['POST'])
def accept_invitation(request, token):
    try:
        invitation = Invitation.objects.get(token=token)
        if not invitation.is_valid():
            return Response({'error': 'Invitation expired or already used'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create user
        user = User.objects.create_user(
            username=request.data.get('username'),
            email=invitation.email,
            password=request.data.get('password'),
            organization=invitation.organization,
            role=invitation.role,
            full_name=request.data.get('full_name', '')
        )
        
        # Mark invitation as accepted
        invitation.is_accepted = True
        invitation.accepted_at = timezone.now()
        invitation.save()
        
        # Generate token
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'access_token': str(refresh.access_token),
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'full_name': user.full_name,
                'role': user.role,
                'organization': user.organization.name
            }
        })
    except Invitation.DoesNotExist:
        return Response({'error': 'Invalid invitation'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_invitations(request):
    if request.user.role != 'admin':
        return Response({'error': 'Only admins can view invitations'}, status=status.HTTP_403_FORBIDDEN)
    
    invitations = Invitation.objects.filter(
        organization=request.user.organization,
        is_accepted=False
    ).order_by('-created_at')
    
    data = [{
        'id': inv.id,
        'email': inv.email,
        'role': inv.role,
        'invited_by': inv.invited_by.get_full_name() if inv.invited_by else None,
        'created_at': inv.created_at,
        'expires_at': inv.expires_at,
        'is_valid': inv.is_valid()
    } for inv in invitations]
    
    return Response(data)

@csrf_exempt
@api_view(['POST'])
def create_organization(request):
    name = request.data.get('name')
    slug = request.data.get('slug')
    admin_username = request.data.get('username')
    admin_email = request.data.get('email')
    admin_password = request.data.get('password')
    admin_full_name = request.data.get('full_name', '')
    
    # Check if org exists
    if Organization.objects.filter(slug=slug).exists():
        return Response({'error': 'Organization already exists'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Create organization
    org = Organization.objects.create(name=name, slug=slug)
    
    # Create admin user
    user = User.objects.create_user(
        username=admin_username,
        email=admin_email,
        password=admin_password,
        organization=org,
        role='admin',
        full_name=admin_full_name
    )
    
    # Generate token
    from rest_framework_simplejwt.tokens import RefreshToken
    refresh = RefreshToken.for_user(user)
    
    return Response({
        'access_token': str(refresh.access_token),
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'full_name': user.full_name,
            'role': user.role,
            'organization': org.name
        }
    })
