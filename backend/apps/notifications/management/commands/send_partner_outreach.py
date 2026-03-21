from django.core.management.base import BaseCommand, CommandError

from apps.notifications.email_service import (
    build_frontend_url,
    build_text_email,
    get_support_email,
    render_email_template,
    send_email,
)


def build_partner_outreach_payload(company_name, contact_name=""):
    normalized_company = (company_name or "").strip()
    normalized_contact = (contact_name or "").strip()
    if not normalized_company:
        raise ValueError("company_name is required")

    greeting_target = normalized_contact or f"{normalized_company} team"
    subject = f"A better way to keep decisions and execution connected at {normalized_company}"
    preheader = (
        "Bring conversations, decisions, documents, and delivery context into one searchable workspace."
    )
    cta_label = "See Knoledgr"
    cta_url = build_frontend_url("/")
    reason_text = (
        f"You are receiving this introduction because Knoledgr believes {normalized_company} may benefit "
        "from a more connected way to manage decisions, conversations, and execution context. "
        "If this is not relevant, you can ignore this email or reply and we will not follow up."
    )
    body_html = (
        f"<p>Hi {greeting_target},</p>"
        "<p>Knoledgr was built for teams that need execution and organizational context to stay connected, "
        "not scattered across chats, meetings, docs, and project boards.</p>"
        f"<p>For <strong>{normalized_company}</strong>, that means one place to:</p>"
        "<ul>"
        "<li>capture important decisions with rationale and follow-up review</li>"
        "<li>connect conversations directly to projects, issues, and sprint work</li>"
        "<li>keep documents and team knowledge searchable over time</li>"
        "<li>reduce context loss as work moves across people and teams</li>"
        "</ul>"
        "<p>Instead of losing the why behind work, Knoledgr helps teams keep an operating memory that stays useful "
        "long after the meeting ends or the sprint closes.</p>"
        "<p>If you are exploring a better way to manage team knowledge, decision history, and delivery context, "
        "I would be glad to show you how Knoledgr can fit your workflow.</p>"
        "<p>Would you be open to a quick walkthrough?</p>"
        "<p>Best,<br/>The Knoledgr Team</p>"
    )
    html = render_email_template(
        preheader=preheader,
        title=subject,
        body_html=body_html,
        cta_label=cta_label,
        cta_url=cta_url,
        reason_text=reason_text,
        variant="marketing",
    )
    text = build_text_email(
        title=subject,
        body_lines=[
            f"Hi {greeting_target},",
            "Knoledgr was built for teams that need execution and organizational context to stay connected, not scattered across chats, meetings, docs, and project boards.",
            f"For {normalized_company}, that means one place to capture decisions, connect conversations to projects and sprints, keep knowledge searchable, and reduce context loss across handoffs.",
            "If you are exploring a better way to manage team knowledge, decision history, and delivery context, I would be glad to show you how Knoledgr can fit your workflow.",
            "Would you be open to a quick walkthrough?",
            "Best,",
            "The Knoledgr Team",
        ],
        cta_label=cta_label,
        cta_url=cta_url,
        reason_text=reason_text,
    )
    return {
        "subject": subject,
        "preheader": preheader,
        "cta_label": cta_label,
        "cta_url": cta_url,
        "reason_text": reason_text,
        "html": html,
        "text": text,
    }


class Command(BaseCommand):
    help = "Send a one-off partner/customer outreach email using the Knoledgr email template."

    def add_arguments(self, parser):
        parser.add_argument("--to", required=True, help="Destination email address")
        parser.add_argument("--company", required=True, help="Company name for personalization")
        parser.add_argument("--contact-name", default="", help="Optional contact or team name")
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Render and print the outreach metadata without sending the email",
        )

    def handle(self, *args, **options):
        to_email = (options.get("to") or "").strip()
        company_name = options.get("company") or ""
        contact_name = options.get("contact_name") or ""
        if not to_email:
            raise CommandError("--to is required")

        payload = build_partner_outreach_payload(company_name, contact_name=contact_name)

        if options.get("dry_run"):
            self.stdout.write(self.style.SUCCESS("Dry run complete."))
            self.stdout.write(f"To: {to_email}")
            self.stdout.write(f"Subject: {payload['subject']}")
            self.stdout.write(f"CTA: {payload['cta_label']} -> {payload['cta_url']}")
            return

        ok = send_email(
            to_email,
            payload["subject"],
            payload["html"],
            text_content=payload["text"],
            reply_to=get_support_email(),
        )
        if not ok:
            raise CommandError(f"Failed to send outreach email to {to_email}")

        self.stdout.write(self.style.SUCCESS(f"Sent outreach email to {to_email}"))
