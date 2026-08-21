"""Capture discussion from pull requests that merged before we were watching.

Capture rides live merge events, so it is forward-only by construction. A team
connects a repository and sees an empty workspace: nothing appears until the
next pull request merges carrying real discussion, and because most merges are
deliberately skipped that can be a fortnight away.

That is the worst possible first impression for a memory product. The team's
own history is the best demonstration it has, and it was sitting in GitHub
unread. This walks back over it once.

    python manage.py backfill_pr_capture --dry-run
    python manage.py backfill_pr_capture --repo acme/dynamo --limit 50
    python manage.py backfill_pr_capture --org 7

Everything else is unchanged on purpose. The same substance filter applies -
two substantive human comments, 240 characters, bots and rubber stamps
discarded - so this captures exactly what a live merge would have captured.
Loosening the bar for history would fill a new workspace with the noise the
filter exists to keep out, on day one, when the impression matters most.

Safe to re-run: capture keys on repo_id:pr_number and returns early when a
conversation for that pull request already exists.
"""

import time

from django.core.management.base import BaseCommand, CommandError

from apps.integrations.github_app import (
    MAX_BACKFILL_PRS,
    get_app_config,
    list_recent_merged_prs,
)
from apps.integrations.github_app_models import GitHubRepo
from apps.integrations.github_pr_capture import maybe_capture_pr_discussion


class Command(BaseCommand):
    help = "Capture discussion from already-merged pull requests."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run", action="store_true",
            help="Report what would be captured without writing anything.",
        )
        parser.add_argument(
            "--repo", type=str, default=None,
            help="Restrict to one repository, by full name (owner/name).",
        )
        parser.add_argument(
            "--org", type=int, default=None,
            help="Restrict to a single organization id.",
        )
        parser.add_argument(
            "--limit", type=int, default=50,
            help=f"Merged PRs to examine per repo (max {MAX_BACKFILL_PRS}).",
        )
        parser.add_argument(
            "--sleep", type=float, default=0.5,
            help="Seconds between pull requests, to stay under the rate limit.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        pause = options["sleep"]
        limit = options["limit"]

        if not get_app_config():
            raise CommandError(
                "The GitHub App is not configured on this deployment "
                "(GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY and the webhook secret)."
            )

        repos = GitHubRepo.objects.select_related(
            "installation", "organization"
        ).filter(is_enabled_for_decisions=True)
        if options["repo"]:
            repos = repos.filter(full_name__iexact=options["repo"])
        if options["org"]:
            repos = repos.filter(organization_id=options["org"])
        repos = list(repos)

        if not repos:
            raise CommandError("No enabled repositories match that filter.")

        self.stdout.write(
            f"{'DRY RUN — nothing will be saved' if dry_run else 'WRITING'}: "
            f"{len(repos)} repo(s), up to {limit} merged PR(s) each"
        )
        self.stdout.write("")

        captured = skipped = already = failed = 0

        for repo in repos:
            installation = repo.installation
            if not installation or not installation.is_active:
                self.stdout.write(
                    f"{repo.full_name}: installation inactive, skipping"
                )
                continue

            try:
                prs = list_recent_merged_prs(
                    installation.installation_id, repo.full_name, limit=limit
                )
            except Exception as exc:
                # One unreachable repo must not abandon the others. A revoked
                # install or a repo the App lost access to is ordinary.
                failed += 1
                self.stdout.write(self.style.ERROR(
                    f"{repo.full_name}: could not list pull requests — {exc}"
                ))
                continue

            self.stdout.write(f"{repo.full_name}: {len(prs)} merged PR(s)")

            for pr in prs:
                number = pr.get("number")
                title = str(pr.get("title") or "").strip()[:60]

                if dry_run:
                    # Report without writing. The substance filter needs three
                    # API calls per PR to judge, so a dry run deliberately does
                    # not pre-judge - it says what it would examine.
                    self.stdout.write(f"  would examine #{number}  {title}")
                    skipped += 1
                    continue

                try:
                    conversation = maybe_capture_pr_discussion(installation, repo, pr)
                except Exception as exc:
                    failed += 1
                    self.stdout.write(self.style.ERROR(
                        f"  #{number} failed — {exc}"
                    ))
                    continue

                if conversation is None:
                    # Either already captured or not substantive. Both are the
                    # normal outcome and neither is worth a line each.
                    skipped += 1
                else:
                    captured += 1
                    self.stdout.write(self.style.SUCCESS(
                        f"  #{number} captured  {title}"
                    ))

                if pause:
                    time.sleep(pause)

        self.stdout.write("")
        if dry_run:
            self.stdout.write(
                f"would examine {skipped} pull request(s). "
                "Re-run without --dry-run to capture the substantive ones."
            )
            return

        self.stdout.write(self.style.SUCCESS(
            f"captured {captured}, passed over {skipped}"
            + (f", {failed} failed" if failed else "")
        ))
        if not captured:
            self.stdout.write(
                "Nothing met the bar. That is the normal outcome for a "
                "repository whose pull requests merge without discussion — "
                "capture needs two substantive human comments to work from."
            )
        if failed:
            raise CommandError(f"{failed} pull request(s) or repo(s) failed")
