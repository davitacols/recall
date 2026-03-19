from datetime import timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.business.document_models import Document
from apps.business.models import Goal, Meeting, Task
from apps.conversations.models import Conversation
from apps.decisions.models import Decision
from apps.organizations.models import Organization, User


class KnowledgeApiContractTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.org = Organization.objects.create(name="Knowledge QA", slug="knowledge-qa")
        self.user = User.objects.create_user(
            username="knowledge_user",
            email="knowledge@example.com",
            password="pass1234",
            organization=self.org,
            role="admin",
        )
        self.client.force_authenticate(user=self.user)

        self.conversation = Conversation.objects.create(
            organization=self.org,
            author=self.user,
            post_type="update",
            title="Risk sync",
            content="Keyword alpha appears in sprint risk discussion.",
            ai_processed=True,
            ai_keywords=["keyword alpha", "risk"],
        )
        self.decision = Decision.objects.create(
            organization=self.org,
            conversation=self.conversation,
            title="Keyword alpha decision",
            description="Decision including keyword alpha for search contract.",
            decision_maker=self.user,
            status="proposed",
            rationale="Contract coverage",
        )
        self.goal = Goal.objects.create(
            organization=self.org,
            title="Keyword alpha goal",
            description="Goal description with keyword alpha",
            conversation=self.conversation,
            decision=self.decision,
            owner=self.user,
            status="in_progress",
            progress=35,
        )
        self.task = Task.objects.create(
            organization=self.org,
            title="Keyword alpha task",
            description="Task description with keyword alpha",
            status="todo",
            priority="medium",
            goal=self.goal,
            decision=self.decision,
        )
        self.meeting = Meeting.objects.create(
            organization=self.org,
            title="Keyword alpha meeting",
            description="Meeting notes include keyword alpha",
            meeting_date=timezone.now() + timedelta(days=1),
            goal=self.goal,
            decision=self.decision,
        )
        self.document = Document.objects.create(
            organization=self.org,
            title="Keyword alpha document",
            description="Document summary includes keyword alpha",
            content="Document body also includes keyword alpha",
            created_by=self.user,
            updated_by=self.user,
            goal_id=self.goal.id,
            meeting_id=self.meeting.id,
            task_id=self.task.id,
        )

    def test_search_returns_bucketed_payload_with_business_entities(self):
        response = self.client.post("/api/knowledge/search/", {"query": "keyword alpha"}, format="json")
        self.assertEqual(response.status_code, 200)

        payload = response.data
        self.assertIn("results", payload)
        self.assertIn("total", payload)
        self.assertIsInstance(payload["results"], dict)

        for bucket in ["conversations", "decisions", "goals", "tasks", "meetings", "documents"]:
            self.assertIn(bucket, payload["results"])
            self.assertIsInstance(payload["results"][bucket], list)

        self.assertTrue(any(item["id"] == self.conversation.id for item in payload["results"]["conversations"]))
        self.assertTrue(any(item["id"] == self.decision.id for item in payload["results"]["decisions"]))
        self.assertTrue(any(item["id"] == self.goal.id for item in payload["results"]["goals"]))
        self.assertTrue(any(item["id"] == self.task.id for item in payload["results"]["tasks"]))
        self.assertTrue(any(item["id"] == self.meeting.id for item in payload["results"]["meetings"]))
        self.assertTrue(any(item["id"] == self.document.id for item in payload["results"]["documents"]))

    def test_search_respects_type_filters(self):
        response = self.client.post(
            "/api/knowledge/search/",
            {"query": "keyword alpha", "filters": {"types": ["document"]}},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        payload = response.data["results"]
        self.assertEqual(len(payload["documents"]), 1)
        self.assertEqual(payload["documents"][0]["id"], self.document.id)
        self.assertEqual(payload["conversations"], [])
        self.assertEqual(payload["decisions"], [])
        self.assertEqual(payload["goals"], [])
        self.assertEqual(payload["tasks"], [])
        self.assertEqual(payload["meetings"], [])

    def test_timeline_returns_paginated_shape(self):
        response = self.client.get("/api/knowledge/timeline/?days=30&page=1&per_page=10")
        self.assertEqual(response.status_code, 200)
        self.assertIn("results", response.data)
        self.assertIn("pagination", response.data)
        self.assertIsInstance(response.data["results"], list)
        self.assertIsInstance(response.data["pagination"], dict)

    def test_graph_returns_nodes_and_edges_shape(self):
        response = self.client.get("/api/knowledge/graph/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("nodes", response.data)
        self.assertIn("edges", response.data)
        self.assertIn("summary", response.data)
        self.assertIsInstance(response.data["nodes"], list)
        self.assertIsInstance(response.data["edges"], list)
        self.assertEqual(response.data["summary"]["type_counts"]["goal"], 1)
        self.assertTrue(
            any(
                edge["source"] == f"decision_{self.decision.id}" and edge["target"] == f"goal_{self.goal.id}"
                for edge in response.data["edges"]
            )
        )

    def test_graph_focus_and_query_filter_return_connected_neighborhood(self):
        response = self.client.get(f"/api/knowledge/graph/?focus_type=decision&focus_id={self.decision.id}&q=keyword alpha")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["summary"]["focus_node"], f"decision_{self.decision.id}")
        node_ids = {node["id"] for node in response.data["nodes"]}
        self.assertIn(f"decision_{self.decision.id}", node_ids)
        self.assertIn(f"goal_{self.goal.id}", node_ids)
        self.assertIn(f"task_{self.task.id}", node_ids)
        self.assertIn(f"meeting_{self.meeting.id}", node_ids)

    def test_search_suggestions_span_multiple_knowledge_sources(self):
        response = self.client.get("/api/knowledge/search/suggestions/?q=keyword alpha")
        self.assertEqual(response.status_code, 200)
        suggestions = response.data.get("suggestions", [])
        self.assertTrue(any("keyword alpha" in suggestion.lower() for suggestion in suggestions))
