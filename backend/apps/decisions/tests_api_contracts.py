from django.test import TestCase
from rest_framework.test import APIClient

from apps.conversations.models import Conversation
from apps.decisions.models import Decision
from apps.organizations.models import Organization, User


class DecisionsApiContractTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.org = Organization.objects.create(name="Decisions QA", slug="decisions-qa")
        self.user = User.objects.create_user(
            username="decisions_user",
            email="decisions@example.com",
            password="pass1234",
            organization=self.org,
            role="admin",
        )
        self.client.force_authenticate(user=self.user)

        self.conversation = Conversation.objects.create(
            organization=self.org,
            author=self.user,
            post_type="update",
            title="Decision seed conversation",
            content="Shared context for decision records.",
            ai_processed=True,
        )

        for idx in range(30):
            Decision.objects.create(
                organization=self.org,
                conversation=self.conversation,
                title=f"Decision {idx}",
                description=f"Description {idx}",
                decision_maker=self.user,
                status="proposed",
                rationale="Coverage",
            )

    def test_decisions_endpoint_not_hard_capped_at_twenty(self):
        response = self.client.get("/api/decisions/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 30)

    def test_decisions_endpoint_respects_limit_query_param(self):
        response = self.client.get("/api/decisions/?limit=5")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 5)
