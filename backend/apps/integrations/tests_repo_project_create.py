"""Creating the project a repo is the code for, from a name alone.

Knoledgr is not a tracker. A project here is the namespace that keeps one
repo's decisions from blurring into another's - nothing more. The only route
to creating one used to be the agile Projects page, which asks for a key, a
lead and a description and sits on a screen counting issues and sprints. That
is the wrong shape for recording "this repo is the code for Dynamo", and it
teaches the wrong mental model on first contact.

So the repo endpoint takes a name and does the rest.
"""

from django.test import TestCase
from rest_framework.test import APIClient

from apps.agile.models import Project
from apps.integrations.github_app_models import GitHubAppInstallation, GitHubRepo
from apps.organizations.models import Organization, User


class RepoProjectCreateTests(TestCase):
    URL = "/api/integrations/github/app/repos/{}/project/"

    def setUp(self):
        self.org = Organization.objects.create(name="Proj Org", slug="proj-org")
        self.user = User.objects.create_user(
            username="proj_user", email="proj@example.com", password="pass1234",
            organization=self.org, role="admin",
        )
        self.installation = GitHubAppInstallation.objects.create(
            organization=self.org, installation_id=99001, account_id=1,
            account_login="acme", account_type="Organization",
        )
        self.repo = self._repo(1001, "acme/dynamo")
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def _repo(self, repo_id, full_name):
        return GitHubRepo.objects.create(
            organization=self.org, installation=self.installation,
            repo_id=repo_id, full_name=full_name,
            owner_login=full_name.split("/")[0], name=full_name.split("/")[1],
        )

    def _patch(self, repo, payload):
        return self.client.patch(self.URL.format(repo.pk), payload, format="json")

    def test_creates_and_assigns_from_a_name(self):
        response = self._patch(self.repo, {"project_name": "Dynamo"})

        self.assertEqual(response.status_code, 200, response.data)
        project = Project.objects.get(organization=self.org, name="Dynamo")
        self.repo.refresh_from_db()
        self.assertEqual(self.repo.project_id, project.id)

    def test_key_is_derived_never_asked_for(self):
        self._patch(self.repo, {"project_name": "Dynamo"})

        project = Project.objects.get(name="Dynamo")
        self.assertEqual(project.key, "DYNAMO")

    def test_key_derivation_strips_punctuation_and_spaces(self):
        self._patch(self.repo, {"project_name": "Ops & Infra!"})

        project = Project.objects.get(name="Ops & Infra!")
        self.assertTrue(project.key.isalnum())
        self.assertLessEqual(len(project.key), 10)

    def test_key_collides_across_workspaces_without_failing(self):
        """The key column is globally unique, so another tenant can hold it."""
        other = Organization.objects.create(name="Other", slug="other-proj-org")
        Project.objects.create(organization=other, name="Dynamo", key="DYNAMO")

        response = self._patch(self.repo, {"project_name": "Dynamo"})

        self.assertEqual(response.status_code, 200, response.data)
        mine = Project.objects.get(organization=self.org, name="Dynamo")
        self.assertNotEqual(mine.key, "DYNAMO")

    def test_an_existing_name_is_reused_not_duplicated(self):
        existing = Project.objects.create(
            organization=self.org, name="Dynamo", key="DYN"
        )

        self._patch(self.repo, {"project_name": "dynamo"})

        self.assertEqual(Project.objects.filter(organization=self.org).count(), 1)
        self.repo.refresh_from_db()
        self.assertEqual(self.repo.project_id, existing.id)

    def test_reusing_a_name_already_taken_by_another_repo_is_refused(self):
        other_repo = self._repo(1002, "acme/other")
        self._patch(other_repo, {"project_name": "Dynamo"})

        response = self._patch(self.repo, {"project_name": "Dynamo"})

        self.assertEqual(response.status_code, 409)
        self.assertIn("already the project for", response.data["error"])

    def test_project_id_still_works(self):
        project = Project.objects.create(
            organization=self.org, name="Existing", key="EXIST"
        )

        response = self._patch(self.repo, {"project_id": project.id})

        self.assertEqual(response.status_code, 200, response.data)
        self.repo.refresh_from_db()
        self.assertEqual(self.repo.project_id, project.id)

    def test_null_project_id_still_clears(self):
        project = Project.objects.create(
            organization=self.org, name="Existing", key="EXIST2"
        )
        self.repo.project = project
        self.repo.save(update_fields=["project"])

        response = self._patch(self.repo, {"project_id": None})

        self.assertEqual(response.status_code, 200, response.data)
        self.repo.refresh_from_db()
        self.assertIsNone(self.repo.project_id)

    def test_neither_field_is_a_400(self):
        response = self._patch(self.repo, {})

        self.assertEqual(response.status_code, 400)

    def test_blank_name_falls_through_rather_than_creating_an_unnamed_project(self):
        response = self._patch(self.repo, {"project_name": "   "})

        self.assertEqual(response.status_code, 400)
        self.assertFalse(Project.objects.filter(organization=self.org).exists())

    def test_cannot_create_a_project_on_another_workspaces_repo(self):
        other = Organization.objects.create(name="Theirs", slug="theirs-proj-org")
        their_install = GitHubAppInstallation.objects.create(
            organization=other, installation_id=99002, account_id=2,
            account_login="them", account_type="Organization",
        )
        their_repo = GitHubRepo.objects.create(
            organization=other, installation=their_install, repo_id=2001,
            full_name="them/secret", owner_login="them", name="secret",
        )

        response = self._patch(their_repo, {"project_name": "Sneaky"})

        self.assertEqual(response.status_code, 404)
        self.assertFalse(Project.objects.filter(name="Sneaky").exists())
