"""Tests for the memory-health endpoint behind the sidebar meter.

The sidebar shows this on every page, and its whole point is to be honest
about how much of the record is actually usable. A decision whose rationale is
a few spaces is an empty one; counting it would flatter exactly the number the
product turns on.
"""

from django.test import TestCase
from rest_framework.test import APIClient

from apps.conversations.models import Conversation
from apps.decisions.models import Decision
from apps.organizations.models import Organization, User


class MemoryHealthTests(TestCase):
    URL = "/api/decisions/memory-health/"

    def setUp(self):
        self.client = APIClient()
        self.org = Organization.objects.create(name="Memory QA", slug="memory-qa")
        self.user = User.objects.create_user(
            username="memory_user", email="memory@example.com", password="pass1234",
            organization=self.org, role="admin",
        )
        self.conversation = Conversation.objects.create(
            organization=self.org, author=self.user, post_type="update",
            title="seed", content="seed", ai_processed=True,
        )
        self.client.force_authenticate(user=self.user)

    def _decision(self, title, rationale):
        return Decision.objects.create(
            organization=self.org, conversation=self.conversation, title=title,
            description="", decision_maker=self.user, status="proposed",
            rationale=rationale,
        )

    def test_counts_decisions_and_those_with_reasoning(self):
        self._decision("With why", "Because the retry loop had no jitter.")
        self._decision("Without why", "")
        resp = self.client.get(self.URL, secure=True)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["decisions"], 2)
        self.assertEqual(resp.data["decisions_with_rationale"], 1)

    def test_whitespace_rationale_does_not_count(self):
        """The number would otherwise be flattered by a few spaces."""
        self._decision("Looks filled in", "   \n  ")
        resp = self.client.get(self.URL, secure=True)
        self.assertEqual(resp.data["decisions"], 1)
        self.assertEqual(resp.data["decisions_with_rationale"], 0)

    def test_empty_workspace_reports_zero_not_an_error(self):
        resp = self.client.get(self.URL, secure=True)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["decisions"], 0)
        self.assertEqual(resp.data["decisions_with_rationale"], 0)

    def test_scoped_to_the_requesting_workspace(self):
        other_org = Organization.objects.create(name="Elsewhere", slug="elsewhere")
        other_user = User.objects.create_user(
            username="other", email="other@example.com", password="pass1234",
            organization=other_org, role="admin",
        )
        other_conv = Conversation.objects.create(
            organization=other_org, author=other_user, post_type="update",
            title="seed", content="seed", ai_processed=True,
        )
        Decision.objects.create(
            organization=other_org, conversation=other_conv, title="Theirs",
            description="", decision_maker=other_user, status="proposed",
            rationale="Their reasoning.",
        )
        self._decision("Ours", "Our reasoning.")

        resp = self.client.get(self.URL, secure=True)
        self.assertEqual(resp.data["decisions"], 1)

    def test_requires_authentication(self):
        self.client.force_authenticate(user=None)
        resp = self.client.get(self.URL, secure=True)
        self.assertIn(resp.status_code, (401, 403))
