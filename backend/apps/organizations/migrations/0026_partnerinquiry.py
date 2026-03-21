from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("organizations", "0025_user_marketing_preferences"),
    ]

    operations = [
        migrations.CreateModel(
            name="PartnerInquiry",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("full_name", models.CharField(max_length=255)),
                ("work_email", models.EmailField(db_index=True, max_length=254)),
                ("company_name", models.CharField(db_index=True, max_length=255)),
                ("role_title", models.CharField(max_length=255)),
                ("website", models.URLField(blank=True)),
                (
                    "partner_type",
                    models.CharField(
                        choices=[
                            ("agency", "Agency"),
                            ("fractional", "Fractional Operator"),
                            ("consultant", "Consultant"),
                            ("ecosystem", "Ecosystem Team"),
                        ],
                        db_index=True,
                        max_length=40,
                    ),
                ),
                ("service_summary", models.TextField()),
                ("consent_to_contact", models.BooleanField(default=False)),
                ("source", models.CharField(default="partners-page", max_length=50)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("new", "New"),
                            ("reviewing", "Reviewing"),
                            ("contacted", "Contacted"),
                            ("qualified", "Qualified"),
                            ("archived", "Archived"),
                        ],
                        db_index=True,
                        default="new",
                        max_length=20,
                    ),
                ),
                ("submitted_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("contacted_at", models.DateTimeField(blank=True, null=True)),
                (
                    "organization",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="partner_inquiries",
                        to="organizations.organization",
                    ),
                ),
                (
                    "submitted_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="partner_inquiries",
                        to="organizations.user",
                    ),
                ),
            ],
            options={
                "db_table": "partner_inquiries",
                "ordering": ["-submitted_at"],
            },
        ),
        migrations.AddIndex(
            model_name="partnerinquiry",
            index=models.Index(fields=["status", "-submitted_at"], name="partner_inq_status_c2a297_idx"),
        ),
        migrations.AddIndex(
            model_name="partnerinquiry",
            index=models.Index(fields=["partner_type", "-submitted_at"], name="partner_inq_partner_091cda_idx"),
        ),
    ]
