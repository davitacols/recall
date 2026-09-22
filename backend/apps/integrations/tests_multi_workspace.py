"""Tests for one GitHub installation serving several workspaces.

GitHub permits one installation per account, and Knoledgr used to bind it to
exactly one workspace — so a developer with two projects under one GitHub login
could connect only one. Connecting the second revoked the first, silently.

Loosening that touches an isolation boundary, so most of these assert the parts
that must *not* loosen: a repo can only be moved somewhere the requester
already belongs, and an installation still cannot be taken over.
"""

from unittest.mock import patch

from django.test import TestCase
from rest_framework.test import APIClient

from apps.integrations.github_app_models import GitHubAppInstallation, GitHubRepo
from apps.organizations.models import Organization, User


class MultiWorkspaceRepoTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner_org = Organization.objects.create(name="DataDisk", slug="datadisk")
        self.other_org = Organization.objects.create(name="Handshake", slug="handshake")
        self.stranger_org = Organization.objects.create(name="Stranger", slug="stranger")

        # One person, two workspaces — the same email in each, which is how
        # membership works here.
        self.user = User.objects.create_user(
            username="dev_datadisk", email="dev@example.com", password="pass1234",
            organization=self.owner_org, role="admin",
        )
        User.objects.create_user(
            username="dev_handshake", email="dev@example.com", password="pass1234",
            organization=self.other_org, role="admin",
        )
        # Someone else entirely.
        User.objects.create_user(
            username="stranger", email="stranger@example.com", password="pass1234",
            organization=self.stranger_org, role="admin",
        )

        self.installation = GitHubAppInstallation.objects.create(
            organization=self.owner_org, installation_id=770001, account_id=9,
            account_login="dev", installed_by=self.user,
        )
        self.repo = GitHubRepo.objects.create(
            organization=self.owner_org, installation=self.installation, repo_id=301,
            full_name="dev/dynamo", owner_login="dev", name="dynamo",
        )
        self.client.force_authenticate(user=self.user)

    def _move(self, org_id, repo=None):
        return self.client.patch(
            f"/api/integrations/github/app/repos/{(repo or self.repo).pk}/workspace/",
            {"org_id": org_id}, format="json",
        )

    # -- the capability -----------------------------------------------------

    def test_repo_moves_to_another_workspace_the_user_belongs_to(self):
        resp = self._move(self.other_org.id)
        self.assertEqual(resp.status_code, 200)
        self.repo.refresh_from_db()
        self.assertEqual(self.repo.organization_id, self.other_org.id)

    def test_moved_repo_arrives_disabled(self):
        """Its decisions live in the workspace it came from; commenting on
        arrival would talk about a record that has nothing to say."""
        self.repo.is_enabled_for_decisions = True
        self.repo.save(update_fields=["is_enabled_for_decisions"])
        self._move(self.other_org.id)
        self.repo.refresh_from_db()
        self.assertFalse(self.repo.is_enabled_for_decisions)

    def test_installation_still_owned_by_the_workspace_that_installed_it(self):
        self._move(self.other_org.id)
        self.installation.refresh_from_db()
        self.assertEqual(self.installation.organization_id, self.owner_org.id)

    # -- the boundary -------------------------------------------------------

    def test_cannot_move_a_repo_into_a_workspace_you_are_not_in(self):
        """Otherwise any authenticated user could push a repo into any
        workspace by id and stream its pull requests into it."""
        resp = self._move(self.stranger_org.id)
        self.assertEqual(resp.status_code, 403)
        self.repo.refresh_from_db()
        self.assertEqual(self.repo.organization_id, self.owner_org.id)

    def test_cannot_move_a_repo_you_cannot_see(self):
        foreign_install = GitHubAppInstallation.objects.create(
            organization=self.stranger_org, installation_id=770002, account_id=10,
            account_login="stranger",
        )
        foreign_repo = GitHubRepo.objects.create(
            organization=self.stranger_org, installation=foreign_install,
            repo_id=302, full_name="stranger/secret", owner_login="stranger",
            name="secret",
        )
        resp = self._move(self.other_org.id, repo=foreign_repo)
        self.assertEqual(resp.status_code, 404)
        foreign_repo.refresh_from_db()
        self.assertEqual(foreign_repo.organization_id, self.stranger_org.id)

    def test_nonexistent_workspace_is_rejected(self):
        self.assertEqual(self._move(999999).status_code, 403)

    def test_org_id_must_be_numeric(self):
        resp = self.client.patch(
            f"/api/integrations/github/app/repos/{self.repo.pk}/workspace/",
            {"org_id": "; drop table"}, format="json",
        )
        self.assertEqual(resp.status_code, 400)

    # -- listing ------------------------------------------------------------

    def test_a_workspace_sees_repos_assigned_to_it(self):
        """Even though it does not own the installation."""
        self._move(self.other_org.id)
        other_user = User.objects.get(username="dev_handshake")
        client = APIClient()
        client.force_authenticate(user=other_user)

        resp = client.get("/api/integrations/github/app/repos/")
        self.assertEqual(resp.status_code, 200)
        names = [r["full_name"] for r in resp.data["results"]]
        self.assertEqual(names, ["dev/dynamo"])
        self.assertTrue(resp.data["github_app"]["connected"])

    def test_the_original_workspace_no_longer_lists_it(self):
        self._move(self.other_org.id)
        resp = self.client.get("/api/integrations/github/app/repos/")
        self.assertEqual(resp.data["results"], [])

    def test_available_workspaces_lists_siblings_only(self):
        resp = self.client.get("/api/integrations/github/app/repos/")
        names = [w["org_name"] for w in resp.data["available_workspaces"]]
        self.assertEqual(names, ["Handshake"])


