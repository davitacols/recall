"""Regression coverage for GitHub App installation drift detection."""

import json
from datetime import timedelta
from unittest.mock import Mock, patch

from django.test import RequestFactory, TestCase, override_settings
from django.utils import timezone

from apps.integrations.github_app import list_app_installations
from apps.integrations.github_app_models import (
    GitHubAppDriftCheck,
    GitHubAppInstallation,
)
from apps.integrations.github_app_views import _serialize_installation
from apps.integrations.tasks import check_github_app_installation_drift
from apps.organizations.health import health_check
from apps.organizations.models import Organization


GITHUB_APP_SETTINGS = {
    "GITHUB_APP_ID": "12345",
    "GITHUB_APP_SLUG": "knoledgr-test",
    "GITHUB_APP_PRIVATE_KEY": "test-private-key",
    "GITHUB_APP_WEBHOOK_SECRET": "test-webhook-secret",
}


def _installation(org, installation_id):
    return GitHubAppInstallation.objects.create(
        organization=org,
        installation_id=installation_id,
        account_id=installation_id + 1000,
        account_login=f"account-{installation_id}",
    )


@override_settings(**GITHUB_APP_SETTINGS)
class InstallationDriftTaskTests(TestCase):
    def setUp(self):
        self.org = Organization.objects.create(name="Drift QA", slug="drift-qa")

    @patch("apps.integrations.tasks.list_app_installations")
    def test_matching_installation_sets_are_healthy(self, mock_list):
        _installation(self.org, 101)
        mock_list.return_value = [{"id": 101}]

        result = check_github_app_installation_drift()

        self.assertEqual(result["status"], GitHubAppDriftCheck.STATUS_HEALTHY)
        check = GitHubAppDriftCheck.objects.get()
        self.assertEqual(check.local_installation_count, 1)
        self.assertEqual(check.github_installation_count, 1)
        self.assertEqual(check.missing_locally, [])
        self.assertEqual(check.missing_on_github, [])

    @patch("apps.integrations.tasks.list_app_installations")
    def test_remote_installation_without_local_row_is_detected(self, mock_list):
        mock_list.return_value = [{"id": 202}]

        result = check_github_app_installation_drift()

        self.assertEqual(result["status"], GitHubAppDriftCheck.STATUS_DRIFT)
        self.assertEqual(result["missing_locally"], [202])
        self.assertEqual(GitHubAppDriftCheck.objects.get().missing_locally, [202])

    @patch("apps.integrations.tasks.list_app_installations")
    def test_local_installation_missing_on_github_is_detected(self, mock_list):
        _installation(self.org, 303)
        mock_list.return_value = []

        result = check_github_app_installation_drift()

        self.assertEqual(result["status"], GitHubAppDriftCheck.STATUS_DRIFT)
        self.assertEqual(result["missing_on_github"], [303])

    @patch("apps.integrations.tasks.list_app_installations")
    def test_revoked_local_installation_is_not_expected_on_github(self, mock_list):
        installation = _installation(self.org, 404)
        installation.revoked_at = timezone.now()
        installation.save(update_fields=["revoked_at"])
        mock_list.return_value = []

        result = check_github_app_installation_drift()

        self.assertEqual(result["status"], GitHubAppDriftCheck.STATUS_HEALTHY)
        self.assertEqual(result["local_count"], 0)

    @patch("apps.integrations.tasks.list_app_installations", side_effect=RuntimeError("offline"))
    def test_api_failure_is_persisted_without_leaking_exception_text(self, _mock_list):
        result = check_github_app_installation_drift()

        self.assertEqual(result["status"], GitHubAppDriftCheck.STATUS_ERROR)
        check = GitHubAppDriftCheck.objects.get()
        self.assertEqual(check.status, GitHubAppDriftCheck.STATUS_ERROR)
        self.assertFalse(hasattr(check, "error_message"))


class InstallationDriftNotConfiguredTests(TestCase):
    @override_settings(
        GITHUB_APP_ID="",
        GITHUB_APP_SLUG="",
        GITHUB_APP_PRIVATE_KEY="",
        GITHUB_APP_WEBHOOK_SECRET="",
    )
    @patch("apps.integrations.tasks.list_app_installations")
    def test_unconfigured_deployment_does_not_call_github(self, mock_list):
        result = check_github_app_installation_drift()

        self.assertEqual(result["status"], GitHubAppDriftCheck.STATUS_NOT_CONFIGURED)
        mock_list.assert_not_called()


@override_settings(**GITHUB_APP_SETTINGS)
class AppInstallationClientTests(TestCase):
    @patch("apps.integrations.github_app.build_app_jwt", return_value="app-jwt")
    @patch("apps.integrations.github_app.requests.get")
    def test_app_installation_listing_follows_pagination(self, mock_get, _mock_jwt):
        first = Mock(
            status_code=200,
            headers={"Link": '<https://api.github.test/app/installations?page=2>; rel="next"'},
        )
        first.json.return_value = [{"id": 11}]
        second = Mock(status_code=200, headers={})
        second.json.return_value = [{"id": 12}]
        mock_get.side_effect = [first, second]

        result = list_app_installations()

        self.assertEqual([row["id"] for row in result], [11, 12])
        self.assertEqual(mock_get.call_count, 2)


@override_settings(**GITHUB_APP_SETTINGS)
class DriftStatusSurfaceTests(TestCase):
    def setUp(self):
        self.org = Organization.objects.create(name="Drift Surface", slug="drift-surface")
        self.installation = _installation(self.org, 505)

    def test_installation_payload_marks_missing_remote_installation(self):
        GitHubAppDriftCheck.objects.create(
            status=GitHubAppDriftCheck.STATUS_DRIFT,
            local_installation_count=1,
            missing_on_github=[505],
        )

        payload = _serialize_installation(self.installation)

        self.assertEqual(payload["verification_status"], "missing_on_github")
        self.assertIsNotNone(payload["last_verified_at"])

    def test_installation_payload_marks_an_overdue_check_as_stale(self):
        check = GitHubAppDriftCheck.objects.create(
            status=GitHubAppDriftCheck.STATUS_HEALTHY,
            local_installation_count=1,
            github_installation_count=1,
        )
        GitHubAppDriftCheck.objects.filter(pk=check.pk).update(
            checked_at=timezone.now() - timedelta(hours=37)
        )

        payload = _serialize_installation(self.installation)

        self.assertEqual(payload["verification_status"], "check_stale")

    @patch("apps.organizations.health.redis.from_url")
    @patch("apps.knowledge.search_engine.get_search_engine", return_value=object())
    def test_public_health_reports_drift_without_exposing_installation_ids(
        self, _mock_search, mock_redis
    ):
        mock_redis.return_value.ping.return_value = True
        GitHubAppDriftCheck.objects.create(
            status=GitHubAppDriftCheck.STATUS_DRIFT,
            local_installation_count=1,
            github_installation_count=0,
            missing_on_github=[505],
        )

        response = health_check(RequestFactory().get("/api/health/"))
        payload = json.loads(response.content)

        self.assertEqual(payload["components"]["github_integration"], "drift")
        self.assertEqual(payload["status"], "degraded")
        self.assertNotIn("505", response.content.decode("utf-8"))
