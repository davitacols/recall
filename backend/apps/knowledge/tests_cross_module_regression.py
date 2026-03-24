from django.test import TestCase
from django.contrib.contenttypes.models import ContentType
from django.db.models import Q
from rest_framework.test import APIClient

from apps.business.document_models import Document
from apps.business.models import Task
from apps.conversations.models import Conversation
from apps.decisions.models import Decision
from apps.knowledge.unified_models import ContentLink
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

    def test_context_panel_suggests_and_applies_direct_links(self):
        self.task.conversation = self.conversation
        self.task.save(update_fields=["conversation"])
        self.document.task_id = self.task.id
        self.document.save(update_fields=["task_id"])
        task_content_type = ContentType.objects.get_for_model(Task)
        ContentLink.objects.filter(
            organization=self.org,
        ).filter(
            Q(source_content_type=task_content_type, source_object_id=self.task.id) |
            Q(target_content_type=task_content_type, target_object_id=self.task.id)
        ).delete()

        context_response = self.client.get(f"/api/knowledge/context/business.task/{self.task.id}/")
        self.assertEqual(context_response.status_code, 200)

        suggested_links = context_response.data.get("suggested_links", [])
        suggested_types = {(item.get("content_type"), item.get("id")) for item in suggested_links}
        self.assertIn(("decisions.decision", self.decision.id), suggested_types)
        self.assertIn(("conversations.conversation", self.conversation.id), suggested_types)
        self.assertIn(("business.document", self.document.id), suggested_types)

        decision_suggestion = next(
            item
            for item in suggested_links
            if item.get("content_type") == "decisions.decision" and item.get("id") == self.decision.id
        )
        self.assertTrue(decision_suggestion.get("is_direct_reference"))
        self.assertEqual(decision_suggestion.get("recommended_link_type"), "implements")

        apply_response = self.client.post(
            f"/api/knowledge/context/business.task/{self.task.id}/apply-suggestions/",
            {"limit": 3},
            format="json",
        )
        self.assertEqual(apply_response.status_code, 200)
        self.assertGreaterEqual(apply_response.data.get("applied_count", 0), 1)

        self.assertTrue(
            ContentLink.objects.filter(
                organization=self.org,
                source_object_id=self.task.id,
                target_object_id=self.decision.id,
                is_auto_generated=True,
            ).exists()
        )

        context_after = self.client.get(f"/api/knowledge/context/business.task/{self.task.id}/")
        self.assertEqual(context_after.status_code, 200)
        related_decisions = context_after.data.get("related_decisions", [])
        self.assertTrue(any(item.get("id") == self.decision.id for item in related_decisions))
