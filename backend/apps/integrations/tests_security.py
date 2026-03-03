from django.test import TestCase

from apps.integrations.models import GitHubIntegration, JiraIntegration, SlackIntegration
from apps.organizations.models import Organization
from apps.organizations.encryption_service import EncryptionService


class IntegrationSecretEncryptionTests(TestCase):
    def setUp(self):
        self.org = Organization.objects.create(name="Acme", slug="acme")

    def test_github_tokens_are_encrypted_at_rest(self):
        token = "ghp_plain_token_123"
        secret = "webhook_secret_456"
        integration = GitHubIntegration.objects.create(
            organization=self.org,
            access_token=token,
            webhook_secret=secret,
            repo_owner="owner",
            repo_name="repo",
            enabled=True,
            auto_link_prs=True,
        )
        integration.refresh_from_db()

        self.assertTrue(integration.access_token.startswith(EncryptionService.PREFIX))
        self.assertTrue(integration.webhook_secret.startswith(EncryptionService.PREFIX))
        self.assertEqual(integration.get_access_token(), token)
        self.assertEqual(integration.get_webhook_secret(), secret)

    def test_jira_api_token_is_encrypted_at_rest(self):
        token = "jira_api_token_123"
        integration = JiraIntegration.objects.create(
            organization=self.org,
            site_url="https://example.atlassian.net",
            email="user@example.com",
            api_token=token,
            enabled=True,
        )
        integration.refresh_from_db()

        self.assertTrue(integration.api_token.startswith(EncryptionService.PREFIX))
        self.assertEqual(integration.get_api_token(), token)

    def test_slack_webhook_url_is_encrypted_at_rest(self):
        webhook_url = "https://hooks.slack.com/services/a/b/c"
        integration = SlackIntegration.objects.create(
            organization=self.org,
            webhook_url=webhook_url,
            channel="#general",
            enabled=True,
        )
        integration.refresh_from_db()

        self.assertTrue(integration.webhook_url.startswith(EncryptionService.PREFIX))
        self.assertEqual(integration.get_webhook_url(), webhook_url)
