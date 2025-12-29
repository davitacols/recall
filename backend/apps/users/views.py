from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from .authentication import CognitoClient
import boto3
from django.conf import settings

User = get_user_model()

@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    username = request.data.get('username')
    password = request.data.get('password')
    
    print(f"[LOGIN] Attempting login with username: {username}")
    
    if not username or not password:
        return Response({'error': 'Username and password required'}, 
                       status=status.HTTP_400_BAD_REQUEST)
    
    # Try local authentication first - support both username and email
    from django.contrib.auth import authenticate
    user = authenticate(username=username, password=password)
    
    # If username auth failed, try email
    if not user:
        try:
            user_obj = User.objects.get(email__iexact=username)
            user = authenticate(username=user_obj.username, password=password)
            print(f"[LOGIN] Tried email lookup, found username: {user_obj.username}")
        except User.DoesNotExist:
            print(f"[LOGIN] No user found with email: {username}")
    
    print(f"[LOGIN] Local auth result: {user}")
    
    if user:
        # Local authentication successful
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)
        
        print(f"[LOGIN] Success for user: {user.username}")
        
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
    
    print(f"[LOGIN] Local auth failed, trying Cognito...")
    
    # Fallback to Cognito authentication
    try:
        client = boto3.client(
            'cognito-idp',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION
        )
        
        response = client.initiate_auth(
            ClientId=settings.COGNITO_CLIENT_ID,
            AuthFlow='USER_PASSWORD_AUTH',
            AuthParameters={
                'USERNAME': username,
                'PASSWORD': password
            }
        )
        
        access_token = response['AuthenticationResult']['AccessToken']
        id_token = response['AuthenticationResult']['IdToken']
        
        # Get user info from token
        user_response = client.get_user(AccessToken=access_token)
        user_attrs = {attr['Name']: attr['Value'] for attr in user_response['UserAttributes']}
        
        return Response({
            'access_token': access_token,
            'id_token': id_token,
            'user': {
                'username': user_attrs.get('email', '').split('@')[0],
                'email': user_attrs.get('email', ''),
                'full_name': user_attrs.get('email', '').split('@')[0].title(),
                'organization': 'Demo Company'
            }
        })
    except Exception as e:
        print(f"[LOGIN] Cognito auth failed: {e}")
        return Response({'error': 'Invalid credentials'}, 
                       status=status.HTTP_401_UNAUTHORIZED)

@api_view(['GET'])
def profile(request):
    user = request.user
    avatar_url = request.build_absolute_uri(user.avatar.url) if user.avatar else None
    org_logo_url = request.build_absolute_uri(user.organization.logo.url) if user.organization.logo else None
    
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
        'organization_color': user.organization.primary_color
    })

@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    email = request.data.get('email')
    password = request.data.get('password')
    token = request.data.get('token')
    organization_name = request.data.get('organization')
    
    print(f"[REGISTER] Received: email={email}, token={token}, org={organization_name}")
    
    # Organization registration (first user creates org)
    if organization_name and not token:
        if not all([email, password, organization_name]):
            return Response({'error': 'Email, password, and organization name required'}, 
                           status=status.HTTP_400_BAD_REQUEST)
        
        # Validate company email (no free email providers)
        free_email_domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'icloud.com', 'mail.com', 'protonmail.com', 'zoho.com', 'yandex.com']
        email_domain = email.split('@')[-1].lower()
        if email_domain in free_email_domains:
            return Response({'error': 'Please use a company email address. Free email providers are not allowed for organization registration.'}, 
                           status=status.HTTP_400_BAD_REQUEST)
        
        # Validate organization name
        if len(organization_name.strip()) < 2:
            return Response({'error': 'Organization name must be at least 2 characters'}, 
                           status=status.HTTP_400_BAD_REQUEST)
        
        if not organization_name.replace(' ', '').replace('-', '').isalnum():
            return Response({'error': 'Organization name can only contain letters, numbers, spaces, and hyphens'}, 
                           status=status.HTTP_400_BAD_REQUEST)
        
        try:
            from apps.organizations.models import Organization
            import re
            
            # Create slug from organization name
            org_slug = re.sub(r'[^a-z0-9-]', '', organization_name.lower().replace(' ', '-'))
            
            # Check if organization already exists
            if Organization.objects.filter(slug=org_slug).exists():
                return Response({'error': 'An organization with this name already exists. Please choose a different name.'}, 
                               status=status.HTTP_400_BAD_REQUEST)
            
            # Check if email already exists
            if User.objects.filter(email=email).exists():
                return Response({'error': 'An account with this email already exists'}, 
                               status=status.HTTP_400_BAD_REQUEST)
            
            # Create organization
            org = Organization.objects.create(
                name=organization_name,
                slug=org_slug
            )
            
            # Create admin user
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
            
            return Response({
                'message': 'Organization created successfully',
                'username': email
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            print(f"[REGISTER] Error: {str(e)}")
            return Response({'error': f'Registration failed: {str(e)}'}, 
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
            
            # Check if user already exists
            if User.objects.filter(email=email, organization=invitation.organization).exists():
                return Response({'error': 'User already exists in this organization'}, 
                               status=status.HTTP_400_BAD_REQUEST)
            
            # Create user
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
            
            # Mark invitation as accepted
            invitation.is_accepted = True
            invitation.accepted_at = timezone.now()
            invitation.save()
            
            return Response({
                'message': 'Account created successfully',
                'username': email
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            print(f"[REGISTER] Error: {str(e)}")
            return Response({'error': f'Registration failed: {str(e)}'}, 
                           status=status.HTTP_400_BAD_REQUEST)
    
    return Response({'error': 'Invalid registration request'}, 
                   status=status.HTTP_400_BAD_REQUEST)