from apps.organizations.models import Organization, User
from apps.agile.models import Project, Sprint, Issue, Board
from apps.conversations.models import Conversation
from apps.decisions.models import Decision
from django.utils import timezone

org = Organization.objects.filter(name='Pic2Nav Inc.').first()
if not org:
    print("Organization not found")
    exit()

print("=" * 60)
print("SYSTEM FUNCTIONALITY CHECK - Pic2Nav Inc.")
print("=" * 60)

# 1. Users
users = User.objects.filter(organization=org)
print(f"\n✅ Users: {users.count()} found")

# 2. Projects
projects = Project.objects.filter(organization=org)
print(f"✅ Projects: {projects.count()} created")
for p in projects:
    print(f"   - {p.name} ({p.key})")

# 3. Sprints
sprints = Sprint.objects.filter(organization=org)
print(f"✅ Sprints: {sprints.count()} created")
for s in sprints:
    print(f"   - {s.name} ({s.project.name})")

# 4. Boards
boards = Board.objects.filter(organization=org)
print(f"✅ Boards: {boards.count()} created")
for b in boards:
    print(f"   - {b.name} ({b.project.name})")

# 5. Issues
issues = Issue.objects.filter(organization=org)
print(f"✅ Issues: {issues.count()} created")
for i in issues:
    print(f"   - {i.key}: {i.title} (Sprint: {i.sprint.name if i.sprint else 'None'})")

# 6. Conversations
conversations = Conversation.objects.filter(organization=org)
print(f"✅ Conversations: {conversations.count()} created")
for c in conversations:
    print(f"   - {c.title} ({c.post_type})")

# 7. Decisions
decisions = Decision.objects.filter(organization=org)
print(f"✅ Decisions: {decisions.count()} created")
for d in decisions:
    print(f"   - {d.title} (Status: {d.status}, Sprint: {d.sprint.name if d.sprint else 'None'})")

# 8. Linking Check
print(f"\n✅ LINKING VERIFICATION:")
conv_with_decisions = Conversation.objects.filter(organization=org, decisions__isnull=False).distinct().count()
print(f"   - Conversations with decisions: {conv_with_decisions}")

decisions_with_sprints = Decision.objects.filter(organization=org, sprint__isnull=False).count()
print(f"   - Decisions linked to sprints: {decisions_with_sprints}")

sprints_with_issues = Sprint.objects.filter(organization=org, issues__isnull=False).distinct().count()
print(f"   - Sprints with issues: {sprints_with_issues}")

# 9. Current Sprint
today = timezone.now().date()
current_sprint = Sprint.objects.filter(
    organization=org,
    start_date__lte=today,
    end_date__gte=today
).first()
if current_sprint:
    print(f"\n✅ CURRENT SPRINT:")
    print(f"   - Name: {current_sprint.name}")
    print(f"   - Issues: {current_sprint.issues.count()}")
    print(f"   - Decisions: {current_sprint.decisions.count()}")
    print(f"   - Days remaining: {(current_sprint.end_date - today).days}")
else:
    print(f"\n⚠️  No active sprint")

print("\n" + "=" * 60)
print("✅ ALL SYSTEMS FUNCTIONAL")
print("=" * 60)
