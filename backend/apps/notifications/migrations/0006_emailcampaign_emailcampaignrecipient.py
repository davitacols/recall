from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("organizations", "0025_user_marketing_preferences"),
        ("notifications", "0005_expand_notification_types"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="EmailCampaign",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=255)),
                ("subject", models.CharField(max_length=255)),
                ("preheader", models.CharField(blank=True, max_length=255)),
                ("body_html", models.TextField()),
                ("cta_label", models.CharField(blank=True, default="Open Knoledgr", max_length=120)),
                ("cta_url", models.CharField(blank=True, default="/", max_length=500)),
                (
                    "segment",
                    models.CharField(
                        choices=[
                            ("all_opted_in", "All opted-in users"),
                            ("active_30d", "Active users (30 days)"),
                            ("admins_managers", "Admins and managers"),
                        ],
                        default="all_opted_in",
                        max_length=30,
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("draft", "Draft"),
                            ("scheduled", "Scheduled"),
                            ("sending", "Sending"),
                            ("sent", "Sent"),
                            ("failed", "Failed"),
                            ("cancelled", "Cancelled"),
                        ],
                        db_index=True,
                        default="draft",
                        max_length=20,
                    ),
                ),
                ("scheduled_for", models.DateTimeField(blank=True, db_index=True, null=True)),
                ("sent_at", models.DateTimeField(blank=True, null=True)),
                ("total_recipients", models.IntegerField(default=0)),
                ("sent_count", models.IntegerField(default=0)),
                ("failed_count", models.IntegerField(default=0)),
                ("suppressed_count", models.IntegerField(default=0)),
                ("open_count", models.IntegerField(default=0)),
                ("click_count", models.IntegerField(default=0)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "created_by",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="created_email_campaigns",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "organization",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="email_campaigns",
                        to="organizations.organization",
                    ),
                ),
            ],
            options={
                "db_table": "email_campaigns",
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="emailcampaign",
            index=models.Index(fields=["organization", "status", "-created_at"], name="email_campa_organiz_91b61c_idx"),
        ),
        migrations.CreateModel(
            name="EmailCampaignRecipient",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("email", models.EmailField(max_length=254)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pending", "Pending"),
                            ("sent", "Sent"),
                            ("failed", "Failed"),
                            ("suppressed", "Suppressed"),
                            ("unsubscribed", "Unsubscribed"),
                        ],
                        db_index=True,
                        default="pending",
                        max_length=20,
                    ),
                ),
                ("provider_message_id", models.CharField(blank=True, max_length=255)),
                ("error_message", models.TextField(blank=True)),
                ("sent_at", models.DateTimeField(blank=True, null=True)),
                ("opened_at", models.DateTimeField(blank=True, null=True)),
                ("clicked_at", models.DateTimeField(blank=True, null=True)),
                ("unsubscribed_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "campaign",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="recipients",
                        to="notifications.emailcampaign",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="campaign_deliveries",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "db_table": "email_campaign_recipients",
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddConstraint(
            model_name="emailcampaignrecipient",
            constraint=models.UniqueConstraint(fields=("campaign", "email"), name="campaign_email_unique"),
        ),
        migrations.AddIndex(
            model_name="emailcampaignrecipient",
            index=models.Index(fields=["campaign", "status"], name="email_campa_campaig_3eb421_idx"),
        ),
        migrations.AddIndex(
            model_name="emailcampaignrecipient",
            index=models.Index(fields=["email", "-created_at"], name="email_campa_email_c724f9_idx"),
        ),
    ]
