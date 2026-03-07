from django.test import TestCase

from apps.agile.models import Board, Issue, Project
from apps.conversations.models import Conversation
from apps.organizations.models import Organization, User
from apps.organizations.platform_import_service import (
    build_preview_hash,
    import_platform_payload,
    normalize_platform_payload,
    preview_platform_payload,
)


class PlatformImportServiceTests(TestCase):
    def setUp(self):
        self.organization = Organization.objects.create(name="Acme", slug="acme")
        self.user = User.objects.create_user(
            username="admin",
            email="admin@acme.test",
            password="pass12345",
            organization=self.organization,
            role="admin",
        )

    def test_normalize_jira_payload(self):
        payload = [
            {
                "Issue key": "ACM-1",
                "Summary": "Set up migration",
                "Description": "Move tasks into Knoledgr",
                "Status": "In Progress",
                "Priority": "High",
                "Issue Type": "Story",
                "Comments": "Imported from Jira comments",
            }
        ]

        normalized = normalize_platform_payload(platform="jira", payload=payload, project_name="Imported Jira")

        self.assertEqual(normalized["project_name"], "Imported Jira")
        self.assertEqual(len(normalized["issues"]), 1)
        self.assertIn("In Progress", normalized["workflow_stages"])
        self.assertEqual(len(normalized["context_rows"]), 1)

    def test_import_platform_payload_creates_project_and_context(self):
        payload = [
            {
                "title": "Landing page polish",
                "description": "Finalize edge-case interactions for release",
                "status": "todo",
                "priority": "medium",
                "type": "task",
                "comments": "Context from existing board discussion",
            },
            {
                "title": "Fix auth race condition",
                "description": "Resolve concurrent refresh issue in API auth flow",
                "status": "in review",
                "priority": "high",
                "type": "bug",
                "comments": "Regression reported by customer success",
            },
        ]

        result = import_platform_payload(
            organization=self.organization,
            user=self.user,
            platform="github",
            payload=payload,
            project_name="GitHub Migration",
            include_context=True,
        )

        self.assertEqual(Project.objects.filter(organization=self.organization).count(), 1)
        self.assertEqual(Board.objects.filter(project__organization=self.organization).count(), 1)
        self.assertEqual(Issue.objects.filter(organization=self.organization).count(), 2)
        self.assertEqual(Conversation.objects.filter(organization=self.organization).count(), 2)
        self.assertEqual(result["issues_imported"], 2)
        self.assertEqual(result["context_imported"], 2)

    def test_preview_platform_payload(self):
        payload = [
            {
                "Summary": "Prepare launch checklist",
                "Description": "Track all blockers before release",
                "Status": "Done",
                "Priority": "Highest",
                "Issue Type": "Task",
                "Comments": "Final release discussion",
            }
        ]

        preview = preview_platform_payload(
            platform="jira",
            payload=payload,
            project_name="Launch Prep",
        )

        self.assertEqual(preview["issues_detected"], 1)
        self.assertEqual(preview["context_items_detected"], 1)
        self.assertIn("done", preview["status_distribution"])
        self.assertEqual(preview["project_name"], "Launch Prep")
        self.assertTrue(preview.get("preview_hash"))

    def test_preview_hash_changes_with_include_context_option(self):
        payload = [
            {
                "title": "Fix release script",
                "description": "Investigate CI mismatch",
                "status": "in progress",
                "priority": "high",
                "type": "task",
                "comments": "Includes migration context for runbook",
            }
        ]
        normalized = normalize_platform_payload(platform="github", payload=payload, project_name="Ops")
        hash_with_context = build_preview_hash(
            platform="github",
            normalized=normalized,
            include_context=True,
        )
        hash_without_context = build_preview_hash(
            platform="github",
            normalized=normalized,
            include_context=False,
        )

        self.assertNotEqual(hash_with_context, hash_without_context)
