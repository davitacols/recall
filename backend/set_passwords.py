import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.organizations.models import User

users = User.objects.filter(organization__slug='pic2nav-inc')
for user in users:
    user.set_password('password123')
    user.save()
    print(f'Set password for {user.username}')

print('\nYou can now login with:')
print('Email: sarah@pic2nav.com')
print('Password: password123')
