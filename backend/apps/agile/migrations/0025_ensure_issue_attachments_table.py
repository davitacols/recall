from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("agile", "0024_ensure_issue_watchers_table"),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
                CREATE TABLE IF NOT EXISTS issue_attachments (
                    id BIGSERIAL PRIMARY KEY,
                    file VARCHAR(100) NOT NULL,
                    filename VARCHAR(255) NOT NULL,
                    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    file_size INTEGER NOT NULL,
                    content_type VARCHAR(100) NOT NULL,
                    issue_id BIGINT NOT NULL REFERENCES issues(id) DEFERRABLE INITIALLY DEFERRED,
                    uploaded_by_id BIGINT NOT NULL REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED
                );
                CREATE INDEX IF NOT EXISTS issue_attachments_issue_id_idx
                    ON issue_attachments(issue_id);
                CREATE INDEX IF NOT EXISTS issue_attachments_uploaded_by_id_idx
                    ON issue_attachments(uploaded_by_id);
                CREATE INDEX IF NOT EXISTS issue_attachments_uploaded_at_idx
                    ON issue_attachments(uploaded_at);
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]

