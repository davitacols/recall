from datetime import timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.business.advanced_models import Milestone
from apps.business.document_models import Document
from apps.business.models import Goal, Meeting, Task
from apps.agile.models import Blocker, Board, Column, Issue, Project, Sprint, SprintUpdate
from apps.conversations.models import ActionItem, Conversation, ConversationReply
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
        self.teammate = User.objects.create_user(
            username="keyword_alpha_specialist",
            email="keyword-alpha-specialist@example.com",
            password="pass1234",
            organization=self.org,
            role="manager",
            full_name="Keyword Alpha Specialist",
            bio="Supports keyword alpha delivery and rollout planning.",
        )

        self.conversation = Conversation.objects.create(
            organization=self.org,
            author=self.user,
            post_type="update",
            title="Risk sync",
            content="Keyword alpha appears in sprint risk discussion.",
            ai_processed=True,
            ai_keywords=["keyword alpha", "risk"],
        )
        self.reply = ConversationReply.objects.create(
            conversation=self.conversation,
            author=self.teammate,
            content="Deep keyword alpha reply context lives in this thread.",
        )
        self.action_item = ActionItem.objects.create(
            conversation=self.conversation,
            title="Keyword alpha action item",
            description="Follow up on the keyword alpha rollout risk.",
            assignee=self.teammate,
            status="in_progress",
            priority="high",
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
        self.milestone = Milestone.objects.create(
            goal=self.goal,
            title="Keyword alpha milestone",
            description="Milestone coverage for keyword alpha delivery.",
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
        self.project = Project.objects.create(
            organization=self.org,
            name="Justice App",
            key="JAPP",
            description="Keyword alpha delivery workspace for the justice app team.",
            lead=self.user,
        )
        self.sprint = Sprint.objects.create(
            organization=self.org,
            project=self.project,
            name="Talking Stage Sprint",
            start_date=timezone.now().date(),
            end_date=(timezone.now() + timedelta(days=14)).date(),
            goal="Keyword alpha sprint focused on the talking stage flow.",
            summary="Justice App sprint summary with keyword alpha context.",
            status="active",
        )
        self.board = Board.objects.create(
            organization=self.org,
            project=self.project,
            name="Justice App Delivery",
            board_type="scrum",
        )
        self.column = Column.objects.create(
            board=self.board,
            name="To Do",
            order=1,
        )
        self.issue = Issue.objects.create(
            organization=self.org,
            project=self.project,
            board=self.board,
            column=self.column,
            key="JAPP-101",
            title="Keyword alpha talking stage issue",
            description="Justice App issue for the talking stage sprint with keyword alpha.",
            priority="high",
            status="todo",
            issue_type="story",
            sprint=self.sprint,
            reporter=self.user,
            assignee=self.user,
            in_backlog=False,
        )
        self.blocker = Blocker.objects.create(
            organization=self.org,
            conversation=self.conversation,
            sprint=self.sprint,
            title="Keyword alpha blocker",
            description="Blocker coverage for the keyword alpha sprint.",
            blocker_type="technical",
            status="active",
            blocked_by=self.user,
            assigned_to=self.teammate,
        )
        self.sprint_update = SprintUpdate.objects.create(
            organization=self.org,
            sprint=self.sprint,
            author=self.user,
            type="sprint_update",
            title="Keyword alpha sprint update",
            content="This sprint update contains keyword alpha details for the team.",
            ai_summary="Keyword alpha sprint summary for testing.",
        )

    def test_search_returns_bucketed_payload_with_business_entities(self):
        response = self.client.post("/api/knowledge/search/", {"query": "keyword alpha"}, format="json")
        self.assertEqual(response.status_code, 200)

        payload = response.data
        self.assertIn("results", payload)
        self.assertIn("total", payload)
        self.assertIsInstance(payload["results"], dict)

        for bucket in [
            "conversations",
            "replies",
            "action_items",
            "decisions",
            "goals",
            "milestones",
            "tasks",
            "meetings",
            "documents",
            "projects",
            "sprints",
            "sprint_updates",
            "issues",
            "blockers",
            "people",
        ]:
            self.assertIn(bucket, payload["results"])
            self.assertIsInstance(payload["results"][bucket], list)

        self.assertTrue(any(item["id"] == self.conversation.id for item in payload["results"]["conversations"]))
        self.assertTrue(any(item["id"] == self.reply.id for item in payload["results"]["replies"]))
        self.assertTrue(any(item["id"] == self.action_item.id for item in payload["results"]["action_items"]))
        self.assertTrue(any(item["id"] == self.decision.id for item in payload["results"]["decisions"]))
        self.assertTrue(any(item["id"] == self.goal.id for item in payload["results"]["goals"]))
        self.assertTrue(any(item["id"] == self.milestone.id for item in payload["results"]["milestones"]))
        self.assertTrue(any(item["id"] == self.task.id for item in payload["results"]["tasks"]))
        self.assertTrue(any(item["id"] == self.meeting.id for item in payload["results"]["meetings"]))
        self.assertTrue(any(item["id"] == self.document.id for item in payload["results"]["documents"]))
        self.assertTrue(any(item["id"] == self.project.id for item in payload["results"]["projects"]))
        self.assertTrue(any(item["id"] == self.sprint.id for item in payload["results"]["sprints"]))
        self.assertTrue(any(item["id"] == self.sprint_update.id for item in payload["results"]["sprint_updates"]))
        self.assertTrue(any(item["id"] == self.issue.id for item in payload["results"]["issues"]))
        self.assertTrue(any(item["id"] == self.blocker.id for item in payload["results"]["blockers"]))
        self.assertTrue(any(item["id"] == self.teammate.id for item in payload["results"]["people"]))

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
        self.assertEqual(payload["projects"], [])
        self.assertEqual(payload["sprints"], [])
        self.assertEqual(payload["issues"], [])
        self.assertEqual(payload["replies"], [])
        self.assertEqual(payload["action_items"], [])
        self.assertEqual(payload["milestones"], [])
        self.assertEqual(payload["sprint_updates"], [])
        self.assertEqual(payload["blockers"], [])
        self.assertEqual(payload["people"], [])

    def test_search_matches_natural_language_sprint_query(self):
        response = self.client.post(
            "/api/knowledge/search/",
            {"query": "tell me about the talking stage sprint in the justice app project"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)

        payload = response.data["results"]
        self.assertTrue(any(item["id"] == self.project.id for item in payload["projects"]))
        self.assertTrue(any(item["id"] == self.sprint.id for item in payload["sprints"]))
        self.assertTrue(any(item["id"] == self.issue.id for item in payload["issues"]))

    def test_search_finds_hidden_reply_and_people_context(self):
        response = self.client.post(
            "/api/knowledge/search/",
            {"query": "deep keyword alpha reply context"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(any(item["id"] == self.reply.id for item in response.data["results"]["replies"]))

        response = self.client.post(
            "/api/knowledge/search/",
            {"query": "keyword alpha specialist"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(any(item["id"] == self.teammate.id for item in response.data["results"]["people"]))

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
