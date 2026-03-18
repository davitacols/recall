from django.test import TestCase
from rest_framework.test import APIClient

from apps.business.document_models import Document
from apps.business.models import Task
from apps.conversations.models import Conversation
from apps.decisions.models import Decision
from apps.organizations.models import Organization, User


class KnowledgeCrossModuleRegressionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.org = Organization.objects.create(name="Knowledge Cross Org", slug="knowledge-cross-org")
        self.user = User.objects.create_user(
            username="kcross_admin",
            email="kcross_admin@example.com",
            password="pass1234",
            organization=self.org,
            role="admin",
        )
        self.client.force_authenticate(user=self.user)

        self.conversation = Conversation.objects.create(
            organization=self.org,
            author=self.user,
            post_type="decision",
            title="Platform migration context",
            content="Legacy migration and auth hardening context.",
            ai_processed=True,
            ai_keywords=["migration", "auth", "platform"],
        )
        self.decision = Decision.objects.create(
            organization=self.org,
            conversation=self.conversation,
            title="Migrate auth platform",
            description="Decision ties execution to migration plan.",
            decision_maker=self.user,
            status="implemented",
            was_successful=False,
            rationale="Cross-module regression coverage",
        )
        self.task = Task.objects.create(
            organization=self.org,
            title="Auth migration task",
            description="Task linked to decision context.",
            status="todo",
            priority="high",
            decision=self.decision,
        )
        self.document = Document.objects.create(
            organization=self.org,
            title="Auth migration document",
            description="Document with migration details.",
            content="Auth migration runbook and constraints.",
            created_by=self.user,
            updated_by=self.user,
        )

    def test_manual_link_surfaces_in_graph_and_context(self):
        context_before = self.client.get(f"/api/knowledge/context/decisions.decision/{self.decision.id}/")
        self.assertEqual(context_before.status_code, 200)
        self.assertFalse(any(item.get("id") == self.task.id for item in context_before.data.get("related_tasks", [])))

        create_link = self.client.post(
            "/api/knowledge/link/",
            {
                "source_type": "decisions.decision",
                "source_id": self.decision.id,
                "target_type": "business.task",
                "target_id": self.task.id,
                "link_type": "implements",
            },
            format="json",
        )
        self.assertEqual(create_link.status_code, 200)
        self.assertTrue(create_link.data.get("created"))

        graph_response = self.client.get("/api/knowledge/graph/")
        self.assertEqual(graph_response.status_code, 200)
        edges = graph_response.data.get("edges", [])
        self.assertTrue(
            any(
                edge.get("source") == f"decision_{self.decision.id}" and
                edge.get("target") == f"task_{self.task.id}"
                for edge in edges
            )
        )

        context_response = self.client.get(f"/api/knowledge/context/decisions.decision/{self.decision.id}/")
        self.assertEqual(context_response.status_code, 200)
        related_tasks = context_response.data.get("related_tasks", [])
        self.assertTrue(any(item.get("id") == self.task.id for item in related_tasks))

    def test_search_all_failed_decision_mode_and_unified_search_contract(self):
        search_all = self.client.get("/api/knowledge/search-all/?q=failed decisions auth")
        self.assertEqual(search_all.status_code, 200)
        results = search_all.data.get("results", [])
        self.assertTrue(any(item.get("type") == "decision" and item.get("id") == self.decision.id for item in results))

        search_response = self.client.post("/api/knowledge/search/", {"query": "auth"}, format="json")
        self.assertEqual(search_response.status_code, 200)
        payload = search_response.data.get("results", {})
        self.assertIn("conversations", payload)
        self.assertIn("decisions", payload)
        self.assertIn("tasks", payload)
        self.assertIn("documents", payload)
        self.assertTrue(any(item.get("id") == self.decision.id for item in payload.get("decisions", [])))
        self.assertTrue(any(item.get("id") == self.task.id for item in payload.get("tasks", [])))
        self.assertTrue(any(item.get("id") == self.document.id for item in payload.get("documents", [])))
