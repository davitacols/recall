from django.test import TestCase
from rest_framework.test import APIClient

from apps.organizations.models import Organization, User, UserFeedback


class UserFeedbackTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.staff_client = APIClient()
        self.admin_client = APIClient()
        self.contributor_client = APIClient()

        self.org = Organization.objects.create(name="Feedback Org", slug="feedback-org")
        self.staff_admin = User.objects.create_user(
            username="feedback_staff",
            email="staff@feedback.test",
            password="pass1234",
            organization=self.org,
            role="admin",
            full_name="Feedback Staff",
            is_staff=True,
        )
        self.admin = User.objects.create_user(
            username="feedback_admin",
            email="admin@feedback.test",
            password="pass1234",
            organization=self.org,
            role="admin",
            full_name="Feedback Admin",
        )
        self.contributor = User.objects.create_user(
            username="feedback_contributor",
            email="contrib@feedback.test",
            password="pass1234",
            organization=self.org,
            role="contributor",
            full_name="Feedback Contributor",
        )

        self.staff_client.force_authenticate(user=self.staff_admin)
        self.admin_client.force_authenticate(user=self.admin)
        self.contributor_client.force_authenticate(user=self.contributor)

    def test_public_user_can_submit_feedback(self):
        response = self.client.post(
            "/api/organizations/feedback/",
            {
                "full_name": "Ada Lovelace",
                "email": "ada@example.com",
                "company_name": "Analytical Labs",
                "role_title": "Founder",
                "feedback_type": "feature",
                "sentiment": "friction",
                "rating": 3,
                "current_page": "/docs",
                "message": "Please add deeper API examples and screenshots to the docs pages for setup and enterprise.",
                "consent_to_contact": True,
                "fax_number": "",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(UserFeedback.objects.count(), 1)
        item = UserFeedback.objects.get()
        self.assertEqual(item.feedback_type, "feature")
        self.assertEqual(item.status, "new")
        self.assertEqual(item.rating, 3)

    def test_authenticated_user_feedback_inherits_org_context(self):
        response = self.admin_client.post(
            "/api/organizations/feedback/",
            {
                "feedback_type": "bug",
                "sentiment": "friction",
                "rating": 2,
                "current_page": "/ask",
                "message": "Ask Recall sometimes says evidence is empty even when a sprint name exists in the workspace.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        item = UserFeedback.objects.get()
        self.assertEqual(item.organization, self.org)
        self.assertEqual(item.submitted_by, self.admin)
        self.assertEqual(item.email, self.admin.email)

    def test_duplicate_feedback_returns_existing_record_message(self):
        UserFeedback.objects.create(
            full_name="Ada Lovelace",
            email="ada@example.com",
            company_name="Analytical Labs",
            feedback_type="feature",
            sentiment="friction",
            rating=3,
            message="Please add deeper API examples and screenshots to the docs pages for setup and enterprise.",
            consent_to_contact=True,
        )

        response = self.client.post(
            "/api/organizations/feedback/",
            {
                "full_name": "Ada Lovelace",
                "email": "ada@example.com",
                "feedback_type": "feature",
                "sentiment": "friction",
                "rating": 3,
                "message": "Please add deeper API examples and screenshots to the docs pages for setup and enterprise.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(UserFeedback.objects.count(), 1)
        self.assertIn("already have this feedback", response.data["message"])

    def test_staff_admin_can_list_feedback(self):
        item = UserFeedback.objects.create(
            full_name="Jamie Operator",
            email="jamie@example.com",
            company_name="Ops Studio",
            feedback_type="general",
            sentiment="positive",
            rating=5,
            message="The new dashboard is much calmer and easier to understand.",
        )

        response = self.staff_client.get("/api/organizations/feedback/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], item.id)

    def test_staff_admin_can_assign_owner_and_resolve_feedback(self):
        item = UserFeedback.objects.create(
            full_name="Taylor Builder",
            email="taylor@example.com",
            company_name="Builder Labs",
            feedback_type="bug",
            sentiment="friction",
            rating=2,
            message="The public homepage keeps refreshing on load for some users.",
        )

        response = self.staff_client.put(
            f"/api/organizations/feedback/{item.id}/",
            {
                "status": "resolved",
                "assign_to_me": True,
                "internal_notes": "Confirmed and fixed in homepage auth bootstrap flow.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        item.refresh_from_db()
        self.assertEqual(item.status, "resolved")
        self.assertEqual(item.owner, self.staff_admin)
        self.assertIsNotNone(item.contacted_at)
        self.assertEqual(item.internal_notes, "Confirmed and fixed in homepage auth bootstrap flow.")

    def test_workspace_admin_cannot_list_feedback(self):
        response = self.admin_client.get("/api/organizations/feedback/")

        self.assertEqual(response.status_code, 403)

    def test_contributor_cannot_list_feedback(self):
        response = self.contributor_client.get("/api/organizations/feedback/")

        self.assertEqual(response.status_code, 403)
