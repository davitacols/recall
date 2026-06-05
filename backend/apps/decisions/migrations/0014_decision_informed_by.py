from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('decisions', '0013_decision_intelligence'),
    ]

    operations = [
        migrations.AddField(
            model_name='decision',
            name='informed_by_decisions',
            field=models.JSONField(blank=True, default=list),
        ),
    ]
