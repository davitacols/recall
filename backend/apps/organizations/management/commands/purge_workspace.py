from collections import Counter

from django.core.management.base import BaseCommand, CommandError
from django.db import DEFAULT_DB_ALIAS, transaction
from django.db.models import FileField
from django.db.models.deletion import Collector

from apps.organizations.models import Organization


def _collect_workspace_deletion(organization):
    """Return the cascade collector, model counts, and stored file references."""
    collector = Collector(using=DEFAULT_DB_ALIAS)
    collector.collect([organization])

    counts = Counter()
    file_refs = {}

    def inspect_objects(model, objects):
        fields = [field for field in model._meta.fields if isinstance(field, FileField)]
        for obj in objects:
            counts[model._meta.label] += 1
            for field in fields:
                value = getattr(obj, field.name, None)
                name = getattr(value, "name", "")
                storage = getattr(value, "storage", None)
                if name and storage is not None:
                    file_refs[(id(storage), name)] = (storage, name)

    for model, objects in collector.data.items():
        inspect_objects(model, objects)

    # Django may optimize simple cascades into direct querysets. They still
    # belong in the dry-run count and may contain stored files.
    for queryset in collector.fast_deletes:
        inspect_objects(queryset.model, queryset.iterator())

    return collector, counts, list(file_refs.values())


class Command(BaseCommand):
    help = (
        "Preview or permanently purge one Knoledgr workspace and its cascading "
        "records. Execution requires the exact workspace slug as confirmation."
    )

    def add_arguments(self, parser):
        parser.add_argument("--slug", required=True, help="Exact workspace slug to inspect.")
        parser.add_argument(
            "--execute",
            action="store_true",
            help="Perform the purge. Without this flag the command is read-only.",
        )
        parser.add_argument(
            "--confirm-slug",
            default="",
            help="Required with --execute and must exactly match --slug.",
        )

    def handle(self, *args, **options):
        slug = (options.get("slug") or "").strip()
        execute = bool(options.get("execute"))
        confirm_slug = (options.get("confirm_slug") or "").strip()

        try:
            organization = Organization.objects.get(slug=slug)
        except Organization.DoesNotExist as exc:
            raise CommandError(f"No workspace exists with slug '{slug}'.") from exc

        if execute and confirm_slug != slug:
            raise CommandError(
                "Refusing to purge: --confirm-slug must exactly match the workspace slug."
            )

        _collector, counts, file_refs = _collect_workspace_deletion(organization)
        total_records = sum(counts.values())
        model_summary = ", ".join(
            f"{label}={count}" for label, count in sorted(counts.items())
        )

        self.stdout.write(
            f"Workspace: {organization.name} (slug={organization.slug}, id={organization.id})"
        )
        self.stdout.write(f"Database records in cascade: {total_records}")
        self.stdout.write(f"Stored files in cascade: {len(file_refs)}")
        if model_summary:
            self.stdout.write(f"Models: {model_summary}")

        if not execute:
            self.stdout.write(
                self.style.WARNING(
                    "DRY RUN ONLY. Nothing was deleted. Re-run with --execute and "
                    f"--confirm-slug {slug} only after export and written customer approval."
                )
            )
            return

        # Commit database deletion before removing files. If the transaction
        # fails, customer records still point to intact files. A later file
        # cleanup failure can leave an inaccessible orphan, but never a live
        # record whose file disappeared underneath it.
        with transaction.atomic():
            organization.delete()

        file_failures = []
        for storage, name in file_refs:
            try:
                storage.delete(name)
            except Exception as exc:  # best effort after the database commit
                file_failures.append(f"{name}: {exc}")

        if file_failures:
            self.stderr.write(
                self.style.WARNING(
                    "Workspace data was deleted, but some stored files need manual cleanup:"
                )
            )
            for failure in file_failures:
                self.stderr.write(f" - {failure}")

        self.stdout.write(
            self.style.SUCCESS(
                f"Purged workspace '{slug}': {total_records} database records and "
                f"{len(file_refs) - len(file_failures)} stored files removed."
            )
        )
