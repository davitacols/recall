# Generated migration for agile workflow enhancements

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('agile', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='issue',
            name='issue_type',
            field=models.CharField(
                choices=[('epic', 'Epic'), ('story', 'Story'), ('task', 'Task'), ('bug', 'Bug'), ('subtask', 'Sub-task')],
                default='task',
                max_length=20
            ),
        ),
        migrations.AddField(
            model_name='issue',
            name='in_backlog',
            field=models.BooleanField(db_index=True, default=True),
        ),
        migrations.AddField(
            model_name='issue',
            name='status_changed_at',
            field=models.DateTimeField(auto_now=True),
        ),
        migrations.AddField(
            model_name='issue',
            name='parent_issue',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='subtasks', to='agile.issue'),
        ),
        migrations.AlterField(
            model_name='issue',
            name='status',
            field=models.CharField(
                choices=[('backlog', 'Backlog'), ('todo', 'To Do'), ('in_progress', 'In Progress'), ('in_review', 'In Review'), ('testing', 'Testing'), ('done', 'Done')],
                db_index=True,
                default='backlog',
                max_length=20
            ),
        ),
        migrations.CreateModel(
            name='Backlog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('issues', models.ManyToManyField(related_name='backlogs', to='agile.issue')),
                ('organization', models.ForeignKey(db_index=True, on_delete=django.db.models.deletion.CASCADE, to='organizations.organization')),
                ('project', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='backlogs', to='agile.project')),
            ],
            options={
                'db_table': 'backlogs',
            },
        ),
        migrations.CreateModel(
            name='WorkflowTransition',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('from_status', models.CharField(max_length=20)),
                ('to_status', models.CharField(max_length=20)),
                ('issue_type', models.CharField(blank=True, choices=[('epic', 'Epic'), ('story', 'Story'), ('task', 'Task'), ('bug', 'Bug'), ('subtask', 'Sub-task')], max_length=20)),
                ('requires_assignee', models.BooleanField(default=False)),
                ('requires_story_points', models.BooleanField(default=False)),
                ('requires_comment', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('organization', models.ForeignKey(db_index=True, on_delete=django.db.models.deletion.CASCADE, to='organizations.organization')),
            ],
            options={
                'db_table': 'workflow_transitions',
            },
        ),
        migrations.AddConstraint(
            model_name='backlog',
            constraint=models.UniqueConstraint(fields=['organization', 'project'], name='backlog_org_project_unique'),
        ),
        migrations.AddConstraint(
            model_name='workflowtransition',
            constraint=models.UniqueConstraint(fields=['organization', 'from_status', 'to_status', 'issue_type'], name='workflow_transition_unique'),
        ),
        migrations.AddIndex(
            model_name='workflowtransition',
            index=models.Index(fields=['organization', 'from_status'], name='workflow_org_from_idx'),
        ),
    ]
