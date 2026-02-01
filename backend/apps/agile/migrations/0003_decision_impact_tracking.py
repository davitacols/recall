# Generated migration for decision impact tracking

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('agile', '0002_agile_workflow'),
        ('decisions', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='DecisionImpact',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('impact_type', models.CharField(choices=[('enables', 'Enables'), ('blocks', 'Blocks'), ('changes', 'Changes Requirements'), ('accelerates', 'Accelerates'), ('delays', 'Delays')], max_length=20)),
                ('description', models.TextField()),
                ('estimated_effort_change', models.IntegerField(default=0, help_text='Story points added/removed')),
                ('estimated_delay_days', models.IntegerField(default=0, help_text='Days of delay if blocking')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('created_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='organizations.user')),
                ('decision', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='impacts', to='decisions.decision')),
                ('issue', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='decision_impacts', to='agile.issue')),
                ('organization', models.ForeignKey(db_index=True, on_delete=django.db.models.deletion.CASCADE, to='organizations.organization')),
                ('sprint', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='decision_impacts', to='agile.sprint')),
            ],
            options={
                'db_table': 'decision_impacts',
            },
        ),
        migrations.CreateModel(
            name='IssueDecisionHistory',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('change_type', models.CharField(choices=[('status_changed', 'Status Changed'), ('priority_changed', 'Priority Changed'), ('points_changed', 'Story Points Changed'), ('blocked', 'Blocked'), ('unblocked', 'Unblocked')], max_length=50)),
                ('old_value', models.CharField(blank=True, max_length=255)),
                ('new_value', models.CharField(blank=True, max_length=255)),
                ('reason', models.TextField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('decision', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='decisions.decision')),
                ('issue', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='decision_history', to='agile.issue')),
                ('organization', models.ForeignKey(db_index=True, on_delete=django.db.models.deletion.CASCADE, to='organizations.organization')),
            ],
            options={
                'db_table': 'issue_decision_history',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='SprintDecisionSummary',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('decisions_made', models.IntegerField(default=0)),
                ('decisions_impacting_sprint', models.IntegerField(default=0)),
                ('total_effort_added', models.IntegerField(default=0, help_text='Total story points added by decisions')),
                ('total_effort_removed', models.IntegerField(default=0, help_text='Total story points removed by decisions')),
                ('issues_blocked_by_decisions', models.IntegerField(default=0)),
                ('issues_enabled_by_decisions', models.IntegerField(default=0)),
                ('velocity_impact_percent', models.FloatField(default=0.0, help_text='% change in velocity due to decisions')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('organization', models.ForeignKey(db_index=True, on_delete=django.db.models.deletion.CASCADE, to='organizations.organization')),
                ('sprint', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='decision_summary', to='agile.sprint')),
            ],
            options={
                'db_table': 'sprint_decision_summaries',
            },
        ),
        migrations.AddConstraint(
            model_name='decisionimpact',
            constraint=models.UniqueConstraint(fields=['decision', 'issue'], name='decision_impact_unique'),
        ),
        migrations.AddIndex(
            model_name='decisionimpact',
            index=models.Index(fields=['organization', 'decision'], name='decision_impact_org_decision_idx'),
        ),
        migrations.AddIndex(
            model_name='decisionimpact',
            index=models.Index(fields=['organization', 'issue'], name='decision_impact_org_issue_idx'),
        ),
        migrations.AddIndex(
            model_name='issuedecisionhistory',
            index=models.Index(fields=['organization', 'issue', '-created_at'], name='issue_decision_history_idx'),
        ),
    ]
