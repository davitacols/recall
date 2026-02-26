from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.decisions.models import Decision


class Command(BaseCommand):
    help = "Backfill review schedules for implemented decisions missing outcome reviews."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show affected decisions without updating records.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        queryset = Decision.objects.filter(
            status="implemented",
            review_completed_at__isnull=True,
            review_scheduled_at__isnull=True,
        ).order_by("implemented_at", "created_at")

        updated = 0
        for decision in queryset:
            base_time = decision.implemented_at or decision.decided_at or decision.created_at or timezone.now()
            scheduled = base_time + timedelta(days=14)
            if dry_run:
                self.stdout.write(
                    f"[DRY-RUN] decision={decision.id} schedule={scheduled.isoformat()} title={decision.title}"
                )
                continue
            decision.review_scheduled_at = scheduled
            decision.save(update_fields=["review_scheduled_at"])
            updated += 1

        if dry_run:
            self.stdout.write(self.style.WARNING(f"Dry run complete. {queryset.count()} decisions would be updated."))
        else:
            self.stdout.write(self.style.SUCCESS(f"Backfill complete. Updated {updated} decisions."))
