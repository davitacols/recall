from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("integrations", "0004_encrypt_integration_secrets"),
        ("organizations", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="GitHubWebhookDelivery",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("event", models.CharField(max_length=50)),
                ("action", models.CharField(blank=True, max_length=100)),
                ("delivery_id", models.CharField(blank=True, db_index=True, max_length=255)),
                ("repository_owner", models.CharField(blank=True, max_length=100)),
                ("repository_name", models.CharField(blank=True, max_length=100)),
                (
                    "processing_state",
                    models.CharField(
                        choices=[("processed", "Processed"), ("ignored", "Ignored"), ("failed", "Failed")],
                        default="processed",
                        max_length=20,
                    ),
                ),
                ("status_code", models.IntegerField(blank=True, null=True)),
                ("signature_valid", models.BooleanField(default=False)),
                ("message", models.TextField(blank=True)),
                ("summary", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                (
                    "integration",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="webhook_deliveries",
                        to="integrations.githubintegration",
                    ),
                ),
                (
                    "organization",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="github_webhook_deliveries",
                        to="organizations.organization",
                    ),
                ),
            ],
            options={
                "db_table": "github_webhook_deliveries",
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="githubwebhookdelivery",
            index=models.Index(fields=["organization", "-created_at"], name="github_webh_organiz_b1fb4f_idx"),
        ),
        migrations.AddIndex(
            model_name="githubwebhookdelivery",
            index=models.Index(fields=["integration", "-created_at"], name="github_webh_integra_6b2997_idx"),
        ),
        migrations.AddIndex(
            model_name="githubwebhookdelivery",
            index=models.Index(
                fields=["integration", "processing_state", "-created_at"],
                name="github_webh_integra_369e4f_idx",
            ),
        ),
    ]
