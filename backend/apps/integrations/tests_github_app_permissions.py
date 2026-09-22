"""Tests for the GitHub App permission gate and its refresh path.

The PR-suggestion feature fails *closed*: if the stored permission set says
``pull_requests: read``, nothing is attempted and one line is logged. That is
the right default, but it means a bug in the refresh path is invisible — the
feature simply stays quiet forever and looks like it was never built.

That is not hypothetical. The permission set was originally written once, at
install time, and never again. An admin could grant ``pull_requests: write``
on GitHub, accept it, see it granted there, and Knoledgr would keep skipping
every PR with the stored ``read`` it captured days earlier.

These tests pin the two halves of that:
  - the gate reads the stored set and defaults to closed, and
  - an installation webhook updates the stored set.
"""

from django.test import TestCase
from django.utils import timezone

from apps.integrations.github_app import installation_can_write_prs
from apps.integrations.github_app_models import GitHubAppInstallation
from apps.integrations.github_app_views import _refresh_permissions
from apps.organizations.models import Organization


def _make_installation(org, installation_id=999001, permissions=None):
    return GitHubAppInstallation.objects.create(
        organization=org,
        installation_id=installation_id,
        account_id=4242,
        account_login="acme",
        account_type=GitHubAppInstallation.ACCOUNT_ORG,
        permissions=permissions if permissions is not None else {
            "metadata": "read", "pull_requests": "read",
        },
    )


class WritePermissionGateTests(TestCase):
    """installation_can_write_prs must fail closed on anything but write."""

    def setUp(self):
        self.org = Organization.objects.create(name="Gate QA", slug="gate-qa")

    def test_read_permission_does_not_allow_writing(self):
        inst = _make_installation(self.org, permissions={"pull_requests": "read"})
        self.assertFalse(installation_can_write_prs(inst))

    def test_write_permission_allows_writing(self):
        inst = _make_installation(self.org, permissions={"pull_requests": "write"})
        self.assertTrue(installation_can_write_prs(inst))

    def test_missing_permission_key_fails_closed(self):
        inst = _make_installation(self.org, permissions={"metadata": "read"})
        self.assertFalse(installation_can_write_prs(inst))

    def test_empty_permissions_fail_closed(self):
        inst = _make_installation(self.org, permissions={})
        self.assertFalse(installation_can_write_prs(inst))

    def test_permission_check_is_case_insensitive(self):
        # GitHub sends lowercase, but a hand-edited row or a future API change
        # should not silently disable the feature.
        inst = _make_installation(self.org, permissions={"pull_requests": "WRITE"})
        self.assertTrue(installation_can_write_prs(inst))


class PermissionRefreshTests(TestCase):
    """An installation webhook must update the stored permission set."""

    def setUp(self):
        self.org = Organization.objects.create(name="Refresh QA", slug="refresh-qa")
        self.inst = _make_installation(self.org)

    def test_accepting_new_permissions_opens_the_gate(self):
        """The end-to-end property this whole module exists to protect."""
        self.assertFalse(installation_can_write_prs(self.inst))

        changed = _refresh_permissions(self.inst, {
            "installation": {
                "permissions": {"metadata": "read", "pull_requests": "write"},
            },
        })

        self.assertTrue(changed)
        self.inst.refresh_from_db()
        self.assertEqual(self.inst.permissions["pull_requests"], "write")
        self.assertTrue(installation_can_write_prs(self.inst))

    def test_refresh_persists_to_the_database(self):
        _refresh_permissions(self.inst, {
            "installation": {"permissions": {"pull_requests": "write"}},
        })
        reloaded = GitHubAppInstallation.objects.get(pk=self.inst.pk)
        self.assertEqual(reloaded.permissions, {"pull_requests": "write"})

    def test_unchanged_permissions_are_not_rewritten(self):
        """Most installation events carry no change; they must not churn writes."""
        changed = _refresh_permissions(self.inst, {
            "installation": {
                "permissions": {"metadata": "read", "pull_requests": "read"},
            },
        })
        self.assertFalse(changed)

    def test_permission_downgrade_is_honoured(self):
        """Revoking write must close the gate, not just opening it must open it."""
        self.inst.permissions = {"pull_requests": "write"}
        self.inst.save(update_fields=["permissions"])

        _refresh_permissions(self.inst, {
            "installation": {"permissions": {"pull_requests": "read"}},
        })

        self.inst.refresh_from_db()
        self.assertFalse(installation_can_write_prs(self.inst))

    def test_missing_permissions_key_leaves_stored_set_alone(self):
        """A malformed or partial payload must never wipe what we know.

        Treating "absent" as "empty" would silently revoke the feature.
        """
        for payload in ({}, {"installation": {}}, {"installation": {"permissions": None}},
                        {"installation": {"permissions": {}}}):
            changed = _refresh_permissions(self.inst, payload)
            self.assertFalse(changed, f"payload {payload!r} should be a no-op")
            self.inst.refresh_from_db()
            self.assertEqual(self.inst.permissions["pull_requests"], "read")

    def test_non_dict_permissions_are_ignored(self):
        changed = _refresh_permissions(self.inst, {
            "installation": {"permissions": "write"},
        })
        self.assertFalse(changed)
        self.inst.refresh_from_db()
        self.assertEqual(self.inst.permissions, {"metadata": "read", "pull_requests": "read"})


class InstallationOwnershipTests(TestCase):
    """One GitHub installation must never be shared by two workspaces.

    A workspace that rebinds another workspace's installation would gain read
    access to its repositories and its PR metadata. This was a real defect,
    fixed in the install callback; it had no regression test until now.
    """

    def setUp(self):
        self.org_a = Organization.objects.create(name="Tenant A", slug="tenant-a")
        self.org_b = Organization.objects.create(name="Tenant B", slug="tenant-b")

    def test_installation_id_is_globally_unique(self):
        from django.db import IntegrityError, transaction

        _make_installation(self.org_a, installation_id=555001)
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                _make_installation(self.org_b, installation_id=555001)

    def test_revoked_installation_is_not_active(self):
        """A reinstall leaves the old row behind; it must not count as live."""
        inst = _make_installation(self.org_a, installation_id=555002)
        self.assertTrue(inst.is_active)

        inst.revoked_at = timezone.now()
        inst.save(update_fields=["revoked_at"])

        inst.refresh_from_db()
        self.assertFalse(inst.is_active)
