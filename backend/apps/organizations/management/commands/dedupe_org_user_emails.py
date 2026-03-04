from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Count
from django.db.models.functions import Lower

from apps.organizations.models import Organization


class Command(BaseCommand):
    help = (
        "Detect and optionally remediate duplicate user emails within the same "
        "organization (case-insensitive). Dry-run by default."
    )

    ROLE_PRIORITY = {
        "admin": 3,
        "manager": 2,
        "contributor": 1,
    }

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Apply remediation. Without this flag, command only reports duplicates.",
        )
        parser.add_argument(
            "--org-slug",
            type=str,
            help="Only process one organization by slug.",
        )
        parser.add_argument(
            "--deactivate",
            action="store_true",
            help=(
                "When applying remediation, deactivate duplicate accounts that are renamed. "
                "Recommended for safety."
            ),
        )

    def handle(self, *args, **options):
        User = get_user_model()
        apply_changes = options["apply"]
        should_deactivate = options["deactivate"] or not apply_changes
        org_slug = (options.get("org_slug") or "").strip().lower()

        org_filter = {}
        if org_slug:
            try:
                org = Organization.objects.get(slug=org_slug)
            except Organization.DoesNotExist:
                self.stdout.write(self.style.ERROR(f"Organization not found: {org_slug}"))
                return
            org_filter["organization_id"] = org.id

        duplicate_groups = (
            User.objects.exclude(email__isnull=True)
            .exclude(email="")
            .filter(**org_filter)
            .annotate(email_norm=Lower("email"))
            .values("organization_id", "email_norm")
            .annotate(user_count=Count("id"))
            .filter(user_count__gt=1)
            .order_by("organization_id", "email_norm")
        )

        total_groups = duplicate_groups.count()
        if total_groups == 0:
            self.stdout.write(self.style.SUCCESS("No duplicate org+email groups found."))
            return

        self.stdout.write(
            self.style.WARNING(
                f"Found {total_groups} duplicate org+email groups "
                f"(case-insensitive)."
            )
        )
        if not apply_changes:
            self.stdout.write("Dry-run mode. Re-run with --apply to remediate.")

        users_changed = 0
        for group in duplicate_groups:
            organization_id = group["organization_id"]
            email_norm = group["email_norm"]
            org = Organization.objects.get(id=organization_id)

            users = list(
                User.objects.filter(
                    organization_id=organization_id,
                    email__iexact=email_norm,
                ).order_by("id")
            )

            keep_user = self._pick_keeper(users)
            duplicate_users = [u for u in users if u.id != keep_user.id]

            self.stdout.write(
                f"\nOrg={org.slug} Email={email_norm} "
                f"Keep=ID:{keep_user.id}:{keep_user.username} "
                f"Duplicates={len(duplicate_users)}"
            )

            for dupe in duplicate_users:
                new_email = self._build_placeholder_email(dupe)
                action_desc = (
                    f"  - ID:{dupe.id} username={dupe.username} "
                    f"email={dupe.email} -> {new_email}"
                )
                if should_deactivate:
                    action_desc += " (deactivate)"
                self.stdout.write(action_desc)

                if apply_changes:
                    with transaction.atomic():
                        dupe.email = new_email
                        if should_deactivate:
                            dupe.is_active = False
                            dupe.save(update_fields=["email", "is_active"])
                        else:
                            dupe.save(update_fields=["email"])
                    users_changed += 1

        if apply_changes:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Remediation complete. Updated {users_changed} duplicate users."
                )
            )
        else:
            self.stdout.write(
                self.style.WARNING(
                    "No changes applied. Re-run with --apply [--deactivate] to fix."
                )
            )

    def _pick_keeper(self, users):
        def rank(user):
            return (
                1 if user.is_active else 0,
                self.ROLE_PRIORITY.get(getattr(user, "role", ""), 0),
                1 if user.last_login else 0,
                user.last_login.timestamp() if user.last_login else 0,
                -user.id,
            )

        return sorted(users, key=rank, reverse=True)[0]

    def _build_placeholder_email(self, user):
        local = (user.email or "user").split("@")[0]
        local = "".join(ch for ch in local if ch.isalnum() or ch in "._-") or "user"
        return f"dedup+u{user.id}-{local}@invalid.local"
