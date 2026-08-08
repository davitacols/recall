"""Attribute existing decision<->PR links to the files they touched.

New links record their files as they are created. Links made before that
existed have none, so the "why is this code here?" lookup would answer with
silence for every decision recorded up to now — which is all of them.

    python manage.py backfill_decision_files --dry-run
    python manage.py backfill_decision_files
    python manage.py backfill_decision_files --org 10 --limit 5

Each link costs one GitHub request (more for a large PR), so --sleep keeps a
big backfill polite. Re-running is safe: files are rebuilt per link, and
--only-missing skips links that already have them.
"""

import time

from django.core.management.base import BaseCommand

from apps.integrations.github_app_models import DecisionFile, DecisionPullRequest
from apps.integrations.github_decision_files import sync_link_files


class Command(BaseCommand):
    help = "Record which files each linked pull request touched."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true",
                            help="Report what would be fetched without writing.")
        parser.add_argument("--org", type=int, default=None,
                            help="Restrict to one organization id.")
        parser.add_argument("--limit", type=int, default=0,
                            help="Stop after this many links (0 = no limit).")
        parser.add_argument("--sleep", type=float, default=0.5,
                            help="Seconds between GitHub requests.")
        parser.add_argument("--only-missing", action="store_true", default=True,
                            help="Skip links that already have files (default).")
        parser.add_argument("--all", dest="only_missing", action="store_false",
                            help="Re-fetch even links that already have files.")

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        org_id = options["org"]
        limit = options["limit"]
        pause = options["sleep"]
        only_missing = options["only_missing"]

        qs = DecisionPullRequest.objects.select_related(
            "repo", "repo__installation", "decision"
        ).order_by("id")
        if org_id:
            qs = qs.filter(organization_id=org_id)

        links = list(qs)
        if only_missing:
            have = set(
                DecisionFile.objects.values_list("link_id", flat=True).distinct()
            )
            links = [l for l in links if l.id not in have]
        if limit:
            links = links[:limit]

        self.stdout.write(
            f"{'DRY RUN — nothing will be written' if dry_run else 'WRITING'}: "
            f"{len(links)} link(s) to attribute\n"
        )

        attributed = skipped = 0
        for link in links:
            label = f"DEC-{link.decision_id} <- {link.repo.full_name}#{link.pr_number}"
            if dry_run:
                self.stdout.write(f"  would fetch  {label}")
                continue

            count = sync_link_files(link)
            if count:
                attributed += 1
                self.stdout.write(f"  {count:>3} file(s)  {label}")
            else:
                skipped += 1
                # Silence here is usually correct — a lockfile-only PR, or one
                # too broad to attribute — so it is reported, not warned about.
                self.stdout.write(f"    skipped   {label}  (nothing worth attributing)")
            if pause:
                time.sleep(pause)

        if not dry_run:
            self.stdout.write("")
            self.stdout.write(self.style.SUCCESS(
                f"attributed {attributed} link(s), skipped {skipped}; "
                f"{DecisionFile.objects.count()} file row(s) total"
            ))
