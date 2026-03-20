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
    @patch("apps.knowledge.ai_intelligence._generate_llm_copilot_answer", return_value=None)
    def test_contract_fields_present_in_low_evidence_mode(self, _llm_answer, get_search_engine, build_plan, _rate_limit):
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
        self.assertIn("citations", response.data)
        self.assertIn("credibility_summary", response.data)
        self.assertEqual(response.data.get("confidence_band"), "low")
        self.assertTrue(len(response.data.get("recommended_interventions") or []) >= 1)
        first_action = response.data["recommended_interventions"][0]
        self.assertIn("priority_score", first_action)
        self.assertIn("effort_hours", first_action)
        self.assertIn("expected_risk_reduction", first_action)

    @patch("apps.knowledge.ai_intelligence.check_rate_limit", return_value=True)
    @patch("apps.knowledge.ai_intelligence._build_chief_of_staff_plan")
    @patch("apps.knowledge.ai_intelligence.get_search_engine")
    @patch("apps.knowledge.ai_intelligence._generate_llm_copilot_answer", return_value=None)
    def test_contract_fields_present_in_diagnosis_mode(self, _llm_answer, get_search_engine, build_plan, _rate_limit):
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

    @patch("apps.knowledge.ai_intelligence.check_rate_limit", return_value=True)
    @patch("apps.knowledge.ai_intelligence._build_chief_of_staff_plan")
    @patch("apps.knowledge.ai_intelligence.get_search_engine")
    @patch("apps.knowledge.ai_intelligence._generate_llm_copilot_answer", return_value="The onboarding goal is supported by a matching task and onboarding guide.")
    def test_answer_mode_returns_broader_organization_sources(self, _llm_answer, get_search_engine, build_plan, _rate_limit):
        search_engine = Mock()
        search_engine.search.return_value = {
            "conversations": [],
            "decisions": [],
            "goals": [
                {"id": 3, "title": "Onboarding Refresh", "created_at": "2026-03-05T08:30:00Z", "url": "/business/goals/3", "owner_name": "Jane Doe"}
            ],
            "tasks": [
                {"id": 4, "title": "Update onboarding checklist", "created_at": "2026-03-06T08:30:00Z", "url": "/business/tasks", "assignee_name": "Ada Lovelace"}
            ],
            "meetings": [],
            "documents": [
                {
                    "id": 5,
                    "title": "Onboarding Guide",
                    "created_at": "2026-03-04T08:30:00Z",
                    "updated_at": "2026-03-07T08:30:00Z",
                    "url": "/business/documents/5",
                    "content_preview": "Guide for new hires.",
                }
            ],
            "total": 3,
        }
        get_search_engine.return_value = search_engine

        build_plan.return_value = {
            "status": "stable",
            "readiness_score": 88.0,
            "interventions": [{"id": "i-3", "title": "Escalate blocker", "impact": "high", "confidence": 80, "reason": "Blocker active"}],
            "learning_model": {},
            "counts": {"unresolved_decisions": 0, "active_blockers": 0, "high_priority_unassigned_tasks": 0},
        }

        response = self.client.post("/api/knowledge/ai/copilot/", {"query": "What active goals are related to onboarding?"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data.get("response_mode"), "answer")
        self.assertEqual(response.data.get("answer_engine"), "anthropic")
        self.assertIn("goal", response.data.get("source_types"))
        self.assertIn("task", response.data.get("source_types"))
        self.assertIn("document", response.data.get("source_types"))
        self.assertEqual(response.data.get("recommended_interventions"), [])
        self.assertEqual((response.data.get("sources") or {}).get("documents")[0]["title"], "Onboarding Guide")
        self.assertTrue(isinstance(response.data.get("citations"), list))
        self.assertIn("Grounded in", response.data.get("credibility_summary", ""))

    @patch("apps.knowledge.ai_intelligence.check_rate_limit", return_value=True)
    @patch("apps.knowledge.ai_intelligence._build_chief_of_staff_plan")
    @patch("apps.knowledge.ai_intelligence.get_search_engine")
    @patch("apps.knowledge.ai_intelligence._generate_llm_copilot_answer", return_value="Talking Stage Sprint is an active sprint in the Justice App project, with one linked high-priority issue.")
    def test_answer_mode_includes_agile_sources_for_sprint_queries(self, _llm_answer, get_search_engine, build_plan, _rate_limit):
        search_engine = Mock()
        search_engine.search.return_value = {
            "conversations": [],
            "decisions": [],
            "goals": [],
            "tasks": [],
            "meetings": [],
            "documents": [],
            "projects": [
                {
                    "id": 21,
                    "title": "Justice App",
                    "key": "JAPP",
                    "updated_at": "2026-03-07T08:30:00Z",
                    "url": "/projects/21",
                }
            ],
            "sprints": [
                {
                    "id": 22,
                    "title": "Talking Stage Sprint",
                    "project_name": "Justice App",
                    "status": "active",
                    "created_at": "2026-03-06T08:30:00Z",
                    "start_date": "2026-03-10",
                    "url": "/sprints/22",
                    "content_preview": "Sprint focused on the talking stage flow.",
                }
            ],
            "issues": [
                {
                    "id": 23,
                    "title": "Talking stage intake polish",
                    "key": "JAPP-101",
                    "project_name": "Justice App",
                    "sprint_name": "Talking Stage Sprint",
                    "updated_at": "2026-03-08T08:30:00Z",
                    "url": "/issues/23",
                }
            ],
            "total": 3,
        }
        get_search_engine.return_value = search_engine

        build_plan.return_value = {
            "status": "stable",
            "readiness_score": 84.0,
            "interventions": [],
            "learning_model": {},
            "counts": {"unresolved_decisions": 0, "active_blockers": 0, "high_priority_unassigned_tasks": 0},
        }

        response = self.client.post(
            "/api/knowledge/ai/copilot/",
            {"query": "tell me about the talking stage sprint in the justice app project"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data.get("response_mode"), "answer")
        self.assertEqual(response.data.get("answer_engine"), "anthropic")
        self.assertIn("project", response.data.get("source_types"))
        self.assertIn("sprint", response.data.get("source_types"))
        self.assertIn("issue", response.data.get("source_types"))
        self.assertEqual((response.data.get("sources") or {}).get("sprints")[0]["title"], "Talking Stage Sprint")
        self.assertEqual((response.data.get("sources") or {}).get("projects")[0]["title"], "Justice App")
        self.assertTrue(any(item.get("type") == "sprint" for item in response.data.get("citations") or []))

    @patch("apps.knowledge.ai_intelligence.check_rate_limit", return_value=True)
    @patch("apps.knowledge.ai_intelligence._build_chief_of_staff_plan")
    @patch("apps.knowledge.ai_intelligence.get_search_engine")
    @patch("apps.knowledge.ai_intelligence._generate_llm_copilot_answer", return_value="The strongest evidence is a blocker, a sprint update, and a reply connected to the launch conversation.")
    def test_answer_mode_returns_credible_citations_for_extended_sources(self, _llm_answer, get_search_engine, build_plan, _rate_limit):
        search_engine = Mock()
        search_engine.search.return_value = {
            "conversations": [],
            "replies": [
                {
                    "id": 31,
                    "title": "Reply in Launch planning",
                    "created_at": "2026-03-09T08:30:00Z",
                    "updated_at": "2026-03-09T09:00:00Z",
                    "url": "/conversations/12",
                    "content_preview": "Reply confirms launch dependencies are still open.",
                    "conversation_title": "Launch planning",
                }
            ],
            "action_items": [],
            "decisions": [],
            "goals": [],
            "milestones": [],
            "tasks": [],
            "meetings": [],
            "documents": [],
            "projects": [],
            "sprints": [],
            "sprint_updates": [
                {
                    "id": 32,
                    "title": "Launch sprint update",
                    "created_at": "2026-03-10T08:30:00Z",
                    "url": "/sprints/9",
                    "content_preview": "Update notes that launch validation is blocked on infra readiness.",
                    "sprint_name": "Launch Sprint",
                    "project_name": "Justice App",
                }
            ],
            "issues": [],
            "blockers": [
                {
                    "id": 33,
                    "title": "Infra validation blocker",
                    "created_at": "2026-03-11T08:30:00Z",
                    "url": "/blockers",
                    "content_preview": "Blocker remains active and is affecting launch readiness.",
                    "status": "active",
                    "sprint_name": "Launch Sprint",
                }
            ],
            "people": [
                {
                    "id": 34,
                    "title": "Ada Lovelace",
                    "last_active": "2026-03-11T08:30:00Z",
                    "url": "/team",
                    "content_preview": "Role manager Supports launch validation.",
                    "role": "manager",
                }
            ],
            "total": 4,
        }
        get_search_engine.return_value = search_engine
        build_plan.return_value = {
            "status": "watch",
            "readiness_score": 71.0,
            "interventions": [],
            "learning_model": {},
            "counts": {"unresolved_decisions": 0, "active_blockers": 1, "high_priority_unassigned_tasks": 0},
        }

        response = self.client.post(
            "/api/knowledge/ai/copilot/",
            {"query": "what is blocking the launch sprint right now"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data.get("response_mode"), "diagnosis")
        self.assertTrue(any(item.get("type") == "blocker" for item in response.data.get("citations") or []))
        self.assertTrue(any(item.get("type") == "reply" for item in response.data.get("citations") or []))
        self.assertIn("Grounded in", response.data.get("credibility_summary", ""))

    @patch("apps.knowledge.ai_intelligence.check_rate_limit", return_value=True)
    def test_execute_requires_confirmation(self, _rate_limit):
        response = self.client.post(
            "/api/knowledge/ai/copilot/",
            {"query": "delivery risk", "execute": True},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("confirm_execute", response.data.get("error", ""))

    @patch("apps.knowledge.ai_intelligence.check_rate_limit", return_value=True)
    @patch("apps.knowledge.ai_intelligence._execute_interventions")
    @patch("apps.knowledge.ai_intelligence._build_chief_of_staff_plan")
    @patch("apps.knowledge.ai_intelligence.get_search_engine")
    @patch("apps.knowledge.ai_intelligence._generate_llm_copilot_answer", return_value=None)
    def test_execute_with_confirmation_returns_execution_payload(self, _llm_answer, get_search_engine, build_plan, execute_interventions, _rate_limit):
        search_engine = Mock()
        search_engine.search.return_value = {
            "conversations": [{"id": 11, "title": "Sprint risk", "created_at": "2026-03-03T08:30:00Z"}],
            "decisions": [],
            "goals": [],
            "tasks": [],
            "meetings": [],
            "documents": [],
            "total": 1,
        }
        get_search_engine.return_value = search_engine
        build_plan.return_value = {
            "status": "watch",
            "readiness_score": 67.0,
            "interventions": [{"id": "task:44", "title": "Assign owner: Critical task", "impact": "medium", "confidence": 76, "reason": "Unassigned task", "url": "/business/tasks"}],
            "learning_model": {},
            "counts": {"unresolved_decisions": 0, "active_blockers": 0, "high_priority_unassigned_tasks": 1},
        }
        execute_interventions.return_value = (
            {
                "dry_run": False,
                "selected": 1,
                "executed_count": 1,
                "skipped_count": 0,
                "executed": [{"id": "task:44", "kind": "task_ownership", "status": "executed"}],
                "skipped": [],
                "audit_log_ids": [91],
            },
            200,
        )

        response = self.client.post(
            "/api/knowledge/ai/copilot/",
            {"query": "delivery risk", "execute": True, "confirm_execute": True},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data.get("execution", {}).get("performed"))
        self.assertEqual(response.data.get("execution", {}).get("selected_ids"), ["task:44"])

    @patch("apps.knowledge.ai_intelligence.check_rate_limit", return_value=True)
    def test_execute_rejected_for_non_diagnosis_query(self, _rate_limit):
        response = self.client.post(
            "/api/knowledge/ai/copilot/",
            {"query": "What active goals are related to onboarding?", "execute": True, "confirm_execute": True},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("only available for operational diagnosis", response.data.get("error", ""))
