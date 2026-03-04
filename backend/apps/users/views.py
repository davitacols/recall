from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth import get_user_model, authenticate
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.contrib.auth.tokens import default_token_generator
import logging
import boto3
from django.conf import settings
from .auth_utils import (
    check_rate_limit,
    validate_email,
    validate_password,
    validate_username,
    generate_unique_org_username,
)
from .bot_protection import verify_turnstile_token
from apps.notifications.email_service import send_password_reset_email, send_welcome_email, build_frontend_url

User = get_user_model()
logger = logging.getLogger(__name__)


def _normalize_user_role(role):
    if role == 'member':
        return 'contributor'
    return role


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    username = request.data.get('username', '').strip()
    password = request.data.get('password', '')
    turnstile_token = request.data.get('turnstile_token')
    org_slug = (request.data.get('org_slug') or request.data.get('organization_slug') or request.data.get('organization') or '').strip().lower()
    
    if not username or not password:
        return Response({'error': 'Username and password required'}, 
                       status=status.HTTP_400_BAD_REQUEST)
    
    # Rate limiting
    if not check_rate_limit(username):
        logger.warning(f"Rate limit exceeded for login attempt: {username}")
        return Response(
            {'error': 'Too many login attempts. Try again later.'},
            status=status.HTTP_429_TOO_MANY_REQUESTS
        )
    ok, captcha_error = verify_turnstile_token(request, turnstile_token)
    if not ok:
        return Response({'error': captcha_error}, status=status.HTTP_400_BAD_REQUEST)
    
    # Input validation
    try:
        if '@' in username:
            validate_email(username)
        else:
            validate_username(username)
    except ValidationError as e:
        logger.warning(f"Invalid input for login: {username}")
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    user = None

    # Org-scoped login: prevent cross-organization account collisions by email.
    if org_slug:
        user_obj = None
        if '@' in username:
            user_obj = User.objects.filter(
                email__iexact=username,
                organization__slug=org_slug,
                is_active=True
            ).first()
        else:
            user_obj = User.objects.filter(
                username__iexact=username,
                organization__slug=org_slug,
                is_active=True
            ).first()

        if user_obj:
            user = authenticate(username=user_obj.username, password=password)
    else:
        # Backward compatibility: direct username login.
        user = authenticate(username=username, password=password)

        # Email login fallback: force org disambiguation if email belongs to multiple orgs.
        if not user and '@' in username:
            matches = User.objects.filter(email__iexact=username, is_active=True).select_related('organization')
            match_count = matches.count()
            if match_count > 1:
                return Response(
                    {
                        'error': 'Multiple organizations found for this email. Provide org_slug to continue.',
                        'organizations': [
                            {
                                'slug': m.organization.slug,
                                'name': m.organization.name,
                            }
                            for m in matches
                        ]
                    },
                    status=status.HTTP_409_CONFLICT
                )
            if match_count == 1:
                user = authenticate(username=matches.first().username, password=password)
    
    if user:
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)
        refresh['organization_id'] = user.organization_id
        refresh['organization_slug'] = user.organization.slug
        logger.info(f"Successful login for user: {user.username}")
        
        return Response({
            'access_token': str(refresh.access_token),
            'id_token': str(refresh.access_token),
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'full_name': user.get_full_name(),
                'role': user.role,
                'organization_name': user.organization.name,
                'organization_slug': user.organization.slug,
            }
        })
    
    logger.warning(f"Failed login attempt for: {username}")
    return Response({'error': 'Invalid credentials'}, 
                   status=status.HTTP_401_UNAUTHORIZED)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def team(request):
    """Get all team members in the user's organization"""
    organization = request.user.organization
    users = User.objects.filter(organization=organization).values(
        'id', 'username', 'email', 'full_name', 'role'
    )
    return Response(list(users))

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def profile(request):
    user = request.user
    
    avatar_url = None
    if user.avatar:
        avatar_url = user.avatar.url if not settings.DEBUG else request.build_absolute_uri(user.avatar.url)
    
    org_logo_url = None
    if user.organization.logo:
        org_logo_url = user.organization.logo.url if not settings.DEBUG else request.build_absolute_uri(user.organization.logo.url)
    
    return Response({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'full_name': user.get_full_name(),
        'bio': user.bio,
        'role': user.role,
        'timezone': user.timezone,
        'avatar': avatar_url,
        'organization_name': user.organization.name,
        'organization_logo': org_logo_url,
        'organization_color': user.organization.primary_color,
        'onboarding_completed': user.onboarding_completed,
        'first_conversation_created': user.first_conversation_created,
        'first_teammate_invited': user.first_teammate_invited,
        'first_decision_made': user.first_decision_made
    })

