"""Attribute existing decisions to the project their code lives in.

New decisions adopt the project when they are linked to a repository. Ones
recorded before that existed carry nothing, so every report by project would
start empty and stay that way for the whole existing record — which is exactly
the association that becomes impossible to recover later, once nobody
remembers which project a decision was about.

Two sources, in order of confidence:

  1. A decision linked to a pull request in a repo that has a project. That is
     evidence, not a guess: someone said this decision is about this repo.
  2. Nothing else. There is deliberately no title matching or date heuristic —
     an invented attribution is worse than a blank one, because a blank invites
     someone to fill it in and a wrong one gets trusted.

    python manage.py backfill_decision_projects --dry-run
    python manage.py backfill_decision_projects
    python manage.py backfill_decision_projects --org 10
"""

from django.core.management.base import BaseCommand

from apps.decisions.models import Decision
from apps.integrations.github_app_models import DecisionPullRequest


class Command(BaseCommand):
    help = "Give existing decisions the project of the repo they were linked to."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true",
                            help="Report what would change without writing.")
        parser.add_argument("--org", type=int, default=None,
                            help="Restrict to one organization id.")

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        org_id = options["org"]

        links = (
            DecisionPullRequest.objects
            .select_related("decision", "repo", "repo__project")
            .filter(repo__project__isnull=False, decision__project__isnull=True)
            .order_by("decision_id")
        )
        if org_id:
            links = links.filter(organization_id=org_id)

        self.stdout.write(
            f"{'DRY RUN — nothing will be written' if dry_run else 'WRITING'}\n"
        )

        seen = set()
        applied = skipped = 0
        for link in links:
            decision = link.decision
            project = link.repo.project
            if decision.id in seen:
                continue
            seen.add(decision.id)

            # A repo can be moved between workspaces and leave its project
            # behind. Filing this decision under another workspace's project
            # would be a quiet cross-tenant leak in everything reporting by
            # project, so it is refused rather than guessed at.
            if project.organization_id != decision.organization_id:
                skipped += 1
                self.stdout.write(
                    f"  DEC-{decision.id:<5} skip  — {project.name} belongs to another workspace"
                )
                continue

            applied += 1
            self.stdout.write(
                f"  DEC-{decision.id:<5} -> {project.name}  (via {link.repo.full_name})"
            )
            if not dry_run:
                decision.project = project
                decision.save(update_fields=["project"])

        unattributed = Decision.objects.filter(project__isnull=True)
        if org_id:
            unattributed = unattributed.filter(organization_id=org_id)

        self.stdout.write("")
        verb = "would attribute" if dry_run else "attributed"
        self.stdout.write(self.style.SUCCESS(
            f"{verb} {applied}, skipped {skipped}; "
            f"{unattributed.count()} decision(s) still have no project"
        ))
        self.stdout.write(
            "  Those need a linked pull request, or a person. There is no "
            "heuristic here on purpose."
        )
