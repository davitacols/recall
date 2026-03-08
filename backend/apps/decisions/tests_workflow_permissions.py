from django.test import TestCase
from rest_framework.test import APIClient

from apps.conversations.models import Conversation
from apps.decisions.models import Decision
from apps.organizations.models import Organization, User


class DecisionWorkflowPermissionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.org = Organization.objects.create(name="Decision Flow Org", slug="decision-flow-org")
        self.admin = User.objects.create_user(
            username="dec_admin",
            email="dec_admin@example.com",
            password="pass1234",
            organization=self.org,
            role="admin",
        )
        self.contributor = User.objects.create_user(
            username="dec_contrib",
            email="dec_contrib@example.com",
            password="pass1234",
            organization=self.org,
            role="contributor",
        )

        self.other_org = Organization.objects.create(name="Other Org", slug="other-org")
        self.other_admin = User.objects.create_user(
            username="other_admin",
            email="other_admin@example.com",
            password="pass1234",
            organization=self.other_org,
            role="admin",
        )

        self.conversation = Conversation.objects.create(
            organization=self.org,
            author=self.admin,
            post_type="decision",
            title="Decision source conversation",
            content="Decision discussion context.",
            ai_processed=True,
        )

    def test_contributor_cannot_approve_decision(self):
        decision = Decision.objects.create(
            organization=self.org,
            conversation=self.conversation,
            title="Permission boundary decision",
            description="Contributor should not approve this.",
            decision_maker=self.admin,
            status="proposed",
            rationale="Permission boundary",
        )

        self.client.force_authenticate(user=self.contributor)
        response = self.client.post(f"/api/decisions/{decision.id}/approve/")
        self.assertEqual(response.status_code, 403)

    def test_admin_full_lifecycle_create_approve_implement_outcome(self):
        self.client.force_authenticate(user=self.admin)

        decision = Decision.objects.create(
            organization=self.org,
            conversation=self.conversation,
            title="Lifecycle decision",
            description="Decision lifecycle should complete.",
            decision_maker=self.admin,
            status="proposed",
            rationale="Coverage",
            impact_level="medium",
        )
        decision_id = decision.id

        approve_response = self.client.post(f"/api/decisions/{decision_id}/approve/")
        self.assertEqual(approve_response.status_code, 200)

        implement_response = self.client.post(f"/api/decisions/{decision_id}/implement/")
        self.assertEqual(implement_response.status_code, 200)

        outcome_response = self.client.post(
            f"/api/decisions/{decision_id}/outcome-review/",
            {
                "was_successful": False,
                "review_confidence": 4,
                "outcome_notes": "Outcome notes for lifecycle test.",
                "impact_review_notes": "Impact notes for lifecycle test.",
                "lessons_learned": "Lesson captured from lifecycle test.",
                "success_metrics": {"adoption_rate": 20, "incident_count": 2},
            },
            format="json",
        )
        self.assertEqual(outcome_response.status_code, 200)
        self.assertEqual(outcome_response.data.get("was_successful"), False)

    def test_org_isolation_on_decision_detail(self):
        decision = Decision.objects.create(
            organization=self.org,
            conversation=self.conversation,
            title="Isolation decision",
            description="Should not be visible cross-org.",
            decision_maker=self.admin,
            status="proposed",
            rationale="Isolation check",
        )

        self.client.force_authenticate(user=self.other_admin)
        response = self.client.get(f"/api/decisions/{decision.id}/")
        self.assertEqual(response.status_code, 404)
