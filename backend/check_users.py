from apps.organizations.models import User, Organization

print('=== ORGANIZATIONS ===')
for o in Organization.objects.all():
    print(f'{o.id}: {o.name}')

print('\n=== USERS ===')
for u in User.objects.all():
    org_name = u.organization.name if u.organization else 'None'
    print(f'Email: {u.email}')
    print(f'  Active: {u.is_active}')
    print(f'  Organization: {org_name}')
    print(f'  Has password: {bool(u.password)}')
    print()
