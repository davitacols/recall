from django.core.management.base import BaseCommand, CommandError

from apps.notifications.email_service import (
    build_frontend_url,
    build_text_email,
    get_support_email,
    render_email_template,
    send_email,
)


SEGMENT_COPY = {
    "product_agency": {
        "subject_prefix": "A better way to keep product context, delivery, and decisions connected at",
        "reason_context": "a more connected way to manage client delivery, product decisions, and execution context",
        "intro": "Knoledgr was built for teams that need product, delivery, and organizational context to stay connected, not scattered across chats, meetings, docs, and project boards.",
        "bullets": [
            "keep client and internal decisions attached to the work they shape",
            "connect conversations directly to projects, issues, and sprint execution",
            "preserve handoff context across strategy, design, engineering, and delivery",
            "reduce re-explaining as teams move between clients, launches, and operating reviews",
        ],
    },
    "atlassian_partner": {
        "subject_prefix": "A stronger decision-memory layer for delivery and transformation teams at",
        "reason_context": "a more connected way to manage decisions, Jira-adjacent delivery context, and operational memory",
        "intro": "Knoledgr was built for teams that need delivery, governance, and decision context to stay connected, not scattered across chats, meetings, docs, and project boards.",
        "bullets": [
            "capture important decisions with rationale and follow-up review",
            "connect delivery conversations directly to projects, issues, blockers, and sprint work",
            "keep knowledge searchable alongside operational tooling instead of outside it",
            "reduce context loss across transformation, implementation, and governance work",
        ],
    },
    "ops_consulting": {
        "subject_prefix": "A better operating-memory layer for process-driven teams like",
        "reason_context": "a more connected way to manage procedures, decisions, and operational context",
        "intro": "Knoledgr was built for teams that need operating context to stay connected, not scattered across chats, meetings, docs, and project boards.",
        "bullets": [
            "capture decisions and operating changes with rationale and review history",
            "connect conversations directly to projects, tasks, and execution work",
            "keep procedures, documents, and team knowledge searchable over time",
            "reduce context loss as work moves across people, systems, and handoffs",
        ],
    },
    "venture_studio": {
        "subject_prefix": "A better way to preserve venture-building context across teams at",
        "reason_context": "a more connected way to manage venture decisions, delivery context, and institutional memory",
        "intro": "Knoledgr was built for teams that need venture, product, and operating context to stay connected, not scattered across chats, meetings, docs, and project boards.",
        "bullets": [
            "capture venture and portfolio decisions with rationale and follow-up review",
            "connect conversations directly to projects, issues, and execution work",
            "keep cross-team knowledge searchable instead of trapped inside one startup or function",
            "reduce context loss as companies move from ideation to launch to scale",
        ],
    },
    "default": {
        "subject_prefix": "A better way to keep decisions and execution connected at",
        "reason_context": "a more connected way to manage decisions, conversations, and execution context",
        "intro": "Knoledgr was built for teams that need execution and organizational context to stay connected, not scattered across chats, meetings, docs, and project boards.",
        "bullets": [
            "capture important decisions with rationale and follow-up review",
            "connect conversations directly to projects, issues, and sprint work",
            "keep documents and team knowledge searchable over time",
            "reduce context loss as work moves across people and teams",
        ],
    },
}


def _segment_copy(segment):
    key = (segment or "").strip().lower()
    return SEGMENT_COPY.get(key, SEGMENT_COPY["default"])


def build_partner_outreach_payload(company_name, contact_name="", segment=""):
    normalized_company = (company_name or "").strip()
    normalized_contact = (contact_name or "").strip()
    if not normalized_company:
        raise ValueError("company_name is required")

    segment_copy = _segment_copy(segment)
    greeting_target = normalized_contact or f"{normalized_company} team"
    subject = f"{segment_copy['subject_prefix']} {normalized_company}"
    preheader = (
        "Bring conversations, decisions, documents, and delivery context into one searchable workspace."
    )
    cta_label = "See Knoledgr"
    cta_url = build_frontend_url("/")
    reason_text = (
        f"You are receiving this introduction because Knoledgr believes {normalized_company} may benefit "
        f"from {segment_copy['reason_context']}. "
        "If this is not relevant, you can ignore this email or reply and we will not follow up."
    )
    bullet_list_html = "".join(f"<li>{bullet}</li>" for bullet in segment_copy["bullets"])
    summary_line = "; ".join(segment_copy["bullets"][:3])
    body_html = (
        f"<p>Hi {greeting_target},</p>"
        f"<p>{segment_copy['intro']}</p>"
        f"<p>For <strong>{normalized_company}</strong>, that means one place to:</p>"
        f"<ul>{bullet_list_html}</ul>"
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
            segment_copy["intro"],
            f"For {normalized_company}, that means one place to {summary_line}, and reduce context loss across handoffs.",
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
        parser.add_argument("--segment", default="", help="Optional outreach segment for light personalization")
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Render and print the outreach metadata without sending the email",
        )

    def handle(self, *args, **options):
        to_email = (options.get("to") or "").strip()
        company_name = options.get("company") or ""
        contact_name = options.get("contact_name") or ""
        segment = options.get("segment") or ""
        if not to_email:
            raise CommandError("--to is required")

        payload = build_partner_outreach_payload(company_name, contact_name=contact_name, segment=segment)

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
