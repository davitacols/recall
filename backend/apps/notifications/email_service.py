import logging
import re
import uuid
from html import escape
from urllib.parse import urljoin

import requests
from django.conf import settings
from django.core.mail import EmailMultiAlternatives

logger = logging.getLogger(__name__)


def send_email(to_email, subject, html_content, text_content=None, reply_to=None):
    if not text_content:
        text_content = html_to_text(html_content)
    support_email = reply_to or get_support_email()
    entity_ref_id = f"knoledgr-{uuid.uuid4()}"
    headers = {
        "X-Entity-Ref-ID": entity_ref_id,
        "X-Auto-Response-Suppress": "OOF, AutoReply",
        "List-Unsubscribe": f"<mailto:{support_email}?subject=unsubscribe>",
    }

    # Prefer Resend when configured; otherwise fallback to Django email backend.
    if not settings.RESEND_API_KEY:
        try:
            msg = EmailMultiAlternatives(
                subject=subject,
                body=text_content,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[to_email],
                reply_to=[support_email] if support_email else None,
                headers=headers,
            )
            msg.attach_alternative(html_content, "text/html")
            msg.send(fail_silently=False)
            logger.info("Sent email via Django backend to %s (Resend key not configured)", to_email)
            return True
        except Exception:
            logger.exception("Fallback Django email send failed for %s", to_email)
            return False

    payload = {
        "from": settings.DEFAULT_FROM_EMAIL,
        "to": [to_email],
        "subject": subject,
        "html": html_content,
        "text": text_content,
        "headers": headers,
    }
    if support_email:
        payload["reply_to"] = support_email

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
        variant="default",
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
    inviter_email = getattr(inviter, "email", "") or ""
    org_name = (
        getattr(inviter, "organization_name", "")
        or getattr(getattr(inviter, "organization", None), "name", "")
        or "your workspace"
    )
    subject = f"Invitation to join {app_name} ({org_name})"
    invite_url = build_frontend_url(f"/invite/{token}")
    reason = "You received this email because a workspace admin invited this address to join their Knoledgr workspace."
    html = render_email_template(
        preheader=f"Workspace invitation from {inviter_name}",
        title=f"You've been invited to join {app_name}",
        body_html=(
            f"<p><strong>{escape(inviter_name)}</strong>"
            f"{f' ({escape(inviter_email)})' if inviter_email else ''} invited you to join "
            f"<strong>{escape(org_name)}</strong> on {app_name}.</p>"
            "<p>If you were expecting this invitation, use the button below to continue.</p>"
            "<p style=\"margin:0 0 8px 0;\"><strong>Invite link:</strong></p>"
            f"<p style=\"margin:0;word-break:break-all;\"><a href=\"{escape(invite_url)}\" style=\"color:#1d4ed8;text-decoration:underline;\">{escape(invite_url)}</a></p>"
            "<p style=\"margin-top:12px;\">If you were not expecting this, you can ignore this email safely.</p>"
        ),
        cta_label="Accept Invitation",
        cta_url=invite_url,
        reason_text=reason,
        variant="default",
    )
    text = build_text_email(
        title=f"You've been invited to join {app_name}",
        body_lines=[
            f"{inviter_name}{f' ({inviter_email})' if inviter_email else ''} invited you to join {org_name} on {app_name}.",
            "If you were expecting this, use the link below to accept the invitation.",
            f"Invite link: {invite_url}",
            "If you were not expecting this, you can ignore this email safely.",
        ],
        cta_label="Accept Invitation",
        cta_url=invite_url,
        reason_text=reason,
    )
    return send_email(email, subject, html, text_content=text, reply_to=get_support_email())

