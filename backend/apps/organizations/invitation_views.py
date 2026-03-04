from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from django.core.exceptions import ValidationError
import logging
from .models import Invitation, Organization, User
from .subscription_entitlements import ensure_default_plans, get_or_create_subscription
from apps.users.auth_utils import (
    check_rate_limit,
    validate_email,
    validate_password,
    validate_username,
    generate_unique_org_username,
)
from apps.users.bot_protection import verify_turnstile_token

logger = logging.getLogger(__name__)


def _normalize_invite_role(role):
    if role == 'member':
        return 'contributor'
    return role


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def invite_user(request):
    if not check_rate_limit(request.user.id, action="invite_user", limit=20, window=3600):
        return Response({"error": "Too many invite attempts. Try again later."}, status=status.HTTP_429_TOO_MANY_REQUESTS)

    if request.user.role != 'admin':
        return Response({'error': 'Only admins can invite users'}, status=status.HTTP_403_FORBIDDEN)
    
    email = (request.data.get('email') or '').strip().lower()
    role = _normalize_invite_role(request.data.get('role', 'contributor'))
    allowed_roles = {'admin', 'manager', 'contributor', 'member'}
    
    if not email:
        return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)
    if role not in allowed_roles:
        return Response({'error': 'Invalid role'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        validate_email(email)
    except ValidationError as exc:
        return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    
    # Check if user already exists
    existing_user = User.objects.filter(
        email__iexact=email,
        organization=request.user.organization
    ).first()
    if existing_user and existing_user.is_active:
        return Response(
            {'error': 'User already exists in this organization'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
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
    
    # Try to send email
    email_sent = False
    try:
        from apps.notifications.email_service import send_invitation_email
        email_sent = send_invitation_email(email, invitation.token, request.user)
    except Exception as e:
        print(f"Email send failed: {e}")
    
    # Always return the invite link for UI display
    from django.conf import settings
    frontend_url = settings.FRONTEND_URL
    invite_link = f"{frontend_url}/invite/{invitation.token}"
    
    return Response({
        'message': 'Invitation created',
        'token': str(invitation.token),
        'invite_link': invite_link,
        'email_sent': email_sent,
        'email': invitation.email,
        'role': _normalize_invite_role(invitation.role)
    }, status=status.HTTP_201_CREATED)

@api_view(['GET'])
@permission_classes([])
def verify_invitation(request, token):
    client_id = request.META.get('REMOTE_ADDR', 'unknown')
    if not check_rate_limit(client_id, action='verify_invitation', limit=80, window=3600):
        return Response({'error': 'Too many verification attempts. Try again later.'}, status=status.HTTP_429_TOO_MANY_REQUESTS)
    try:
        invitation = Invitation.objects.get(token=token)
        
        if invitation.is_accepted:
            return Response({'error': 'This invitation has already been used'}, status=status.HTTP_400_BAD_REQUEST)
        
        if timezone.now() > invitation.expires_at:
            return Response({'error': 'This invitation has expired'}, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({
            'organization': invitation.organization.name,
            'email': invitation.email,
            'role': _normalize_invite_role(invitation.role)
        })
    except Invitation.DoesNotExist:
        return Response({'error': 'Invalid invitation'}, status=status.HTTP_404_NOT_FOUND)
    except Exception:
        logger.exception("Error verifying invitation token")
        return Response({'error': 'Unable to verify invitation'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([])
def accept_invitation(request, token):
    client_id = request.META.get('REMOTE_ADDR', 'unknown')
    if not check_rate_limit(client_id, action='accept_invitation', limit=20, window=3600):
        return Response({'error': 'Too many acceptance attempts. Try again later.'}, status=status.HTTP_429_TOO_MANY_REQUESTS)
    ok, captcha_error = verify_turnstile_token(request, request.data.get('turnstile_token'))
    if not ok:
        return Response({'error': captcha_error}, status=status.HTTP_400_BAD_REQUEST)

    try:
        invitation = Invitation.objects.get(token=token)
        if not invitation.is_valid():
            return Response({'error': 'Invitation expired or already used'}, status=status.HTTP_400_BAD_REQUEST)
        username = (request.data.get('username') or '').strip()
        password = request.data.get('password') or ''
        full_name = (request.data.get('full_name') or '').strip()
        if not username or not password:
            return Response({'error': 'Username and password are required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            validate_username(username)
            validate_password(password)
        except ValidationError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        if User.objects.filter(email__iexact=invitation.email, organization=invitation.organization).exists():
            return Response({'error': 'User already exists in this organization'}, status=status.HTTP_400_BAD_REQUEST)

        generated_username = generate_unique_org_username(username, invitation.organization.slug)

        # Create user with the organization from the invitation
        user = User.objects.create_user(
            username=generated_username,
            email=invitation.email,
            password=password,
            organization=invitation.organization,
            role=_normalize_invite_role(invitation.role),
            full_name=full_name
        )
        
        # Mark invitation as accepted
        invitation.is_accepted = True
        invitation.accepted_at = timezone.now()
        invitation.save()
        
        # Generate token
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)
        refresh['organization_id'] = user.organization_id
        refresh['organization_slug'] = user.organization.slug
        
        return Response({
            'access_token': str(refresh.access_token),
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'full_name': user.full_name,
                'role': user.role,
                'organization': user.organization.name,
                'organization_name': user.organization.name,
                'organization_slug': user.organization.slug,
            }
        })
    except Invitation.DoesNotExist:
        return Response({'error': 'Invalid invitation'}, status=status.HTTP_404_NOT_FOUND)
    except Exception:
        logger.exception("Error accepting invitation")
        return Response({'error': 'Unable to accept invitation'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_invitations(request):
    if request.user.role != 'admin':
        return Response({'error': 'Only admins can view invitations'}, status=status.HTTP_403_FORBIDDEN)
    
    from django.conf import settings
    
    invitations = Invitation.objects.filter(
        organization=request.user.organization,
        is_accepted=False
    ).order_by('-created_at')
    
    data = [({
        'id': inv.id,
        'email': inv.email,
        'role': _normalize_invite_role(inv.role),
        'token': str(inv.token),
        'invited_by': inv.invited_by.get_full_name() if inv.invited_by else None,
        'created_at': inv.created_at,
        'expires_at': inv.expires_at,
        'is_valid': inv.is_valid(),
        'invite_link': f"{settings.FRONTEND_URL}/invite/{inv.token}"
    }) for inv in invitations]
    
    return Response(data)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def revoke_invitation(request, invitation_id):
    if request.user.role != 'admin':
        return Response({'error': 'Only admins can revoke invitations'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        invitation = Invitation.objects.get(
            id=invitation_id,
            organization=request.user.organization
        )
        invitation.delete()
        return Response({'message': 'Invitation revoked'})
    except Invitation.DoesNotExist:
        return Response({'error': 'Invitation not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
@permission_classes([])
def create_organization(request):
    client_id = request.META.get('REMOTE_ADDR', 'unknown')
    if not check_rate_limit(client_id, action='create_organization', limit=8, window=3600):
        return Response({'error': 'Too many organization creation attempts. Try again later.'}, status=status.HTTP_429_TOO_MANY_REQUESTS)
    ok, captcha_error = verify_turnstile_token(request, request.data.get('turnstile_token'))
    if not ok:
        return Response({'error': captcha_error}, status=status.HTTP_400_BAD_REQUEST)

    name = request.data.get('name')
    slug = request.data.get('slug')
    admin_username = request.data.get('username')
    admin_email = request.data.get('email')
    admin_password = request.data.get('password')
    admin_full_name = request.data.get('full_name', '')
    try:
        validate_email((admin_email or '').strip().lower())
        validate_password(admin_password or '')
        if '@' in (admin_username or ''):
            validate_email((admin_username or '').strip().lower())
        else:
            validate_username((admin_username or '').strip())
    except ValidationError as exc:
        return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    
    # Check if org exists
    if Organization.objects.filter(slug=slug).exists():
        return Response({'error': 'Organization already exists'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Create organization
    org = Organization.objects.create(name=name, slug=slug)
    ensure_default_plans()
    get_or_create_subscription(org)
    
    generated_username = generate_unique_org_username(admin_username or admin_email, org.slug)

    # Create admin user
    user = User.objects.create_user(
        username=generated_username,
        email=admin_email,
        password=admin_password,
        organization=org,
        role='admin',
        full_name=admin_full_name
    )
    
    # Generate token
    from rest_framework_simplejwt.tokens import RefreshToken
    refresh = RefreshToken.for_user(user)
    refresh['organization_id'] = user.organization_id
    refresh['organization_slug'] = user.organization.slug
    
    return Response({
        'access_token': str(refresh.access_token),
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'full_name': user.full_name,
            'role': user.role,
            'organization': org.name,
            'organization_slug': org.slug,
        }
    })
