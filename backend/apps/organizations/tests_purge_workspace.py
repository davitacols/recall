import io
import os
import shutil
import tempfile
from collections import Counter
from unittest.mock import patch

from django.core.files.base import ContentFile
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase, override_settings

from apps.organizations.models import Organization, User


class PurgeWorkspaceCommandTests(TestCase):
    def setUp(self):
        self.media_root = tempfile.mkdtemp(prefix="knoledgr-purge-test-")
        self.settings_override = override_settings(MEDIA_ROOT=self.media_root)
        self.settings_override.enable()

        self.org = Organization.objects.create(name="Pilot Customer", slug="pilot-customer")
        self.user = User.objects.create_user(
            username="pilot-owner",
            email="owner@pilot.example",
            password="pass1234",
            organization=self.org,
            role="admin",
        )
        self.org.logo.save("pilot-logo.png", ContentFile(b"pilot-logo"), save=True)
        self.logo_path = self.org.logo.path

        self.other_org = Organization.objects.create(name="Other Customer", slug="other-customer")
        self.other_user = User.objects.create_user(
            username="other-owner",
            email="owner@other.example",
            password="pass1234",
            organization=self.other_org,
            role="admin",
        )

    def tearDown(self):
        self.settings_override.disable()
        shutil.rmtree(self.media_root, ignore_errors=True)

    def test_default_run_is_a_read_only_preview(self):
        stdout = io.StringIO()

        with patch(
            "apps.organizations.management.commands.purge_workspace._collect_workspace_deletion",
            return_value=(None, Counter({"organizations.Organization": 1}), []),
        ):
            call_command("purge_workspace", slug=self.org.slug, stdout=stdout)

        self.assertTrue(Organization.objects.filter(pk=self.org.pk).exists())
        self.assertTrue(os.path.exists(self.logo_path))
        self.assertIn("DRY RUN ONLY", stdout.getvalue())

    def test_execute_requires_exact_slug_confirmation(self):
        with self.assertRaises(CommandError):
            call_command(
                "purge_workspace",
                slug=self.org.slug,
                execute=True,
                confirm_slug="wrong-workspace",
            )

        self.assertTrue(Organization.objects.filter(pk=self.org.pk).exists())

    def test_confirmed_execute_deletes_only_the_target_workspace(self):
        stdout = io.StringIO()
        file_ref = (self.org.logo.storage, self.org.logo.name)

        with patch(
            "apps.organizations.management.commands.purge_workspace._collect_workspace_deletion",
            return_value=(
                None,
                Counter({"organizations.Organization": 1, "organizations.User": 1}),
                [file_ref],
            ),
        ), patch("apps.organizations.models.Organization.delete") as delete_workspace:
            call_command(
                "purge_workspace",
                slug=self.org.slug,
                execute=True,
                confirm_slug=self.org.slug,
                stdout=stdout,
            )

        delete_workspace.assert_called_once()
        self.assertFalse(os.path.exists(self.logo_path))
        self.assertTrue(Organization.objects.filter(pk=self.other_org.pk).exists())
        self.assertTrue(User.objects.filter(pk=self.other_user.pk).exists())
        self.assertIn("Purged workspace 'pilot-customer'", stdout.getvalue())
