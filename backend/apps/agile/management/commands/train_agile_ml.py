from django.core.management.base import BaseCommand

from apps.agile.ml_models import AgileMLTrainer
from apps.organizations.models import Organization


class Command(BaseCommand):
    help = "Train Agile ML baseline models for one org or all orgs."

    def add_arguments(self, parser):
        parser.add_argument(
            "--org-id",
            type=int,
            default=None,
            help="Organization ID. If omitted, trains all organizations.",
        )

    def handle(self, *args, **options):
        org_id = options.get("org_id")
        if org_id:
            organizations = Organization.objects.filter(id=org_id)
        else:
            organizations = Organization.objects.all()

        if not organizations.exists():
            self.stdout.write(self.style.WARNING("No organizations found for training."))
            return

        for organization in organizations:
            result = AgileMLTrainer.train_for_organization(organization.id)
            self.stdout.write(
                self.style.SUCCESS(
                    f"[trained] org={organization.id} "
                    f"issues={result['metadata']['issue_count']} "
                    f"assignee_examples={result['metadata']['assignee_examples']} "
                    f"story_point_examples={result['metadata']['story_point_examples']}"
                )
            )
