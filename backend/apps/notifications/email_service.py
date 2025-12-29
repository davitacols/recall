import resend
from django.conf import settings

resend.api_key = settings.RESEND_API_KEY

def send_welcome_email(user):
    """Send welcome email to new user"""
    try:
        resend.Emails.send({
            "from": settings.DEFAULT_FROM_EMAIL,
            "to": user.email,
            "subject": "Welcome to Recall!",
            "html": f"""
                <h1>Welcome to Recall, {user.get_full_name()}!</h1>
                <p>Your account has been successfully created for <strong>{user.organization.name}</strong>.</p>
                <p>You can now start collaborating with your team and building your company's knowledge base.</p>
                <p><a href="{settings.FRONTEND_URL}/login">Login to Recall</a></p>
                <br>
                <p>Best regards,<br>The Recall Team</p>
            """
        })
    except Exception as e:
        print(f"Failed to send welcome email: {e}")

def send_invitation_email(invitation):
    """Send invitation email"""
    try:
        invite_link = f"{settings.FRONTEND_URL}/invite/{invitation.token}"
        invited_by_name = invitation.invited_by.get_full_name() if invitation.invited_by else "Your team"
        
        resend.Emails.send({
            "from": settings.DEFAULT_FROM_EMAIL,
            "to": invitation.email,
            "subject": f"You're invited to join {invitation.organization.name} on Recall",
            "html": f"""
                <h1>You've been invited to Recall!</h1>
                <p>{invited_by_name} has invited you to join <strong>{invitation.organization.name}</strong> on Recall.</p>
                <p>Role: <strong>{invitation.get_role_display()}</strong></p>
                <p><a href="{invite_link}" style="background: #000; color: #fff; padding: 12px 24px; text-decoration: none; display: inline-block; margin: 20px 0;">Accept Invitation</a></p>
                <p>Or copy this link: {invite_link}</p>
                <p><small>This invitation expires in 7 days.</small></p>
                <br>
                <p>Best regards,<br>The Recall Team</p>
            """
        })
    except Exception as e:
        print(f"Failed to send invitation email: {e}")
