from apps.organizations.models import Invitation
from apps.notifications.email_service import send_invitation_email

email = 'davitacols@gmail.com'
invitation = Invitation.objects.filter(email=email).first()

if invitation:
    result = send_invitation_email(invitation)
    print(f'Email sent to {email}: {result}')
else:
    print(f'No invitation found for {email}')
