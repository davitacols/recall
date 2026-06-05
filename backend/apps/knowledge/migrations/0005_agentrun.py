from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('organizations', '0001_initial'),
        ('knowledge', '0004_contentlink_contextpanel_unifiedactivity'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='AgentRun',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('goal', models.TextField()),
                ('status', models.CharField(
                    choices=[
                        ('running', 'Running'),
                        ('awaiting_approval', 'Awaiting approval'),
                        ('completed', 'Completed'),
                        ('failed', 'Failed'),
                        ('cancelled', 'Cancelled'),
                    ],
                    db_index=True,
                    default='running',
                    max_length=24,
                )),
                ('messages', models.JSONField(blank=True, default=list)),
                ('steps', models.JSONField(blank=True, default=list)),
                ('pending_tool_calls', models.JSONField(blank=True, default=list)),
                ('final_answer', models.TextField(blank=True)),
                ('error', models.TextField(blank=True)),
                ('iterations', models.PositiveIntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('organization', models.ForeignKey(
                    db_index=True,
                    on_delete=models.deletion.CASCADE,
                    related_name='agent_runs',
                    to='organizations.organization',
                )),
                ('user', models.ForeignKey(
                    null=True,
                    on_delete=models.deletion.SET_NULL,
                    related_name='agent_runs',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'db_table': 'agent_runs',
                'ordering': ['-created_at'],
                'indexes': [
                    models.Index(fields=['organization', '-created_at'], name='agent_runs_org_created_idx'),
                    models.Index(fields=['organization', 'status'], name='agent_runs_org_status_idx'),
                ],
            },
        ),
    ]
