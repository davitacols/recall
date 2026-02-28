from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("agile", "0023_rename_work_logs_org_issue_idx_work_logs_organiz_6e7468_idx_and_more"),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
                CREATE TABLE IF NOT EXISTS issues_watchers (
                    id BIGSERIAL PRIMARY KEY,
                    issue_id BIGINT NOT NULL REFERENCES issues(id) DEFERRABLE INITIALLY DEFERRED,
                    user_id BIGINT NOT NULL REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED
                );
                CREATE UNIQUE INDEX IF NOT EXISTS issues_watchers_issue_id_user_id_uniq
                    ON issues_watchers(issue_id, user_id);
                CREATE INDEX IF NOT EXISTS issues_watchers_issue_id_idx
                    ON issues_watchers(issue_id);
                CREATE INDEX IF NOT EXISTS issues_watchers_user_id_idx
                    ON issues_watchers(user_id);
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]

