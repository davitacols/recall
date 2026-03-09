from django.core.management.base import BaseCommand

from apps.organizations.models import Organization
from apps.knowledge.deep_learning import DeepKnowledgeTrainer


class Command(BaseCommand):
    help = "Train organization-wide deep knowledge models."

    def add_arguments(self, parser):
        parser.add_argument("--org-slug", type=str, help="Train for only one organization slug")
        parser.add_argument("--epochs", type=int, default=3, help="Training epochs (default: 3)")
        parser.add_argument("--max-samples", type=int, default=1200, help="Max org samples (default: 1200)")
        parser.add_argument(
            "--include-inactive",
            action="store_true",
            help="Include inactive organizations",
        )

    def handle(self, *args, **options):
        epochs = min(max(int(options["epochs"]), 1), 10)
        max_samples = min(max(int(options["max_samples"]), 100), 5000)
        org_slug = options.get("org_slug")
        include_inactive = bool(options.get("include_inactive"))

        orgs = Organization.objects.all()
        if not include_inactive:
            orgs = orgs.filter(is_active=True)
        if org_slug:
            orgs = orgs.filter(slug=org_slug)

        if not orgs.exists():
            self.stdout.write(self.style.WARNING("No organizations matched the filter."))
            return

        success = 0
        failed = 0
        for org in orgs:
            self.stdout.write(f"\nTraining org: {org.slug}")
            trainer = DeepKnowledgeTrainer(org)
            try:
                payload = trainer.train(epochs=epochs, max_samples=max_samples)
                success += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f"  OK: dataset={payload.get('dataset_size')} accuracy={payload.get('metrics', {}).get('accuracy')}"
                    )
                )
            except Exception as exc:
                failed += 1
                self.stdout.write(self.style.ERROR(f"  FAILED: {exc}"))

        self.stdout.write(
            self.style.SUCCESS(f"\nTraining completed. success={success}, failed={failed}, total={success + failed}")
        )
