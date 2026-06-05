from django.db import migrations, models
import apps.organizations.webhook_models


class Migration(migrations.Migration):

    dependencies = [
        ('organizations', '0032_agent_budgets'),
    ]

    operations = [
        migrations.CreateModel(
            name='WebhookSubscription',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('url', models.URLField(max_length=1024)),
                ('event', models.CharField(db_index=True, max_length=64)),
                ('secret', models.CharField(default=apps.organizations.webhook_models._new_secret, max_length=128)),
                ('is_active', models.BooleanField(default=True)),
                ('description', models.CharField(blank=True, max_length=255)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('last_fired_at', models.DateTimeField(blank=True, null=True)),
                ('fail_count', models.PositiveIntegerField(default=0)),
                ('organization', models.ForeignKey(
                    on_delete=models.deletion.CASCADE,
                    related_name='webhook_subscriptions',
                    to='organizations.organization',
                )),
            ],
            options={
                'db_table': 'webhook_subscriptions',
                'indexes': [
                    models.Index(fields=['organization', 'event'], name='webhook_sub_org_event_idx'),
                ],
            },
        ),
        migrations.CreateModel(
            name='WebhookDelivery',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('event', models.CharField(db_index=True, max_length=64)),
                ('payload', models.JSONField(blank=True, default=dict)),
                ('attempt', models.PositiveIntegerField(default=0)),
                ('status', models.CharField(
                    choices=[('queued', 'Queued'), ('succeeded', 'Succeeded'),
                             ('failed', 'Failed'), ('retrying', 'Retrying')],
                    db_index=True, default='queued', max_length=16,
                )),
                ('response_status', models.PositiveIntegerField(blank=True, null=True)),
                ('response_body', models.CharField(blank=True, max_length=1024)),
                ('error', models.CharField(blank=True, max_length=512)),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('last_attempt_at', models.DateTimeField(blank=True, null=True)),
                ('subscription', models.ForeignKey(
                    on_delete=models.deletion.CASCADE,
                    related_name='deliveries',
                    to='organizations.webhooksubscription',
                )),
            ],
            options={
                'db_table': 'webhook_deliveries',
                'ordering': ['-created_at'],
            },
        ),
    ]
