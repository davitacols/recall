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
