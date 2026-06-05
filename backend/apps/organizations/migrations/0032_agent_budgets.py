from django.db import migrations, models
import apps.organizations.budget_models


class Migration(migrations.Migration):

    dependencies = [
        ('organizations', '0031_default_realtime_notification_emails'),
    ]

    operations = [
        migrations.CreateModel(
            name='OrgAgentBudget',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('monthly_run_cap', models.PositiveIntegerField(default=apps.organizations.budget_models._default_cap)),
                ('monthly_copilot_cap', models.PositiveIntegerField(default=apps.organizations.budget_models._default_cap)),
                ('enforced', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('organization', models.OneToOneField(
                    on_delete=models.deletion.CASCADE,
                    related_name='agent_budget',
                    to='organizations.organization',
                )),
            ],
            options={'db_table': 'org_agent_budgets'},
        ),
        migrations.CreateModel(
            name='OrgAgentBudgetMonth',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('year', models.PositiveIntegerField()),
                ('month', models.PositiveIntegerField()),
                ('run_count', models.PositiveIntegerField(default=0)),
                ('copilot_count', models.PositiveIntegerField(default=0)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('organization', models.ForeignKey(
                    db_index=True,
                    on_delete=models.deletion.CASCADE,
                    related_name='agent_budget_months',
                    to='organizations.organization',
                )),
            ],
            options={
                'db_table': 'org_agent_budget_months',
                'unique_together': {('organization', 'year', 'month')},
                'indexes': [
                    models.Index(fields=['organization', 'year', 'month'], name='agent_budget_org_ym_idx'),
                ],
            },
        ),
    ]
