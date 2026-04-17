from django.http import JsonResponse
from django.test import RequestFactory, SimpleTestCase, override_settings

from config.security_middleware import (
    LocalDevelopmentSecurityMiddleware,
    RequestSecurityMiddleware,
)


class RequestSecurityMiddlewareTests(SimpleTestCase):
    def setUp(self):
        self.factory = RequestFactory()

    @override_settings(API_MAX_BODY_SIZE_BYTES=10)
    def test_blocks_oversized_api_requests(self):
        middleware = RequestSecurityMiddleware(lambda request: JsonResponse({"ok": True}))
        request = self.factory.post("/api/test", data={"value": "x"})
        request.META["CONTENT_LENGTH"] = "11"

        response = middleware(request)

        self.assertEqual(response.status_code, 413)
        self.assertIn("X-Request-ID", response)

    def test_adds_request_id_header(self):
        middleware = RequestSecurityMiddleware(lambda request: JsonResponse({"ok": True}))
        request = self.factory.get("/api/health/")

        response = middleware(request)

        self.assertEqual(response.status_code, 200)
        self.assertIn("X-Request-ID", response)


class LocalDevelopmentSecurityMiddlewareTests(SimpleTestCase):
    def setUp(self):
        self.factory = RequestFactory()

    @override_settings(SECURE_SSL_REDIRECT=True, ALLOWED_HOSTS=["localhost", "testserver"])
    def test_skips_https_redirect_for_localhost(self):
        middleware = LocalDevelopmentSecurityMiddleware(lambda request: JsonResponse({"ok": True}))
        request = self.factory.post("/api/auth/login/", HTTP_HOST="localhost:8000")

        response = middleware(request)

        self.assertEqual(response.status_code, 200)

    @override_settings(SECURE_SSL_REDIRECT=True, ALLOWED_HOSTS=["api.example.com", "testserver"])
    def test_preserves_https_redirect_for_non_local_hosts(self):
        middleware = LocalDevelopmentSecurityMiddleware(lambda request: JsonResponse({"ok": True}))
        request = self.factory.post("/api/auth/login/", HTTP_HOST="api.example.com")

        response = middleware(request)

        self.assertEqual(response.status_code, 301)
        self.assertEqual(response["Location"], "https://api.example.com/api/auth/login/")
