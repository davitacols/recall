import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('organizations', '0001_initial'),
        ('decisions', '0012_decisionmetric_consensussnapshot_metricdatapoint_and_more'),
        ('knowledge', '0006_agentrun_profile_slug'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # ---- DecisionPrediction ----
        migrations.CreateModel(
            name='DecisionPrediction',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('dimension', models.CharField(max_length=80)),
                ('statement', models.TextField()),
                ('metric_kind', models.CharField(
                    choices=[
                        ('number', 'Number'),
                        ('percent', 'Percent'),
                        ('binary', 'Yes / No'),
                        ('text', 'Text'),
                    ],
                    default='text',
                    max_length=20,
                )),
                ('target_value', models.JSONField(blank=True, default=dict)),
                ('baseline_value', models.JSONField(blank=True, null=True)),
                ('check_at', models.DateField()),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('organization', models.ForeignKey(
                    db_index=True,
                    on_delete=models.deletion.CASCADE,
                    related_name='decision_predictions',
                    to='organizations.organization',
                )),
                ('decision', models.ForeignKey(
                    on_delete=models.deletion.CASCADE,
                    related_name='predictions',
                    to='decisions.decision',
                )),
                ('created_by', models.ForeignKey(
                    null=True,
                    on_delete=models.deletion.SET_NULL,
                    related_name='created_predictions',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'db_table': 'decision_predictions',
                'ordering': ['check_at', 'created_at'],
                'indexes': [
                    models.Index(fields=['organization', 'check_at'], name='dec_pred_org_check_idx'),
                    models.Index(fields=['decision', 'check_at'], name='dec_pred_dec_check_idx'),
                ],
            },
        ),
        # ---- DecisionOutcomeCheck ----
        migrations.CreateModel(
            name='DecisionOutcomeCheck',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('observed_value', models.JSONField(blank=True, default=dict)),
                ('drift_pct', models.FloatField(blank=True, null=True)),
                ('drift_band', models.CharField(
                    choices=[
                        ('exceeded', 'Exceeded target'),
                        ('on_track', 'On track'),
                        ('drifting', 'Drifting'),
                        ('off_track', 'Off track'),
                        ('unknown', 'Unknown'),
                    ],
                    db_index=True,
                    default='unknown',
                    max_length=16,
                )),
                ('notes', models.TextField(blank=True)),
                ('observed_at', models.DateTimeField(db_index=True, default=django.utils.timezone.now)),
                ('organization', models.ForeignKey(
                    db_index=True,
                    on_delete=models.deletion.CASCADE,
                    to='organizations.organization',
                )),
                ('prediction', models.ForeignKey(
                    on_delete=models.deletion.CASCADE,
                    related_name='checks',
                    to='decisions.decisionprediction',
                )),
                ('observed_by', models.ForeignKey(
                    null=True,
                    on_delete=models.deletion.SET_NULL,
                    related_name='logged_outcome_checks',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'db_table': 'decision_outcome_checks',
                'ordering': ['-observed_at'],
                'indexes': [
                    models.Index(fields=['organization', 'drift_band'], name='dec_chk_org_band_idx'),
                    models.Index(fields=['prediction', '-observed_at'], name='dec_chk_pred_obs_idx'),
                ],
            },
        ),
        # ---- DecisionRetrospective ----
        migrations.CreateModel(
            name='DecisionRetrospective',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('triggered_by', models.CharField(
                    choices=[
                        ('drift', 'Drift threshold exceeded'),
                        ('milestone', 'Final milestone reached'),
                        ('manual', 'Requested manually'),
                        ('agent', 'Agent-initiated'),
                    ],
                    default='manual',
                    max_length=20,
                )),
                ('summary', models.TextField(blank=True)),
                ('root_cause', models.TextField(blank=True)),
                ('lesson', models.TextField(blank=True)),
                ('confidence_delta', models.IntegerField(blank=True, null=True)),
                ('tags', models.JSONField(blank=True, default=list)),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('closed_at', models.DateTimeField(blank=True, null=True)),
                ('organization', models.ForeignKey(
                    db_index=True,
                    on_delete=models.deletion.CASCADE,
                    to='organizations.organization',
                )),
                ('decision', models.ForeignKey(
                    on_delete=models.deletion.CASCADE,
                    related_name='retrospectives',
                    to='decisions.decision',
                )),
                ('triggered_by_check', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=models.deletion.SET_NULL,
                    related_name='retrospectives_triggered',
                    to='decisions.decisionoutcomecheck',
                )),
                ('author', models.ForeignKey(
                    null=True,
                    on_delete=models.deletion.SET_NULL,
                    related_name='authored_retrospectives',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'db_table': 'decision_retrospectives',
                'ordering': ['-created_at'],
                'indexes': [
                    models.Index(fields=['organization', '-created_at'], name='dec_retro_org_created_idx'),
                    models.Index(fields=['decision', '-created_at'], name='dec_retro_dec_created_idx'),
                ],
            },
        ),
        # ---- DecisionTwinRun ----
        migrations.CreateModel(
            name='DecisionTwinRun',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('counterfactual_premise', models.TextField()),
                ('status', models.CharField(
                    choices=[
                        ('queued', 'Queued'),
                        ('running', 'Running'),
                        ('completed', 'Completed'),
                        ('failed', 'Failed'),
                    ],
                    db_index=True,
                    default='queued',
                    max_length=20,
                )),
                ('analysis', models.TextField(blank=True)),
                ('estimated_outcomes', models.JSONField(blank=True, default=list)),
                ('confidence', models.IntegerField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('completed_at', models.DateTimeField(blank=True, null=True)),
                ('organization', models.ForeignKey(
                    db_index=True,
                    on_delete=models.deletion.CASCADE,
                    to='organizations.organization',
                )),
                ('decision', models.ForeignKey(
                    on_delete=models.deletion.CASCADE,
                    related_name='twin_runs',
                    to='decisions.decision',
                )),
                ('agent_run', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=models.deletion.SET_NULL,
                    related_name='twin_runs',
                    to='knowledge.agentrun',
                )),
                ('requested_by', models.ForeignKey(
                    null=True,
                    on_delete=models.deletion.SET_NULL,
                    related_name='requested_twin_runs',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'db_table': 'decision_twin_runs',
                'ordering': ['-created_at'],
                'indexes': [
                    models.Index(fields=['organization', '-created_at'], name='dec_twin_org_created_idx'),
                    models.Index(fields=['decision', '-created_at'], name='dec_twin_dec_created_idx'),
                    models.Index(fields=['organization', 'status'], name='dec_twin_org_status_idx'),
                ],
            },
        ),
    ]
