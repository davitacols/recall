# Adds AgentStep table — one row per agent reasoning frame.
#
# The unrelated RenameIndex / AlterField operations Django proposed for the
# existing AgentRun model are deliberately omitted here. They're cosmetic
# index-name and BigAutoField-default refreshes that landed when the project
# upgraded Django, and they'd risk a non-trivial schema change on a live
# table for no functional gain. We keep this migration focused on the new
# table only.

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('knowledge', '0006_agentrun_profile_slug'),
    ]

    operations = [
        migrations.CreateModel(
            name='AgentStep',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('ordinal', models.PositiveIntegerField()),
                ('kind', models.CharField(
                    choices=[
                        ('plan', 'Plan'),
                        ('thought', 'Thought'),
                        ('tool_call', 'Tool call'),
                        ('tool_result', 'Tool result'),
                        ('final', 'Final'),
                    ],
                    db_index=True,
                    max_length=20,
                )),
                ('payload', models.JSONField(blank=True, default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('run', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='step_rows',
                    to='knowledge.agentrun',
                )),
            ],
            options={
                'db_table': 'agent_steps',
                'ordering': ['ordinal'],
                'indexes': [
                    models.Index(fields=['run', 'ordinal'], name='agent_steps_run_id_4c2464_idx'),
                    models.Index(fields=['run', 'kind'], name='agent_steps_run_id_1fb15d_idx'),
                ],
                'unique_together': {('run', 'ordinal')},
            },
        ),
    ]
