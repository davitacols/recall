from django.db import migrations, models


def encrypt_existing_secrets(apps, schema_editor):
    from apps.organizations.encryption_service import EncryptionService

    SlackIntegration = apps.get_model("integrations", "SlackIntegration")
    GitHubIntegration = apps.get_model("integrations", "GitHubIntegration")
    JiraIntegration = apps.get_model("integrations", "JiraIntegration")

    for row in SlackIntegration.objects.all().iterator():
        if row.webhook_url:
            encrypted = EncryptionService.encrypt(row.webhook_url)
            if encrypted != row.webhook_url:
                row.webhook_url = encrypted
                row.save(update_fields=["webhook_url"])

    for row in GitHubIntegration.objects.all().iterator():
        changed = []
        if row.access_token:
            encrypted_access = EncryptionService.encrypt(row.access_token)
            if encrypted_access != row.access_token:
                row.access_token = encrypted_access
                changed.append("access_token")
        if row.webhook_secret:
            encrypted_secret = EncryptionService.encrypt(row.webhook_secret)
            if encrypted_secret != row.webhook_secret:
                row.webhook_secret = encrypted_secret
                changed.append("webhook_secret")
        if changed:
            row.save(update_fields=changed)

    for row in JiraIntegration.objects.all().iterator():
        if row.api_token:
            encrypted = EncryptionService.encrypt(row.api_token)
            if encrypted != row.api_token:
                row.api_token = encrypted
                row.save(update_fields=["api_token"])


class Migration(migrations.Migration):

    dependencies = [
        ("integrations", "0003_githubintegration_webhook_secret_pullrequest_commit"),
    ]

    operations = [
        migrations.AlterField(
            model_name="slackintegration",
            name="webhook_url",
            field=models.TextField(),
        ),
        migrations.AlterField(
            model_name="githubintegration",
            name="access_token",
            field=models.TextField(),
        ),
        migrations.AlterField(
            model_name="githubintegration",
            name="webhook_secret",
            field=models.TextField(blank=True),
        ),
        migrations.AlterField(
            model_name="jiraintegration",
            name="api_token",
            field=models.TextField(),
        ),
        migrations.RunPython(encrypt_existing_secrets, migrations.RunPython.noop),
    ]
