from django.core.management.base import BaseCommand, CommandError

from apps.knowledge.search_engine import get_search_engine
from apps.knowledge.semantic_search import SemanticSearchUnavailable
from apps.organizations.models import Organization


class Command(BaseCommand):
    help = "Warm cached semantic embeddings for workspace search"

    def add_arguments(self, parser):
        parser.add_argument(
            "--org-slug",
            type=str,
            help="Warm only one organization",
        )

    def handle(self, *args, **options):
        search_engine = get_search_engine()
        if not search_engine.semantic.enabled:
            raise CommandError("SEMANTIC_SEARCH_URL is not configured")

        organizations = Organization.objects.all().order_by("id")
        if options.get("org_slug"):
            organizations = organizations.filter(slug=options["org_slug"])
            if not organizations.exists():
                raise CommandError("Organization not found")

        total = 0
        for organization in organizations.iterator():
            self.stdout.write(f"Warming: {organization.name}")
            try:
                count = search_engine.warm_semantic_index(organization.id)
            except SemanticSearchUnavailable as exc:
                raise CommandError(str(exc)) from exc
            total += count
            self.stdout.write(self.style.SUCCESS(f"  Cached {count} records"))

        self.stdout.write(self.style.SUCCESS(f"Semantic index ready: {total} records"))