class RepoSyncPreservesAssignmentTests(TestCase):
    """A resync must not drag a reassigned repo back to the installing org.

    _sync_installation_repos runs on installation_repositories webhooks and on
    the manual resync button. Passing organization into update_or_create would
    have reset the assignment every time — silently, on a schedule.
    """

    def setUp(self):
        self.owner_org = Organization.objects.create(name="Owner", slug="owner-co")
        self.other_org = Organization.objects.create(name="Other", slug="other-co")
        self.installation = GitHubAppInstallation.objects.create(
            organization=self.owner_org, installation_id=780001, account_id=11,
            account_login="dev",
        )
        self.repo = GitHubRepo.objects.create(
            organization=self.other_org, installation=self.installation,
            repo_id=401, full_name="dev/moved", owner_login="dev", name="moved",
        )

    def test_resync_leaves_the_assignment_alone(self):
        from apps.integrations.github_app_views import _sync_installation_repos

        payload = [{
            "id": 401, "full_name": "dev/moved", "name": "moved",
            "owner": {"login": "dev"}, "default_branch": "main",
            "private": False, "archived": False,
            "html_url": "https://github.com/dev/moved",
        }]
        with patch(
            "apps.integrations.github_app_views.list_installation_repos",
            return_value=payload,
        ):
            _sync_installation_repos(self.installation)

        self.repo.refresh_from_db()
        self.assertEqual(
            self.repo.organization_id, self.other_org.id,
            "a resync must not pull a reassigned repo back to the installing workspace",
        )

    def test_resync_updates_metadata(self):
        from apps.integrations.github_app_views import _sync_installation_repos

        payload = [{
            "id": 401, "full_name": "dev/renamed", "name": "renamed",
            "owner": {"login": "dev"}, "default_branch": "trunk",
            "private": True, "archived": False,
            "html_url": "https://github.com/dev/renamed",
        }]
        with patch(
            "apps.integrations.github_app_views.list_installation_repos",
            return_value=payload,
        ):
            _sync_installation_repos(self.installation)

        self.repo.refresh_from_db()
        self.assertEqual(self.repo.full_name, "dev/renamed")
        self.assertEqual(self.repo.default_branch, "trunk")
        self.assertTrue(self.repo.private)
        self.assertEqual(self.repo.organization_id, self.other_org.id)

    def test_a_repo_no_longer_shared_is_disabled_wherever_it_lives(self):
        self.repo.is_enabled_for_decisions = True
        self.repo.save(update_fields=["is_enabled_for_decisions"])

        from apps.integrations.github_app_views import _sync_installation_repos

        with patch(
            "apps.integrations.github_app_views.list_installation_repos",
            return_value=[],
        ):
            _sync_installation_repos(self.installation)

        self.repo.refresh_from_db()
        self.assertFalse(self.repo.is_enabled_for_decisions)
