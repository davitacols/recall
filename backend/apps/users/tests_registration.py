from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIRequestFactory

from apps.organizations.models import Organization
from apps.users.views import google_login, register


User = get_user_model()


@override_settings(TURNSTILE_ENABLED=False)
class RegistrationPolicyTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()

    @patch("apps.users.views.send_welcome_email")
    def test_register_allows_free_email_for_new_workspace(self, mock_send_welcome_email):
        request = self.factory.post(
            "/api/auth/register/",
            {
                "email": "founder@gmail.com",
                "password": "Password1",
                "organization": "Small Shop",
                "full_name": "Small Shop Founder",
            },
            format="json",
        )

        response = register(request)

        self.assertEqual(response.status_code, 201)
        user = User.objects.get(email="founder@gmail.com")
        self.assertEqual(user.organization.name, "Small Shop")
        self.assertTrue(user.check_password("Password1"))
        mock_send_welcome_email.assert_called_once()

    @override_settings(GOOGLE_OAUTH_ENABLED=True, GOOGLE_CLIENT_ID="test-google-client-id")
    @patch("apps.users.views._log_auth_audit")
    @patch("apps.users.views.send_welcome_email")
    @patch("apps.users.views.google_requests")
    @patch("apps.users.views.google_id_token")
    def test_google_signup_creates_workspace_for_new_personal_email(
        self,
        mock_google_id_token,
        mock_google_requests,
        mock_send_welcome_email,
        mock_log_auth_audit,
    ):
        mock_google_id_token.verify_oauth2_token.return_value = {
            "iss": "https://accounts.google.com",
            "email": "owner@gmail.com",
            "email_verified": True,
            "name": "Owner Name",
            "picture": "https://example.com/avatar.png",
            "sub": "google-sub-123",
        }
        mock_google_requests.Request.return_value = object()

        request = self.factory.post(
            "/api/auth/google/",
            {
                "credential": "google-jwt",
                "organization": "Corner Bakery",
            },
            format="json",
        )

        response = google_login(request)

        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.data["created_workspace"])
        self.assertIn("access_token", response.data)

        user = User.objects.get(email="owner@gmail.com")
        self.assertEqual(user.organization.name, "Corner Bakery")
        self.assertFalse(user.has_usable_password())
        self.assertEqual(user.avatar_url, "https://example.com/avatar.png")
        mock_send_welcome_email.assert_called_once_with(user)
        mock_log_auth_audit.assert_called_once()

    @override_settings(GOOGLE_OAUTH_ENABLED=True, GOOGLE_CLIENT_ID="test-google-client-id")
    @patch("apps.users.views.google_requests")
    @patch("apps.users.views.google_id_token")
    def test_google_signup_requires_organization_name_for_new_account(
        self,
        mock_google_id_token,
        mock_google_requests,
    ):
        mock_google_id_token.verify_oauth2_token.return_value = {
            "iss": "https://accounts.google.com",
            "email": "solo@gmail.com",
            "email_verified": True,
            "name": "Solo Owner",
            "sub": "google-sub-456",
        }
        mock_google_requests.Request.return_value = object()

        request = self.factory.post(
            "/api/auth/google/",
            {
                "credential": "google-jwt",
            },
            format="json",
        )

        response = google_login(request)

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.data["error"],
            "Enter an organization name to create your workspace with Google.",
        )
        self.assertFalse(Organization.objects.filter(name="Solo Owner").exists())
