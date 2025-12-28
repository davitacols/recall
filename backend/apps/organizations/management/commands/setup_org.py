from django.core.management.base import BaseCommand
from apps.organizations.models import Organization, User

class Command(BaseCommand):
    help = 'Create initial organization and admin user'
    
    def add_arguments(self, parser):
        parser.add_argument('--org-name', required=True)
        parser.add_argument('--org-slug', required=True)
        parser.add_argument('--admin-username', required=True)
        parser.add_argument('--admin-password', required=True)
    
    def handle(self, *args, **options):
        org, created = Organization.objects.get_or_create(
            slug=options['org_slug'],
            defaults={'name': options['org_name']}
        )
        
        if created:
            self.stdout.write(f"Created organization: {org.name}")
        
        admin_user, created = User.objects.get_or_create(
            username=options['admin_username'],
            organization=org,
            defaults={
                'role': 'admin',
                'is_staff': True,
                'is_superuser': True
            }
        )
        
        if created:
            admin_user.set_password(options['admin_password'])
            admin_user.save()
            self.stdout.write(f"Created admin user: {admin_user.username}")
        
        self.stdout.write(self.style.SUCCESS('Setup complete!'))