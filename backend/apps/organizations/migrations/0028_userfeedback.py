from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("organizations", "0027_partnerinquiry_owner_internal_notes"),
    ]

    operations = [
        migrations.CreateModel(
            name="UserFeedback",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("full_name", models.CharField(max_length=255)),
                ("email", models.EmailField(db_index=True, max_length=254)),
                ("company_name", models.CharField(blank=True, db_index=True, max_length=255)),
                ("role_title", models.CharField(blank=True, max_length=255)),
                ("feedback_type", models.CharField(choices=[("general", "General Product Feedback"), ("bug", "Bug Report"), ("feature", "Feature Request"), ("docs", "Documentation"), ("pricing", "Pricing Or Upgrade"), ("support", "Support Or Onboarding"), ("testimonial", "Testimonial")], db_index=True, max_length=40)),
                ("sentiment", models.CharField(choices=[("positive", "Positive"), ("neutral", "Neutral"), ("friction", "Needs Improvement")], db_index=True, default="neutral", max_length=20)),
                ("rating", models.PositiveSmallIntegerField(default=4)),
                ("current_page", models.CharField(blank=True, max_length=500)),
                ("message", models.TextField()),
                ("consent_to_contact", models.BooleanField(default=False)),
                ("source", models.CharField(default="feedback-page", max_length=50)),
                ("status", models.CharField(choices=[("new", "New"), ("reviewing", "Reviewing"), ("contacted", "Contacted"), ("resolved", "Resolved"), ("archived", "Archived")], db_index=True, default="new", max_length=20)),
                ("internal_notes", models.TextField(blank=True)),
                ("submitted_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("contacted_at", models.DateTimeField(blank=True, null=True)),
                ("organization", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="feedback_submissions", to="organizations.organization")),
                ("owner", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="owned_feedback_submissions", to="organizations.user")),
                ("submitted_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="feedback_submissions", to="organizations.user")),
            ],
            options={
                "db_table": "user_feedback",
                "ordering": ["-submitted_at"],
            },
        ),
        migrations.AddIndex(
            model_name="userfeedback",
            index=models.Index(fields=["status", "-submitted_at"], name="userfb_status_sub_idx"),
        ),
        migrations.AddIndex(
            model_name="userfeedback",
            index=models.Index(fields=["feedback_type", "-submitted_at"], name="userfb_type_sub_idx"),
        ),
        migrations.AddIndex(
            model_name="userfeedback",
            index=models.Index(fields=["sentiment", "-submitted_at"], name="userfb_sent_sub_idx"),
        ),
    ]
