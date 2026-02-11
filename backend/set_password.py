import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.organizations.models import User

user = User.objects.get(email='charlie@techcorp.com')
user.set_password('password123')
user.save()
print(f'Password set for {user.email}')
print(f'Login with: charlie@techcorp.com / password123')
