from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('business', '0005_journeymap_calendarconnection'),
    ]

    operations = [
        migrations.AddField(
            model_name='task',
            name='scheduled_start',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='task',
            name='scheduled_end',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='task',
            name='scheduled_duration_minutes',
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
    ]
