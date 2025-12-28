from django.core.management.base import BaseCommand
from apps.users.authentication import CognitoClient
from apps.organizations.models import Organization, User
import boto3
from django.conf import settings

class Command(BaseCommand):
    help = 'Setup Cognito user pool and create demo users'
    
    def add_arguments(self, parser):
        parser.add_argument('--pool-name', type=str, default='RecallUserPool')
        parser.add_argument('--create-demo', action='store_true')
    
    def handle(self, *args, **options):
        try:
            client = boto3.client(
                'cognito-idp',
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_REGION
            )
            
            # Create user pool if needed
            pool_name = options['pool_name']
            
            try:
                response = client.create_user_pool(
                    PoolName=pool_name,
                    Policies={
                        'PasswordPolicy': {
                            'MinimumLength': 8,
                            'RequireUppercase': False,
                            'RequireLowercase': False,
                            'RequireNumbers': False,
                            'RequireSymbols': False
                        }
                    },
                    Schema=[
                        {
                            'Name': 'email',
                            'AttributeDataType': 'String',
                            'Required': True
                        },
                        {
                            'Name': 'organization',
                            'AttributeDataType': 'String',
                            'Mutable': True
                        }
                    ]
                )
                
                user_pool_id = response['UserPool']['Id']
                self.stdout.write(f'Created user pool: {user_pool_id}')
                
                # Create app client
                app_response = client.create_user_pool_client(
                    UserPoolId=user_pool_id,
                    ClientName='RecallApp',
                    ExplicitAuthFlows=['USER_PASSWORD_AUTH']
                )
                
                client_id = app_response['UserPoolClient']['ClientId']
                self.stdout.write(f'Created app client: {client_id}')
                
                self.stdout.write('\nAdd these to your .env file:')
                self.stdout.write(f'COGNITO_USER_POOL_ID={user_pool_id}')
                self.stdout.write(f'COGNITO_CLIENT_ID={client_id}')
                
            except Exception as e:
                if 'already exists' in str(e):
                    self.stdout.write('User pool already exists')
                else:
                    raise e
            
            # Create demo users if requested
            if options['create_demo']:
                self.create_demo_users()
                
        except Exception as e:
            self.stdout.write(f'Error: {str(e)}')
    
    def create_demo_users(self):
        # Create demo organization
        org, created = Organization.objects.get_or_create(
            slug='demo-company',
            defaults={'name': 'Demo Company'}
        )
        
        if created:
            self.stdout.write('Created demo organization')
        
        # Create demo users in Cognito
        cognito_client = CognitoClient()
        
        demo_users = [
            {'username': 'demo', 'email': 'demo@recall.com', 'password': 'demo123'},
            {'username': 'admin', 'email': 'admin@recall.com', 'password': 'admin123'},
        ]
        
        for user_data in demo_users:
            try:
                cognito_client.create_user(
                    username=user_data['username'],
                    password=user_data['password'],
                    email=user_data['email'],
                    organization_slug='demo-company'
                )
                self.stdout.write(f'Created demo user: {user_data["username"]}')
            except Exception as e:
                if 'already exists' in str(e):
                    self.stdout.write(f'User {user_data["username"]} already exists')
                else:
                    self.stdout.write(f'Error creating {user_data["username"]}: {str(e)}')