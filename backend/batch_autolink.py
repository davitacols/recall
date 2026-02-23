import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.organizations.models import Organization
from apps.conversations.models import Conversation
from apps.decisions.models import Decision
from apps.knowledge.context_engine import ContextEngine

print("Starting batch auto-linking...")

for org in Organization.objects.all():
    print(f"\nProcessing organization: {org.name}")
    
    # Link conversations
    conversations = Conversation.objects.filter(organization=org, ai_processed=True)
    print(f"  Linking {conversations.count()} conversations...")
    for conv in conversations:
        try:
            ContextEngine.auto_link_content(conv, org)
        except Exception as e:
            print(f"    Error linking conversation {conv.id}: {e}")
    
    # Link decisions
    decisions = Decision.objects.filter(organization=org)
    print(f"  Linking {decisions.count()} decisions...")
    for decision in decisions:
        try:
            ContextEngine.auto_link_content(decision, org)
        except Exception as e:
            print(f"    Error linking decision {decision.id}: {e}")

print("\n[COMPLETE] Batch auto-linking finished!")
