import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.notifications.utils import create_notification
from apps.organizations.models import User

# Create test notifications for all users
users = User.objects.all()
print(f"\n=== Creating test notifications for all users ===\n")

for user in users:
    # Create a test notification
    notif = create_notification(
        user=user,
        notification_type='system',
        title='Welcome to Notifications!',
        message='Your notification system is now active. You will receive updates here.',
        link='/dashboard'
    )
    print(f"[OK] Created notification for {user.username} (ID: {user.id})")

print(f"\n=== Done! ===")
print(f"Total notifications created: {users.count()}")