@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    email = request.data.get('email', '').strip()
    password = request.data.get('password', '')
    turnstile_token = request.data.get('turnstile_token')
    token = request.data.get('token')
    organization_name = request.data.get('organization', '').strip()
    full_name = (request.data.get('full_name') or '').strip()
    
    # Rate limiting
    if not check_rate_limit(f'register:{email}'):
        logger.warning(f"Rate limit exceeded for registration: {email}")
        return Response(
            {'error': 'Too many registration attempts. Try again later.'},
            status=status.HTTP_429_TOO_MANY_REQUESTS
        )
    ok, captcha_error = verify_turnstile_token(request, turnstile_token)
    if not ok:
        return Response({'error': captcha_error}, status=status.HTTP_400_BAD_REQUEST)
    
    # Input validation
    try:
        validate_email(email)
        validate_password(password)
    except ValidationError as e:
        logger.warning(f"Invalid input for registration: {email}")
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    # Organization registration
    if organization_name and not token:
        if not all([email, password, organization_name]):
            return Response({'error': 'Email, password, and organization name required'}, 
                           status=status.HTTP_400_BAD_REQUEST)
        
        free_email_domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 
                             'aol.com', 'icloud.com', 'mail.com', 'protonmail.com', 
                             'zoho.com', 'yandex.com']
        email_domain = email.split('@')[-1].lower()
        if email_domain in free_email_domains:
            return Response({'error': 'Please use a company email address'}, 
                           status=status.HTTP_400_BAD_REQUEST)
        
        if len(organization_name) < 2:
            return Response({'error': 'Organization name must be at least 2 characters'}, 
                           status=status.HTTP_400_BAD_REQUEST)
        
        try:
            from apps.organizations.models import Organization
            import re
            
            org_slug = re.sub(r'[^a-z0-9-]', '', organization_name.lower().replace(' ', '-'))
            
            if Organization.objects.filter(slug=org_slug).exists():
                return Response({'error': 'Organization name already exists'}, 
                               status=status.HTTP_400_BAD_REQUEST)
            
            org = Organization.objects.create(name=organization_name, slug=org_slug)
            
            username = generate_unique_org_username(email, org_slug)
            display_name = full_name or email.split('@')[0].replace('.', ' ').replace('_', ' ').title()
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                organization=org,
                full_name=display_name,
                first_name=display_name.split()[0] if display_name else email.split('@')[0],
                role='admin'
            )
            
            logger.info(f"New organization created: {organization_name} by {email}")
            try:
                send_welcome_email(user)
            except Exception:
                logger.exception("Failed to send welcome email to %s", email)
            
            return Response({
                'message': 'Organization created successfully',
                'username': user.username
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Registration error: {str(e)}")
            return Response({'error': 'Registration failed'}, 
                           status=status.HTTP_400_BAD_REQUEST)
    
    # Invitation registration
    if token:
        if not all([email, password, token]):
            return Response({'error': 'Email, password, and invitation token required'}, 
                           status=status.HTTP_400_BAD_REQUEST)
        
        try:
            from apps.organizations.models import Invitation
            try:
                invitation = Invitation.objects.get(token=token, email=email, is_accepted=False)
            except Invitation.DoesNotExist:
                return Response({'error': 'Invalid or expired invitation'}, 
                               status=status.HTTP_400_BAD_REQUEST)
            
            if User.objects.filter(email=email, organization=invitation.organization).exists():
                return Response({'error': 'User already exists in this organization'}, 
                               status=status.HTTP_400_BAD_REQUEST)
            
            username = generate_unique_org_username(email, invitation.organization.slug)
            display_name = full_name or email.split('@')[0].replace('.', ' ').replace('_', ' ').title()
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                organization=invitation.organization,
                full_name=display_name,
                first_name=display_name.split()[0] if display_name else email.split('@')[0],
                role=_normalize_user_role(invitation.role or 'contributor')
            )
            
            invitation.is_accepted = True
            invitation.accepted_at = timezone.now()
            invitation.save()
            
            logger.info(f"User registered via invitation: {email}")
            try:
                send_welcome_email(user)
            except Exception:
                logger.exception("Failed to send welcome email to invited user %s", email)
            
            return Response({
                'message': 'Account created successfully',
                'username': user.username
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Registration error: {str(e)}")
            return Response({'error': 'Registration failed'}, 
                           status=status.HTTP_400_BAD_REQUEST)
    
    return Response({'error': 'Invalid registration request'}, 
                   status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def forgot_password(request):
    email = (request.data.get('email') or '').strip().lower()
    turnstile_token = request.data.get('turnstile_token')
    if not email:
        return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)
    if not check_rate_limit(f'forgot_password:{email}', limit=10, window=3600):
        return Response({'error': 'Too many attempts. Try again later.'}, status=status.HTTP_429_TOO_MANY_REQUESTS)
    ok, captcha_error = verify_turnstile_token(request, turnstile_token)
    if not ok:
        return Response({'error': captcha_error}, status=status.HTTP_400_BAD_REQUEST)

    # Always return success to avoid email enumeration.
    generic_response = {
        'message': 'If an account exists for this email, a password reset link has been sent.'
    }

    try:
        validate_email(email)
    except ValidationError:
        return Response(generic_response, status=status.HTTP_200_OK)

    user = User.objects.filter(email__iexact=email, is_active=True).first()
    if not user:
        return Response(generic_response, status=status.HTTP_200_OK)

    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    reset_url = build_frontend_url(f"/reset-password?uid={uid}&token={token}")

    try:
        send_password_reset_email(user, reset_url)
    except Exception:
        logger.exception("Failed to send password reset email to %s", email)

    return Response(generic_response, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password(request):
    uid = request.data.get('uid')
    token = request.data.get('token')
    password = request.data.get('password', '')
    confirm_password = request.data.get('confirm_password', '')

    if not uid or not token or not password:
        return Response(
            {'error': 'uid, token, and password are required'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if confirm_password and password != confirm_password:
        return Response({'error': 'Passwords do not match'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        validate_password(password)
    except ValidationError as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user_id = force_str(urlsafe_base64_decode(uid))
        user = User.objects.get(pk=user_id, is_active=True)
    except Exception:
        return Response({'error': 'Invalid or expired reset link'}, status=status.HTTP_400_BAD_REQUEST)

    if not default_token_generator.check_token(user, token):
        return Response({'error': 'Invalid or expired reset link'}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(password)
    user.save(update_fields=['password'])

    return Response({'message': 'Password has been reset successfully'}, status=status.HTTP_200_OK)
