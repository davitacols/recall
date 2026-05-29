"""Detect (and optionally repair) database schema drift.

Lists every table the Django models expect that is missing from the database —
including auto-created many-to-many "through" tables — grouped by app. This
catches the failure mode where a migration is recorded as applied but its table
is absent from the DB (e.g. a dropped table on a shared/remote Postgres).

Usage:
    python manage.py check_schema                 # report only
    python manage.py check_schema --app business  # limit to one app
    python manage.py check_schema --create        # create the missing tables

--create uses the schema editor to build each missing table to match the model
(exact table name, constraints, indexes). It only ever creates tables that are
absent — it never drops or alters existing ones, and it does not touch the
migration ledger.
"""

from django.apps import apps as django_apps
from django.core.management.base import BaseCommand
from django.db import connection


def _expected_tables(app_filter=None):
    """Yield (app_label, label, table_name, creator) for every expected table.

    creator is a no-arg callable that creates the table via the schema editor.
    """
    for model in django_apps.get_models():
        meta = model._meta
        if not meta.managed:
            continue
        if app_filter and meta.app_label != app_filter:
            continue

        yield (
            meta.app_label,
            model.__name__,
            meta.db_table,
            lambda m=model: _create(m),
        )

        for field in meta.local_many_to_many:
            through = field.remote_field.through
            # Only auto-created join tables; explicit through models are real
            # models and are already yielded by get_models().
            if through._meta.auto_created:
                yield (
                    meta.app_label,
                    f"{model.__name__}.{field.name} (m2m)",
                    through._meta.db_table,
                    lambda t=through: _create(t),
                )


def _create(model):
    with connection.schema_editor() as editor:
        editor.create_model(model)


class Command(BaseCommand):
    help = "Report (and optionally create) database tables that models expect but are missing."

    def add_arguments(self, parser):
        parser.add_argument("--app", default=None, help="Limit to a single app label.")
        parser.add_argument("--create", action="store_true", help="Create the missing tables.")

    def handle(self, *args, **opts):
        ok = self.style.SUCCESS
        warn = self.style.WARNING
        bad = self.style.ERROR

        existing = set(connection.introspection.table_names())
        expected = list(_expected_tables(opts["app"]))

        missing = [row for row in expected if row[2] not in existing]

        self.stdout.write("Schema drift check")
        self.stdout.write("------------------")
        self.stdout.write(f"  Models checked : {len(expected)} table(s)")
        self.stdout.write(f"  In database    : {len(existing)} table(s)")
        self.stdout.write("")

        if not missing:
            self.stdout.write(ok("OK    No missing tables. Schema matches the models."))
            return

        self.stdout.write(bad(f"DRIFT {len(missing)} expected table(s) missing from the database:"))
        by_app = {}
        for app_label, label, table, _creator in missing:
            by_app.setdefault(app_label, []).append((label, table))
        for app_label in sorted(by_app):
            self.stdout.write(f"\n  {app_label}")
            for label, table in by_app[app_label]:
                self.stdout.write(f"    - {table}   ({label})")

        if not opts["create"]:
            self.stdout.write("")
            self.stdout.write(warn("Run with --create to build these tables, or --app <label> to scope it."))
            return

        # Repair pass. Retry a few times so tables whose FK targets are also
        # missing get created once their dependency exists.
        self.stdout.write("")
        self.stdout.write("Creating missing tables…")
        pending = list(missing)
        created, failed = [], []
        for _ in range(4):
            if not pending:
                break
            still_missing = set(connection.introspection.table_names())
            next_pending = []
            for row in pending:
                app_label, label, table, creator = row
                if table in still_missing:
                    created.append(table)
                    continue
                try:
                    creator()
                    created.append(table)
                    self.stdout.write(ok(f"  created {table}"))
                except Exception:  # noqa: BLE001 - report and continue
                    next_pending.append(row)
            pending = next_pending

        for row in pending:
            failed.append((row[2], row[1]))

        self.stdout.write("")
        self.stdout.write(ok(f"Created {len(set(created))} table(s)."))
        if failed:
            self.stdout.write(bad(f"Could not create {len(failed)} table(s):"))
            for table, label in failed:
                self.stdout.write(f"    - {table}  ({label})")
            self.stdout.write(warn("These usually depend on another missing table — re-run after the rest are created."))
