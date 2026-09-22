"""Align releases.created_at with the rest of the schema.

Same cause as business.0012: the table was created outside migrations, so its
created_at is `timestamp without time zone` while every comparable column is
`timestamptz`. Under USE_TZ = True that yields naive datetimes for this model
alone, which raises as soon as one is compared with an aware datetime.

Values are already UTC, so `AT TIME ZONE 'UTC'` reinterprets without shifting.
"""
from django.db import migrations


SQL = """
DO $$
BEGIN
    IF to_regclass('public.releases') IS NOT NULL THEN
        ALTER TABLE releases
            ALTER COLUMN created_at TYPE timestamptz
            USING created_at AT TIME ZONE 'UTC';
    END IF;
END $$;
"""

REVERSE_SQL = """
DO $$
BEGIN
    IF to_regclass('public.releases') IS NOT NULL THEN
        ALTER TABLE releases
            ALTER COLUMN created_at TYPE timestamp
            USING created_at AT TIME ZONE 'UTC';
    END IF;
END $$;
"""


class Migration(migrations.Migration):

    dependencies = [
        ("agile", "0027_rename_service_des_organiz_e4d47a_idx_service_des_organiz_b7eb20_idx_and_more"),
    ]

    operations = [
        migrations.RunSQL(sql=SQL, reverse_sql=REVERSE_SQL),
    ]
