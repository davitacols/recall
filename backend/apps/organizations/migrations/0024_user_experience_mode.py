from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('organizations', '0023_merge_20260304_1'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='experience_mode',
            field=models.CharField(
                choices=[('simple', 'Simple'), ('standard', 'Standard'), ('advanced', 'Advanced')],
                default='standard',
                max_length=20,
            ),
        ),
    ]

