"""Tests for decision<->file attribution and the PR context comment.

The feature answers "why is this code here?", and its whole value rests on
restraint. A reviewer who is told about an irrelevant decision once will skim
past the next one, and there is no recovering from that — so most of these
tests are about what is deliberately *not* attributed and *not* posted.
"""

from unittest.mock import patch

from django.test import TestCase

from apps.conversations.models import Conversation
from apps.decisions.models import Decision
from apps.integrations.github_app_models import (
    DecisionFile,
    DecisionPullRequest,
    GitHubAppInstallation,
    GitHubRepo,
)
from apps.integrations.github_decision_files import (
    MAX_FILES_PER_LINK,
    decisions_for_paths,
    is_noise,
    sync_link_files,
)
from apps.organizations.models import Organization, User


def _gh_file(name, status="modified", changes=10):
    return {"filename": name, "status": status, "changes": changes}


class NoiseFilterTests(TestCase):
    def test_lockfiles_and_generated_paths_are_noise(self):
        for path in (
            "package-lock.json",
            "frontend/yarn.lock",
            "backend/poetry.lock",
            "go.sum",
            "node_modules/react/index.js",
            "vendor/github.com/x/y.go",
            "dist/main.js",
            "src/__snapshots__/App.test.js.snap",
            "static/app.min.js",
            "docs/diagram.png",
            "apps/core/migrations/0003_auto.py",
        ):
            self.assertTrue(is_noise(path), f"{path} should be treated as noise")

    def test_source_files_are_not_noise(self):
        for path in (
            "src/client/retry.py",
            "backend/apps/integrations/github_app.py",
            "frontend/src/pages/Decisions.js",
            "README.md",
            "apps/core/migrations/__init__.py",
        ):
            self.assertFalse(is_noise(path), f"{path} should not be treated as noise")


class _Fixture:
    """Shared setup. Deliberately not a TestCase.

    A TestCase subclass inherits its parent's test methods, so the two
    classes below were silently re-running every sync test — three times
    over — against fixtures they had modified for their own purposes.
    Harmless here, but the same shape that broke the project tests.
    """

    def setUp(self):
        self.org = Organization.objects.create(name="Files QA", slug="files-qa")
        self.user = User.objects.create_user(
            username="files_user", email="files@example.com", password="pass1234",
            organization=self.org, role="admin",
        )
        self.installation = GitHubAppInstallation.objects.create(
            organization=self.org, installation_id=990001, account_id=1,
            account_login="acme",
        )
        self.repo = GitHubRepo.objects.create(
            organization=self.org, installation=self.installation, repo_id=51,
            full_name="acme/widgets", owner_login="acme", name="widgets",
        )
        self.conversation = Conversation.objects.create(
            organization=self.org, author=self.user, post_type="update",
            title="seed", content="seed", ai_processed=True,
        )
        self.decision = Decision.objects.create(
            organization=self.org, conversation=self.conversation,
            title="Use tenacity for retries", description="",
            decision_maker=self.user, status="approved",
            rationale="The hand-rolled loop had no jitter, so clients retried in lockstep.",
        )
        self.link = DecisionPullRequest.objects.create(
            organization=self.org, decision=self.decision, repo=self.repo,
            pr_number=7, title="Swap in tenacity", html_url="https://x.test/pull/7",
        )

    def _sync_with(self, files):
        with patch("apps.integrations.github_decision_files.list_pr_files", return_value=files):
            return sync_link_files(self.link)


class SyncLinkFilesTests(_Fixture, TestCase):
    def test_records_source_files(self):
        count = self._sync_with([
            _gh_file("src/client/retry.py"),
            _gh_file("tests/test_retry.py"),
        ])
        self.assertEqual(count, 2)
        self.assertEqual(
            sorted(DecisionFile.objects.values_list("path", flat=True)),
            ["src/client/retry.py", "tests/test_retry.py"],
        )

    def test_lockfile_only_pr_records_nothing(self):
        self.assertEqual(self._sync_with([_gh_file("package-lock.json")]), 0)
        self.assertEqual(DecisionFile.objects.count(), 0)

    def test_sweeping_pr_is_not_attributed(self):
        """A rename or reformat is not evidence of a decision about each file."""
        many = [_gh_file(f"src/module_{i}.py") for i in range(MAX_FILES_PER_LINK + 5)]
        self.assertEqual(self._sync_with(many), 0)
        self.assertEqual(DecisionFile.objects.count(), 0)

    def test_resync_replaces_rather_than_accumulates(self):
        """A force-push can drop files; a stale row would keep claiming them."""
        self._sync_with([_gh_file("src/a.py"), _gh_file("src/b.py")])
        self._sync_with([_gh_file("src/a.py")])
        self.assertEqual(
            list(DecisionFile.objects.values_list("path", flat=True)), ["src/a.py"]
        )

    def test_github_failure_is_not_fatal(self):
        with patch(
            "apps.integrations.github_decision_files.list_pr_files",
            side_effect=RuntimeError("GitHub is down"),
        ):
            self.assertEqual(sync_link_files(self.link), 0)


