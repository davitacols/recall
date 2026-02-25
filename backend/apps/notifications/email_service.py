import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)


def send_email(to_email, subject, html_content):
    """Send transactional email through Resend REST API."""
    if not settings.RESEND_API_KEY:
        logger.warning("RESEND_API_KEY is missing; email skipped for %s", to_email)
        return False

    try:
        response = requests.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "from": settings.DEFAULT_FROM_EMAIL,
                "to": [to_email],
                "subject": subject,
                "html": html_content,
            },
            timeout=20,
        )
        if not response.ok:
            logger.error("Resend email failed (%s): %s", response.status_code, response.text)
            return False
        return True
    except Exception:
        logger.exception("Unexpected email error for %s", to_email)
        return False


def send_notification_email(user, notification):
    app_name = "Knoledgr"
    link = notification.link or "/notifications"
    subject = f"{app_name}: {notification.title}"
    html = f"""
    <h2>{notification.title}</h2>
    <p>{notification.message}</p>
    <p><a href="{settings.FRONTEND_URL}{link}">View in {app_name}</a></p>
    """
    return send_email(user.email, subject, html)


def send_invitation_email(email, token, inviter):
    app_name = "Knoledgr"
    inviter_name = inviter.full_name or inviter.username
    subject = f"{inviter_name} invited you to {app_name}"
    html = f"""
    <h2>You've been invited to join {app_name}</h2>
    <p>{inviter_name} has invited you to join their organization on {app_name}.</p>
    <p><a href="{settings.FRONTEND_URL}/invite/{token}">Accept Invitation</a></p>
    """
    return send_email(email, subject, html)
