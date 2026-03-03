from django.http import JsonResponse
from django.test import RequestFactory, SimpleTestCase, override_settings

from config.security_middleware import RequestSecurityMiddleware


class RequestSecurityMiddlewareTests(SimpleTestCase):
    def setUp(self):
        self.factory = RequestFactory()

    @override_settings(API_MAX_BODY_SIZE_BYTES=10)
    def test_blocks_oversized_api_requests(self):
        middleware = RequestSecurityMiddleware(lambda request: JsonResponse({"ok": True}))
        request = self.factory.post("/api/test", data="x")
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
