"""Tests for the one-off catch-up over already-merged pull requests.

Capture is forward-only by construction: it rides live merge events. A team
connecting a repo therefore sees an empty workspace until the next substantive
PR merges, which can be a fortnight given how much the substance filter skips.
This command walks the history once so the product demonstrates itself on the
customer's own data.

The properties worth pinning: the substance bar is not lowered for history,
re-running captures nothing twice, and one unreachable repo does not abandon
the rest.
"""

from io import StringIO
from unittest.mock import patch

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase

from apps.integrations.github_app_models import GitHubAppInstallation, GitHubRepo
from apps.organizations.models import Organization, User

LIST_PRS = "apps.integrations.management.commands.backfill_pr_capture.list_recent_merged_prs"
CAPTURE = "apps.integrations.management.commands.backfill_pr_capture.maybe_capture_pr_discussion"
CONFIG = "apps.integrations.management.commands.backfill_pr_capture.get_app_config"


class _Fixture:
    """Shared setup only. Deliberately not a TestCase, so these do not re-run."""

    def setUp(self):
        self.org = Organization.objects.create(name="Backfill PR", slug="backfill-pr")
        self.user = User.objects.create_user(
            username="bpr_user", email="bpr@example.com", password="pass1234",
            organization=self.org, role="admin",
        )
        self.installation = GitHubAppInstallation.objects.create(
            organization=self.org, installation_id=77001, account_id=5,
            account_login="acme", account_type="Organization",
        )
        self.repo = GitHubRepo.objects.create(
            organization=self.org, installation=self.installation,
            repo_id=5001, full_name="acme/dynamo",
            owner_login="acme", name="dynamo",
        )

    def _run(self, **kwargs):
        out = StringIO()
        call_command("backfill_pr_capture", stdout=out, stderr=out, sleep=0, **kwargs)
        return out.getvalue()

    @staticmethod
    def _pr(number, title="A change"):
        return {"number": number, "title": title, "merged_at": "2026-08-01T00:00:00Z"}


@patch(CONFIG, return_value=object())
class BackfillPrCaptureTests(_Fixture, TestCase):

    @patch(LIST_PRS, return_value=[])
    def test_reports_when_a_repo_has_no_merged_prs(self, _prs, _cfg):
        output = self._run()

        self.assertIn("0 merged PR(s)", output)
        self.assertIn("captured 0", output)

    @patch(LIST_PRS)
    def test_captures_what_the_filter_accepts(self, prs, _cfg):
        prs.return_value = [self._pr(1), self._pr(2)]
        with patch(CAPTURE, side_effect=[object(), None]) as capture:
            output = self._run()

        self.assertEqual(capture.call_count, 2)
        self.assertIn("#1 captured", output)
        self.assertIn("captured 1, passed over 1", output)

    @patch(LIST_PRS)
    def test_does_not_lower_the_bar_for_history(self, prs, _cfg):
        """Everything goes through the same capture path, filter included."""
        prs.return_value = [self._pr(1)]
        with patch(CAPTURE, return_value=None) as capture:
            output = self._run()

        capture.assert_called_once()
        self.assertIn("Nothing met the bar", output)

    @patch(LIST_PRS)
    def test_dry_run_captures_nothing(self, prs, _cfg):
        prs.return_value = [self._pr(1), self._pr(2)]
        with patch(CAPTURE) as capture:
            output = self._run(dry_run=True)

        capture.assert_not_called()
        self.assertIn("DRY RUN", output)
        self.assertIn("would examine", output)

    @patch(LIST_PRS)
    def test_a_failing_repo_does_not_abandon_the_others(self, prs, _cfg):
        other = GitHubRepo.objects.create(
            organization=self.org, installation=self.installation,
            repo_id=5002, full_name="acme/other", owner_login="acme", name="other",
        )
        prs.side_effect = lambda inst, full_name, limit=50: (
            [] if full_name == other.full_name else (_ for _ in ()).throw(RuntimeError("403"))
        )

        with self.assertRaises(CommandError):
            self._run()

        # The healthy repo was still visited despite the other one throwing.
        self.assertEqual(prs.call_count, 2)

    @patch(LIST_PRS)
    def test_a_failing_pull_request_does_not_abandon_the_rest(self, prs, _cfg):
        prs.return_value = [self._pr(1), self._pr(2), self._pr(3)]
        with patch(CAPTURE, side_effect=[RuntimeError("boom"), object(), None]) as capture:
            with self.assertRaises(CommandError):
                self._run()

        self.assertEqual(capture.call_count, 3)

    @patch(LIST_PRS, return_value=[])
    def test_skips_a_repo_disabled_for_decisions(self, prs, _cfg):
        self.repo.is_enabled_for_decisions = False
        self.repo.save(update_fields=["is_enabled_for_decisions"])

        with self.assertRaises(CommandError):
            self._run()

        prs.assert_not_called()

    @patch(LIST_PRS, return_value=[])
    def test_skips_a_revoked_installation(self, prs, _cfg):
        from django.utils import timezone
        self.installation.revoked_at = timezone.now()
        self.installation.save(update_fields=["revoked_at"])

        output = self._run()

        prs.assert_not_called()
        self.assertIn("installation inactive", output)

    @patch(LIST_PRS, return_value=[])
    def test_repo_filter_is_honoured(self, prs, _cfg):
        GitHubRepo.objects.create(
            organization=self.org, installation=self.installation,
            repo_id=5003, full_name="acme/unrelated", owner_login="acme", name="unrelated",
        )

        self._run(repo="acme/dynamo")

        self.assertEqual(prs.call_count, 1)

    @patch(LIST_PRS, return_value=[])
    def test_org_filter_leaves_other_workspaces_alone(self, prs, _cfg):
        other_org = Organization.objects.create(name="Theirs", slug="theirs-bpr")
        other_install = GitHubAppInstallation.objects.create(
            organization=other_org, installation_id=77002, account_id=6,
            account_login="them", account_type="Organization",
        )
        GitHubRepo.objects.create(
            organization=other_org, installation=other_install,
            repo_id=6001, full_name="them/secret", owner_login="them", name="secret",
        )

        self._run(org=self.org.id)

        self.assertEqual(prs.call_count, 1)


class ConfigGateTests(_Fixture, TestCase):

    @patch(CONFIG, return_value=None)
    def test_refuses_when_the_app_is_not_configured(self, _cfg):
        with self.assertRaises(CommandError) as ctx:
            self._run()

        self.assertIn("not configured", str(ctx.exception))
