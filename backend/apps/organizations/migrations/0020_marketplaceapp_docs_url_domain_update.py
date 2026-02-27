from django.db import migrations


def update_marketplace_docs_urls(apps, schema_editor):
    MarketplaceApp = apps.get_model('organizations', 'MarketplaceApp')
    docs_map = {
        'github-advanced-sync': 'https://knoledgr.com/docs/integrations/github',
        'jira-portfolio-bridge': 'https://knoledgr.com/docs/integrations/jira',
        'compliance-audit-exporter': 'https://knoledgr.com/docs/enterprise/compliance',
        'incident-ops-feed': 'https://knoledgr.com/docs/enterprise/incident-ops',
    }
    for slug, docs_url in docs_map.items():
        MarketplaceApp.objects.filter(slug=slug).update(docs_url=docs_url)

    # Safety rewrite for any remaining legacy docs subdomain values.
    for app in MarketplaceApp.objects.filter(docs_url__startswith='https://docs.knoledgr.com/'):
        path = app.docs_url.replace('https://docs.knoledgr.com/', '', 1).lstrip('/')
        app.docs_url = f'https://knoledgr.com/docs/{path}'
        app.save(update_fields=['docs_url'])


class Migration(migrations.Migration):
    dependencies = [
        ('organizations', '0019_marketplaceapp_launch_path'),
    ]

    operations = [
        migrations.RunPython(update_marketplace_docs_urls, migrations.RunPython.noop),
    ]

