from apps.organizations.models import User, Invitation
from apps.notifications.email_service import send_invitation_email
from django.utils import timezone
from datetime import timedelta

user = User.objects.filter(role='admin').first()
email = 'davitacols@gmail.com'

expires_at = timezone.now() + timedelta(days=7)
invitation = Invitation.objects.create(
    organization=user.organization,
    email=email,
    role='member',
    invited_by=user,
    expires_at=expires_at
)
result = send_invitation_email(invitation)
print(f'Email sent to {email}: {result}')
