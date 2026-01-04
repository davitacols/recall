import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.organizations.models import Organization
from apps.agile.models import Project, Sprint, Issue
from apps.conversations.models import Conversation
from apps.decisions.models import Decision

orgs = Organization.objects.all()

for org in orgs:
    print(f"\n{org.name} (ID: {org.id})")
    print(f"  Projects: {Project.objects.filter(organization=org).count()}")
    print(f"  Sprints: {Sprint.objects.filter(organization=org).count()}")
    print(f"  Issues: {Issue.objects.filter(organization=org).count()}")
    print(f"  Conversations: {Conversation.objects.filter(organization=org).count()}")
    print(f"  Decisions: {Decision.objects.filter(organization=org).count()}")
