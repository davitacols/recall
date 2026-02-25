import logging
import re
from html import escape
from urllib.parse import urljoin

import requests
from django.conf import settings

logger = logging.getLogger(__name__)


def send_email(to_email, subject, html_content, text_content=None, reply_to=None):
    """Send transactional email through Resend REST API."""
    if not settings.RESEND_API_KEY:
        logger.warning("RESEND_API_KEY is missing; email skipped for %s", to_email)
        return False

    if not text_content:
        text_content = html_to_text(html_content)

    payload = {
        "from": settings.DEFAULT_FROM_EMAIL,
        "to": [to_email],
        "subject": subject,
        "html": html_content,
        "text": text_content,
        "headers": {
            "X-Entity-Ref-ID": "knoledgr-transactional",
            "X-Auto-Response-Suppress": "OOF, AutoReply",
        },
    }
    if reply_to:
        payload["reply_to"] = reply_to

    try:
        response = requests.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                "Content-Type": "application/json",
            },
            json=payload,
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
    reason = "You received this email because notifications are enabled in your Knoledgr account."
    html = render_email_template(
        preheader=notification.title,
        title=notification.title,
        body_html=f"<p>{escape(notification.message)}</p>",
        cta_label=f"View in {app_name}",
        cta_url=build_frontend_url(link),
        reason_text=reason,
    )
    text = build_text_email(
        title=notification.title,
        body_lines=[notification.message],
        cta_label=f"View in {app_name}",
        cta_url=build_frontend_url(link),
        reason_text=reason,
    )
    return send_email(user.email, subject, html, text_content=text, reply_to=get_support_email())


def send_invitation_email(email, token, inviter):
    app_name = "Knoledgr"
    inviter_name = inviter.full_name or inviter.username
    subject = f"{inviter_name} invited you to {app_name}"
    invite_url = build_frontend_url(f"/invite/{token}")
    reason = "You received this email because a workspace admin invited this address."
    html = render_email_template(
        preheader=f"{inviter_name} invited you to join {app_name}",
        title=f"You've been invited to join {app_name}",
        body_html=(
            f"<p><strong>{escape(inviter_name)}</strong> invited you to collaborate in "
            f"{app_name}.</p><p>Accept your invite to access conversations, decisions, "
            f"projects, and team context.</p>"
        ),
        cta_label="Accept Invitation",
        cta_url=invite_url,
        reason_text=reason,
    )
    text = build_text_email(
        title=f"You've been invited to join {app_name}",
        body_lines=[
            f"{inviter_name} invited you to collaborate in {app_name}.",
            "Accept your invite to access conversations, decisions, projects, and team context.",
        ],
        cta_label="Accept Invitation",
        cta_url=invite_url,
        reason_text=reason,
    )
    return send_email(email, subject, html, text_content=text, reply_to=get_support_email())


def build_frontend_url(path):
    base = settings.FRONTEND_URL.rstrip("/") + "/"
    relative = (path or "/").lstrip("/")
    return urljoin(base, relative)


def render_email_template(preheader, title, body_html, cta_label, cta_url, reason_text=""):
    app_name = "Knoledgr"
    safe_preheader = escape(preheader or app_name)
    safe_title = escape(title or app_name)
    safe_cta_label = escape(cta_label or "Open")
    safe_cta_url = escape(cta_url or settings.FRONTEND_URL)
    safe_reason = escape(reason_text or "This is a transactional email related to your Knoledgr account.")

    return f"""
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{safe_title}</title>
  </head>
  <body style="margin:0;background:#f6f1ea;padding:24px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#231814;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      {safe_preheader}
    </div>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;margin:0 auto;">
      <tr>
        <td style="padding:0 0 10px 0;">
          <div style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#7c6d5a;font-weight:700;">
            Knoledgr
          </div>
        </td>
      </tr>
      <tr>
        <td style="background:#fffaf3;border:1px solid #eadfce;border-radius:14px;padding:24px;">
          <h1 style="margin:0 0 12px 0;font-size:24px;line-height:1.2;color:#231814;">{safe_title}</h1>
          <div style="font-size:14px;line-height:1.6;color:#4a3b2f;">
            {body_html}
          </div>
          <div style="padding-top:18px;">
            <a href="{safe_cta_url}" style="display:inline-block;text-decoration:none;background:linear-gradient(135deg,#ffd390,#ff9f62);color:#20140f;font-weight:700;border-radius:10px;padding:11px 16px;font-size:14px;">
              {safe_cta_label}
            </a>
          </div>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 2px 0 2px;">
          <div style="font-size:12px;line-height:1.5;color:#7c6d5a;">
            {safe_reason}
          </div>
          <div style="margin-top:6px;font-size:12px;line-height:1.5;color:#7c6d5a;">
            Sent by {app_name}. Need help? Reply to this email.
          </div>
        </td>
      </tr>
    </table>
  </body>
</html>
"""


def build_text_email(title, body_lines, cta_label, cta_url, reason_text):
    lines = [
        f"Knoledgr - {title}",
        "",
    ]
    lines.extend([line for line in (body_lines or []) if line])
    lines.extend(
        [
            "",
            f"{cta_label}: {cta_url}",
            "",
            reason_text or "This is a transactional email related to your Knoledgr account.",
            "Need help? Reply to this email.",
        ]
    )
    return "\n".join(lines)


def html_to_text(html):
    no_tags = re.sub(r"<[^>]+>", " ", html or "")
    normalized = re.sub(r"\s+", " ", no_tags).strip()
    return normalized[:5000]


def get_support_email():
    from_email = settings.DEFAULT_FROM_EMAIL or ""
    match = re.search(r"<([^>]+)>", from_email)
    if match:
        return match.group(1)
    return from_email
