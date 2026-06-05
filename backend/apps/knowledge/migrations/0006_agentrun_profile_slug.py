from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('knowledge', '0005_agentrun'),
    ]

    operations = [
        migrations.AddField(
            model_name='agentrun',
            name='profile_slug',
            field=models.CharField(db_index=True, default='general', max_length=40),
        ),
    ]
