"""The health endpoint must not report degraded just for being new.

The drift check runs nightly. Before it has ever run there is no row, and the
first version treated that as degraded - so a freshly deployed environment
reported unhealthy until the task first fired. Any uptime monitor watching the
endpoint would alarm on day one, and an endpoint that cries wolf on every
deployment gets ignored, which costs more than it saves.

Never-run and stopped-running are different problems though, and the second
one has to stay visible. The oldest installation is the clock.
"""

from datetime import timedelta
from unittest.mock import patch

from django.test import TestCase
from django.utils import timezone

from apps.integrations.github_app_models import (
    GitHubAppDriftCheck,
    GitHubAppInstallation,
)
from apps.organizations.models import Organization

CONFIG = "apps.integrations.github_app.get_app_config"
REDIS = "apps.organizations.health.redis.from_url"


@patch(REDIS)
@patch(CONFIG, return_value=object())
class HealthDriftTests(TestCase):
    URL = "/api/health/"

    def setUp(self):
        self.org = Organization.objects.create(name="Health Org", slug="health-org")

    def _installation(self, age_hours=0):
        install = GitHubAppInstallation.objects.create(
            organization=self.org, installation_id=33001, account_id=4,
            account_login="acme", account_type="Organization",
        )
        if age_hours:
            GitHubAppInstallation.objects.filter(pk=install.pk).update(
                created_at=timezone.now() - timedelta(hours=age_hours)
            )
        return install

    def _check(self, status_value, age_hours=0):
        check = GitHubAppDriftCheck.objects.create(status=status_value)
        if age_hours:
            GitHubAppDriftCheck.objects.filter(pk=check.pk).update(
                checked_at=timezone.now() - timedelta(hours=age_hours)
            )
        return check

    def _get(self):
        response = self.client.get(self.URL)
        self.assertEqual(response.status_code, 200)
        if response["Content-Type"].startswith("text/html"):
            raise AssertionError(
                f"health returned {response.status_code} as HTML: "
                f"{response.content[:300]}"
            )
        return response.json()

    def test_a_young_deployment_is_not_degraded(self, _cfg, _redis):
        """Nothing has run yet because nothing has had time to."""
        self._installation(age_hours=1)

        body = self._get()

        self.assertEqual(body["components"]["github_integration"], "unchecked")
        self.assertEqual(body["status"], "healthy")

    def test_no_installation_at_all_is_not_degraded(self, _cfg, _redis):
        body = self._get()

        self.assertEqual(body["components"]["github_integration"], "unchecked")
        self.assertEqual(body["status"], "healthy")

    def test_a_schedule_that_never_started_is_degraded(self, _cfg, _redis):
        """An old connection nothing has ever looked at means beat is broken."""
        self._installation(age_hours=72)

        body = self._get()

        self.assertEqual(body["components"]["github_integration"], "overdue")
        self.assertEqual(body["status"], "degraded")

    def test_a_healthy_check_is_healthy(self, _cfg, _redis):
        self._installation(age_hours=72)
        self._check(GitHubAppDriftCheck.STATUS_HEALTHY)

        body = self._get()

        self.assertEqual(body["components"]["github_integration"], "ok")
        self.assertEqual(body["status"], "healthy")

    def test_a_stale_check_is_degraded(self, _cfg, _redis):
        """The task ran once and then stopped."""
        self._installation(age_hours=200)
        self._check(GitHubAppDriftCheck.STATUS_HEALTHY, age_hours=48)

        body = self._get()

        self.assertEqual(body["components"]["github_integration"], "stale")
        self.assertEqual(body["status"], "degraded")

    def test_actual_drift_is_degraded(self, _cfg, _redis):
        self._installation(age_hours=72)
        self._check(GitHubAppDriftCheck.STATUS_DRIFT)

        body = self._get()

        self.assertEqual(body["components"]["github_integration"], "drift")
        self.assertEqual(body["status"], "degraded")

    def test_no_installation_identifiers_are_exposed(self, _cfg, _redis):
        """The endpoint is unauthenticated."""
        self._installation(age_hours=72)
        self._check(GitHubAppDriftCheck.STATUS_DRIFT)

        self.assertNotIn("33001", str(self._get()))
