from django.test import TestCase
from rest_framework.test import APIClient

from apps.organizations.models import Organization, User
from apps.organizations.auditlog_models import AuditLog


class AGICopilotFeedbackTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.org = Organization.objects.create(name="Feedback QA", slug="feedback-qa")
        self.user = User.objects.create_user(
            username="feedback_user",
            email="feedback@example.com",
            password="pass1234",
            organization=self.org,
            role="admin",
        )
        self.client.force_authenticate(user=self.user)

    def test_feedback_submission_creates_audit_entry(self):
        response = self.client.post(
            "/api/knowledge/ai/copilot/feedback/",
            {
                "analysis_id": "abc-123",
                "query": "where is risk",
                "feedback": "up",
                "outcome": "improved",
                "response_mode": "diagnosis",
                "confidence_band": "medium",
                "evidence_count": 3,
                "coverage_score": 58.5,
                "has_actions": True,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        log = AuditLog.objects.filter(
            organization=self.org,
            user=self.user,
            resource_type="agi_copilot_feedback",
        ).first()
        self.assertIsNotNone(log)
        self.assertEqual(log.details.get("feedback"), "up")
        self.assertEqual(log.details.get("outcome"), "improved")

    def test_feedback_summary_counts_votes(self):
        AuditLog.log(
            organization=self.org,
            user=self.user,
            action="update",
            resource_type="agi_copilot_feedback",
            details={"feedback": "up", "outcome": "improved"},
        )
        AuditLog.log(
            organization=self.org,
            user=self.user,
            action="update",
            resource_type="agi_copilot_feedback",
            details={"feedback": "down", "outcome": "worse"},
        )
        response = self.client.get("/api/knowledge/ai/copilot/feedback-summary/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data.get("total_feedback"), 2)
        self.assertEqual(response.data.get("upvotes"), 1)
        self.assertEqual(response.data.get("downvotes"), 1)

    def test_feedback_trend_returns_daily_points(self):
        AuditLog.log(
            organization=self.org,
            user=self.user,
            action="update",
            resource_type="agi_copilot_feedback",
            details={"feedback": "up"},
        )
        AuditLog.log(
            organization=self.org,
            user=self.user,
            action="update",
            resource_type="agi_copilot_feedback",
            details={"feedback": "down"},
        )
        response = self.client.get("/api/knowledge/ai/copilot/feedback-trend/?days=7")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data.get("window_days"), 7)
        points = response.data.get("points") or []
        self.assertEqual(len(points), 7)
        self.assertIn("totals", response.data)
        self.assertEqual(response.data["totals"].get("total_feedback"), 2)

    def test_what_if_returns_projection_payload(self):
        response = self.client.post(
            "/api/knowledge/ai/copilot/what-if/",
            {
                "action_type": "resolve_decisions",
                "units": 2,
                "horizon_days": 14,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("baseline", response.data)
        self.assertIn("projected", response.data)
        self.assertIn("delta", response.data["projected"])
