from datetime import timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.business.advanced_models import Milestone
from apps.business.document_models import Document
from apps.business.models import CalendarConnection, Goal, Meeting, Task
from apps.agile.models import Blocker, Board, Column, Issue, Project, Sprint, SprintUpdate
from apps.conversations.models import ActionItem, Bookmark, Conversation, ConversationReply
from apps.decisions.models import Decision
from apps.integrations.models import Commit as IntegrationCommit
from apps.integrations.models import GitHubIntegration, JiraIntegration, PullRequest as IntegrationPullRequest, SlackIntegration
from apps.organizations.auditlog_models import AuditLog
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
            assigned_to=self.user,
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
        self.issue.watchers.add(self.user)
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
        self.github_integration = GitHubIntegration.objects.create(
            organization=self.org,
            access_token="ghp_test_keyword_alpha_token",
            repo_owner="keyword-alpha-org",
            repo_name="keyword-alpha-repo",
            enabled=True,
            auto_link_prs=True,
        )
        self.jira_integration = JiraIntegration.objects.create(
            organization=self.org,
            site_url="https://keyword-alpha.atlassian.net",
            email="keyword-alpha-admin@example.com",
            api_token="jira_test_keyword_alpha_token",
            enabled=True,
            auto_sync_issues=True,
        )
        self.slack_integration = SlackIntegration.objects.create(
            organization=self.org,
            webhook_url="https://hooks.slack.com/services/T000/B000/keywordalpha",
            channel="#keyword-alpha-alerts",
            enabled=True,
            post_decisions=True,
            post_blockers=True,
            post_sprint_summary=True,
        )
        self.calendar_connection = CalendarConnection.objects.create(
            organization=self.org,
            user=self.user,
            provider="google",
            is_connected=True,
            external_calendar_id="keyword-alpha-primary",
            metadata={"calendar_id": "keyword-alpha-primary"},
            last_synced_at=timezone.now(),
        )
        self.integration_pr = IntegrationPullRequest.objects.create(
            organization=self.org,
            decision=self.decision,
            pr_number=27,
            pr_url="https://github.com/keyword-alpha-org/keyword-alpha-repo/pull/27",
            title="Keyword alpha talking stage rollout",
            status="open",
            branch_name="feature/keyword-alpha-talking-stage",
            author="octocat",
            created_at=timezone.now(),
            commits_count=2,
        )
        self.integration_commit = IntegrationCommit.objects.create(
            organization=self.org,
            decision=self.decision,
            pull_request=self.integration_pr,
            sha="a" * 40,
            message="Keyword alpha commit for talking stage rollout",
            author="octocat",
            commit_url="https://github.com/keyword-alpha-org/keyword-alpha-repo/commit/" + ("a" * 40),
            committed_at=timezone.now(),
        )
        self.bookmark = Bookmark.objects.create(
            user=self.user,
            conversation=self.conversation,
            note="Keep this risk sync handy.",
        )
        self.ask_recall_log = AuditLog.log(
            organization=self.org,
            user=self.user,
            action="update",
            resource_type="agi_copilot_query",
            details={
                "query": "What changed in Justice App?",
                "response_mode": "answer",
                "confidence_band": "medium",
                "evidence_count": 3,
                "coverage_score": 78.0,
                "answer_engine": "rules",
            },
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
            "github_integrations",
            "jira_integrations",
            "slack_integrations",
            "calendar_connections",
            "pull_requests",
            "commits",
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
        self.assertTrue(any(item["id"] == self.github_integration.id for item in payload["results"]["github_integrations"]))
        self.assertTrue(any(item["id"] == self.jira_integration.id for item in payload["results"]["jira_integrations"]))
        self.assertTrue(any(item["id"] == self.slack_integration.id for item in payload["results"]["slack_integrations"]))
        self.assertTrue(any(item["id"] == self.calendar_connection.id for item in payload["results"]["calendar_connections"]))
        self.assertTrue(any(item["id"] == self.integration_pr.id for item in payload["results"]["pull_requests"]))
        self.assertTrue(any(item["id"] == self.integration_commit.id for item in payload["results"]["commits"]))

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
        self.assertEqual(payload["github_integrations"], [])
        self.assertEqual(payload["jira_integrations"], [])
        self.assertEqual(payload["slack_integrations"], [])
        self.assertEqual(payload["calendar_connections"], [])
        self.assertEqual(payload["pull_requests"], [])
        self.assertEqual(payload["commits"], [])

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

    def test_personal_briefing_returns_user_lane_payload(self):
        response = self.client.get("/api/knowledge/dashboard/personal-briefing/")
        self.assertEqual(response.status_code, 200)

        payload = response.data
        self.assertIn("assigned_tasks", payload)
        self.assertIn("bookmarked_conversations", payload)
        self.assertIn("relevant_decisions", payload)
        self.assertIn("watched_issues", payload)
        self.assertIn("recent_conversations", payload)
        self.assertIn("recent_ask_recall_queries", payload)
        self.assertIn("counts", payload)

        self.assertEqual(payload["assigned_tasks"][0]["id"], self.task.id)
        self.assertEqual(payload["bookmarked_conversations"][0]["conversation_id"], self.conversation.id)
        self.assertEqual(payload["relevant_decisions"][0]["id"], self.decision.id)
        self.assertEqual(payload["watched_issues"][0]["id"], self.issue.id)
        self.assertTrue(any(item["id"] == self.conversation.id for item in payload["recent_conversations"]))
        self.assertEqual(payload["recent_ask_recall_queries"][0]["query"], "What changed in Justice App?")
        self.assertEqual(payload["counts"]["bookmarked_conversations"], 1)
        self.assertEqual(payload["counts"]["relevant_decisions"], 1)
        self.assertEqual(payload["counts"]["recent_ask_recall_queries"], 1)

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

    def test_search_returns_connected_system_sources_for_connector_queries(self):
        response = self.client.post(
            "/api/knowledge/search/",
            {"query": "which integrations are connected to this workspace"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        payload = response.data["results"]
        self.assertTrue(any(item["id"] == self.github_integration.id for item in payload["github_integrations"]))
        self.assertTrue(any(item["id"] == self.jira_integration.id for item in payload["jira_integrations"]))
        self.assertTrue(any(item["id"] == self.slack_integration.id for item in payload["slack_integrations"]))
        self.assertTrue(any(item["id"] == self.calendar_connection.id for item in payload["calendar_connections"]))
