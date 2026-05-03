from unittest.mock import Mock, patch

from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APIClient

from apps.agile.models import Board, Column, Issue, Project
from apps.agile.models import Release, Sprint
from apps.organizations.auditlog_models import AuditLog
from apps.organizations.models import Organization, User
from apps.conversations.models import Conversation
from apps.decisions.models import Decision
from apps.business.models import Task
from apps.business.document_models import Document


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
        self.assertIn("evidence_breakdown", response.data)
        self.assertIn("citations", response.data)
        self.assertIn("credibility_summary", response.data)
        self.assertIn("answer_foundation", response.data)
        self.assertIn("follow_up_questions", response.data)
        self.assertEqual(response.data.get("confidence_band"), "low")
        self.assertTrue(len(response.data.get("recommended_interventions") or []) >= 1)
        self.assertTrue(len(response.data.get("answer_foundation") or []) >= 1)
        self.assertTrue(len(response.data.get("follow_up_questions") or []) >= 1)
        first_action = response.data["recommended_interventions"][0]
        self.assertIn("priority_score", first_action)
        self.assertIn("effort_hours", first_action)
        self.assertIn("expected_risk_reduction", first_action)
        log = AuditLog.objects.filter(
            organization=self.org,
            user=self.user,
            resource_type="agi_copilot_query",
        ).order_by("-created_at").first()
        self.assertIsNotNone(log)
        self.assertEqual((log.details or {}).get("query"), "where is risk?")
        self.assertTrue(bool((log.details or {}).get("answer_preview")))

    @patch("apps.knowledge.ai_intelligence.check_rate_limit", return_value=True)
    @patch("apps.knowledge.ai_intelligence._build_chief_of_staff_plan")
    def test_route_assistant_mode_returns_navigation_links(self, build_plan, _rate_limit):
        build_plan.return_value = {
            "status": "stable",
            "readiness_score": 82.0,
            "interventions": [],
            "learning_model": {},
            "counts": {},
        }

        response = self.client.post(
            "/api/knowledge/ai/copilot/",
            {"query": "dashboards", "assistant_mode": "route"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data.get("assistant_mode"), "route")
        self.assertEqual(response.data.get("response_mode"), "navigation")
        self.assertTrue(response.data.get("tool_links"))
        self.assertIn("Open the most relevant workspace surface.", response.data.get("follow_up_questions") or [])

    @patch("apps.knowledge.ai_intelligence.check_rate_limit", return_value=True)
    @patch("apps.knowledge.ai_intelligence._build_chief_of_staff_plan")
    @patch("apps.knowledge.ai_intelligence.get_search_engine")
    @patch("apps.knowledge.ai_intelligence._generate_llm_copilot_answer", return_value=None)
    def test_plan_assistant_mode_uses_diagnosis_interventions(self, _llm_answer, get_search_engine, build_plan, _rate_limit):
        search_engine = Mock()
        search_engine.search.return_value = {
            "conversations": [],
            "decisions": [],
            "total": 0,
        }
        get_search_engine.return_value = search_engine

        build_plan.return_value = {
            "status": "watch",
            "readiness_score": 68.0,
            "interventions": [
                {
                    "id": "decision:7",
                    "kind": "decision_resolution",
                    "title": "Resolve decision: Pricing launch",
                    "impact": "high",
                    "confidence": 81,
                    "reason": "Decision is blocking readiness",
                    "url": "/decisions",
                }
            ],
            "learning_model": {},
            "counts": {"unresolved_decisions": 1, "active_blockers": 0, "high_priority_unassigned_tasks": 0},
        }

        response = self.client.post(
            "/api/knowledge/ai/copilot/",
            {"query": "summarize launch readiness", "assistant_mode": "plan"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data.get("assistant_mode"), "plan")
        self.assertIn("Assistant plan", response.data.get("answer", ""))
        self.assertTrue(response.data.get("recommended_interventions"))
        self.assertIn("Turn the strongest step into tasks.", response.data.get("follow_up_questions") or [])

    @patch("apps.knowledge.ai_intelligence.check_rate_limit", return_value=True)
    def test_copilot_action_creates_tasks_from_plan(self, _rate_limit):
        response = self.client.post(
            "/api/knowledge/ai/copilot/actions/",
            {
                "action": "create_tasks",
                "assistant_mode": "plan",
                "query": "Build a recovery plan",
                "answer": "Assistant plan\n- Step 1: Resolve the launch decision.",
                "next_actions": [
                    {
                        "title": "Resolve launch decision",
                        "impact": "high",
                        "confidence": 83,
                        "reason": "Decision is blocking launch readiness",
                        "href": "/decisions",
                    }
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data.get("created_count"), 1)
        self.assertIn("?task=", response.data["created_items"][0]["url"])
        task = Task.objects.get(organization=self.org, title="Resolve launch decision")
        self.assertEqual(task.priority, "high")
        self.assertEqual(task.assigned_to, self.user)
        self.assertIn("Build a recovery plan", task.description)

    @patch("apps.knowledge.ai_intelligence.check_rate_limit", return_value=True)
    def test_copilot_action_creates_draft_document(self, _rate_limit):
        response = self.client.post(
            "/api/knowledge/ai/copilot/actions/",
            {
                "action": "create_draft",
                "assistant_mode": "draft",
                "query": "Draft leadership update",
                "answer": "Draft\n\nLaunch is on track with one open decision.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        document = Document.objects.get(organization=self.org, title__startswith="Ask Recall draft")
        self.assertEqual(document.document_type, "report")
        self.assertIn("Launch is on track", document.content)
        self.assertIn("ai-draft", document.tags)

    @patch("apps.knowledge.ai_intelligence.check_rate_limit", return_value=True)
    def test_copilot_action_creates_plan_document(self, _rate_limit):
        response = self.client.post(
            "/api/knowledge/ai/copilot/actions/",
            {
                "action": "create_plan_document",
                "assistant_mode": "plan",
                "query": "Plan launch recovery",
                "answer": "Assistant plan\n- Step 1: Resolve the launch decision.",
                "next_actions": [{"title": "Resolve launch decision", "reason": "Decision is blocking launch"}],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        document = Document.objects.get(organization=self.org, title__startswith="Ask Recall execution memo")
        self.assertIn("Plan actions", document.content)
        self.assertIn("execution-plan", document.tags)

    @patch("apps.knowledge.ai_intelligence.check_rate_limit", return_value=True)
    @patch("apps.knowledge.ai_intelligence._build_chief_of_staff_plan")
    def test_copilot_prioritizes_current_user_tasks(self, build_plan, _rate_limit):
        other_user = User.objects.create_user(
            username="other_owner",
            email="other@example.com",
            password="pass1234",
            organization=self.org,
            role="member",
        )
        today = timezone.localdate()
        Task.objects.create(
            organization=self.org,
            title="Low value future task",
            priority="low",
            status="todo",
            assigned_to=self.user,
            due_date=today + timedelta(days=20),
        )
        urgent = Task.objects.create(
            organization=self.org,
            title="Urgent launch handoff",
            priority="high",
            status="in_progress",
            assigned_to=self.user,
            due_date=today,
        )
        Task.objects.create(
            organization=self.org,
            title="Other person's task",
            priority="high",
            status="in_progress",
            assigned_to=other_user,
            due_date=today,
        )
        Task.objects.create(
            organization=self.org,
            title="Already done",
            priority="high",
            status="done",
            assigned_to=self.user,
            due_date=today,
        )
        build_plan.return_value = {
            "status": "stable",
            "readiness_score": 80,
            "interventions": [],
            "learning_model": {},
            "counts": {},
        }

        response = self.client.post(
            "/api/knowledge/ai/copilot/",
            {"query": "Prioritize my next three tasks", "assistant_mode": "plan"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data.get("response_mode"), "task_priority")
        self.assertIn("Urgent launch handoff", response.data.get("answer", ""))
        self.assertNotIn("Other person's task", response.data.get("answer", ""))
        self.assertNotIn("Already done", response.data.get("answer", ""))
        self.assertEqual((response.data.get("sources") or {}).get("tasks")[0]["id"], urgent.id)
        self.assertEqual(response.data.get("recommended_interventions"), [])

    @patch("apps.knowledge.ai_intelligence.check_rate_limit", return_value=True)
    @patch("apps.knowledge.ai_intelligence._build_chief_of_staff_plan")
    def test_copilot_prioritizes_project_issues(self, build_plan, _rate_limit):
        project = Project.objects.create(
            organization=self.org,
            name="Atlas Delivery",
            key="ATLS",
            lead=self.user,
        )
        board = Board.objects.create(organization=self.org, project=project, name="Atlas Board")
        column = Column.objects.create(board=board, name="To Do", order=0)
        urgent = Issue.objects.create(
            organization=self.org,
            project=project,
            board=board,
            column=column,
            key="ATLS-1",
            title="Restore release pipeline",
            reporter=self.user,
            priority="highest",
            status="in_progress",
            due_date=timezone.localdate(),
        )
        Issue.objects.create(
            organization=self.org,
            project=project,
            board=board,
            column=column,
            key="ATLS-2",
            title="Already shipped",
            reporter=self.user,
            priority="highest",
            status="done",
            due_date=timezone.localdate(),
        )
        build_plan.return_value = {
            "status": "watch",
            "readiness_score": 70,
            "interventions": [],
            "learning_model": {},
            "counts": {},
        }

        response = self.client.post(
            "/api/knowledge/ai/copilot/",
            {"query": "Prioritize issues in Atlas Delivery and build a sprint recovery plan", "assistant_mode": "plan"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data.get("response_mode"), "issue_priority")
        self.assertIn("Restore release pipeline", response.data.get("answer", ""))
        self.assertNotIn("Already shipped", response.data.get("answer", ""))
        self.assertEqual((response.data.get("sources") or {}).get("issues")[0]["id"], urgent.id)

    @patch("apps.knowledge.ai_intelligence.check_rate_limit", return_value=True)
    @patch("apps.knowledge.ai_intelligence._build_chief_of_staff_plan")
    @patch("apps.knowledge.ai_intelligence.get_search_engine")
    @patch("apps.knowledge.ai_intelligence._generate_llm_copilot_answer", return_value=None)
    def test_low_evidence_task_reassignment_uses_live_interventions(self, _llm_answer, get_search_engine, build_plan, _rate_limit):
        search_engine = Mock()
        search_engine.search.return_value = {
            "conversations": [],
            "decisions": [],
            "tasks": [],
            "total": 0,
        }
        get_search_engine.return_value = search_engine

        build_plan.return_value = {
            "status": "watch",
            "readiness_score": 65.0,
            "interventions": [
                {
                    "id": "task:11",
                    "kind": "task_ownership",
                    "title": "Assign owner: Reconcile launch checklist",
                    "impact": "medium",
                    "confidence": 74,
                    "reason": "High-priority task is unassigned",
                    "url": "/business/tasks",
                },
                {
                    "id": "task:12",
                    "kind": "task_ownership",
                    "title": "Assign owner: Escalation handoff for onboarding",
                    "impact": "medium",
                    "confidence": 74,
                    "reason": "High-priority task is unassigned",
                    "url": "/business/tasks",
                },
                {
                    "id": "task:13",
                    "kind": "task_ownership",
                    "title": "Assign owner: API migration QA sweep",
                    "impact": "medium",
                    "confidence": 74,
                    "reason": "High-priority task is unassigned",
                    "url": "/business/tasks",
                },
            ],
            "learning_model": {},
            "counts": {"unresolved_decisions": 1, "active_blockers": 0, "high_priority_unassigned_tasks": 3},
        }

        response = self.client.post(
            "/api/knowledge/ai/copilot/",
            {"query": "Which high-priority tasks should we reassign now?"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data.get("response_mode"), "needs_evidence")
        self.assertIn("Reconcile launch checklist", response.data.get("answer", ""))
        self.assertIn("Escalation handoff for onboarding", response.data.get("answer", ""))
        self.assertIn("inference from the live intervention plan", response.data.get("answer", "").lower())
        self.assertIn("No direct workspace records matched this query.", response.data.get("credibility_summary", ""))
        self.assertTrue(any("Strongest recommended moves were" in item for item in response.data.get("answer_foundation") or []))

    @patch("apps.knowledge.ai_intelligence.check_rate_limit", return_value=True)
    @patch("apps.knowledge.ai_intelligence._build_chief_of_staff_plan")
    @patch("apps.knowledge.ai_intelligence.get_search_engine")
    def test_greeting_query_returns_conversational_opener(self, get_search_engine, build_plan, _rate_limit):
        build_plan.return_value = {
            "status": "stable",
            "readiness_score": 84.0,
            "interventions": [],
            "learning_model": {},
            "counts": {"unresolved_decisions": 0, "active_blockers": 0, "high_priority_unassigned_tasks": 0},
        }

        response = self.client.post("/api/knowledge/ai/copilot/", {"query": "Hello there"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data.get("response_mode"), "conversation")
        self.assertIn("workspace copilot", response.data.get("answer", "").lower())
        self.assertEqual(response.data.get("evidence_count"), 0)
        self.assertEqual(response.data.get("missing_evidence"), [])
        self.assertTrue(len(response.data.get("follow_up_questions") or []) >= 3)
        get_search_engine.assert_not_called()

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
        self.assertTrue(len(response.data.get("evidence_breakdown") or []) >= 1)
        self.assertTrue(len(response.data.get("answer_foundation") or []) >= 1)
        self.assertTrue(len(response.data.get("follow_up_questions") or []) >= 1)
        first_action = (response.data.get("recommended_interventions") or [{}])[0]
        self.assertIn("priority_score", first_action)
        self.assertIn("effort_hours", first_action)
        self.assertIn("expected_risk_reduction", first_action)

    @patch("apps.knowledge.ai_intelligence.check_rate_limit", return_value=True)
    @patch("apps.knowledge.ai_intelligence._build_chief_of_staff_plan")
    @patch("apps.knowledge.ai_intelligence.get_search_engine")
    @patch("apps.knowledge.ai_intelligence._generate_llm_copilot_answer", return_value=None)
    def test_answer_and_citations_strip_rich_text_html(self, _llm_answer, get_search_engine, build_plan, _rate_limit):
        search_engine = Mock()
        search_engine.search.return_value = {
            "conversations": [
                {
                    "id": 11,
                    "title": "Garlody Project",
                    "created_at": "2026-03-22T08:30:00Z",
                    "url": "/conversations/11",
                    "content_preview": '<p>We are <strong>still</strong> delegating about the project.</p><pre class="ql-syntax">const setup = true;</pre>',
                }
            ],
            "decisions": [
                {
                    "id": 22,
                    "title": "Garlody Project",
                    "created_at": "2026-03-22T08:30:00Z",
                    "url": "/decisions/22",
                    "content_preview": '<p>Decision summary for <em>Garlody</em>.</p>',
                }
            ],
            "total": 2,
        }
        get_search_engine.return_value = search_engine

        build_plan.return_value = {
            "status": "stable",
            "readiness_score": 96.5,
            "interventions": [],
            "learning_model": {},
            "counts": {"unresolved_decisions": 0, "active_blockers": 0, "high_priority_unassigned_tasks": 0},
        }

        response = self.client.post("/api/knowledge/ai/copilot/", {"query": "What changed most recently around Garlody Project?"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertNotIn("<p>", response.data.get("answer", ""))
        self.assertNotIn("<pre", response.data.get("answer", ""))
        first_citation = (response.data.get("citations") or [{}])[0]
        self.assertNotIn("<p>", first_citation.get("preview", ""))
        self.assertNotIn("<pre", first_citation.get("preview", ""))

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
        self.assertTrue(isinstance(response.data.get("answer_foundation"), list))
        self.assertTrue(isinstance(response.data.get("follow_up_questions"), list))
        first_link = response.data["tool_links"][0]
        self.assertIn("label", first_link)
        self.assertIn("url", first_link)

    @patch("apps.knowledge.ai_intelligence.check_rate_limit", return_value=True)
    @patch("apps.knowledge.ai_intelligence._build_chief_of_staff_plan")
    @patch("apps.knowledge.ai_intelligence.get_search_engine")
    @patch("apps.knowledge.ai_intelligence._generate_llm_copilot_answer", return_value=None)
    def test_recent_project_query_uses_workspace_lookup_fallback(self, _llm_answer, get_search_engine, build_plan, _rate_limit):
        search_engine = Mock()
        search_engine.search.return_value = {
            "conversations": [],
            "decisions": [],
            "projects": [],
            "total": 0,
        }
        get_search_engine.return_value = search_engine

        build_plan.return_value = {
            "status": "stable",
            "readiness_score": 82.0,
            "interventions": [],
            "learning_model": {},
            "counts": {"unresolved_decisions": 0, "active_blockers": 0, "high_priority_unassigned_tasks": 0},
        }

        older_project = Project.objects.create(
            organization=self.org,
            name="Legacy Console",
            key="LEG",
            lead=self.user,
            description="Older delivery workspace",
        )
        newer_project = Project.objects.create(
            organization=self.org,
            name="Orbit Ops",
            key="ORB",
            lead=self.user,
            description="Newest control surface",
        )
        earlier = timezone.now() - timezone.timedelta(days=5)
        Project.objects.filter(id=older_project.id).update(created_at=earlier, updated_at=earlier)

        response = self.client.post("/api/knowledge/ai/copilot/", {"query": "most recent project"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data.get("response_mode"), "answer")
        self.assertEqual(response.data.get("evidence_count"), 1)
        self.assertIn('The most recent project in Knoledgr is "Orbit Ops"', response.data.get("answer", ""))
        self.assertEqual((response.data.get("sources") or {}).get("projects")[0]["title"], "Orbit Ops")
        self.assertEqual((response.data.get("citations") or [{}])[0].get("title"), "Orbit Ops")

    @patch("apps.knowledge.ai_intelligence.check_rate_limit", return_value=True)
    @patch("apps.knowledge.ai_intelligence._build_chief_of_staff_plan")
    @patch("apps.knowledge.ai_intelligence.get_search_engine")
    @patch("apps.knowledge.ai_intelligence._generate_llm_copilot_answer", return_value=None)
    def test_recent_sprint_query_uses_workspace_lookup_fallback(self, _llm_answer, get_search_engine, build_plan, _rate_limit):
        search_engine = Mock()
        search_engine.search.return_value = {
            "conversations": [],
            "decisions": [],
            "sprints": [],
            "total": 0,
        }
        get_search_engine.return_value = search_engine

        build_plan.return_value = {
            "status": "stable",
            "readiness_score": 80.0,
            "interventions": [],
            "learning_model": {},
            "counts": {"unresolved_decisions": 0, "active_blockers": 0, "high_priority_unassigned_tasks": 0},
        }

        project = Project.objects.create(
            organization=self.org,
            name="Justice App",
            key="JAPP",
            lead=self.user,
            description="Primary delivery workspace",
        )
        Sprint.objects.create(
            organization=self.org,
            project=project,
            name="Talking Stage Sprint",
            start_date=timezone.now().date(),
            end_date=(timezone.now() + timezone.timedelta(days=14)).date(),
            goal="Ship the talking stage flow",
            status="active",
        )

        response = self.client.post("/api/knowledge/ai/copilot/", {"query": "latest sprint"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data.get("response_mode"), "answer")
        self.assertIn('The most recent sprint in Knoledgr is "Talking Stage Sprint"', response.data.get("answer", ""))
        self.assertEqual((response.data.get("sources") or {}).get("sprints")[0]["title"], "Talking Stage Sprint")

    @patch("apps.knowledge.ai_intelligence.check_rate_limit", return_value=True)
    @patch("apps.knowledge.ai_intelligence._build_chief_of_staff_plan")
    @patch("apps.knowledge.ai_intelligence.get_search_engine")
    @patch("apps.knowledge.ai_intelligence._generate_llm_copilot_answer", return_value=None)
    def test_recent_decision_query_uses_workspace_lookup_fallback(self, _llm_answer, get_search_engine, build_plan, _rate_limit):
        search_engine = Mock()
        search_engine.search.return_value = {
            "conversations": [],
            "decisions": [],
            "total": 0,
        }
        get_search_engine.return_value = search_engine

        build_plan.return_value = {
            "status": "stable",
            "readiness_score": 80.0,
            "interventions": [],
            "learning_model": {},
            "counts": {"unresolved_decisions": 0, "active_blockers": 0, "high_priority_unassigned_tasks": 0},
        }

        conversation = Conversation.objects.create(
            organization=self.org,
            author=self.user,
            post_type="decision",
            title="Rollout thread",
            content="Conversation context for the decision.",
        )
        Decision.objects.create(
            organization=self.org,
            conversation=conversation,
            title="Approve support handoff",
            description="Move support handoff into the launch plan.",
            decision_maker=self.user,
            status="approved",
            rationale="Reduce rollout friction",
            impact_level="high",
        )

        response = self.client.post("/api/knowledge/ai/copilot/", {"query": "most recent decision"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data.get("response_mode"), "answer")
        self.assertIn('The most recent decision in Knoledgr is "Approve support handoff".', response.data.get("answer", ""))
        self.assertEqual((response.data.get("sources") or {}).get("decisions")[0]["title"], "Approve support handoff")

    @patch("apps.knowledge.ai_intelligence.check_rate_limit", return_value=True)
    @patch("apps.knowledge.ai_intelligence._build_chief_of_staff_plan")
    @patch("apps.knowledge.ai_intelligence.get_search_engine")
    @patch("apps.knowledge.ai_intelligence._generate_llm_copilot_answer", return_value=None)
    def test_recent_document_query_uses_workspace_lookup_fallback(self, _llm_answer, get_search_engine, build_plan, _rate_limit):
        search_engine = Mock()
        search_engine.search.return_value = {
            "conversations": [],
            "decisions": [],
            "documents": [],
            "total": 0,
        }
        get_search_engine.return_value = search_engine

        build_plan.return_value = {
            "status": "stable",
            "readiness_score": 80.0,
            "interventions": [],
            "learning_model": {},
            "counts": {"unresolved_decisions": 0, "active_blockers": 0, "high_priority_unassigned_tasks": 0},
        }

        Document.objects.create(
            organization=self.org,
            title="Launch Brief",
            description="Release preparation brief",
            document_type="guide",
            content="Step-by-step launch plan.",
            created_by=self.user,
            updated_by=self.user,
        )

        response = self.client.post("/api/knowledge/ai/copilot/", {"query": "latest document"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data.get("response_mode"), "answer")
        self.assertIn('The most recent document in Knoledgr is "Launch Brief".', response.data.get("answer", ""))
        self.assertEqual((response.data.get("sources") or {}).get("documents")[0]["title"], "Launch Brief")

    @patch("apps.knowledge.ai_intelligence.check_rate_limit", return_value=True)
    @patch("apps.knowledge.ai_intelligence._build_chief_of_staff_plan")
    @patch("apps.knowledge.ai_intelligence.get_search_engine")
    @patch("apps.knowledge.ai_intelligence._generate_llm_copilot_answer", return_value=None)
    def test_recent_release_query_uses_workspace_lookup_fallback(self, _llm_answer, get_search_engine, build_plan, _rate_limit):
        search_engine = Mock()
        search_engine.search.return_value = {
            "conversations": [],
            "decisions": [],
            "releases": [],
            "total": 0,
        }
        get_search_engine.return_value = search_engine

        build_plan.return_value = {
            "status": "stable",
            "readiness_score": 80.0,
            "interventions": [],
            "learning_model": {},
            "counts": {"unresolved_decisions": 0, "active_blockers": 0, "high_priority_unassigned_tasks": 0},
        }

        project = Project.objects.create(
            organization=self.org,
            name="Orbit Ops",
            key="ORB",
            lead=self.user,
            description="Ops workspace",
        )
        Release.objects.create(
            project=project,
            name="Spring Launch",
            version="2.3.0",
            release_date=timezone.now().date(),
            status="unreleased",
            description="First spring launch cut",
        )

        response = self.client.post("/api/knowledge/ai/copilot/", {"query": "latest release"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data.get("response_mode"), "answer")
        self.assertIn('The most recent release in Knoledgr is "Spring Launch" (2.3.0)', response.data.get("answer", ""))
        self.assertEqual((response.data.get("sources") or {}).get("releases")[0]["title"], "Spring Launch")

    @patch("apps.knowledge.ai_intelligence.check_rate_limit", return_value=True)
    @patch("apps.knowledge.ai_intelligence._build_chief_of_staff_plan")
    @patch("apps.knowledge.ai_intelligence.get_search_engine")
    @patch("apps.knowledge.ai_intelligence._generate_llm_copilot_answer", return_value=None)
    def test_recent_conversation_query_uses_workspace_lookup_fallback(self, _llm_answer, get_search_engine, build_plan, _rate_limit):
        search_engine = Mock()
        search_engine.search.return_value = {
            "conversations": [],
            "decisions": [],
            "total": 0,
        }
        get_search_engine.return_value = search_engine

        build_plan.return_value = {
            "status": "stable",
            "readiness_score": 80.0,
            "interventions": [],
            "learning_model": {},
            "counts": {"unresolved_decisions": 0, "active_blockers": 0, "high_priority_unassigned_tasks": 0},
        }

        Conversation.objects.create(
            organization=self.org,
            author=self.user,
            post_type="update",
            title="Launch retro prep",
            content="We need to prepare the launch retro and assign owners.",
        )

        response = self.client.post("/api/knowledge/ai/copilot/", {"query": "most recent conversation"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data.get("response_mode"), "answer")
        self.assertIn('The most recent conversation in Knoledgr is "Launch retro prep".', response.data.get("answer", ""))
        self.assertEqual((response.data.get("sources") or {}).get("conversations")[0]["title"], "Launch retro prep")

    @patch("apps.knowledge.ai_intelligence.check_rate_limit", return_value=True)
    @patch("apps.knowledge.ai_intelligence._build_chief_of_staff_plan")
    @patch("apps.knowledge.ai_intelligence.get_search_engine")
    @patch("apps.knowledge.ai_intelligence._generate_llm_copilot_answer", return_value=None)
    def test_today_workspace_activity_query_uses_workspace_lookup_fallback(self, _llm_answer, get_search_engine, build_plan, _rate_limit):
        search_engine = Mock()
        search_engine.search.return_value = {
            "conversations": [],
            "decisions": [],
            "documents": [],
            "projects": [],
            "sprints": [],
            "total": 0,
        }
        get_search_engine.return_value = search_engine

        build_plan.return_value = {
            "status": "stable",
            "readiness_score": 84.0,
            "interventions": [],
            "learning_model": {},
            "counts": {"unresolved_decisions": 0, "active_blockers": 0, "high_priority_unassigned_tasks": 0},
        }

        Conversation.objects.create(
            organization=self.org,
            author=self.user,
            post_type="update",
            title="Daily delivery sync",
            content="Frontend reached QA and backend review is in progress.",
        )
        decision_conversation = Conversation.objects.create(
            organization=self.org,
            author=self.user,
            post_type="decision",
            title="Rollout checkpoint",
            content="Decision context for today's rollout checkpoint.",
        )
        Decision.objects.create(
            organization=self.org,
            conversation=decision_conversation,
            title="Approve onboarding release checklist",
            description="Lock the checklist before rollout.",
            decision_maker=self.user,
            status="approved",
            rationale="Reduce launch variance",
            impact_level="medium",
        )
        Document.objects.create(
            organization=self.org,
            title="Ops handoff note",
            description="Daily operations summary",
            document_type="report",
            content="Support coverage is ready for today's release window.",
            created_by=self.user,
            updated_by=self.user,
        )

        response = self.client.post("/api/knowledge/ai/copilot/", {"query": "what has happened today in the organization?"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data.get("response_mode"), "answer")
        self.assertGreaterEqual(response.data.get("evidence_count") or 0, 3)
        self.assertIn("Today in Knoledgr", response.data.get("answer", ""))
        self.assertTrue((response.data.get("sources") or {}).get("conversations"))
        self.assertTrue((response.data.get("sources") or {}).get("decisions"))
        self.assertTrue((response.data.get("sources") or {}).get("documents"))

    @patch("apps.knowledge.ai_intelligence.check_rate_limit", return_value=True)
    @patch("apps.knowledge.ai_intelligence._build_chief_of_staff_plan")
    @patch("apps.knowledge.ai_intelligence.get_search_engine")
    @patch("apps.knowledge.ai_intelligence._generate_llm_copilot_answer", return_value=None)
    def test_follow_up_query_uses_thread_context_anchor(self, _llm_answer, get_search_engine, build_plan, _rate_limit):
        search_engine = Mock()
        search_engine.search.side_effect = [
            {
                "conversations": [],
                "decisions": [],
                "projects": [],
                "total": 0,
            },
            {
                "conversations": [],
                "decisions": [],
                "projects": [
                    {
                        "id": 21,
                        "title": "Orbit Ops",
                        "key": "ORB",
                        "updated_at": "2026-04-08T08:30:00Z",
                        "created_at": "2026-04-07T08:30:00Z",
                        "url": "/projects/21",
                        "content_preview": "Newest control surface",
                    }
                ],
                "total": 1,
            },
        ]
        get_search_engine.return_value = search_engine

        build_plan.return_value = {
            "status": "stable",
            "readiness_score": 82.0,
            "interventions": [],
            "learning_model": {},
            "counts": {"unresolved_decisions": 0, "active_blockers": 0, "high_priority_unassigned_tasks": 0},
        }

        response = self.client.post(
            "/api/knowledge/ai/copilot/",
            {
                "query": "what changed most recently there?",
                "thread_context": [
                    {
                        "id": "thread-1",
                        "question": "most recent project",
                        "response_mode": "answer",
                        "sources": [
                            {"id": 21, "type": "project", "title": "Orbit Ops", "href": "/projects/21"}
                        ],
                    }
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data.get("response_mode"), "answer")
        self.assertEqual((response.data.get("context_anchor") or {}).get("title"), "Orbit Ops")
        self.assertIn('Recent thread context anchored this answer to project "Orbit Ops".', response.data.get("answer_foundation", [])[0])
        self.assertEqual((response.data.get("sources") or {}).get("projects")[0]["title"], "Orbit Ops")
        self.assertEqual(search_engine.search.call_count, 2)

    @patch("apps.knowledge.ai_intelligence.check_rate_limit", return_value=True)
    @patch("apps.knowledge.ai_intelligence._build_chief_of_staff_plan")
    @patch("apps.knowledge.ai_intelligence.get_search_engine")
    @patch("apps.knowledge.ai_intelligence._generate_llm_copilot_answer", return_value=None)
    def test_generic_follow_up_prefers_thread_scoped_results(self, _llm_answer, get_search_engine, build_plan, _rate_limit):
        search_engine = Mock()
        search_engine.search.side_effect = [
            {
                "conversations": [],
                "decisions": [
                    {
                        "id": 31,
                        "title": "Approve support handoff",
                        "created_at": "2026-04-08T08:30:00Z",
                        "url": "/decisions/31",
                        "content_preview": "Support handoff decision.",
                    }
                ],
                "total": 1,
            },
            {
                "conversations": [],
                "decisions": [
                    {
                        "id": 32,
                        "title": "Orbit Ops support handoff",
                        "created_at": "2026-04-08T09:30:00Z",
                        "url": "/decisions/32",
                        "content_preview": "Support handoff decision for Orbit Ops.",
                        "project_name": "Orbit Ops",
                    }
                ],
                "total": 1,
            },
        ]
        get_search_engine.return_value = search_engine

        build_plan.return_value = {
            "status": "stable",
            "readiness_score": 82.0,
            "interventions": [],
            "learning_model": {},
            "counts": {"unresolved_decisions": 0, "active_blockers": 0, "high_priority_unassigned_tasks": 0},
        }

        response = self.client.post(
            "/api/knowledge/ai/copilot/",
            {
                "query": "summarize the decision instead",
                "thread_context": [
                    {
                        "id": "thread-2",
                        "question": "most recent project",
                        "response_mode": "answer",
                        "sources": [
                            {"id": 21, "type": "project", "title": "Orbit Ops", "href": "/projects/21"}
                        ],
                    }
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data.get("response_mode"), "answer")
        self.assertEqual((response.data.get("context_anchor") or {}).get("title"), "Orbit Ops")
        self.assertEqual((response.data.get("sources") or {}).get("decisions")[0]["title"], "Orbit Ops support handoff")
        self.assertIn('Recent thread context anchored this answer to project "Orbit Ops".', response.data.get("answer_foundation", [])[0])
        self.assertEqual(search_engine.search.call_count, 2)

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
        self.assertEqual(response.data.get("answer_engine"), "claude")
        self.assertIn("goal", response.data.get("source_types"))
        self.assertIn("task", response.data.get("source_types"))
        self.assertIn("document", response.data.get("source_types"))
        self.assertEqual(response.data.get("recommended_interventions"), [])
        self.assertEqual((response.data.get("sources") or {}).get("documents")[0]["title"], "Onboarding Guide")
        self.assertTrue(isinstance(response.data.get("citations"), list))
        self.assertIn("Grounded in", response.data.get("credibility_summary", ""))
        self.assertTrue(len(response.data.get("answer_foundation") or []) >= 1)
        self.assertTrue(len(response.data.get("follow_up_questions") or []) >= 1)

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
        self.assertEqual(response.data.get("answer_engine"), "claude")
        self.assertIn("project", response.data.get("source_types"))
        self.assertIn("sprint", response.data.get("source_types"))
        self.assertIn("issue", response.data.get("source_types"))
        self.assertEqual((response.data.get("sources") or {}).get("sprints")[0]["title"], "Talking Stage Sprint")
        self.assertEqual((response.data.get("sources") or {}).get("projects")[0]["title"], "Justice App")
        self.assertTrue(any(item.get("type") == "sprint" for item in response.data.get("citations") or []))
        self.assertTrue(any(item.get("type") == "sprint" for item in response.data.get("evidence_breakdown") or []))
        self.assertTrue(any("Talking Stage Sprint" in item for item in response.data.get("answer_foundation") or []))
        self.assertTrue(len(response.data.get("follow_up_questions") or []) >= 1)

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
    @patch("apps.knowledge.ai_intelligence._build_chief_of_staff_plan")
    @patch("apps.knowledge.ai_intelligence.get_search_engine")
    @patch("apps.knowledge.ai_intelligence._generate_llm_copilot_answer", return_value="GitHub, Jira, Slack, and a connected Google calendar are available in this workspace.")
    def test_answer_mode_returns_connected_system_sources(self, _llm_answer, get_search_engine, build_plan, _rate_limit):
        search_engine = Mock()
        search_engine.search.return_value = {
            "conversations": [],
            "replies": [],
            "action_items": [],
            "decisions": [],
            "goals": [],
            "milestones": [],
            "tasks": [],
            "meetings": [],
            "documents": [],
            "projects": [],
            "sprints": [],
            "sprint_updates": [],
            "issues": [],
            "blockers": [],
            "people": [],
            "github_integrations": [
                {
                    "id": 41,
                    "title": "GitHub: justice-org/justice-app",
                    "created_at": "2026-03-10T08:30:00Z",
                    "url": "/integrations",
                    "content_preview": "Connected GitHub repository Repo justice-org/justice-app Auto link PRs enabled",
                    "status": "enabled",
                }
            ],
            "jira_integrations": [
                {
                    "id": 42,
                    "title": "Jira: https://justice.atlassian.net",
                    "created_at": "2026-03-10T08:30:00Z",
                    "url": "/integrations",
                    "content_preview": "Connected Jira workspace Admin ops@justice.example.com Issue sync enabled",
                    "status": "enabled",
                }
            ],
            "slack_integrations": [
                {
                    "id": 43,
                    "title": "Slack: #justice-alerts",
                    "created_at": "2026-03-10T08:30:00Z",
                    "url": "/integrations",
                    "content_preview": "Connected Slack channel Decision posts on Blocker posts on",
                    "status": "enabled",
                }
            ],
            "calendar_connections": [
                {
                    "id": 44,
                    "title": "Google calendar for Ada Lovelace",
                    "created_at": "2026-03-10T08:30:00Z",
                    "updated_at": "2026-03-11T08:30:00Z",
                    "last_synced_at": "2026-03-12T08:30:00Z",
                    "url": "/business/calendar",
                    "content_preview": "External calendar connection Calendar justice-primary Connected yes",
                    "status": "connected",
                }
            ],
            "pull_requests": [
                {
                    "id": 45,
                    "title": "Justice rollout PR",
                    "created_at": "2026-03-12T08:30:00Z",
                    "url": "https://github.com/justice-org/justice-app/pull/45",
                    "content_preview": "PR #45 Branch feature/justice-rollout",
                    "status": "open",
                }
            ],
            "commits": [
                {
                    "id": 46,
                    "title": "abc1234 Justice rollout fix",
                    "committed_at": "2026-03-12T09:30:00Z",
                    "url": "https://github.com/justice-org/justice-app/commit/abc1234",
                    "content_preview": "Justice rollout commit",
                    "status": "recorded",
                }
            ],
            "total": 6,
        }
        get_search_engine.return_value = search_engine
        build_plan.return_value = {
            "status": "stable",
            "readiness_score": 89.0,
            "interventions": [],
            "learning_model": {},
            "counts": {"unresolved_decisions": 0, "active_blockers": 0, "high_priority_unassigned_tasks": 0},
        }

        response = self.client.post(
            "/api/knowledge/ai/copilot/",
            {"query": "which integrations are connected to this workspace"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data.get("response_mode"), "answer")
        self.assertIn("github_integration", response.data.get("source_types"))
        self.assertIn("jira_integration", response.data.get("source_types"))
        self.assertIn("slack_integration", response.data.get("source_types"))
        self.assertIn("calendar_connection", response.data.get("source_types"))
        self.assertTrue(any(item.get("type") == "github_integration" for item in response.data.get("citations") or []))
        self.assertTrue(any(item.get("type") == "github_integration" for item in response.data.get("evidence_breakdown") or []))
        self.assertTrue(any("GitHub" in item for item in response.data.get("answer_foundation") or []))
        self.assertTrue(any(item.get("title") == "Justice rollout PR" for item in (response.data.get("sources") or {}).get("pull_requests", [])))

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
