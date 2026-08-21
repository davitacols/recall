"""Converting a conversation while the model API is down.

Two different empties, and the client must be able to tell them apart:

  - the discussion stated no reason      a finding about the source
  - the model API refused the request    a finding about us

Reporting the second as the first quietly degrades the record. Every
conversion during an outage adds a why-less decision that looks like the
discussion's fault, and the number the product turns on drops with no
explanation anyone can act on.
"""

from unittest.mock import patch

from django.test import TestCase
from rest_framework.test import APIClient

from apps.conversations.models import Conversation
from apps.decisions.models import Decision
from apps.decisions.rationale import RationaleUnavailable
from apps.organizations.models import Organization, User

TARGET = "apps.decisions.rationale.generate_decision_rationale"


class ConvertDegradationTests(TestCase):
    def setUp(self):
        self.org = Organization.objects.create(name="Convert Org", slug="convert-org")
        self.user = User.objects.create_user(
            username="convert_user", email="convert@example.com", password="pass1234",
            organization=self.org, role="admin",
        )
        self.conversation = Conversation.objects.create(
            organization=self.org, author=self.user, post_type="update",
            title="We argued about retries", content="A real discussion.",
            ai_processed=True,
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def url(self):
        return f"/api/decisions/convert/{self.conversation.id}/"

    @patch(TARGET, return_value="Because the retry loop had no jitter.")
    def test_records_the_reasoning_when_available(self, _mock):
        response = self.client.post(self.url(), {}, format="json")

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["rationale"], "Because the retry loop had no jitter.")
        self.assertEqual(response.data["rationale_unavailable"], "")

    @patch(TARGET, return_value="")
    def test_no_reasoning_in_the_source_is_not_an_outage(self, _mock):
        response = self.client.post(self.url(), {}, format="json")

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["rationale"], "")
        self.assertEqual(
            response.data["rationale_unavailable"], "",
            "an empty source is a finding, not a failure",
        )

    @patch(TARGET, side_effect=RationaleUnavailable("credit balance is too low"))
    def test_an_outage_is_reported_as_one(self, _mock):
        response = self.client.post(self.url(), {}, format="json")

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["rationale"], "")
        self.assertIn("credit balance", response.data["rationale_unavailable"])

    @patch(TARGET, side_effect=RationaleUnavailable("credit balance is too low"))
    def test_the_decision_is_still_created(self, _mock):
        """Losing the record because an API is down would be worse."""
        response = self.client.post(self.url(), {}, format="json")

        self.assertEqual(response.status_code, 201)
        decision = Decision.objects.get(conversation=self.conversation)
        self.assertEqual(decision.rationale, "")
        self.assertEqual(decision.id, response.data["id"])
