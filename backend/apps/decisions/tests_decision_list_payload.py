"""The decisions list must return the reasoning, and what the decision reaches.

The list returned title, description, status, owner, impact and date - and not
rationale. So the one field the product exists to preserve was searchable and
never rendered, and the page looked like a ticket tracker.

Hiding an empty why is also why it stays empty. A gap nobody can see is a gap
nobody fills, which is how a record arrives at 44% with no one noticing.
"""

from django.test import TestCase
from rest_framework.test import APIClient

from apps.agile.models import Project
from apps.conversations.models import Conversation
from apps.decisions.models import Decision
from apps.integrations.github_app_models import (
    DecisionPullRequest,
    GitHubAppInstallation,
    GitHubRepo,
)
from apps.organizations.models import Organization, User


class DecisionListPayloadTests(TestCase):
    URL = "/api/decisions/"

    def setUp(self):
        self.org = Organization.objects.create(name="List Org", slug="list-org")
        self.user = User.objects.create_user(
            username="list_user", email="list@example.com", password="pass1234",
            organization=self.org, role="admin",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def _decision(self, title="A decision", rationale="", **extra):
        return Decision.objects.create(
            organization=self.org, title=title, description="Some description",
            decision_maker=self.user, status="proposed", rationale=rationale,
            **extra,
        )

    def _row(self, decision):
        response = self.client.get(self.URL)
        self.assertEqual(response.status_code, 200)
        return next(r for r in response.data if r["id"] == decision.id)

    def test_returns_the_rationale(self):
        decision = self._decision(rationale="Because the retry loop had no jitter.")

        row = self._row(decision)

        self.assertEqual(row["rationale"], "Because the retry loop had no jitter.")
        self.assertTrue(row["has_rationale"])

    def test_flags_a_missing_rationale(self):
        decision = self._decision(rationale="")

        row = self._row(decision)

        self.assertFalse(row["has_rationale"])

    def test_whitespace_is_not_a_rationale(self):
        """Must agree with the dashboard percentage, or the two disagree."""
        decision = self._decision(rationale="  \n\t ")

        row = self._row(decision)

        self.assertFalse(row["has_rationale"])

    def test_rationale_is_flattened_and_truncated(self):
        decision = self._decision(
            rationale="<p>First para.</p><p>Second para.</p>"
        )

        row = self._row(decision)

        self.assertNotIn("<p>", row["rationale"])
        self.assertIn("First para. Second para.", row["rationale"])

    def test_reports_whether_the_decision_reaches_code(self):
        decision = self._decision(rationale="A reason.")
        installation = GitHubAppInstallation.objects.create(
            organization=self.org, installation_id=66001, account_id=3,
            account_login="acme", account_type="Organization",
        )
        repo = GitHubRepo.objects.create(
            organization=self.org, installation=installation, repo_id=3001,
            full_name="acme/dynamo", owner_login="acme", name="dynamo",
        )
        DecisionPullRequest.objects.create(
            organization=self.org, decision=decision, repo=repo,
            pr_number=7, title="A PR", html_url="https://example.test/7",
        )

        row = self._row(decision)

        self.assertEqual(row["pull_request_count"], 1)

    def test_unlinked_decision_reports_zero_rather_than_nothing(self):
        decision = self._decision(rationale="A reason.")

        row = self._row(decision)

        self.assertEqual(row["pull_request_count"], 0)

    def test_reports_the_source_discussion(self):
        conversation = Conversation.objects.create(
            organization=self.org, author=self.user, post_type="update",
            title="source", content="the argument", ai_processed=True,
        )
        decision = self._decision(rationale="A reason.", conversation=conversation)

        row = self._row(decision)

        self.assertEqual(row["conversation_id"], conversation.id)

    def test_reports_the_project(self):
        project = Project.objects.create(
            organization=self.org, name="Dynamo", key="DYNLIST"
        )
        decision = self._decision(rationale="A reason.", project=project)

        row = self._row(decision)

        self.assertEqual(row["project_name"], "Dynamo")

    def test_another_workspace_is_not_listed(self):
        other_org = Organization.objects.create(name="Theirs", slug="theirs-list")
        other_user = User.objects.create_user(
            username="other_list", email="otherlist@example.com", password="pass1234",
            organization=other_org, role="admin",
        )
        theirs = Decision.objects.create(
            organization=other_org, title="Their decision", description="x",
            decision_maker=other_user, status="proposed", rationale="Their reason.",
        )

        response = self.client.get(self.URL)

        self.assertNotIn(theirs.id, [r["id"] for r in response.data])
