import hashlib
import hmac
import json

from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from apps.agile.models import Board, CodeCommit, Column, DecisionIssueLink, Deployment, Issue, Project, PullRequest as AgilePullRequest
from apps.conversations.models import Conversation
from apps.decisions.models import Decision
from apps.integrations.models import Commit as IntegrationCommit
from apps.integrations.models import GitHubIntegration, GitHubWebhookDelivery, PullRequest as IntegrationPullRequest
from apps.organizations.models import Organization, User


class GitHubEndpointTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.webhook_client = APIClient()
        self.org = Organization.objects.create(name="GitHub QA", slug="github-qa")
        self.user = User.objects.create_user(
            username="github_admin",
            email="github@example.com",
            password="pass1234",
            organization=self.org,
            role="admin",
        )
        self.client.force_authenticate(user=self.user)

        self.conversation = Conversation.objects.create(
            organization=self.org,
            author=self.user,
            post_type="update",
            title="Implementation sync",
            content="We need a verified GitHub execution trail.",
        )
        self.decision = Decision.objects.create(
            organization=self.org,
            conversation=self.conversation,
            title="Ship the GitHub execution timeline",
            description="Connect GitHub evidence back to decisions and linked issues.",
            decision_maker=self.user,
            rationale="Improve engineering context fidelity.",
            status="approved",
            code_links=[
                {
                    "type": "link",
                    "url": "https://github.com/acme/justice-app/actions/runs/12345",
                    "title": "Production workflow run",
                }
            ],
        )

        self.integration = GitHubIntegration.objects.create(
            organization=self.org,
            access_token="ghp_example_token",
            repo_owner="acme",
            repo_name="justice-app",
            webhook_secret="super-secret",
            enabled=True,
            auto_link_prs=True,
        )

        self.project = Project.objects.create(
            organization=self.org,
            name="Justice App",
            key="JAPP",
            description="Justice platform delivery workspace.",
            lead=self.user,
        )
        self.board = Board.objects.create(
            organization=self.org,
            project=self.project,
            name="Justice Board",
            board_type="scrum",
        )
        self.column = Column.objects.create(board=self.board, name="In Progress", order=1)
        self.issue = Issue.objects.create(
            organization=self.org,
            project=self.project,
            board=self.board,
            column=self.column,
            key="JAPP-42",
            title="Talking stage rollout",
            description="Implement the talking stage sprint flow.",
            reporter=self.user,
            assignee=self.user,
            status="in_progress",
            branch_name="feature/talking-stage-rollout",
            pr_url="https://github.com/acme/justice-app/pull/45",
            commit_hash="b" * 40,
            ci_status="passed",
            ci_url="https://github.com/acme/justice-app/actions/runs/999",
        )
        DecisionIssueLink.objects.create(decision=self.decision, issue=self.issue, impact_type="enables")

        self.direct_pr = IntegrationPullRequest.objects.create(
            organization=self.org,
            decision=self.decision,
            pr_number=18,
            pr_url="https://github.com/acme/justice-app/pull/18",
            title="Direct decision rollout PR",
            status="merged",
            branch_name="decision/ship-github-execution-timeline",
            author="octocat",
            created_at=timezone.now(),
            merged_at=timezone.now(),
        )
        IntegrationCommit.objects.create(
            organization=self.org,
            decision=self.decision,
            pull_request=self.direct_pr,
            sha="a" * 40,
            message="Ship GitHub decision timeline",
            author="octocat",
            commit_url="https://github.com/acme/justice-app/commit/" + ("a" * 40),
            committed_at=timezone.now(),
        )

        AgilePullRequest.objects.create(
            organization=self.org,
            issue=self.issue,
            pr_number=45,
            title="Talking stage rollout PR",
            description="Implements the talking stage flow.",
            status="merged",
            url="https://github.com/acme/justice-app/pull/45",
            author="buildbot",
            reviewers=["qa@example.com"],
            merged_at=timezone.now(),
        )
        CodeCommit.objects.create(
            organization=self.org,
            issue=self.issue,
            commit_hash="b" * 40,
            message="Wire talking stage flow into sprint board",
            author="buildbot",
            branch="feature/talking-stage-rollout",
            url="https://github.com/acme/justice-app/commit/" + ("b" * 40),
        )
        Deployment.objects.create(
            organization=self.org,
            environment="production",
            status="success",
            commit_hash="b" * 40,
            branch="feature/talking-stage-rollout",
            deployed_by="release-bot",
            deployed_at=timezone.now(),
            url="https://deploys.example.com/justice-app/42",
        )

    def test_github_config_returns_health_and_activity_summary(self):
        response = self.client.get("/api/integrations/fresh/github/config/")

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["configured"])
        self.assertEqual(response.data["repo_slug"], "acme/justice-app")
        self.assertTrue(response.data["has_webhook_secret"])
        self.assertEqual(response.data["webhook_readiness"]["state"], "ready")
        self.assertEqual(response.data["webhook_observability"]["health"], "awaiting_events")
        self.assertEqual(response.data["engineering_summary"]["decision_pull_requests"], 1)
        self.assertEqual(response.data["engineering_summary"]["issue_pull_requests"], 1)
        self.assertEqual(response.data["engineering_summary"]["commits"], 2)
        self.assertEqual(response.data["engineering_summary"]["deployments"], 1)
        self.assertGreaterEqual(len(response.data["recent_activity"]), 1)

    @override_settings(PUBLIC_API_URL="https://api.example.com")
    def test_github_config_uses_public_api_url_for_webhook_readiness(self):
        response = self.client.get("/api/integrations/fresh/github/config/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.data["webhook_readiness"]["webhook_url"],
            "https://api.example.com/api/integrations/github/webhook/",
        )

    def test_decision_timeline_merges_decision_and_issue_execution_signals(self):
        response = self.client.get(f"/api/integrations/fresh/github/decisions/{self.decision.id}/timeline/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["implementation_status"], "deployed")
        self.assertEqual(response.data["summary"]["decision_pull_requests"], 1)
        self.assertEqual(response.data["summary"]["issue_pull_requests"], 1)
        self.assertEqual(response.data["summary"]["commits"], 2)
        self.assertEqual(response.data["summary"]["deployments"], 1)
        self.assertEqual(response.data["summary"]["linked_issues"], 1)
        self.assertEqual(response.data["summary"]["manual_links"], 1)
        self.assertEqual(response.data["linked_issues"][0]["key"], "JAPP-42")
        pull_titles = {item["title"] for item in response.data["pull_requests"]}
        self.assertIn("Direct decision rollout PR", pull_titles)
        self.assertIn("Talking stage rollout PR", pull_titles)
        self.assertTrue(response.data["naming"]["suggested_pr_title"].startswith(f"DECISION-{self.decision.id}:"))

    def test_issue_timeline_returns_linked_decisions_and_delivery_context(self):
        response = self.client.get(f"/api/integrations/fresh/github/issues/{self.issue.id}/timeline/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["implementation_status"], "deployed")
        self.assertEqual(response.data["summary"]["pull_requests"], 1)
        self.assertEqual(response.data["summary"]["commits"], 1)
        self.assertEqual(response.data["summary"]["deployments"], 1)
        self.assertEqual(response.data["summary"]["linked_decisions"], 1)
        self.assertEqual(response.data["linked_decisions"][0]["title"], self.decision.title)
        self.assertEqual(response.data["engineering_signals"]["branch_name"], "feature/talking-stage-rollout")

    def test_decision_link_pr_endpoint_now_persists_tracked_pull_request(self):
        response = self.client.post(
            f"/api/decisions/{self.decision.id}/link-pr/",
            {"pr_url": "https://github.com/acme/justice-app/pull/88"},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.decision.refresh_from_db()
        self.assertTrue(any(link.get("url") == "https://github.com/acme/justice-app/pull/88" for link in self.decision.code_links))
        self.assertTrue(
            IntegrationPullRequest.objects.filter(
                organization=self.org,
                decision=self.decision,
                pr_number=88,
            ).exists()
        )

    def test_github_webhook_logs_processed_delivery_and_surfaces_it_in_config(self):
        payload = {
            "action": "opened",
            "repository": {
                "name": "justice-app",
                "full_name": "acme/justice-app",
                "owner": {"login": "acme"},
            },
            "pull_request": {
                "number": 77,
                "html_url": "https://github.com/acme/justice-app/pull/77",
                "title": f"DECISION-{self.decision.id}: Ship the GitHub execution timeline",
                "state": "open",
                "merged": False,
                "head": {"ref": f"decision/{self.decision.id}-ship-the-github-execution-timeline"},
                "user": {"login": "octocat"},
            },
        }
        body = json.dumps(payload)
        signature = hmac.new(
            self.integration.get_webhook_secret().encode("utf-8"),
            body.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

        response = self.webhook_client.post(
            "/api/integrations/github/webhook/",
            data=body,
            content_type="application/json",
            HTTP_X_GITHUB_EVENT="pull_request",
            HTTP_X_GITHUB_DELIVERY="delivery-123",
            HTTP_X_HUB_SIGNATURE_256=f"sha256={signature}",
        )

        self.assertEqual(response.status_code, 200)
        delivery = GitHubWebhookDelivery.objects.get()
        self.assertEqual(delivery.processing_state, "processed")
        self.assertTrue(delivery.signature_valid)
        self.assertEqual(delivery.event, "pull_request")
        self.assertEqual(delivery.delivery_id, "delivery-123")

        config_response = self.client.get("/api/integrations/fresh/github/config/")
        self.assertEqual(config_response.status_code, 200)
        self.assertEqual(config_response.data["webhook_observability"]["health"], "healthy")
        self.assertEqual(config_response.data["webhook_observability"]["recent_processed_count"], 1)
        self.assertEqual(config_response.data["webhook_observability"]["recent_failure_count"], 0)
        self.assertEqual(config_response.data["webhook_observability"]["recent_deliveries"][0]["processing_state"], "processed")

    def test_github_webhook_logs_failed_delivery_for_invalid_signature(self):
        payload = {
            "repository": {
                "name": "justice-app",
                "owner": {"login": "acme"},
            },
            "commits": [],
        }
        body = json.dumps(payload)

        response = self.webhook_client.post(
            "/api/integrations/github/webhook/",
            data=body,
            content_type="application/json",
            HTTP_X_GITHUB_EVENT="push",
            HTTP_X_GITHUB_DELIVERY="delivery-bad",
            HTTP_X_HUB_SIGNATURE_256="sha256=bad-signature",
        )

        self.assertEqual(response.status_code, 401)
        delivery = GitHubWebhookDelivery.objects.get()
        self.assertEqual(delivery.processing_state, "failed")
        self.assertFalse(delivery.signature_valid)
        self.assertEqual(delivery.message, "invalid_signature")
