from django.test import TestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.organizations.models import Organization, User
from .ml_endpoints import model_status, suggest_assignee, train_models
from .models import Board, Column, Issue, Project


class AgileMLTrainingTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.org = Organization.objects.create(name="ML Org", slug="ml-org")
        self.admin = User.objects.create_user(
            username="ml_admin",
            email="ml_admin@example.com",
            password="pass",
            organization=self.org,
            role="admin",
            full_name="ML Admin",
        )
        self.dev_a = User.objects.create_user(
            username="dev_a",
            email="dev_a@example.com",
            password="pass",
            organization=self.org,
            role="contributor",
            full_name="Dev A",
        )
        self.dev_b = User.objects.create_user(
            username="dev_b",
            email="dev_b@example.com",
            password="pass",
            organization=self.org,
            role="contributor",
            full_name="Dev B",
        )
        self.project = Project.objects.create(
            organization=self.org,
            name="ML Project",
            key="MLP",
            lead=self.admin,
        )
        self.board = Board.objects.create(organization=self.org, project=self.project, name="Board")
        self.column = Column.objects.create(board=self.board, name="Todo", order=0)

        # Historical examples for assignee + story point training
        Issue.objects.create(
            organization=self.org,
            project=self.project,
            board=self.board,
            column=self.column,
            key="MLP-1",
            title="Fix login bug in auth flow",
            description="critical auth bug in backend",
            reporter=self.admin,
            assignee=self.dev_a,
            status="done",
            story_points=3,
        )
        Issue.objects.create(
            organization=self.org,
            project=self.project,
            board=self.board,
            column=self.column,
            key="MLP-2",
            title="Fix OAuth callback bug",
            description="bug in login redirect and token parse",
            reporter=self.admin,
            assignee=self.dev_a,
            status="done",
            story_points=2,
        )
        Issue.objects.create(
            organization=self.org,
            project=self.project,
            board=self.board,
            column=self.column,
            key="MLP-3",
            title="Build dashboard analytics charts",
            description="new frontend charts for sprint velocity",
            reporter=self.admin,
            assignee=self.dev_b,
            status="done",
            story_points=5,
        )

    def test_admin_can_train_and_status_reports_metadata(self):
        request = self.factory.post("/api/agile/ml/train/", {}, format="json")
        force_authenticate(request, user=self.admin)
        response = train_models(request)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data.get("trained"))
        self.assertGreaterEqual(response.data.get("metadata", {}).get("issue_count", 0), 3)

        status_request = self.factory.get("/api/agile/ml/model-status/")
        force_authenticate(status_request, user=self.admin)
        status_response = model_status(status_request)
        self.assertEqual(status_response.status_code, 200)
        self.assertTrue(status_response.data.get("trained"))
        self.assertIn("trained_at", status_response.data.get("metadata", {}))

    def test_suggest_assignee_uses_trained_model_after_training(self):
        train_request = self.factory.post("/api/agile/ml/train/", {}, format="json")
        force_authenticate(train_request, user=self.admin)
        train_models(train_request)

        suggest_request = self.factory.post(
            "/api/agile/ml/suggest-assignee/",
            {
                "title": "Login bug on OAuth callback",
                "description": "auth bug breaks login redirect",
                "project_id": self.project.id,
            },
            format="json",
        )
        force_authenticate(suggest_request, user=self.admin)
        response = suggest_assignee(suggest_request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data.get("model_source"), "trained")
