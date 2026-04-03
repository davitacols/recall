from datetime import date, timedelta

from django.test import TestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.organizations.models import Organization, User
from .agile_fresh import project_detail as fresh_project_detail, projects as fresh_projects
from .kanban_views import assign_issue_to_sprint, board_view
from .ml_endpoints import predict_sprint, sprint_insights, suggest_assignee
from .models import Board, Column, Component, Issue, IssueLabel, Project, Release, Sprint
from .views import project_detail, projects
from .views_missing_features import check_wip_limit, components, releases, update_release


class AgilePermissionIsolationTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()

        self.org_a = Organization.objects.create(name="Org A", slug="org-a")
        self.org_b = Organization.objects.create(name="Org B", slug="org-b")

        self.admin_a = User.objects.create_user(
            username="admin_a",
            email="admin_a@example.com",
            password="pass",
            organization=self.org_a,
            role="admin",
        )
        self.contributor_a = User.objects.create_user(
            username="contrib_a",
            email="contrib_a@example.com",
            password="pass",
            organization=self.org_a,
            role="contributor",
        )
        self.admin_b = User.objects.create_user(
            username="admin_b",
            email="admin_b@example.com",
            password="pass",
            organization=self.org_b,
            role="admin",
        )

        self.project_a = Project.objects.create(
            organization=self.org_a,
            name="Project A",
            key="PA",
            lead=self.admin_a,
        )
        self.project_b = Project.objects.create(
            organization=self.org_b,
            name="Project B",
            key="PB",
            lead=self.admin_b,
        )

        self.release_a = Release.objects.create(project=self.project_a, name="R1", version="1.0.0")
        self.release_b = Release.objects.create(project=self.project_b, name="R2", version="2.0.0")

        self.board_a = Board.objects.create(organization=self.org_a, project=self.project_a, name="Board A")
        self.board_b = Board.objects.create(organization=self.org_b, project=self.project_b, name="Board B")
        self.column_a = Column.objects.create(board=self.board_a, name="In Progress", order=1, wip_limit=3)
        self.column_b = Column.objects.create(board=self.board_b, name="In Progress", order=1, wip_limit=2)

        self.sprint_a = Sprint.objects.create(
            organization=self.org_a,
            project=self.project_a,
            name="Sprint A",
            start_date=date.today(),
            end_date=date.today() + timedelta(days=14),
            status="active",
        )
        self.sprint_b = Sprint.objects.create(
            organization=self.org_b,
            project=self.project_b,
            name="Sprint B",
            start_date=date.today(),
            end_date=date.today() + timedelta(days=14),
            status="active",
        )

        self.issue_a = Issue.objects.create(
            organization=self.org_a,
            project=self.project_a,
            board=self.board_a,
            column=self.column_a,
            key="PA-1",
            title="Issue A",
            reporter=self.admin_a,
            status="todo",
        )
        self.issue_b = Issue.objects.create(
            organization=self.org_b,
            project=self.project_b,
            board=self.board_b,
            column=self.column_b,
            key="PB-1",
            title="Issue B",
            reporter=self.admin_b,
            status="todo",
        )
        self.label_a = IssueLabel.objects.create(
            organization=self.org_a,
            name="Platform",
            color="#4F46E5",
        )
        self.label_a.issues.add(self.issue_a)
        self.issue_a.assignee = self.contributor_a
        self.issue_a.sprint = self.sprint_a
        self.issue_a.save(update_fields=["assignee", "sprint", "updated_at", "status_changed_at"])

    def test_contributor_can_read_releases_but_cannot_create(self):
        get_request = self.factory.get(f"/api/agile/projects/{self.project_a.id}/releases/")
        force_authenticate(get_request, user=self.contributor_a)
        get_response = releases(get_request, self.project_a.id)
        self.assertEqual(get_response.status_code, 200)
        self.assertEqual(len(get_response.data), 1)
        self.assertEqual(get_response.data[0]["id"], self.release_a.id)

        post_request = self.factory.post(
            f"/api/agile/projects/{self.project_a.id}/releases/",
            {"name": "R1.1", "version": "1.1.0"},
            format="json",
        )
        force_authenticate(post_request, user=self.contributor_a)
        post_response = releases(post_request, self.project_a.id)
        self.assertEqual(post_response.status_code, 403)

    def test_cross_org_release_access_is_blocked(self):
        get_request = self.factory.get(f"/api/agile/projects/{self.project_b.id}/releases/")
        force_authenticate(get_request, user=self.admin_a)
        get_response = releases(get_request, self.project_b.id)
        self.assertEqual(get_response.status_code, 404)

        patch_request = self.factory.patch(
            f"/api/agile/releases/{self.release_b.id}/",
            {"name": "Hacked"},
            format="json",
        )
        force_authenticate(patch_request, user=self.admin_a)
        patch_response = update_release(patch_request, self.release_b.id)
        self.assertEqual(patch_response.status_code, 404)

    def test_component_create_rejects_lead_from_other_org(self):
        request = self.factory.post(
            f"/api/agile/projects/{self.project_a.id}/components/",
            {"name": "Frontend", "lead_id": self.admin_b.id},
            format="json",
        )
        force_authenticate(request, user=self.admin_a)
        response = components(request, self.project_a.id)
        self.assertEqual(response.status_code, 400)
        self.assertIn("Lead user not found", str(response.data.get("error", "")))
        self.assertFalse(Component.objects.filter(project=self.project_a, name="Frontend").exists())

    def test_project_create_allows_same_org_lead_selection(self):
        request = self.factory.post(
            "/api/agile/projects/",
            {
                "name": "Ops Console",
                "description": "Operational delivery project",
                "lead_id": self.contributor_a.id,
            },
            format="json",
        )
        force_authenticate(request, user=self.admin_a)
        response = projects(request)
        self.assertEqual(response.status_code, 201)

        created = Project.objects.get(id=response.data["id"])
        self.assertEqual(created.lead_id, self.contributor_a.id)

    def test_project_create_rejects_cross_org_lead_selection(self):
        request = self.factory.post(
            "/api/agile/projects/",
            {
                "name": "Ops Console",
                "lead_id": self.admin_b.id,
            },
            format="json",
        )
        force_authenticate(request, user=self.admin_a)
        response = projects(request)
        self.assertEqual(response.status_code, 400)
        self.assertIn("Lead user not found", str(response.data.get("error", "")))

    def test_project_detail_put_updates_lead_for_admin(self):
        request = self.factory.put(
            f"/api/agile/projects/{self.project_a.id}/",
            {
                "lead_id": self.contributor_a.id,
                "description": "Updated direction",
            },
            format="json",
        )
        force_authenticate(request, user=self.admin_a)
        response = project_detail(request, self.project_a.id)
        self.assertEqual(response.status_code, 200)
        self.project_a.refresh_from_db()
        self.assertEqual(self.project_a.lead_id, self.contributor_a.id)
        self.assertEqual(self.project_a.description, "Updated direction")

    def test_project_detail_patch_updates_lead_for_admin(self):
        request = self.factory.patch(
            f"/api/agile/projects/{self.project_a.id}/",
            {
                "lead_id": self.contributor_a.id,
            },
            format="json",
        )
        force_authenticate(request, user=self.admin_a)
        response = project_detail(request, self.project_a.id)
        self.assertEqual(response.status_code, 200)
        self.project_a.refresh_from_db()
        self.assertEqual(self.project_a.lead_id, self.contributor_a.id)

    def test_fresh_project_detail_patch_updates_lead_for_admin(self):
        request = self.factory.patch(
            f"/api/agile/projects/{self.project_a.id}/",
            {
                "lead_id": self.contributor_a.id,
                "description": "Fresh route update",
            },
            format="json",
        )
        force_authenticate(request, user=self.admin_a)
        response = fresh_project_detail(request, self.project_a.id)
        self.assertEqual(response.status_code, 200)
        self.project_a.refresh_from_db()
        self.assertEqual(self.project_a.lead_id, self.contributor_a.id)
        self.assertEqual(self.project_a.description, "Fresh route update")
        self.assertEqual(response.data["lead_id"], self.contributor_a.id)
        self.assertEqual(response.data["lead_name"], self.contributor_a.get_full_name())

    def test_fresh_project_detail_rejects_cross_org_lead_selection(self):
        request = self.factory.patch(
            f"/api/agile/projects/{self.project_a.id}/",
            {
                "lead_id": self.admin_b.id,
            },
            format="json",
        )
        force_authenticate(request, user=self.admin_a)
        response = fresh_project_detail(request, self.project_a.id)
        self.assertEqual(response.status_code, 400)
        self.assertIn("Lead user not found", str(response.data.get("error", "")))

    def test_fresh_projects_list_includes_lead_fields(self):
        self.project_a.lead = self.contributor_a
        self.project_a.save(update_fields=["lead"])

        request = self.factory.get("/api/agile/projects/")
        force_authenticate(request, user=self.admin_a)
        response = fresh_projects(request)
        self.assertEqual(response.status_code, 200)

        project_payload = next(item for item in response.data if item["id"] == self.project_a.id)
        self.assertEqual(project_payload["lead_id"], self.contributor_a.id)
        self.assertEqual(project_payload["lead_name"], self.contributor_a.get_full_name())

    def test_check_wip_limit_is_org_scoped(self):
        request = self.factory.get(f"/api/agile/columns/{self.column_b.id}/wip-check/")
        force_authenticate(request, user=self.admin_a)
        response = check_wip_limit(request, self.column_b.id)
        self.assertEqual(response.status_code, 404)

        own_request = self.factory.get(f"/api/agile/columns/{self.column_a.id}/wip-check/")
        force_authenticate(own_request, user=self.admin_a)
        own_response = check_wip_limit(own_request, self.column_a.id)
        self.assertEqual(own_response.status_code, 200)
        self.assertIn("wip_limit", own_response.data)

    def test_board_view_is_org_scoped(self):
        request = self.factory.get(f"/api/agile/boards/{self.board_b.id}/")
        force_authenticate(request, user=self.admin_a)
        response = board_view(request, self.board_b.id)
        self.assertEqual(response.status_code, 404)

    def test_board_view_returns_project_metadata_and_issue_shape(self):
        request = self.factory.get(f"/api/agile/boards/{self.board_a.id}/")
        force_authenticate(request, user=self.admin_a)
        response = board_view(request, self.board_a.id)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["project_name"], self.project_a.name)
        self.assertEqual(len(response.data["columns"]), 1)
        self.assertEqual(response.data["columns"][0]["issue_count"], 1)
        self.assertEqual(len(response.data["columns"][0]["issues"]), 1)
        issue_payload = response.data["columns"][0]["issues"][0]
        self.assertEqual(issue_payload["id"], self.issue_a.id)
        self.assertEqual(issue_payload["labels"], ["Platform"])
        self.assertEqual(issue_payload["sprint"], self.sprint_a.name)

    def test_assign_issue_to_sprint_is_org_scoped(self):
        request = self.factory.post(
            f"/api/agile/issues/{self.issue_b.id}/assign-sprint/",
            {"sprint_id": self.sprint_a.id},
            format="json",
        )
        force_authenticate(request, user=self.admin_a)
        response = assign_issue_to_sprint(request, self.issue_b.id)
        self.assertEqual(response.status_code, 404)

    def test_ml_sprint_endpoints_are_org_scoped(self):
        request = self.factory.get(f"/api/agile/ml/predict-sprint/{self.sprint_b.id}/")
        force_authenticate(request, user=self.admin_a)
        response = predict_sprint(request, self.sprint_b.id)
        self.assertEqual(response.status_code, 404)

        insights_request = self.factory.get(f"/api/agile/ml/sprint-insights/{self.sprint_b.id}/")
        force_authenticate(insights_request, user=self.admin_a)
        insights_response = sprint_insights(insights_request, self.sprint_b.id)
        self.assertEqual(insights_response.status_code, 404)

    def test_ml_suggest_assignee_validates_project_org(self):
        request = self.factory.post(
            "/api/agile/ml/suggest-assignee/",
            {
                "title": "Test issue",
                "description": "desc",
                "project_id": self.project_b.id,
            },
            format="json",
        )
        force_authenticate(request, user=self.admin_a)
        response = suggest_assignee(request)
        self.assertEqual(response.status_code, 404)
