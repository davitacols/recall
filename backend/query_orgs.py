import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.organizations.models import Organization, User

print("\n=== ORGANIZATIONS ===")
orgs = Organization.objects.all()
for org in orgs:
    print(f"Name: {org.name}, Slug: {org.slug}, ID: {org.id}")
    users = User.objects.filter(organization=org)
    print(f"  Users: {users.count()}")
    for user in users:
        print(f"    - {user.username} ({user.email}) - {user.role}")
    print()
