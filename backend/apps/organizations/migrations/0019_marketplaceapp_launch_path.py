from django.db import migrations, models


def backfill_launch_paths(apps, schema_editor):
    MarketplaceApp = apps.get_model('organizations', 'MarketplaceApp')
    defaults = {
        'github-advanced-sync': '/integrations',
        'jira-portfolio-bridge': '/enterprise',
        'compliance-audit-exporter': '/audit-logs',
        'incident-ops-feed': '/enterprise',
    }
    for slug, launch_path in defaults.items():
        MarketplaceApp.objects.filter(slug=slug).update(launch_path=launch_path)


class Migration(migrations.Migration):
    dependencies = [
        ('organizations', '0018_projectpermissionscope_slarule_incidentescalationrule_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='marketplaceapp',
            name='launch_path',
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.RunPython(backfill_launch_paths, migrations.RunPython.noop),
    ]

