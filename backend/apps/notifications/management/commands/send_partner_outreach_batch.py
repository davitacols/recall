import csv
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from apps.notifications.email_service import get_support_email, send_email
from apps.notifications.management.commands.send_partner_outreach import (
    build_partner_outreach_payload,
)


class Command(BaseCommand):
    help = "Send batch partner outreach emails from a CSV target list."

    def add_arguments(self, parser):
        parser.add_argument("--csv", required=True, help="Path to outreach CSV file")
        parser.add_argument("--limit", type=int, default=0, help="Optional maximum number of rows to process")
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Render and print targets without sending emails",
        )

    def handle(self, *args, **options):
        csv_path = Path(options["csv"])
        if not csv_path.exists():
            raise CommandError(f"CSV file not found: {csv_path}")

        limit = max(0, int(options.get("limit") or 0))
        dry_run = bool(options.get("dry_run"))

        sent_count = 0
        failed = []
        processed = 0

        with csv_path.open("r", encoding="utf-8-sig", newline="") as handle:
            reader = csv.DictReader(handle)
            for row in reader:
                if limit and processed >= limit:
                    break

                to_email = (row.get("email") or "").strip()
                company_name = (row.get("company") or "").strip()
                contact_name = (row.get("contact_name") or "").strip()
                segment = (row.get("segment") or "").strip()

                if not to_email or not company_name:
                    failed.append({"email": to_email or "<missing>", "reason": "missing email or company"})
                    continue

                payload = build_partner_outreach_payload(
                    company_name,
                    contact_name=contact_name,
                    segment=segment,
                )
                processed += 1

                if dry_run:
                    self.stdout.write(
                        f"[DRY RUN] {company_name} <{to_email}> | {payload['subject']}"
                    )
                    continue

                ok = send_email(
                    to_email,
                    payload["subject"],
                    payload["html"],
                    text_content=payload["text"],
                    reply_to=get_support_email(),
                )
                if ok:
                    sent_count += 1
                    self.stdout.write(self.style.SUCCESS(f"Sent outreach email to {company_name} <{to_email}>"))
                else:
                    failed.append({"email": to_email, "reason": "send_email returned False"})

        self.stdout.write("")
        self.stdout.write(f"Processed: {processed}")
        if dry_run:
            self.stdout.write(self.style.SUCCESS("Batch dry run complete."))
        else:
            self.stdout.write(self.style.SUCCESS(f"Sent: {sent_count}"))
        if failed:
            self.stdout.write(self.style.WARNING(f"Failed: {len(failed)}"))
            for item in failed[:20]:
                self.stdout.write(f" - {item['email']}: {item['reason']}")

