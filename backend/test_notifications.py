import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.notifications.models import Notification
from apps.organizations.models import User

# Get all users
users = User.objects.all()
print(f"\n=== Users in system ===")
for user in users:
    print(f"- {user.username} ({user.get_full_name()}) - ID: {user.id}")

# Get all notifications
notifications = Notification.objects.all()
print(f"\n=== Total Notifications: {notifications.count()} ===")
for notif in notifications:
    print(f"\nID: {notif.id}")
    print(f"User: {notif.user.username}")
    print(f"Type: {notif.notification_type}")
    print(f"Title: {notif.title}")
    print(f"Message: {notif.message}")
    print(f"Link: {notif.link}")
    print(f"Read: {notif.is_read}")
    print(f"Created: {notif.created_at}")

# Test creating a notification
if users.exists():
    test_user = users.first()
    from apps.notifications.utils import create_notification
    
    test_notif = create_notification(
        user=test_user,
        notification_type='system',
        title='Test Notification',
        message='This is a test notification to verify the system works',
        link='/dashboard'
    )
    print(f"\n=== Created Test Notification ===")
    print(f"ID: {test_notif.id}")
    print(f"User: {test_notif.user.username}")
    print(f"Success!")
