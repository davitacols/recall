"""Importing a repository's already-merged pull requests from the interface.

The management command does the same walk, but only an operator with SSH can
run it. A customer who connects a repo cannot reach it at all, so their own
history - the best demonstration the product has - stays unread while their
workspace sits empty on the day it matters most.

What these pin down: the workspace boundary, that pressing twice does not queue
twice, that a repo with no merged pull requests is reported as its own distinct
outcome rather than a zero that reads like a fault, and that one unreadable
pull request does not end the walk.
"""

from unittest.mock import patch

from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient

from apps.conversations.models import Conversation
from apps.integrations import import_tasks
from apps.integrations.github_app_models import GitHubAppInstallation, GitHubRepo
from apps.organizations.models import Organization, User

LIST_PRS = "apps.integrations.github_app.list_recent_merged_prs"
CAPTURE = "apps.integrations.github_pr_capture.maybe_capture_pr_discussion"
DELAY = "apps.integrations.github_app_import_views.import_repo_pr_history.delay"


class _Fixture:
    """Shared setup only. Deliberately not a TestCase."""

    def setUp(self):
        cache.clear()
        self.org = Organization.objects.create(name="Import Org", slug="import-org")
        self.user = User.objects.create_user(
            username="import_user", email="import@example.com", password="pass1234",
            organization=self.org, role="admin",
        )
        self.installation = GitHubAppInstallation.objects.create(
            organization=self.org, installation_id=88001, account_id=9,
            account_login="acme", account_type="Organization",
        )
        self.repo = GitHubRepo.objects.create(
            organization=self.org, installation=self.installation,
            repo_id=9001, full_name="acme/dynamo", owner_login="acme", name="dynamo",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def url(self, repo=None):
        return f"/api/integrations/github/app/repos/{(repo or self.repo).pk}/import/"

    @staticmethod
    def _pr(number):
        return {"number": number, "title": f"PR {number}", "merged_at": "2026-08-01T00:00:00Z"}


class ImportEndpointTests(_Fixture, TestCase):

    @patch(DELAY)
    def test_starting_queues_the_job(self, delay):
        response = self.client.post(self.url())

        self.assertEqual(response.status_code, 202, response.data)
        self.assertEqual(response.data["status"], import_tasks.STATUS_QUEUED)
        delay.assert_called_once()

    @patch(DELAY)
    def test_pressing_twice_does_not_queue_twice(self, delay):
        self.client.post(self.url())
        response = self.client.post(self.url())

        self.assertEqual(response.status_code, 202)
        self.assertEqual(delay.call_count, 1, "impatience must not double the work")

    @patch(DELAY)
    def test_status_is_readable_while_it_runs(self, _delay):
        self.client.post(self.url())

        response = self.client.get(self.url())

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], import_tasks.STATUS_QUEUED)

    def test_status_before_any_run_is_null(self):
        response = self.client.get(self.url())

        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.data["status"])

    @patch(DELAY)
    def test_refuses_a_repo_switched_off_for_decisions(self, delay):
        self.repo.is_enabled_for_decisions = False
        self.repo.save(update_fields=["is_enabled_for_decisions"])

        response = self.client.post(self.url())

        self.assertEqual(response.status_code, 409)
        delay.assert_not_called()

    @patch(DELAY)
    def test_refuses_a_revoked_installation(self, delay):
        from django.utils import timezone
        self.installation.revoked_at = timezone.now()
        self.installation.save(update_fields=["revoked_at"])

        response = self.client.post(self.url())

        self.assertEqual(response.status_code, 409)
        delay.assert_not_called()

    @patch(DELAY)
    def test_cannot_import_another_workspaces_repo(self, delay):
        other_org = Organization.objects.create(name="Theirs", slug="theirs-import")
        other_install = GitHubAppInstallation.objects.create(
            organization=other_org, installation_id=88002, account_id=10,
            account_login="them", account_type="Organization",
        )
        their_repo = GitHubRepo.objects.create(
            organization=other_org, installation=other_install,
            repo_id=9002, full_name="them/secret", owner_login="them", name="secret",
        )

        response = self.client.post(self.url(their_repo))

        self.assertEqual(response.status_code, 404)
        delay.assert_not_called()

    def test_requires_authentication(self):
        anon = APIClient()

        self.assertEqual(anon.post(self.url()).status_code, 401)

    @patch(DELAY)
    def test_reports_how_many_conversations_the_repo_already_has(self, _delay):
        Conversation.objects.create(
            organization=self.org, author=self.user, post_type="update",
            title="PR #1", content="x", ai_processed=True,
            source=Conversation.SOURCE_GITHUB_PR,
            external_id=f"{self.repo.repo_id}:1",
        )

        response = self.client.get(self.url())

        self.assertEqual(response.data["conversations_captured_total"], 1)


class ImportTaskTests(_Fixture, TestCase):

    @patch(LIST_PRS, return_value=[])
    def test_no_merged_prs_is_its_own_outcome(self, _prs):
        """Distinct from "nothing met the bar" - this repo can never produce."""
        result = import_tasks.import_repo_pr_history(self.repo.id)

        self.assertEqual(result["status"], import_tasks.STATUS_DONE)
        self.assertTrue(result["no_pull_requests"])
        self.assertEqual(result["captured"], 0)

    @patch(LIST_PRS)
    def test_counts_what_the_filter_accepted(self, prs):
        prs.return_value = [self._pr(1), self._pr(2), self._pr(3)]
        with patch(CAPTURE, side_effect=[object(), None, object()]):
            result = import_tasks.import_repo_pr_history(self.repo.id)

        self.assertEqual(result["status"], import_tasks.STATUS_DONE)
        self.assertEqual(result["captured"], 2)
        self.assertEqual(result["examined"], 3)
        self.assertFalse(result.get("no_pull_requests"))

    @patch(LIST_PRS)
    def test_one_unreadable_pull_request_does_not_end_the_walk(self, prs):
        prs.return_value = [self._pr(1), self._pr(2), self._pr(3)]
        with patch(CAPTURE, side_effect=[RuntimeError("boom"), object(), object()]) as cap:
            result = import_tasks.import_repo_pr_history(self.repo.id)

        self.assertEqual(cap.call_count, 3)
        self.assertEqual(result["captured"], 2)
        self.assertEqual(result["status"], import_tasks.STATUS_DONE)

    @patch(LIST_PRS, side_effect=RuntimeError("403 from GitHub"))
    def test_an_unreachable_repo_fails_with_a_reason(self, _prs):
        result = import_tasks.import_repo_pr_history(self.repo.id)

        self.assertEqual(result["status"], import_tasks.STATUS_FAILED)
        self.assertIn("403", result["error"])

    def test_a_missing_repo_fails_rather_than_raising(self):
        result = import_tasks.import_repo_pr_history(999999)

        self.assertEqual(result["status"], import_tasks.STATUS_FAILED)

    @patch(LIST_PRS)
    def test_progress_is_visible_while_it_runs(self, prs):
        prs.return_value = [self._pr(1), self._pr(2)]
        seen = []

        def record(*_args, **_kwargs):
            seen.append(dict(import_tasks.get_status(self.repo.id) or {}))
            return None

        with patch(CAPTURE, side_effect=record):
            import_tasks.import_repo_pr_history(self.repo.id)

        self.assertEqual(seen[0]["status"], import_tasks.STATUS_RUNNING)
        self.assertEqual(seen[0]["total"], 2)
