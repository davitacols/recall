import boto3
import logging
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
import jwt
from jwt import PyJWKClient
from apps.organizations.models import Organization

User = get_user_model()
logger = logging.getLogger(__name__)

class CognitoAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION')
        
        if not auth_header or not auth_header.startswith('Bearer '):
            return None
        
        token = auth_header.split(' ')[1]
        
        try:
            jwks_client = PyJWKClient(
                f"https://cognito-idp.{settings.AWS_REGION}.amazonaws.com/{settings.COGNITO_USER_POOL_ID}/.well-known/jwks.json"
            )
            signing_key = jwks_client.get_signing_key_from_jwt(token)
            
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256"],
                audience=settings.COGNITO_CLIENT_ID,
                options={"verify_aud": True}
            )
            
            org, _ = Organization.objects.get_or_create(
                slug='demo-company',
                defaults={'name': 'Demo Company'}
            )
            
            email = payload.get('email', '')
            username = payload.get('username', '') or (email.split('@')[0] if email else 'user')
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
            
            logger.info(f"User authenticated: {user.username}")
            return (user, token)
        except Exception as e:
            logger.warning(f"Authentication failed: {type(e).__name__}")
            raise AuthenticationFailed('Invalid token')

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
            
            self.client.admin_set_user_password(
                UserPoolId=settings.COGNITO_USER_POOL_ID,
                Username=username,
                Password=password,
                Permanent=True
            )
            
            logger.info(f"Cognito user created: {username}")
            return response
        except Exception as e:
            logger.error(f"Failed to create Cognito user: {type(e).__name__}")
            raise Exception('Failed to create user')
