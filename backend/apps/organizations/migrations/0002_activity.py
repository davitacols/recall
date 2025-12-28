# Generated migration for Activity model

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('contenttypes', '0002_remove_content_type_name'),
        ('organizations', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Activity',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('action_type', models.CharField(choices=[('conversation_created', 'Created Conversation'), ('conversation_replied', 'Replied to Conversation'), ('decision_created', 'Created Decision'), ('decision_approved', 'Approved Decision'), ('decision_implemented', 'Implemented Decision'), ('user_joined', 'Joined Organization')], db_index=True, max_length=50)),
                ('object_id', models.PositiveIntegerField(null=True)),
                ('metadata', models.JSONField(blank=True, default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('actor', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='activities', to=settings.AUTH_USER_MODEL)),
                ('content_type', models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, to='contenttypes.contenttype')),
                ('organization', models.ForeignKey(db_index=True, on_delete=django.db.models.deletion.CASCADE, to='organizations.organization')),
            ],
            options={
                'db_table': 'activities',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='activity',
            index=models.Index(fields=['organization', '-created_at'], name='activities_org_created_idx'),
        ),
        migrations.AddIndex(
            model_name='activity',
            index=models.Index(fields=['actor', '-created_at'], name='activities_actor_created_idx'),
        ),
    ]
