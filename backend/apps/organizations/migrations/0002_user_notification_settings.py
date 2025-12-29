# Generated migration for notification settings

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('organizations', '0001_initial'),  # Adjust to your latest migration
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='email_notifications',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='user',
            name='mention_notifications',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='user',
            name='reply_notifications',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='user',
            name='decision_notifications',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='user',
            name='digest_frequency',
            field=models.CharField(
                max_length=20,
                choices=[
                    ('realtime', 'Real-time'),
                    ('hourly', 'Hourly'),
                    ('daily', 'Daily'),
                    ('weekly', 'Weekly'),
                    ('never', 'Never')
                ],
                default='daily'
            ),
        ),
    ]
