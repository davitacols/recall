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


class RationaleUpdateTests(TestCase):
    """Recording the why from the interface.

    Decisions had no update endpoint at all, so the list could say a decision
    cannot answer anything and offer no way to change that - pointing at a
    problem nobody could fix.
    """

    def setUp(self):
        self.org = Organization.objects.create(name="Edit Org", slug="edit-org")
        self.user = User.objects.create_user(
            username="edit_user", email="edit@example.com", password="pass1234",
            organization=self.org, role="member",
        )
        self.decision = Decision.objects.create(
            organization=self.org, title="A decision", description="x",
            decision_maker=self.user, status="proposed", rationale="",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def url(self, decision=None):
        return f"/api/decisions/{(decision or self.decision).id}/rationale/"

    def test_records_a_why(self):
        response = self.client.patch(
            self.url(), {"rationale": "The retry loop had no jitter."}, format="json"
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.decision.refresh_from_db()
        self.assertEqual(self.decision.rationale, "The retry loop had no jitter.")
        self.assertTrue(response.data["has_rationale"])

    def test_corrects_an_existing_why(self):
        self.decision.rationale = "The old reason."
        self.decision.save(update_fields=["rationale"])

        self.client.patch(
            self.url(), {"rationale": "The corrected reason."}, format="json"
        )

        self.decision.refresh_from_db()
        self.assertEqual(self.decision.rationale, "The corrected reason.")

    def test_whitespace_only_is_stored_as_empty(self):
        """Otherwise it would count as recorded and hide the gap again."""
        response = self.client.patch(
            self.url(), {"rationale": "   \n\t "}, format="json"
        )

        self.assertFalse(response.data["has_rationale"])
        self.decision.refresh_from_db()
        self.assertEqual(self.decision.rationale, "")

    def test_missing_field_is_a_400(self):
        response = self.client.patch(self.url(), {}, format="json")

        self.assertEqual(response.status_code, 400)

    def test_cannot_edit_another_workspaces_decision(self):
        other_org = Organization.objects.create(name="Theirs", slug="theirs-edit")
        other_user = User.objects.create_user(
            username="other_edit", email="otheredit@example.com", password="pass1234",
            organization=other_org, role="admin",
        )
        theirs = Decision.objects.create(
            organization=other_org, title="Theirs", description="x",
            decision_maker=other_user, status="proposed", rationale="Their reason.",
        )

        response = self.client.patch(
            self.url(theirs), {"rationale": "Overwritten."}, format="json"
        )

        self.assertEqual(response.status_code, 404)
        theirs.refresh_from_db()
        self.assertEqual(theirs.rationale, "Their reason.")

    def test_requires_authentication(self):
        anon = APIClient()

        response = anon.patch(self.url(), {"rationale": "x"}, format="json")

        self.assertEqual(response.status_code, 401)


class DecisionTextEditTests(TestCase):
    """Correcting the text on a decision after the fact.

    Description had no edit path at all, so a description pasted as one flat
    block could never be broken up - and the page that displays it is the page
    someone reads to understand the decision.
    """

    def setUp(self):
        self.org = Organization.objects.create(name="Text Org", slug="text-org")
        self.user = User.objects.create_user(
            username="text_user", email="text@example.com", password="pass1234",
            organization=self.org, role="member",
        )
        self.decision = Decision.objects.create(
            organization=self.org, title="A decision", description="flat block",
            decision_maker=self.user, status="proposed", rationale="",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def url(self, decision=None):
        return f"/api/decisions/{(decision or self.decision).id}/"

    def test_edits_the_description(self):
        response = self.client.patch(
            self.url(), {"description": "First line.\nSecond line."}, format="json"
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.decision.refresh_from_db()
        self.assertEqual(self.decision.description, "First line.\nSecond line.")

    def test_edits_the_title(self):
        response = self.client.patch(
            self.url(), {"title": "A better title"}, format="json"
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.decision.refresh_from_db()
        self.assertEqual(self.decision.title, "A better title")

    def test_rejects_a_title_too_short_to_find(self):
        response = self.client.patch(self.url(), {"title": "hi"}, format="json")

        self.assertEqual(response.status_code, 400)
        self.decision.refresh_from_db()
        self.assertEqual(self.decision.title, "A decision")

    def test_ignores_fields_that_are_not_text(self):
        """Status and impact carry their own rules and are not edited here."""
        response = self.client.patch(
            self.url(), {"status": "approved", "impact_level": "critical"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.decision.refresh_from_db()
        self.assertEqual(self.decision.status, "proposed")

    def test_edits_several_fields_at_once(self):
        response = self.client.patch(
            self.url(),
            {"title": "Corrected title", "rationale": "The real reason."},
            format="json",
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.decision.refresh_from_db()
        self.assertEqual(self.decision.title, "Corrected title")
        self.assertTrue(response.data["has_rationale"])

    def test_cannot_edit_another_workspaces_decision(self):
        other_org = Organization.objects.create(name="Theirs", slug="theirs-text")
        other_user = User.objects.create_user(
            username="other_text", email="othertext@example.com", password="pass1234",
            organization=other_org, role="admin",
        )
        theirs = Decision.objects.create(
            organization=other_org, title="Their decision", description="theirs",
            decision_maker=other_user, status="proposed", rationale="",
        )

        response = self.client.patch(
            self.url(theirs), {"description": "overwritten"}, format="json"
        )

        self.assertEqual(response.status_code, 404)
        theirs.refresh_from_db()
        self.assertEqual(theirs.description, "theirs")

    def test_the_rationale_route_still_works(self):
        response = self.client.patch(
            f"/api/decisions/{self.decision.id}/rationale/",
            {"rationale": "Because the retry loop had no jitter."},
            format="json",
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.decision.refresh_from_db()
        self.assertEqual(self.decision.rationale, "Because the retry loop had no jitter.")

    def test_the_rationale_route_will_not_edit_anything_else(self):
        """Narrow on purpose: the interface links straight to it."""
        response = self.client.patch(
            f"/api/decisions/{self.decision.id}/rationale/",
            {"title": "Sneaky retitle"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.decision.refresh_from_db()
        self.assertEqual(self.decision.title, "A decision")
