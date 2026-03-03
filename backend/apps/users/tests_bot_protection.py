from unittest.mock import patch

from django.test import RequestFactory, SimpleTestCase, override_settings

from apps.users.bot_protection import verify_turnstile_token


class TurnstileVerificationTests(SimpleTestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.request = self.factory.post("/api/auth/login/")

    @override_settings(TURNSTILE_ENABLED=False)
    def test_verification_skips_when_disabled(self):
        ok, message = verify_turnstile_token(self.request, token=None)
        self.assertTrue(ok)
        self.assertIsNone(message)

    @override_settings(TURNSTILE_ENABLED=True, TURNSTILE_SECRET_KEY="secret")
    @patch("apps.users.bot_protection.requests.post")
    def test_verification_succeeds(self, mock_post):
        mock_post.return_value.ok = True
        mock_post.return_value.json.return_value = {"success": True}
        ok, message = verify_turnstile_token(self.request, token="token-123")
        self.assertTrue(ok)
        self.assertIsNone(message)

    @override_settings(TURNSTILE_ENABLED=True, TURNSTILE_SECRET_KEY="secret")
    @patch("apps.users.bot_protection.requests.post")
    def test_verification_fails(self, mock_post):
        mock_post.return_value.ok = True
        mock_post.return_value.json.return_value = {"success": False}
        ok, message = verify_turnstile_token(self.request, token="token-123")
        self.assertFalse(ok)
        self.assertTrue(isinstance(message, str))
