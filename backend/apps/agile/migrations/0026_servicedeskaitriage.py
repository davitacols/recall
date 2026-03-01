from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('organizations', '0021_free_plan_and_feature_entitlements'),
        ('agile', '0025_ensure_issue_attachments_table'),
    ]

    operations = [
        migrations.CreateModel(
            name='ServiceDeskAITriage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('risk_status', models.CharField(blank=True, default='watch', max_length=20)),
                ('confidence', models.IntegerField(default=0)),
                ('suggested_request_type', models.CharField(blank=True, default='general', max_length=30)),
                ('suggested_priority', models.CharField(blank=True, default='medium', max_length=20)),
                ('ai_answer', models.TextField(blank=True)),
                ('suggested_actions', models.JSONField(blank=True, default=list)),
                ('raw_payload', models.JSONField(blank=True, default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('generated_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='organizations.user')),
                ('issue', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='service_desk_ai', to='agile.issue')),
                ('organization', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='organizations.organization')),
            ],
            options={
                'db_table': 'service_desk_ai_triage',
            },
        ),
        migrations.AddIndex(
            model_name='servicedeskaitriage',
            index=models.Index(fields=['organization', 'risk_status'], name='service_des_organiz_e4d47a_idx'),
        ),
        migrations.AddIndex(
            model_name='servicedeskaitriage',
            index=models.Index(fields=['organization', '-updated_at'], name='service_des_organiz_0ce01e_idx'),
        ),
    ]

