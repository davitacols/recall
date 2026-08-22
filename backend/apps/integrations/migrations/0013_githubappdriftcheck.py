from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("integrations", "0012_githubrepo_project"),
    ]

    operations = [
        migrations.CreateModel(
            name="GitHubAppDriftCheck",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("healthy", "Healthy"),
                            ("drift", "Drift detected"),
                            ("error", "Check failed"),
                            ("not_configured", "GitHub App not configured"),
                        ],
                        db_index=True,
                        max_length=24,
                    ),
                ),
                ("local_installation_count", models.PositiveIntegerField(default=0)),
                ("github_installation_count", models.PositiveIntegerField(default=0)),
                ("missing_locally", models.JSONField(blank=True, default=list)),
                ("missing_on_github", models.JSONField(blank=True, default=list)),
                ("checked_at", models.DateTimeField(auto_now_add=True, db_index=True)),
            ],
            options={
                "db_table": "github_app_drift_checks",
                "ordering": ["-checked_at"],
            },
        ),
    ]