def send_welcome_email(user):
    app_name = "Knoledgr"
    user_name = user.get_full_name() or user.username
    subject = f"Welcome to {app_name}, {user_name}"
    home_url = build_frontend_url("/")
    reason = "You received this email because a new account was created with this address."
    html = render_email_template(
        preheader=f"Welcome to {app_name}",
        title=f"Welcome to {app_name}",
        body_html=(
            f"<p>Hi {escape(user_name)},</p>"
            f"<p>Your workspace is ready. You can now capture decisions, organize context, "
            f"and keep team knowledge searchable.</p>"
        ),
        cta_label="Open Workspace",
        cta_url=home_url,
        reason_text=reason,
        variant="default",
    )
    text = build_text_email(
        title=f"Welcome to {app_name}",
        body_lines=[
            f"Hi {user_name},",
            "Your workspace is ready.",
            "You can now capture decisions, organize context, and keep team knowledge searchable.",
        ],
        cta_label="Open Workspace",
        cta_url=home_url,
        reason_text=reason,
    )
    return send_email(user.email, subject, html, text_content=text, reply_to=get_support_email())

def send_password_reset_email(user, reset_url):
    app_name = "Knoledgr"
    user_name = user.get_full_name() or user.username
    subject = f"Reset your {app_name} password"
    reason = "You received this email because a password reset was requested for this account."
    html = render_email_template(
        preheader=f"Reset your {app_name} password",
        title="Reset your password",
        body_html=(
            f"<p>Hi {escape(user_name)},</p>"
            "<p>We received a request to reset your password.</p>"
            "<p>If this was you, use the button below. If not, you can ignore this email.</p>"
        ),
        cta_label="Reset Password",
        cta_url=reset_url,
        reason_text=reason,
        variant="security",
    )
    text = build_text_email(
        title="Reset your password",
        body_lines=[
            f"Hi {user_name},",
            "We received a request to reset your password.",
            "If this was you, use the link below. If not, you can ignore this email.",
        ],
        cta_label="Reset Password",
        cta_url=reset_url,
        reason_text=reason,
    )
    return send_email(user.email, subject, html, text_content=text, reply_to=get_support_email())


def send_workspace_switch_code_email(user, organization_name, code):
    app_name = "Knoledgr"
    user_name = user.get_full_name() or user.username
    subject = f"Your {app_name} workspace switch code"
    reason = "You received this email because a workspace switch was requested."
    html = render_email_template(
        preheader=f"Workspace switch code for {organization_name}",
        title="Verify workspace switch",
        body_html=(
            f"<p>Hi {escape(user_name)},</p>"
            f"<p>Use this verification code to switch to <strong>{escape(organization_name)}</strong>:</p>"
            f"<p style=\"font-size:28px;font-weight:800;letter-spacing:0.18em;margin:10px 0 6px;\">{escape(code)}</p>"
            "<p>This code expires in 10 minutes.</p>"
        ),
        cta_label="Open Knoledgr",
        cta_url=build_frontend_url("/"),
        reason_text=reason,
        variant="security",
    )
    text = build_text_email(
        title="Verify workspace switch",
        body_lines=[
            f"Hi {user_name},",
            f"Use this verification code to switch to {organization_name}: {code}",
            "This code expires in 10 minutes.",
        ],
        cta_label="Open Knoledgr",
        cta_url=build_frontend_url("/"),
        reason_text=reason,
    )
    return send_email(user.email, subject, html, text_content=text, reply_to=get_support_email())


def build_frontend_url(path):
    base = settings.FRONTEND_URL.rstrip("/") + "/"
    relative = (path or "/").lstrip("/")
    return urljoin(base, relative)


