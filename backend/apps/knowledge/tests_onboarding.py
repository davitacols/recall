from django.test import TestCase
from rest_framework.test import APIClient

from apps.conversations.models import Conversation
from apps.decisions.models import Decision
from apps.integrations.github_app_models import GitHubAppInstallation, GitHubRepo
from apps.organizations.auditlog_models import AuditLog
from apps.organizations.models import Organization, User


class DecisionMemoryOnboardingTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.org = Organization.objects.create(name="Pilot Workspace", slug="pilot-workspace")
        self.user = User.objects.create_user(
            username="pilot-admin",
            email="pilot@example.com",
            password="pass1234",
            organization=self.org,
            role="admin",
        )
        self.client.force_authenticate(user=self.user)

    def _steps(self):
        response = self.client.get("/api/knowledge/onboarding/")
        self.assertEqual(response.status_code, 200)
        return {item["id"]: item for item in response.data["steps"]}

    def _installation(self, organization=None, installation_id=991):
        organization = organization or self.org
        return GitHubAppInstallation.objects.create(
            organization=organization,
            installation_id=installation_id,
            account_id=installation_id + 1000,
            account_login=f"pilot-org-{installation_id}",
            installed_by=self.user if organization == self.org else None,
        )

    def test_empty_workspace_starts_with_every_step_incomplete(self):
        steps = self._steps()

        self.assertEqual(len(steps), 5)
        self.assertTrue(all(not item["completed"] for item in steps.values()))
        self.assertEqual(steps["connect_github"]["path"], "/integrations/github")

    def test_github_workflow_completes_each_step(self):
        installation = self._installation()
        GitHubRepo.objects.create(
            organization=self.org,
            installation=installation,
            repo_id=44,
            full_name="pilot/product",
            owner_login="pilot",
            name="product",
            is_enabled_for_decisions=True,
        )
        conversation = Conversation.objects.create(
            organization=self.org,
            author=self.user,
            post_type="decision",
            title="Choose the queue architecture",
            content="The team compared both queue designs and chose the simpler recovery model.",
            source=Conversation.SOURCE_GITHUB_PR,
            source_url="https://github.com/pilot/product/pull/12",
            external_id="pilot/product#12",
        )
        Decision.objects.create(
            organization=self.org,
            conversation=conversation,
            title="Use the recoverable queue",
            description="Adopt the queue design discussed in pull request 12.",
            decision_maker=self.user,
            status="approved",
            rationale="It makes failed jobs observable and safe to replay.",
        )
        AuditLog.log(
            organization=self.org,
            user=self.user,
            action="create",
            resource_type="agi_copilot_query",
            details={"query": "Why did we choose this queue?"},
        )

        steps = self._steps()

        self.assertTrue(all(item["completed"] for item in steps.values()))

    def test_other_workspace_activity_never_completes_this_workspace(self):
        other = Organization.objects.create(name="Other Workspace", slug="other-workspace")
        other_user = User.objects.create_user(
            username="other-admin",
            email="other@example.com",
            password="pass1234",
            organization=other,
            role="admin",
        )
        installation = GitHubAppInstallation.objects.create(
            organization=other,
            installation_id=992,
            account_id=1992,
            account_login="other-org",
            installed_by=other_user,
        )
        GitHubRepo.objects.create(
            organization=other,
            installation=installation,
            repo_id=55,
            full_name="other/private",
            owner_login="other",
            name="private",
            is_enabled_for_decisions=True,
        )
        Conversation.objects.create(
            organization=other,
            author=other_user,
            post_type="decision",
            title="Other workspace decision",
            content="This private discussion must not affect another workspace onboarding state.",
            source=Conversation.SOURCE_GITHUB_PR,
            source_url="https://github.com/other/private/pull/1",
            external_id="other/private#1",
        )

        steps = self._steps()

        self.assertTrue(all(not item["completed"] for item in steps.values()))

    def test_repo_assigned_from_shared_installation_counts_as_connected(self):
        owner = Organization.objects.create(name="Install Owner", slug="install-owner")
        owner_user = User.objects.create_user(
            username="install-owner-admin",
            email="install-owner@example.com",
            password="pass1234",
            organization=owner,
            role="admin",
        )
        installation = GitHubAppInstallation.objects.create(
            organization=owner,
            installation_id=993,
            account_id=1993,
            account_login="shared-github-org",
            installed_by=owner_user,
        )
        GitHubRepo.objects.create(
            organization=self.org,
            installation=installation,
            repo_id=66,
            full_name="shared/product",
            owner_login="shared",
            name="product",
            is_enabled_for_decisions=False,
        )

        steps = self._steps()

        self.assertTrue(steps["connect_github"]["completed"])
        self.assertFalse(steps["enable_repository"]["completed"])
