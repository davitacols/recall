import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.organizations.models import Organization
from apps.conversations.models import Conversation

org = Organization.objects.first()
print(f'Organization: {org.name}')

convs = Conversation.objects.filter(organization=org, ai_processed=True)
print(f'AI Processed Conversations: {convs.count()}')

if convs.exists():
    print(f'\nSample conversation:')
    conv = convs.first()
    print(f'  Title: {conv.title}')
    print(f'  Keywords: {conv.ai_keywords}')
    print(f'  Summary: {conv.ai_summary[:100]}...')
