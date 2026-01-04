import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.organizations.models import Organization
from apps.agile.models import Project, Sprint
from apps.conversations.models import Conversation
from apps.decisions.models import Decision

org = Organization.objects.filter(name='Pic2Nav Inc.').first()

if org:
    print(f"Deleting all data from {org.name}...")
    
    Project.objects.filter(organization=org).delete()
    Sprint.objects.filter(organization=org).delete()
    Conversation.objects.filter(organization=org).delete()
    Decision.objects.filter(organization=org).delete()
    
    print("Done. All data deleted from Pic2Nav Inc.")
else:
    print("Organization not found")
