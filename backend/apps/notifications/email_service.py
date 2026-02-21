import requests
from django.conf import settings

def send_email(to_email, subject, html_content):
    if not settings.RESEND_API_KEY:
        return False
    
    try:
        response = requests.post(
            'https://api.resend.com/emails',
            headers={
                'Authorization': f'Bearer {settings.RESEND_API_KEY}',
                'Content-Type': 'application/json'
            },
            json={
                'from': settings.DEFAULT_FROM_EMAIL,
                'to': [to_email],
                'subject': subject,
                'html': html_content
            }
        )
        return response.status_code == 200
    except:
        return False

def send_notification_email(user, notification):
    subject = f'New Notification: {notification.title}'
    html = f'''
    <h2>{notification.title}</h2>
    <p>{notification.message}</p>
    <p><a href="{settings.FRONTEND_URL}/notifications">View in Recall</a></p>
    '''
    return send_email(user.email, subject, html)

def send_invitation_email(email, token, inviter):
    subject = f'{inviter.full_name} invited you to Recall'
    html = f'''
    <h2>You've been invited to join Recall</h2>
    <p>{inviter.full_name} has invited you to join their organization on Recall.</p>
    <p><a href="{settings.FRONTEND_URL}/invite/{token}">Accept Invitation</a></p>
    '''
    return send_email(email, subject, html)
