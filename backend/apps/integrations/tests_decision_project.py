"""Tests for one repo, one project, and the attribution that follows.

GitHub is the source of the code; Knoledgr is the ground truth for what was
decided and why. In a workspace with several projects those have to line up, or
the record becomes one pool covering unrelated work.

The attribution has to be automatic to stay true, and it has to refuse to
guess: a project chosen by a person outranks one inferred from a link, and a
project belonging to another workspace is never acceptable.
"""

from django.test import TestCase
from rest_framework.test import APIClient

from apps.agile.models import Project
from apps.conversations.models import Conversation
from apps.decisions.models import Decision
from apps.integrations.decision_project import adopt_project_from_repo
from apps.integrations.github_app_models import GitHubAppInstallation, GitHubRepo
from apps.organizations.models import Organization, User


class _Fixture:
    """Shared setup. Deliberately not a TestCase.

    Subclassing a TestCase to reuse its setUp also inherits its test
    methods, so the endpoint tests below would re-run every attribution
    test against a fixture they had changed on purpose — and fail on it.
    """

    def setUp(self):
        self.org = Organization.objects.create(name="Proj QA", slug="proj-qa")
        self.user = User.objects.create_user(
            username="proj_user", email="proj@example.com", password="pass1234",
            organization=self.org, role="admin",
        )
        self.conversation = Conversation.objects.create(
            organization=self.org, author=self.user, post_type="update",
            title="seed", content="seed", ai_processed=True,
        )
        self.project = Project.objects.create(
            organization=self.org, name="Payments", key="PAY",
        )
        self.other_project = Project.objects.create(
            organization=self.org, name="Search", key="SRCH",
        )
        self.installation = GitHubAppInstallation.objects.create(
            organization=self.org, installation_id=660001, account_id=3,
            account_login="acme",
        )
        self.repo = GitHubRepo.objects.create(
            organization=self.org, installation=self.installation, repo_id=91,
            full_name="acme/payments", owner_login="acme", name="payments",
            project=self.project,
        )

    def _decision(self, title="A choice", project=None):
        return Decision.objects.create(
            organization=self.org, conversation=self.conversation, title=title,
            description="", decision_maker=self.user, status="proposed",
            rationale="Because.", project=project,
        )


class ProjectAttributionTests(_Fixture, TestCase):
    def test_decision_adopts_the_repo_project(self):
        d = self._decision()
        self.assertTrue(adopt_project_from_repo(d, self.repo))
        d.refresh_from_db()
        self.assertEqual(d.project_id, self.project.id)

    def test_an_existing_project_is_never_overwritten(self):
        """A person's answer outranks one inferred from a link."""
        d = self._decision(project=self.other_project)
        self.assertFalse(adopt_project_from_repo(d, self.repo))
        d.refresh_from_db()
        self.assertEqual(d.project_id, self.other_project.id)

    def test_repo_without_a_project_attributes_nothing(self):
        self.repo.project = None
        self.repo.save(update_fields=["project"])
        d = self._decision()
        self.assertFalse(adopt_project_from_repo(d, self.repo))
        d.refresh_from_db()
        self.assertIsNone(d.project_id)

    def test_never_attributes_across_workspaces(self):
        """A repo can be moved between workspaces and leave its project behind.

        Filing this workspace's decision under another's project would be a
        quiet cross-tenant leak in everything that reports by project.
        """
        stranger = Organization.objects.create(name="Stranger", slug="stranger-co")
        foreign = Project.objects.create(
            organization=stranger, name="Theirs", key="THR",
        )
        self.repo.project = foreign
        self.repo.save(update_fields=["project"])

        d = self._decision()
        self.assertFalse(adopt_project_from_repo(d, self.repo))
        d.refresh_from_db()
        self.assertIsNone(d.project_id)

    def test_missing_arguments_are_survivable(self):
        self.assertFalse(adopt_project_from_repo(None, self.repo))
        self.assertFalse(adopt_project_from_repo(self._decision(), None))


class RepoProjectEndpointTests(_Fixture, TestCase):
    def setUp(self):
        super().setUp()
        self.repo.project = None
        self.repo.save(update_fields=["project"])
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def _url(self, repo=None):
        return f"/api/integrations/github/app/repos/{(repo or self.repo).pk}/project/"

    def test_assigns_a_project(self):
        resp = self.client.patch(self._url(), {"project_id": self.project.id}, format="json", secure=True)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["project_id"], self.project.id)
        self.assertEqual(resp.data["project_name"], "Payments")

    def test_clears_with_null(self):
        self.repo.project = self.project
        self.repo.save(update_fields=["project"])
        resp = self.client.patch(self._url(), {"project_id": None}, format="json", secure=True)
        self.assertEqual(resp.status_code, 200)
        self.repo.refresh_from_db()
        self.assertIsNone(self.repo.project_id)

    def test_one_project_cannot_be_the_code_for_two_repos(self):
        """The rule the whole design rests on, explained rather than a 500."""
        second = GitHubRepo.objects.create(
            organization=self.org, installation=self.installation, repo_id=92,
            full_name="acme/other", owner_login="acme", name="other",
            project=self.project,
        )
        resp = self.client.patch(self._url(), {"project_id": self.project.id}, format="json", secure=True)
        self.assertEqual(resp.status_code, 409)
        self.assertIn(second.full_name, resp.data["error"])

    def test_project_must_be_in_this_workspace(self):
        stranger = Organization.objects.create(name="Elsewhere", slug="elsewhere-co")
        foreign = Project.objects.create(organization=stranger, name="Theirs", key="THR2")
        resp = self.client.patch(self._url(), {"project_id": foreign.id}, format="json", secure=True)
        self.assertEqual(resp.status_code, 404)

    def test_cannot_touch_a_repo_in_another_workspace(self):
        stranger = Organization.objects.create(name="Other", slug="other-co2")
        inst = GitHubAppInstallation.objects.create(
            organization=stranger, installation_id=660002, account_id=4,
            account_login="other",
        )
        foreign_repo = GitHubRepo.objects.create(
            organization=stranger, installation=inst, repo_id=93,
            full_name="other/secret", owner_login="other", name="secret",
        )
        resp = self.client.patch(
            self._url(foreign_repo), {"project_id": self.project.id}, format="json", secure=True
        )
        self.assertEqual(resp.status_code, 404)

    def test_project_id_is_required(self):
        resp = self.client.patch(self._url(), {}, format="json", secure=True)
        self.assertEqual(resp.status_code, 400)

    def test_repo_list_offers_the_workspace_projects(self):
        resp = self.client.get("/api/integrations/github/app/repos/", secure=True)
        self.assertEqual(resp.status_code, 200)
        names = [p["name"] for p in resp.data["available_projects"]]
        self.assertEqual(names, ["Payments", "Search"])
