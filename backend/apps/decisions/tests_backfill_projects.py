"""Tests for backfilling a project onto decisions recorded before it existed.

The value of the backfill is entirely in what it refuses to do. An invented
attribution is worse than a blank one — a blank invites someone to fill it in,
a wrong one gets trusted and quoted.
"""

from io import StringIO

from django.core.management import call_command
from django.test import TestCase

from apps.agile.models import Project
from apps.conversations.models import Conversation
from apps.decisions.models import Decision
from apps.integrations.github_app_models import (
    DecisionPullRequest,
    GitHubAppInstallation,
    GitHubRepo,
)
from apps.organizations.models import Organization, User


class BackfillProjectsTests(TestCase):
    def setUp(self):
        self.org = Organization.objects.create(name="Backfill QA", slug="backfill-qa")
        self.user = User.objects.create_user(
            username="bf_user", email="bf@example.com", password="pass1234",
            organization=self.org, role="admin",
        )
        self.conversation = Conversation.objects.create(
            organization=self.org, author=self.user, post_type="update",
            title="seed", content="seed", ai_processed=True,
        )
        self.project = Project.objects.create(
            organization=self.org, name="Payments", key="BFPAY",
        )
        self.installation = GitHubAppInstallation.objects.create(
            organization=self.org, installation_id=550001, account_id=2,
            account_login="acme",
        )
        self.repo = GitHubRepo.objects.create(
            organization=self.org, installation=self.installation, repo_id=71,
            full_name="acme/payments", owner_login="acme", name="payments",
            project=self.project,
        )

    def _decision(self, title="A choice", project=None):
        return Decision.objects.create(
            organization=self.org, conversation=self.conversation, title=title,
            description="", decision_maker=self.user, status="proposed",
            rationale="Because.", project=project,
        )

    def _link(self, decision, repo=None, pr_number=1):
        return DecisionPullRequest.objects.create(
            organization=self.org, decision=decision, repo=repo or self.repo,
            pr_number=pr_number, title="PR", html_url="https://x.test/pull/1",
        )

    def _run(self, **kwargs):
        out = StringIO()
        call_command("backfill_decision_projects", stdout=out, **kwargs)
        return out.getvalue()

    def test_attributes_a_linked_decision(self):
        d = self._decision()
        self._link(d)
        self._run()
        d.refresh_from_db()
        self.assertEqual(d.project_id, self.project.id)

    def test_dry_run_writes_nothing(self):
        d = self._decision()
        self._link(d)
        output = self._run(dry_run=True)
        d.refresh_from_db()
        self.assertIsNone(d.project_id)
        self.assertIn("DRY RUN", output)

    def test_leaves_an_unlinked_decision_alone(self):
        """No title matching, no date heuristic. A blank invites a person."""
        d = self._decision(title="Adopt tenacity for retries in payments")
        self._run()
        d.refresh_from_db()
        self.assertIsNone(d.project_id)

    def test_never_overwrites_an_existing_project(self):
        other = Project.objects.create(
            organization=self.org, name="Search", key="BFSRCH",
        )
        d = self._decision(project=other)
        self._link(d)
        self._run()
        d.refresh_from_db()
        self.assertEqual(d.project_id, other.id)

    def test_refuses_a_project_from_another_workspace(self):
        stranger = Organization.objects.create(name="Elsewhere", slug="bf-elsewhere")
        foreign = Project.objects.create(
            organization=stranger, name="Theirs", key="BFTHR",
        )
        self.repo.project = foreign
        self.repo.save(update_fields=["project"])

        d = self._decision()
        self._link(d)
        output = self._run()

        d.refresh_from_db()
        self.assertIsNone(d.project_id)
        self.assertIn("another workspace", output)

    def test_repo_without_a_project_contributes_nothing(self):
        self.repo.project = None
        self.repo.save(update_fields=["project"])
        d = self._decision()
        self._link(d)
        self._run()
        d.refresh_from_db()
        self.assertIsNone(d.project_id)

    def test_is_idempotent(self):
        d = self._decision()
        self._link(d)
        self._run()
        self._run()
        d.refresh_from_db()
        self.assertEqual(d.project_id, self.project.id)
