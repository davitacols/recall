from django.test import TestCase
from rest_framework.test import APIClient

from apps.agile.models import Board, Column, Issue, Project, Sprint
from apps.organizations.models import Organization, User


class IssueIsolationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.org = Organization.objects.create(name="Issue Org", slug="issue-org")
        self.other_org = Organization.objects.create(name="Other Issue Org", slug="other-issue-org")
        self.user = User.objects.create_user(
            username="issue_owner",
            email="issue_owner@example.com",
            password="pass1234",
            organization=self.org,
            role="admin",
        )
        self.member = User.objects.create_user(
            username="issue_member",
            email="issue_member@example.com",
            password="pass1234",
            organization=self.org,
            role="contributor",
        )
        self.other_member = User.objects.create_user(
            username="other_issue_member",
            email="other_issue_member@example.com",
            password="pass1234",
            organization=self.other_org,
            role="contributor",
        )
        self.project = Project.objects.create(
            organization=self.org,
            name="Issue Project",
            key="IP",
            description="Main project",
            lead=self.user,
        )
        self.board = Board.objects.create(
            organization=self.org,
            project=self.project,
            name="Main Board",
            board_type="kanban",
        )
        self.column = Column.objects.create(board=self.board, name="To Do", order=0)
        self.other_project = Project.objects.create(
            organization=self.other_org,
            name="Other Project",
            key="OP",
            description="Other project",
            lead=self.other_member,
        )
        self.other_board = Board.objects.create(
            organization=self.other_org,
            project=self.other_project,
            name="Other Board",
            board_type="kanban",
        )
        self.other_column = Column.objects.create(board=self.other_board, name="Other Col", order=0)
        self.sprint = Sprint.objects.create(
            organization=self.org,
            project=self.project,
            name="Sprint A",
            start_date="2026-03-10",
            end_date="2026-03-20",
            status="active",
        )
        self.other_sprint = Sprint.objects.create(
            organization=self.other_org,
            project=self.other_project,
            name="Other Sprint",
            start_date="2026-03-10",
            end_date="2026-03-20",
            status="active",
        )
        self.issue = Issue.objects.create(
            organization=self.org,
            project=self.project,
            board=self.board,
            column=self.column,
            key="IP-1",
            title="Main issue",
            reporter=self.user,
            assignee=self.member,
            status="todo",
        )
        self.client.force_authenticate(user=self.user)

    def test_issue_detail_rejects_cross_org_assignee(self):
        response = self.client.put(
            f"/api/agile/issues/{self.issue.id}/",
            {
                "assignee_id": self.other_member.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"], "Invalid assignee_id for this organization")

    def test_project_detail_returns_command_center(self):
        Issue.objects.create(
            organization=self.org,
            project=self.project,
            board=self.board,
            column=self.column,
            key="IP-2",
            title="Unassigned urgent issue",
            reporter=self.user,
            priority="highest",
            status="in_progress",
            due_date="2026-03-09",
        )

        response = self.client.get(f"/api/agile/projects/{self.project.id}/")

        self.assertEqual(response.status_code, 200)
        command_center = response.data.get("command_center") or {}
        self.assertIn("risk_score", command_center)
        self.assertIn("priority_issues", command_center)
        self.assertTrue(command_center["priority_issues"])
        self.assertEqual(command_center["priority_issues"][0]["title"], "Unassigned urgent issue")
        self.assertEqual(response.data.get("active_issues"), 2)

    def test_project_issue_create_accepts_assignee_and_sprint_ids(self):
        response = self.client.post(
            f"/api/agile/projects/{self.project.id}/issues/",
            {
                "title": "Assigned sprint issue",
                "description": "Should retain assignee and sprint.",
                "priority": "highest",
                "assignee_id": self.member.id,
                "sprint_id": self.sprint.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        issue = Issue.objects.get(id=response.data["id"])
        self.assertEqual(issue.assignee_id, self.member.id)
        self.assertEqual(issue.sprint_id, self.sprint.id)
        self.assertEqual(issue.priority, "highest")

    def test_project_issue_create_rejects_cross_org_assignment_and_sprint(self):
        response = self.client.post(
            f"/api/agile/projects/{self.project.id}/issues/",
            {
                "title": "Cross org assignee",
                "assignee_id": self.other_member.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"], "Invalid assignee_id for this organization")

        response = self.client.post(
            f"/api/agile/projects/{self.project.id}/issues/",
            {
                "title": "Cross org sprint",
                "sprint_id": self.other_sprint.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"], "Invalid sprint_id for this project")

    def test_move_issue_rejects_cross_org_column(self):
        response = self.client.post(
            f"/api/agile/issues/{self.issue.id}/move/",
            {
                "column_id": self.other_column.id,
                "status": "in_progress",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 404)

    def test_add_comment_rejects_cross_org_issue_lookup(self):
        other_issue = Issue.objects.create(
            organization=self.other_org,
            project=self.other_project,
            board=self.other_board,
            column=self.other_column,
            key="OP-1",
            title="Other issue",
            reporter=self.other_member,
            status="todo",
        )

        response = self.client.post(
            f"/api/agile/issues/{other_issue.id}/comments/",
            {
                "content": "Cross-org comment",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 404)
