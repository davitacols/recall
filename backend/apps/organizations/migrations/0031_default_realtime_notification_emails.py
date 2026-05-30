from django.db import migrations, models


def daily_to_realtime(apps, schema_editor):
    """Move users off the previous default.

    'daily' was the default digest_frequency, which deferred every notification to a
    daily digest email (dependent on a running Celery beat) and left immediate
    per-notification emails effectively disabled. Switching those rows to 'realtime'
    turns on the reliable synchronous email path. Users who want batched email can
    re-select a digest frequency in settings; explicit hourly/weekly/never choices
    are left untouched.
    """
    User = apps.get_model('organizations', 'User')
    User.objects.filter(digest_frequency='daily').update(digest_frequency='realtime')


class Migration(migrations.Migration):

    dependencies = [
        ('organizations', '0030_rename_partner_inq_status_c2a297_idx_partner_inq_status_74c69c_idx_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='user',
            name='digest_frequency',
            field=models.CharField(
                choices=[
                    ('realtime', 'Real-time'),
                    ('hourly', 'Hourly'),
                    ('daily', 'Daily'),
                    ('weekly', 'Weekly'),
                    ('never', 'Never'),
                ],
                default='realtime',
                max_length=20,
            ),
        ),
        migrations.RunPython(daily_to_realtime, migrations.RunPython.noop),
    ]
