"""Removing a decision that should never have been one.

Decisions could be created and never removed: no endpoint, no admin
registration, nothing in the interface. So a conversation converted by mistake
stayed in the count forever, holding down the one number the product turns on.
Four of the nine decisions in the first workspace were of that kind - titled
About Galordy, Introduction, Missing Implementations, code implementation.
"""

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.decisions.intelligence_models import DecisionPrediction
from apps.decisions.models import Decision
from apps.integrations.github_app_models import (
    DecisionPullRequest,
    GitHubAppInstallation,
    GitHubRepo,
)
from apps.organizations.models import Organization, User


class DecisionDeleteTests(TestCase):
    def setUp(self):
        self.org = Organization.objects.create(name="Del Org", slug="del-org")
        self.admin = User.objects.create_user(
            username="del_admin", email="deladmin@example.com", password="pass1234",
            organization=self.org, role="admin",
        )
        self.member = User.objects.create_user(
            username="del_member", email="delmember@example.com", password="pass1234",
            organization=self.org, role="member",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.admin)

    def _decision(self, maker=None):
        return Decision.objects.create(
            organization=self.org, title="Introduction", description="x",
            decision_maker=maker or self.admin, status="proposed", rationale="",
        )

    def url(self, decision):
        return f"/api/decisions/{decision.id}/"

    def test_an_admin_can_delete(self):
        decision = self._decision()

        response = self.client.delete(self.url(decision))

        self.assertEqual(response.status_code, 200, response.data)
        self.assertFalse(Decision.objects.filter(id=decision.id).exists())

    def test_whoever_recorded_it_can_delete_it(self):
        """A member who converted a conversation by mistake should not need an admin."""
        decision = self._decision(maker=self.member)
        client = APIClient()
        client.force_authenticate(user=self.member)

        response = client.delete(self.url(decision))

        self.assertEqual(response.status_code, 200, response.data)

    def test_an_unrelated_member_cannot_delete(self):
        decision = self._decision(maker=self.admin)
        client = APIClient()
        client.force_authenticate(user=self.member)

        response = client.delete(self.url(decision))

        self.assertEqual(response.status_code, 403)
        self.assertTrue(Decision.objects.filter(id=decision.id).exists())

    def test_refuses_when_pull_requests_are_linked(self):
        """Those links are evidence. The cascade would take them silently."""
        decision = self._decision()
        installation = GitHubAppInstallation.objects.create(
            organization=self.org, installation_id=55001, account_id=2,
            account_login="acme", account_type="Organization",
        )
        repo = GitHubRepo.objects.create(
            organization=self.org, installation=installation, repo_id=2001,
            full_name="acme/dynamo", owner_login="acme", name="dynamo",
        )
        DecisionPullRequest.objects.create(
            organization=self.org, decision=decision, repo=repo,
            pr_number=3, title="A PR", html_url="https://example.test/3",
        )

        response = self.client.delete(self.url(decision))

        self.assertEqual(response.status_code, 409)
        self.assertIn("Unlink them first", response.data["error"])
        self.assertTrue(Decision.objects.filter(id=decision.id).exists())

    def test_reports_what_else_it_removed(self):
        decision = self._decision()
        DecisionPrediction.objects.create(
            organization=self.org, decision=decision, dimension="latency",
            statement="p95 under 200ms", metric_kind="number",
            check_at=timezone.now().date(),
        )

        response = self.client.delete(self.url(decision))

        self.assertEqual(response.data["also_removed"]["predictions"], 1)
        self.assertEqual(response.data["title"], "Introduction")

    def test_cannot_delete_another_workspaces_decision(self):
        other_org = Organization.objects.create(name="Theirs", slug="theirs-del")
        other_user = User.objects.create_user(
            username="other_del", email="otherdel@example.com", password="pass1234",
            organization=other_org, role="admin",
        )
        theirs = Decision.objects.create(
            organization=other_org, title="Theirs", description="x",
            decision_maker=other_user, status="proposed", rationale="Their reason.",
        )

        response = self.client.delete(self.url(theirs))

        self.assertEqual(response.status_code, 404)
        self.assertTrue(Decision.objects.filter(id=theirs.id).exists())

    def test_get_still_works(self):
        decision = self._decision()

        response = self.client.get(self.url(decision))

        self.assertEqual(response.status_code, 200)
