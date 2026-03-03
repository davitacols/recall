from unittest.mock import Mock, patch

from django.test import TestCase
from rest_framework.test import APIClient

from apps.organizations.models import Organization, User


class AGICopilotContractTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.org = Organization.objects.create(name="Copilot QA", slug="copilot-qa")
        self.user = User.objects.create_user(
            username="copilot_admin",
            email="copilot@example.com",
            password="pass1234",
            organization=self.org,
            role="admin",
        )
        self.client.force_authenticate(user=self.user)

    @patch("apps.knowledge.ai_intelligence.check_rate_limit", return_value=True)
    @patch("apps.knowledge.ai_intelligence._build_chief_of_staff_plan")
    @patch("apps.knowledge.ai_intelligence.get_search_engine")
    def test_contract_fields_present_in_low_evidence_mode(self, get_search_engine, build_plan, _rate_limit):
        search_engine = Mock()
        search_engine.search.return_value = {
            "conversations": [],
            "decisions": [],
            "total": 0,
        }
        get_search_engine.return_value = search_engine

        build_plan.return_value = {
            "status": "stable",
            "readiness_score": 81.0,
            "interventions": [{"id": "i-1", "title": "Resolve decision", "impact": "medium", "confidence": 80, "reason": "Decision pending"}],
            "learning_model": {},
            "counts": {"unresolved_decisions": 1, "active_blockers": 0, "high_priority_unassigned_tasks": 0},
        }

        response = self.client.post("/api/knowledge/ai/copilot/", {"query": "where is risk?"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data.get("response_mode"), "needs_evidence")
        self.assertEqual(response.data.get("evidence_count"), 0)
        self.assertIn("coverage_score", response.data)
        self.assertIn("missing_evidence", response.data)
        self.assertEqual(response.data.get("confidence_band"), "low")
        self.assertTrue(len(response.data.get("recommended_interventions") or []) >= 1)
        first_action = response.data["recommended_interventions"][0]
        self.assertIn("priority_score", first_action)
        self.assertIn("effort_hours", first_action)
        self.assertIn("expected_risk_reduction", first_action)

    @patch("apps.knowledge.ai_intelligence.check_rate_limit", return_value=True)
    @patch("apps.knowledge.ai_intelligence._build_chief_of_staff_plan")
    @patch("apps.knowledge.ai_intelligence.get_search_engine")
    def test_contract_fields_present_in_diagnosis_mode(self, get_search_engine, build_plan, _rate_limit):
        search_engine = Mock()
        search_engine.search.return_value = {
            "conversations": [{"id": 11, "title": "Sprint risk", "created_at": "2026-03-03T08:30:00Z"}],
            "decisions": [{"id": 22, "title": "API migration", "created_at": "2026-03-02T08:30:00Z"}],
            "total": 3,
        }
        get_search_engine.return_value = search_engine

        build_plan.return_value = {
            "status": "watch",
            "readiness_score": 68.0,
            "interventions": [{"id": "i-2", "title": "Escalate blocker", "impact": "high", "confidence": 88, "reason": "Blocker active"}],
            "learning_model": {},
            "counts": {"unresolved_decisions": 2, "active_blockers": 1, "high_priority_unassigned_tasks": 1},
        }

        response = self.client.post("/api/knowledge/ai/copilot/", {"query": "delivery risk"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data.get("response_mode"), "diagnosis")
        self.assertEqual(response.data.get("evidence_count"), 3)
        self.assertTrue(isinstance(response.data.get("source_types"), list))
        self.assertIn("conversation", response.data.get("source_types"))
        self.assertIn("decision", response.data.get("source_types"))
        self.assertIn(response.data.get("confidence_band"), ["medium", "high"])
        first_action = (response.data.get("recommended_interventions") or [{}])[0]
        self.assertIn("priority_score", first_action)
        self.assertIn("effort_hours", first_action)
        self.assertIn("expected_risk_reduction", first_action)

    @patch("apps.knowledge.ai_intelligence.check_rate_limit", return_value=True)
    @patch("apps.knowledge.ai_intelligence._build_chief_of_staff_plan")
    def test_navigation_mode_returns_tool_links(self, build_plan, _rate_limit):
        build_plan.return_value = {
            "status": "stable",
            "readiness_score": 86.0,
            "interventions": [],
            "learning_model": {},
            "counts": {"unresolved_decisions": 0, "active_blockers": 0, "high_priority_unassigned_tasks": 0},
        }

        response = self.client.post("/api/knowledge/ai/copilot/", {"query": "where can i find agile tool"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data.get("response_mode"), "navigation")
        self.assertTrue(isinstance(response.data.get("tool_links"), list))
        self.assertTrue(len(response.data.get("tool_links") or []) >= 1)
        first_link = response.data["tool_links"][0]
        self.assertIn("label", first_link)
        self.assertIn("url", first_link)
