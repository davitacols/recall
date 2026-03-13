from django.test import TestCase
from rest_framework.test import APIClient

from apps.agile.models import Board, Column, Issue, IssueTemplate, Project, Sprint
from apps.organizations.models import Organization, User


class AgileCompatibilityIsolationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.org = Organization.objects.create(name="Compat Org", slug="compat-org")
        self.other_org = Organization.objects.create(name="Other Compat Org", slug="other-compat-org")
        self.user = User.objects.create_user(
            username="compat_admin",
            email="compat_admin@example.com",
            password="pass1234",
            organization=self.org,
            role="admin",
        )
        self.member = User.objects.create_user(
            username="compat_member",
            email="compat_member@example.com",
            password="pass1234",
            organization=self.org,
            role="contributor",
        )
        self.other_member = User.objects.create_user(
            username="compat_other_member",
            email="compat_other_member@example.com",
            password="pass1234",
            organization=self.other_org,
            role="contributor",
        )
        self.project = Project.objects.create(
            organization=self.org,
            name="Compat Project",
            key="CP",
            description="Primary project",
            lead=self.user,
        )
        self.board = Board.objects.create(
            organization=self.org,
            project=self.project,
            name="Compat Board",
            board_type="kanban",
        )
        self.column = Column.objects.create(board=self.board, name="To Do", order=0)
        self.issue = Issue.objects.create(
            organization=self.org,
            project=self.project,
            board=self.board,
            column=self.column,
            key="CP-1",
            title="Compatibility issue",
            reporter=self.user,
            assignee=self.member,
            status="todo",
        )
        self.sprint = Sprint.objects.create(
            organization=self.org,
            project=self.project,
            name="Compat Sprint",
            start_date="2026-03-10",
            end_date="2026-03-20",
            status="active",
        )
        self.other_project = Project.objects.create(
            organization=self.org,
            name="Other Compat Project",
            key="OCP",
            description="Secondary project",
            lead=self.user,
        )
        self.other_board = Board.objects.create(
            organization=self.org,
            project=self.other_project,
            name="Other Compat Board",
            board_type="kanban",
        )
        self.other_column = Column.objects.create(board=self.other_board, name="Queued", order=0)
        self.other_sprint = Sprint.objects.create(
            organization=self.org,
            project=self.other_project,
            name="Other Compat Sprint",
            start_date="2026-03-10",
            end_date="2026-03-20",
            status="planning",
        )
        self.foreign_project = Project.objects.create(
            organization=self.other_org,
            name="Foreign Compat Project",
            key="FCP",
            description="Foreign project",
            lead=self.other_member,
        )
        self.client.force_authenticate(user=self.user)

    def test_bulk_update_rejects_cross_org_assignee(self):
        response = self.client.post(
            "/api/agile/issues/bulk-update/",
            {
                "issue_ids": [self.issue.id],
                "updates": {
                    "assignee_id": self.other_member.id,
                },
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"], "Invalid assignee_id for this organization")

    def test_bulk_update_rejects_sprint_from_different_project(self):
        response = self.client.post(
            "/api/agile/issues/bulk-update/",
            {
                "issue_ids": [self.issue.id],
                "updates": {
                    "sprint_id": self.other_sprint.id,
                },
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.data["error"],
            "Sprint must belong to the same project as every selected issue",
        )

    def test_bulk_update_rejects_invalid_status(self):
        response = self.client.post(
            "/api/agile/issues/bulk-update/",
            {
                "issue_ids": [self.issue.id],
                "updates": {
                    "status": "archived",
                },
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"], "Invalid status")

    def test_issue_template_rejects_cross_org_project(self):
        response = self.client.post(
            "/api/agile/templates/",
            {
                "project_id": self.foreign_project.id,
                "name": "Bug Triage",
                "issue_type": "bug",
                "title_template": "Bug: {summary}",
                "description_template": "Describe the bug",
                "default_priority": "high",
                "default_labels": ["bug", "triage"],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"], "Project not found in your organization")

    def test_issue_template_creates_same_org_project_template(self):
        response = self.client.post(
            "/api/agile/templates/",
            {
                "project_id": self.project.id,
                "name": "Bug Triage",
                "issue_type": "bug",
                "title_template": "Bug: {summary}",
                "description_template": "Describe the bug",
                "default_priority": "high",
                "default_labels": ["bug", "triage", ""],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        template = IssueTemplate.objects.get(id=response.data["id"])
        self.assertEqual(template.project, self.project)
        self.assertEqual(template.default_labels, ["bug", "triage"])
