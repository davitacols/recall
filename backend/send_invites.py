from apps.organizations.models import User, Invitation
from apps.notifications.email_service import send_invitation_email
from django.utils import timezone
from datetime import timedelta

user = User.objects.filter(role='admin').first()
emails = ['dataDisk52@gmail.com', 'turfglobaltsp@gmail.com']

for email in emails:
    expires_at = timezone.now() + timedelta(days=7)
    invitation = Invitation.objects.create(
        organization=user.organization,
        email=email,
        role='member',
        invited_by=user,
        expires_at=expires_at
    )
    send_invitation_email(invitation)
    print(f'Sent invitation to {email}')