def render_email_template(preheader, title, body_html, cta_label, cta_url, reason_text="", variant="default"):
    app_name = "Knoledgr"
    safe_preheader = escape(preheader or app_name)
    safe_title = escape(title or app_name)
    safe_cta_label = escape(cta_label or "Open")
    safe_cta_url = escape(cta_url or settings.FRONTEND_URL)
    safe_reason = escape(reason_text or "This is a transactional email related to your Knoledgr account.")
    normalized_variant = (variant or "default").strip().lower()

    variant_config = {
        "default": {
            "tag": "Knoledgr Update",
            "badge_bg": "linear-gradient(135deg,#ffe3b7,#ffc68c,#ffa86a)",
            "badge_text": "#6a3f23",
            "cta_bg": "#1f140d",
            "cta_text": "#ffe8cf",
        },
        "security": {
            "tag": "Security Notice",
            "badge_bg": "linear-gradient(135deg,#d9ecff,#b8dcff,#8fc4f8)",
            "badge_text": "#123a5c",
            "cta_bg": "#0f2d47",
            "cta_text": "#e8f4ff",
        },
        "digest": {
            "tag": "Digest Summary",
            "badge_bg": "linear-gradient(135deg,#e8f8ec,#c9f1d5,#9ce2b8)",
            "badge_text": "#1e4e35",
            "cta_bg": "#153d2b",
            "cta_text": "#e6fff2",
        },
        "marketing": {
            "tag": "Knoledgr News",
            "badge_bg": "linear-gradient(135deg,#ffe9b9,#ffd08f,#ffb878)",
            "badge_text": "#6b3c18",
            "cta_bg": "#2a1608",
            "cta_text": "#fff0df",
        },
    }.get(normalized_variant, {
        "tag": "Knoledgr Update",
        "badge_bg": "linear-gradient(135deg,#ffe3b7,#ffc68c,#ffa86a)",
        "badge_text": "#6a3f23",
        "cta_bg": "#1f140d",
        "cta_text": "#ffe8cf",
    })

    return f"""
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{safe_title}</title>
  </head>
  <body style="margin:0;padding:0;background:#f3efe8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#201611;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      {safe_preheader}
    </div>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f3efe8;">
      <tr>
        <td style="padding:20px 12px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:640px;margin:0 auto;">
            <tr>
              <td style="padding:0 0 10px 0;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#7b6957;font-weight:800;">
                      {app_name}
                    </td>
                    <td align="right" style="font-size:11px;color:#9a8978;">
                      Transactional
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="border:1px solid #e4d8c9;border-radius:18px;overflow:hidden;background:#fffaf3;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td style="padding:20px 22px;background:{variant_config['badge_bg']};border-bottom:1px solid #e4d8c9;">
                      <p style="margin:0;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:{variant_config['badge_text']};font-weight:700;">
                        {escape(variant_config['tag'])}
                      </p>
                      <h1 style="margin:8px 0 0 0;font-size:25px;line-height:1.18;color:#21140d;">
                        {safe_title}
                      </h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:22px;">
                      <div style="font-size:14px;line-height:1.64;color:#433328;">
                        {body_html}
                      </div>
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:18px;">
                        <tr>
                          <td style="border-radius:12px;background:{variant_config['cta_bg']};">
                            <a href="{safe_cta_url}" style="display:inline-block;text-decoration:none;color:{variant_config['cta_text']};font-size:14px;font-weight:700;padding:12px 18px;border-radius:12px;">
                              {safe_cta_label}
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:14px 22px 18px;background:#fff5ea;border-top:1px solid #e8ddcf;">
                      <p style="margin:0;font-size:12px;line-height:1.55;color:#7c6c5b;">
                        {safe_reason}
                      </p>
                      <p style="margin:6px 0 0 0;font-size:12px;line-height:1.55;color:#7c6c5b;">
                        Sent by {app_name}. Need help? Reply to this email.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:10px 2px 0 2px;font-size:11px;line-height:1.4;color:#9a8b7d;">
                This message was sent automatically for account and workflow activity.
              </td>
            </tr>
          </table>
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
    configured_support_email = (getattr(settings, "SUPPORT_EMAIL", "") or "").strip()
    if configured_support_email:
        return configured_support_email
    from_email = settings.DEFAULT_FROM_EMAIL or ""
    match = re.search(r"<([^>]+)>", from_email)
    if match:
        return match.group(1)
    return from_email
