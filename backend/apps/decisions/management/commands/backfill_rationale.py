"""Backfill the reasoning on decisions recorded without one.

Roughly half the decisions in the corpus have an empty rationale, because the
capture flow used to copy a conversation's title and body across without ever
extracting the why. Most of those decisions still hold the reasoning somewhere —
in the thread that produced them, or in their own description — just not in the
field anyone reads.

This matters beyond tidiness: Ask Recall can only answer as well as the records
allow. A decision with no rationale contributes a title to search and nothing to
an explanation.

    python manage.py backfill_rationale --dry-run          # look first
    python manage.py backfill_rationale                    # write
    python manage.py backfill_rationale --org 7 --limit 5  # narrow

Where the reasoning is read from, in the order it is assembled:

  - the linked conversation, when there is one
  - the decision's own description
  - context_reason, tradeoffs, impact_assessment

The first version read only the linked conversation, and reported everything
else as "needs a person". That wrote off every decision drafted directly from
/decisions/new — which has no conversation by definition — even though its
description very often states the reason in the first sentence. Those were the
majority of the blanks in practice.

Safety properties, since this writes to live records:
  - Only ever fills a rationale that is currently empty. Never overwrites.
  - Skips decisions whose sources contain no actual reasoning, rather than
    inventing one — the extractor returns empty and we leave the field alone.
  - Idempotent: re-running only picks up what is still blank.
  - --dry-run performs the extraction and reports exactly what it would write,
    so the judgement call happens before anything changes.
"""

import time

from django.core.management.base import BaseCommand

from apps.decisions.intelligence_views import decisions_missing_rationale
from apps.decisions.models import Decision
from apps.decisions.rationale import generate_decision_rationale
from apps.knowledge.text_utils import to_plain_text

# Fields that can carry reasoning, beyond the discussion and the description.
# Ordered least-to-most speculative; all are optional and usually empty.
_EXTRA_FIELDS = (
    ("context_reason", "context"),
    ("tradeoffs", "tradeoffs"),
    ("impact_assessment", "impact"),
)


def collect_source(decision) -> tuple[str, str]:
    """Return (text, labels) describing everything we can read for a decision.

    Content is flattened first. Conversation bodies and descriptions hold
    rich-text HTML, and handing raw markup to the extractor buries the prose in
    tags for no benefit.
    """
    chunks: list[str] = []
    labels: list[str] = []

    if decision.conversation_id:
        text = to_plain_text(getattr(decision.conversation, "content", "") or "")
        if text:
            chunks.append(text)
            labels.append("discussion")

    description = to_plain_text(decision.description or "")
    if description:
        chunks.append(description)
        labels.append("description")

    for field, label in _EXTRA_FIELDS:
        value = to_plain_text(getattr(decision, field, "") or "")
        if value:
            chunks.append(value)
            labels.append(label)

    return "\n\n".join(chunks), "+".join(labels)


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

        # Same definition of "blank" the dashboard percentage uses, so the
        # worklist here and the number in the sidebar cannot disagree.
        blank = list(decisions_missing_rationale(qs))

        candidates = []
        no_source = []
        for decision in blank:
            text, labels = collect_source(decision)
            if text:
                candidates.append((decision, text, labels))
            else:
                no_source.append(decision)

        if limit:
            candidates = candidates[:limit]

        self.stdout.write(
            f"{'DRY RUN — nothing will be saved' if dry_run else 'WRITING'}: "
            f"{len(blank)} decision(s) with no rationale, "
            f"{len(candidates)} with something to read"
        )
        if no_source:
            ids = ", ".join(f"DEC-{d.id}" for d in no_source[:10])
            more = "…" if len(no_source) > 10 else ""
            self.stdout.write(
                f"  ({len(no_source)} have no readable source at all and need "
                f"a person: {ids}{more})"
            )
        self.stdout.write("")

        filled = skipped = 0
        for decision, text, labels in candidates:
            rationale = generate_decision_rationale(decision.title, text)
            if not rationale:
                skipped += 1
                self.stdout.write(
                    f"  DEC-{decision.id:<5} skip  — {labels} contains no reasoning"
                )
            else:
                filled += 1
                preview = rationale[:110] + ("…" if len(rationale) > 110 else "")
                self.stdout.write(
                    f"  DEC-{decision.id:<5} fill  [{labels}] {preview}"
                )
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
        if no_source:
            self.stdout.write(
                f"{len(no_source)} still need a person to write the why."
            )
        if dry_run and filled:
            self.stdout.write("Re-run without --dry-run to apply.")