class DecisionsForPathsTests(_Fixture, TestCase):
    def test_finds_the_decision_behind_a_file(self):
        self._sync_with([_gh_file("src/client/retry.py")])
        found = decisions_for_paths(self.org, self.repo, ["src/client/retry.py"])
        self.assertEqual(len(found), 1)
        self.assertEqual(found[0][0].id, self.decision.id)
        self.assertEqual(found[0][1], ["src/client/retry.py"])

    def test_unrelated_file_finds_nothing(self):
        self._sync_with([_gh_file("src/client/retry.py")])
        self.assertEqual(decisions_for_paths(self.org, self.repo, ["src/other.py"]), [])

    def test_a_decision_that_deleted_a_file_is_not_why_it_exists(self):
        self._sync_with([_gh_file("src/legacy.py", status="removed")])
        self.assertEqual(decisions_for_paths(self.org, self.repo, ["src/legacy.py"]), [])

    def test_noise_paths_are_not_looked_up(self):
        self.assertEqual(decisions_for_paths(self.org, self.repo, ["package-lock.json"]), [])

    def test_decisions_are_ranked_by_coverage(self):
        """The decision accounting for more of the diff should read first."""
        other = Decision.objects.create(
            organization=self.org, conversation=self.conversation,
            title="Split the client module", description="",
            decision_maker=self.user, status="approved", rationale="Because.",
        )
        other_link = DecisionPullRequest.objects.create(
            organization=self.org, decision=other, repo=self.repo, pr_number=8,
            title="Split", html_url="https://x.test/pull/8",
        )
        self._sync_with([_gh_file("src/client/retry.py")])
        with patch(
            "apps.integrations.github_decision_files.list_pr_files",
            return_value=[_gh_file("src/client/retry.py"), _gh_file("src/client/pool.py")],
        ):
            sync_link_files(other_link)

        found = decisions_for_paths(
            self.org, self.repo, ["src/client/retry.py", "src/client/pool.py"]
        )
        self.assertEqual(found[0][0].id, other.id)

    def test_workspace_isolation(self):
        """A file path is not unique across customers."""
        stranger = Organization.objects.create(name="Other", slug="other-co")
        self._sync_with([_gh_file("src/client/retry.py")])
        self.assertEqual(
            decisions_for_paths(stranger, self.repo, ["src/client/retry.py"]), []
        )


class ContextCommentTests(_Fixture, TestCase):
    def setUp(self):
        super().setUp()
        self.installation.permissions = {"pull_requests": "write"}
        self.installation.save(update_fields=["permissions"])
        self.pr = {"number": 42, "title": "Rework retries"}

    def _run(self, changed, existing_comments=None):
        from apps.integrations import github_pr_context

        posted = {}

        class _Resp:
            ok = True
            status_code = 200

            def __init__(self, payload):
                self._payload = payload

            def json(self):
                return self._payload

        def fake_get(path, installation_id=None, params=None):
            return _Resp(existing_comments or [])

        def fake_post(path, installation_id=None, json_body=None):
            posted["body"] = json_body["body"]
            return _Resp({})

        with patch.object(github_pr_context, "list_pr_files",
                          create=True, return_value=[_gh_file(p) for p in changed]), \
             patch("apps.integrations.github_app.list_pr_files",
                   return_value=[_gh_file(p) for p in changed]), \
             patch.object(github_pr_context, "github_get", side_effect=fake_get), \
             patch.object(github_pr_context, "github_post", side_effect=fake_post):
            made = github_pr_context.maybe_comment_context(
                installation=self.installation, repo=self.repo, pr=self.pr,
                base_url="https://knoledgr.test",
            )
        return made, posted.get("body", "")

    def test_comments_when_a_touched_file_carries_reasoning(self):
        self._sync_with([_gh_file("src/client/retry.py")])
        made, body = self._run(["src/client/retry.py"])
        self.assertTrue(made)
        self.assertIn("DEC-%d" % self.decision.id, body)
        self.assertIn("no jitter", body)
        self.assertIn("src/client/retry.py", body)

    def test_silent_when_the_decision_has_no_reasoning(self):
        """A bare title tells a reviewer nothing the diff does not already."""
        self.decision.rationale = ""
        self.decision.save(update_fields=["rationale"])
        self._sync_with([_gh_file("src/client/retry.py")])
        made, _ = self._run(["src/client/retry.py"])
        self.assertFalse(made)

    def test_silent_when_nothing_matches(self):
        self._sync_with([_gh_file("src/client/retry.py")])
        made, _ = self._run(["docs/README.md"])
        self.assertFalse(made)

    def test_does_not_comment_twice(self):
        self._sync_with([_gh_file("src/client/retry.py")])
        from apps.integrations.github_pr_context import CONTEXT_MARKER

        made, _ = self._run(
            ["src/client/retry.py"],
            existing_comments=[{"body": CONTEXT_MARKER + " earlier"}],
        )
        self.assertFalse(made)

    def test_skips_a_decision_the_pr_is_already_linked_to(self):
        """The author chose that link; repeating it back is noise."""
        self._sync_with([_gh_file("src/client/retry.py")])
        DecisionPullRequest.objects.create(
            organization=self.org, decision=self.decision, repo=self.repo,
            pr_number=42, title="Rework retries", html_url="https://x.test/pull/42",
        )
        made, _ = self._run(["src/client/retry.py"])
        self.assertFalse(made)

    def test_silent_without_write_permission(self):
        self.installation.permissions = {"pull_requests": "read"}
        self.installation.save(update_fields=["permissions"])
        self._sync_with([_gh_file("src/client/retry.py")])
        made, _ = self._run(["src/client/retry.py"])
        self.assertFalse(made)
