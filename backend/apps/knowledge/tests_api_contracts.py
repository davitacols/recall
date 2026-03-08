from datetime import timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.business.document_models import Document
from apps.business.models import Meeting, Task
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
        self.task = Task.objects.create(
            organization=self.org,
            title="Keyword alpha task",
            description="Task description with keyword alpha",
            status="todo",
            priority="medium",
        )
        self.meeting = Meeting.objects.create(
            organization=self.org,
            title="Keyword alpha meeting",
            description="Meeting notes include keyword alpha",
            meeting_date=timezone.now() + timedelta(days=1),
        )
        self.document = Document.objects.create(
            organization=self.org,
            title="Keyword alpha document",
            description="Document summary includes keyword alpha",
            content="Document body also includes keyword alpha",
            created_by=self.user,
            updated_by=self.user,
        )

    def test_search_returns_bucketed_payload_with_business_entities(self):
        response = self.client.post("/api/knowledge/search/", {"query": "keyword alpha"}, format="json")
        self.assertEqual(response.status_code, 200)

        payload = response.data
        self.assertIn("results", payload)
        self.assertIn("total", payload)
        self.assertIsInstance(payload["results"], dict)

        for bucket in ["conversations", "decisions", "tasks", "meetings", "documents"]:
            self.assertIn(bucket, payload["results"])
            self.assertIsInstance(payload["results"][bucket], list)

        self.assertTrue(any(item["id"] == self.conversation.id for item in payload["results"]["conversations"]))
        self.assertTrue(any(item["id"] == self.decision.id for item in payload["results"]["decisions"]))
        self.assertTrue(any(item["id"] == self.task.id for item in payload["results"]["tasks"]))
        self.assertTrue(any(item["id"] == self.meeting.id for item in payload["results"]["meetings"]))
        self.assertTrue(any(item["id"] == self.document.id for item in payload["results"]["documents"]))

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
        self.assertIsInstance(response.data["nodes"], list)
        self.assertIsInstance(response.data["edges"], list)
