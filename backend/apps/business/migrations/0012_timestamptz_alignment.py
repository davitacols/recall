"""Align business_* timestamp columns with the rest of the schema.

These tables were created by the raw-SQL bootstrap scripts in the repo root
(create_business_tables.py / create_advanced_business_tables.py) rather than by
migrations, so their datetime columns landed as `timestamp without time zone`
while every other table in the database uses `timestamptz`.

With USE_TZ = True that means psycopg2 hands back *naive* datetimes for these
models and aware ones for everything else. Any code that compares the two
raises "can't compare offset-naive and offset-aware datetimes" — which is what
took /api/knowledge/dashboard/workspace-briefing/ to a 500 in production.

The stored values are already UTC (TIME_ZONE = 'UTC' and Django wrote them via
timezone.now()), so `AT TIME ZONE 'UTC'` reinterprets rather than shifts them:
no clock values change. The reverse direction is provided so the migration can
be rolled back cleanly.
"""
from django.db import migrations


COLUMNS = [
    ("business_comments", "created_at"),
    ("business_comments", "updated_at"),
    ("business_documents", "created_at"),
    ("business_documents", "updated_at"),
    ("business_goals", "created_at"),
    ("business_goals", "updated_at"),
    ("business_meetings", "created_at"),
    ("business_meetings", "updated_at"),
    ("business_milestones", "created_at"),
    ("business_reminders", "created_at"),
    ("business_tasks", "created_at"),
    ("business_tasks", "updated_at"),
    ("business_templates", "created_at"),
]


def _statements(target, using_tz):
    # to_regclass returns NULL rather than raising when a table is absent, so a
    # deployment missing one of the optional business tables still migrates.
    return "\n".join(
        f"""
        DO $$
        BEGIN
            IF to_regclass('public.{table}') IS NOT NULL THEN
                ALTER TABLE {table}
                    ALTER COLUMN {column} TYPE {target}
                    USING {column} {using_tz};
            END IF;
        END $$;
        """
        for table, column in COLUMNS
    )


class Migration(migrations.Migration):

    dependencies = [
        ("business", "0011_task_scheduling_fields"),
    ]

    operations = [
        migrations.RunSQL(
            sql=_statements("timestamptz", "AT TIME ZONE 'UTC'"),
            reverse_sql=_statements("timestamp", "AT TIME ZONE 'UTC'"),
        ),
    ]
