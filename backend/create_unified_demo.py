import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.organizations.models import Organization, User
from apps.conversations.models import Conversation
from apps.decisions.models import Decision
from apps.knowledge.context_engine import ContextEngine

org = Organization.objects.first()
user = User.objects.filter(organization=org).first()

if not org or not user:
    print("[ERROR] Create an organization and user first!")
    exit()

print(f"[OK] Using org: {org.name}, user: {user.get_full_name()}")

# Create conversation
conv = Conversation.objects.create(
    organization=org,
    author=user,
    post_type='update',
    title='Migrating to PostgreSQL',
    content='We need to migrate from SQLite to PostgreSQL for better performance and scalability.',
    ai_keywords=['postgresql', 'database', 'migration', 'performance'],
    ai_processed=True
)
print(f"[OK] Created conversation #{conv.id}: {conv.title}")

# Create decision
decision = Decision.objects.create(
    organization=org,
    conversation=conv,
    decision_maker=user,
    title='Approve PostgreSQL Migration',
    description='After discussion, we approve the migration to PostgreSQL.',
    rationale='Better performance and scalability for growing data',
    status='approved'
)
print(f"[OK] Created decision #{decision.id}: {decision.title}")

# Trigger auto-linking
ContextEngine.auto_link_content(conv, org)
ContextEngine.auto_link_content(decision, org)
print(f"[OK] Auto-linking completed")

# Check timeline
from apps.knowledge.unified_models import UnifiedActivity
activities = UnifiedActivity.objects.filter(organization=org).order_by('-created_at')[:5]
print(f"\n[TIMELINE] {activities.count()} activities:")
for act in activities:
    print(f"  - {act.activity_type}: {act.title}")

# Check links
from apps.knowledge.unified_models import ContentLink
links = ContentLink.objects.filter(organization=org)
print(f"\n[LINKS] {links.count()} connections:")
for link in links:
    print(f"  - {link.link_type}: {link.source_object} -> {link.target_object}")

print("\n[SUCCESS] Demo data created successfully!")
print(f"   View conversation: http://localhost:3000/conversations/{conv.id}")
print(f"   View decision: http://localhost:3000/decisions/{decision.id}")
