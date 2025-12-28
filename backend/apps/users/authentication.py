import boto3
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
import jwt
from jwt import PyJWKClient
from apps.organizations.models import Organization

User = get_user_model()

class CognitoAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION')
        print(f"[AUTH DEBUG] Authorization header: {auth_header}")
        
        if not auth_header or not auth_header.startswith('Bearer '):
            print("[AUTH DEBUG] No Bearer token found")
            return None
        
        token = auth_header.split(' ')[1]
        print(f"[AUTH DEBUG] Token extracted: {token[:20]}...")
        
        try:
            # Verify Cognito JWT token
            jwks_client = PyJWKClient(f"https://cognito-idp.{settings.AWS_REGION}.amazonaws.com/{settings.COGNITO_USER_POOL_ID}/.well-known/jwks.json")
            signing_key = jwks_client.get_signing_key_from_jwt(token)
            
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256"],
                audience=settings.COGNITO_CLIENT_ID,
                options={"verify_aud": False}  # Disable audience verification for now
            )
            
            print(f"[AUTH DEBUG] Token decoded successfully, payload: {payload.get('username', 'N/A')}")
            
            # Get or create organization
            org, _ = Organization.objects.get_or_create(
                slug='demo-company',
                defaults={'name': 'Demo Company'}
            )
            
            # Get or create user from Cognito data
            email = payload.get('email', '')
            username = payload.get('username', '') or email.split('@')[0] if email else 'user'
            
            # Extract name from email or username
            display_name = username.split('@')[0] if '@' in username else username
            display_name = display_name.replace('.', ' ').replace('_', ' ').title()
            
            user, created = User.objects.get_or_create(
                username=username,
                organization=org,
                defaults={
                    'email': email,
                    'full_name': display_name,
                    'first_name': display_name.split()[0] if display_name else username,
                    'is_active': True,
                    'role': 'contributor'
                }
            )
            
            print(f"[AUTH DEBUG] User authenticated: {user.username}")
            return (user, token)
        except Exception as e:
            print(f"[AUTH DEBUG] Authentication failed: {str(e)}")
            raise AuthenticationFailed(f'Invalid token: {str(e)}')

class CognitoClient:
    def __init__(self):
        self.client = boto3.client(
            'cognito-idp',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION
        )
    
    def create_user(self, username, password, email, organization_slug):
        try:
            response = self.client.admin_create_user(
                UserPoolId=settings.COGNITO_USER_POOL_ID,
                Username=username,
                UserAttributes=[
                    {'Name': 'email', 'Value': email},
                    {'Name': 'custom:organization', 'Value': organization_slug}
                ],
                TemporaryPassword=password,
                MessageAction='SUPPRESS'
            )
            
            # Set permanent password
            self.client.admin_set_user_password(
                UserPoolId=settings.COGNITO_USER_POOL_ID,
                Username=username,
                Password=password,
                Permanent=True
            )
            
            return response
        except Exception as e:
            raise Exception(f'Failed to create user: {str(e)}')