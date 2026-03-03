from django.core.management.base import BaseCommand

from apps.integrations.models import GitHubIntegration, JiraIntegration, SlackIntegration
from apps.organizations.encryption_service import EncryptionService


class Command(BaseCommand):
    help = "Re-encrypt integration secrets using the current encryption key."

    def handle(self, *args, **options):
        updated = 0

        for row in SlackIntegration.objects.all().iterator():
            plain = row.get_webhook_url()
            encrypted = EncryptionService.encrypt(plain)
            if encrypted != row.webhook_url:
                row.webhook_url = encrypted
                row.save(update_fields=["webhook_url"])
                updated += 1

        for row in GitHubIntegration.objects.all().iterator():
            changed = []
            token_plain = row.get_access_token()
            token_encrypted = EncryptionService.encrypt(token_plain)
            if token_encrypted != row.access_token:
                row.access_token = token_encrypted
                changed.append("access_token")

            secret_plain = row.get_webhook_secret()
            secret_encrypted = EncryptionService.encrypt(secret_plain)
            if secret_encrypted != row.webhook_secret:
                row.webhook_secret = secret_encrypted
                changed.append("webhook_secret")

            if changed:
                row.save(update_fields=changed)
                updated += 1

        for row in JiraIntegration.objects.all().iterator():
            plain = row.get_api_token()
            encrypted = EncryptionService.encrypt(plain)
            if encrypted != row.api_token:
                row.api_token = encrypted
                row.save(update_fields=["api_token"])
                updated += 1

        self.stdout.write(self.style.SUCCESS(f"Re-encrypted integration rows: {updated}"))
