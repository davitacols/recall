# Generated migration for mentions and tags

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('conversations', '0002_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Tag',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(db_index=True, max_length=50)),
                ('color', models.CharField(default='#000000', max_length=7)),
                ('usage_count', models.PositiveIntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('organization', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='organizations.organization')),
            ],
            options={
                'db_table': 'tags',
                'ordering': ['-usage_count', 'name'],
            },
        ),
        migrations.AddField(
            model_name='conversation',
            name='mentioned_users',
            field=models.ManyToManyField(blank=True, related_name='mentioned_in', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='conversation',
            name='tags',
            field=models.ManyToManyField(blank=True, related_name='conversations', to='conversations.tag'),
        ),
        migrations.AddField(
            model_name='conversationreply',
            name='mentioned_users',
            field=models.ManyToManyField(blank=True, related_name='mentioned_in_replies', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AlterUniqueTogether(
            name='tag',
            unique_together={('name', 'organization')},
        ),
    ]
