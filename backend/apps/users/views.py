from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.contrib.auth import get_user_model, authenticate
from django.utils import timezone
from django.core.exceptions import ValidationError
import logging
import boto3
from django.conf import settings
from .auth_utils import check_rate_limit, validate_email, validate_password, validate_username

User = get_user_model()
logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    username = request.data.get('username', '').strip()
    password = request.data.get('password', '')
    
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
    
    # Input validation
    try:
        if '@' in username:
            validate_email(username)
        else:
            validate_username(username)
    except ValidationError as e:
        logger.warning(f"Invalid input for login: {username}")
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    # Try local authentication
    user = authenticate(username=username, password=password)
    
    if not user:
        try:
            user_obj = User.objects.get(email__iexact=username)
            user = authenticate(username=user_obj.username, password=password)
        except User.DoesNotExist:
            pass
    
    if user:
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)
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
                'organization_name': user.organization.name
            }
        })
    
    logger.warning(f"Failed login attempt for: {username}")
    return Response({'error': 'Invalid credentials'}, 
                   status=status.HTTP_401_UNAUTHORIZED)

@api_view(['GET'])
@permission_classes([AllowAny])
def team(request):
    """Get all team members in the user's organization"""
    if not request.user.is_authenticated:
        return Response({'error': 'Authentication required'}, 
                       status=status.HTTP_401_UNAUTHORIZED)
    
    organization = request.user.organization
    users = User.objects.filter(organization=organization).values(
        'id', 'username', 'email', 'full_name', 'role'
    )
    return Response(list(users))

@api_view(['GET'])
@permission_classes([AllowAny])
def profile(request):
    if not request.user.is_authenticated:
        return Response({'error': 'Authentication required'}, 
                       status=status.HTTP_401_UNAUTHORIZED)
    
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
    token = request.data.get('token')
    organization_name = request.data.get('organization', '').strip()
    
    # Rate limiting
    if not check_rate_limit(f'register:{email}'):
        logger.warning(f"Rate limit exceeded for registration: {email}")
        return Response(
            {'error': 'Too many registration attempts. Try again later.'},
            status=status.HTTP_429_TOO_MANY_REQUESTS
        )
    
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
            
            if User.objects.filter(email=email).exists():
                return Response({'error': 'Email already exists'}, 
                               status=status.HTTP_400_BAD_REQUEST)
            
            org = Organization.objects.create(name=organization_name, slug=org_slug)
            
            username = email.split('@')[0]
            display_name = username.replace('.', ' ').replace('_', ' ').title()
            user = User.objects.create_user(
                username=email,
                email=email,
                password=password,
                organization=org,
                full_name=display_name,
                first_name=display_name.split()[0] if display_name else username,
                role='admin'
            )
            
            logger.info(f"New organization created: {organization_name} by {email}")
            
            return Response({
                'message': 'Organization created successfully',
                'username': email
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
            
            username = email.split('@')[0]
            display_name = username.replace('.', ' ').replace('_', ' ').title()
            user = User.objects.create_user(
                username=email,
                email=email,
                password=password,
                organization=invitation.organization,
                full_name=display_name,
                first_name=display_name.split()[0] if display_name else username,
                role=invitation.role or 'contributor'
            )
            
            invitation.is_accepted = True
            invitation.accepted_at = timezone.now()
            invitation.save()
            
            logger.info(f"User registered via invitation: {email}")
            
            return Response({
                'message': 'Account created successfully',
                'username': email
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Registration error: {str(e)}")
            return Response({'error': 'Registration failed'}, 
                           status=status.HTTP_400_BAD_REQUEST)
    
    return Response({'error': 'Invalid registration request'}, 
                   status=status.HTTP_400_BAD_REQUEST)
