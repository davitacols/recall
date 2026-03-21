from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("organizations", "0026_partnerinquiry"),
    ]

    operations = [
        migrations.AddField(
            model_name="partnerinquiry",
            name="internal_notes",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="partnerinquiry",
            name="owner",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="owned_partner_inquiries",
                to="organizations.user",
            ),
        ),
    ]
