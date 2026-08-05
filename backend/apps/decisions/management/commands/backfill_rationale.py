"""Backfill the reasoning on decisions recorded without one.

Roughly half the decisions in the corpus have an empty rationale, because the
capture flow used to copy a conversation's title and body across without ever
extracting the why. Most of those decisions are still linked to the discussion
that produced them, so the reasoning is recoverable — it is sitting in the
thread, just not in the field anyone reads.

This matters beyond tidiness: Ask Recall can only answer as well as the records
allow. A decision with no rationale contributes a title to search and nothing to
an explanation.

    python manage.py backfill_rationale --dry-run          # look first
    python manage.py backfill_rationale                    # write
    python manage.py backfill_rationale --org 7 --limit 5  # narrow

Safety properties, since this writes to live records:
  - Only ever fills a rationale that is currently empty. Never overwrites.
  - Skips decisions whose conversation contains no actual reasoning, rather
    than inventing one — the extractor returns empty and we leave the field
    alone.
  - Idempotent: re-running only picks up what is still blank.
  - --dry-run performs the extraction and reports exactly what it would write,
    so the judgement call happens before anything changes.
"""

import time

from django.core.management.base import BaseCommand

from apps.decisions.models import Decision
from apps.decisions.rationale import generate_decision_rationale


class Command(BaseCommand):
    help = "Extract the reasoning for decisions whose rationale is empty."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run", action="store_true",
            help="Extract and report without saving anything.",
        )
        parser.add_argument(
            "--org", type=int, default=None,
            help="Restrict to a single organization id.",
        )
        parser.add_argument(
            "--limit", type=int, default=0,
            help="Stop after this many candidates (0 = no limit).",
        )
        parser.add_argument(
            "--sleep", type=float, default=1.0,
            help="Seconds between model calls, to stay polite to the API.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        org_id = options["org"]
        limit = options["limit"]
        pause = options["sleep"]

        qs = Decision.objects.select_related("conversation").order_by("id")
        if org_id:
            qs = qs.filter(organization_id=org_id)

        # A decision with no linked conversation has no source to read, so it
        # is not a candidate — those need a human, not a model.
        candidates = [
            d for d in qs
            if not str(d.rationale or "").strip()
            and d.conversation_id
            and str(getattr(d.conversation, "content", "") or "").strip()
        ]
        no_source = [
            d for d in qs
            if not str(d.rationale or "").strip() and not d.conversation_id
        ]

        if limit:
            candidates = candidates[:limit]

        self.stdout.write(
            f"{'DRY RUN — nothing will be saved' if dry_run else 'WRITING'}: "
            f"{len(candidates)} decision(s) with a source discussion to read"
        )
        if no_source:
            self.stdout.write(
                f"  ({len(no_source)} more are blank but have no linked "
                f"conversation — those need a person)"
            )
        self.stdout.write("")

        filled = skipped = 0
        for decision in candidates:
            rationale = generate_decision_rationale(
                decision.title, decision.conversation.content
            )
            if not rationale:
                skipped += 1
                self.stdout.write(
                    f"  DEC-{decision.id:<5} skip  — the discussion contains no reasoning"
                )
            else:
                filled += 1
                preview = rationale[:110] + ("…" if len(rationale) > 110 else "")
                self.stdout.write(f"  DEC-{decision.id:<5} fill  — {preview}")
                if not dry_run:
                    decision.rationale = rationale
                    decision.save(update_fields=["rationale"])
            if pause:
                time.sleep(pause)

        self.stdout.write("")
        verb = "would fill" if dry_run else "filled"
        self.stdout.write(self.style.SUCCESS(
            f"{verb} {filled}, left {skipped} alone (no reasoning to extract)"
        ))
        if dry_run and filled:
            self.stdout.write("Re-run without --dry-run to apply.")
