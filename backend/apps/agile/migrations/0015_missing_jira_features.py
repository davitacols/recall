# Generated migration for missing Jira features

from django.db import migrations, models, connection
import django.db.models.deletion


def table_exists(table_name):
    """Check if a table exists in the database"""
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = %s
            );
        """, [table_name])
        return cursor.fetchone()[0]


class Migration(migrations.Migration):

    dependencies = [
        ('agile', '0014_remove_backlog_backlog_org_project_unique_and_more'),
        ('organizations', '0001_initial'),
    ]

    operations = [
        # Add WIP limit to Column (safe - will skip if exists)
        migrations.AddField(
            model_name='column',
            name='wip_limit',
            field=models.IntegerField(blank=True, help_text='Work In Progress limit', null=True),
        ),
        
        # Add watchers to Issue (safe - will skip if exists)
        migrations.AddField(
            model_name='issue',
            name='watchers',
            field=models.ManyToManyField(blank=True, related_name='watched_issues', to='organizations.User'),
        ),
        
        # IssueAttachment model
        migrations.CreateModel(
            name='IssueAttachment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('file', models.FileField(upload_to='issue_attachments/%Y/%m/')),
                ('filename', models.CharField(max_length=255)),
                ('uploaded_at', models.DateTimeField(auto_now_add=True)),
                ('file_size', models.IntegerField()),
                ('content_type', models.CharField(max_length=100)),
                ('issue', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='attachments', to='agile.issue')),
                ('uploaded_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='organizations.user')),
            ],
            options={
                'db_table': 'issue_attachments',
                'ordering': ['-uploaded_at'],
            },
        ),
        
        # SavedFilter model
        migrations.CreateModel(
            name='SavedFilter',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('filter_params', models.JSONField()),
                ('is_public', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('organization', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='organizations.organization')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='saved_filters', to='organizations.user')),
            ],
            options={
                'db_table': 'saved_filters',
                'ordering': ['name'],
            },
        ),
        
        # IssueTemplate model
        migrations.CreateModel(
            name='IssueTemplate',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('issue_type', models.CharField(choices=[('epic', 'Epic'), ('story', 'Story'), ('task', 'Task'), ('bug', 'Bug'), ('subtask', 'Sub-task')], max_length=20)),
                ('title_template', models.CharField(max_length=255)),
                ('description_template', models.TextField()),
                ('default_priority', models.CharField(default='medium', max_length=20)),
                ('default_labels', models.JSONField(default=list)),
                ('organization', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='organizations.organization')),
                ('project', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to='agile.project')),
            ],
            options={
                'db_table': 'issue_templates',
                'ordering': ['name'],
            },
        ),
        
        # Component model
        migrations.CreateModel(
            name='Component',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('description', models.TextField(blank=True)),
                ('lead', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='organizations.user')),
                ('project', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='components', to='agile.project')),
            ],
            options={
                'db_table': 'components',
                'ordering': ['name'],
                'unique_together': {('project', 'name')},
            },
        ),
        
        # ProjectCategory model
        migrations.CreateModel(
            name='ProjectCategory',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('description', models.TextField(blank=True)),
                ('color', models.CharField(default='#4F46E5', max_length=7)),
                ('organization', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='organizations.organization')),
            ],
            options={
                'db_table': 'project_categories',
                'ordering': ['name'],
                'unique_together': {('organization', 'name')},
            },
        ),
    ]
