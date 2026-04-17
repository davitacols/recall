import uuid

from django.conf import settings
from django.http import JsonResponse
from django.middleware.security import SecurityMiddleware


def _is_loopback_host(hostname):
    normalized = (hostname or "").strip().lower().strip("[]")
    if not normalized:
        return False
    return normalized in {"localhost", "127.0.0.1", "::1", "0.0.0.0"} or normalized.endswith(".localhost")


class LocalDevelopmentSecurityMiddleware(SecurityMiddleware):
    """
    Keep Django's security headers/redirect behavior, but avoid forcing HTTPS
    for loopback hosts so local development still works when prod-like env vars
    leak into the shell.
    """

    def process_request(self, request):
        host = request.META.get("HTTP_HOST", "")
        host_name = host.split(":", 1)[0]
        if _is_loopback_host(host_name):
            return None
        return super().process_request(request)


class RequestSecurityMiddleware:
    """
    Adds a request correlation id and enforces a hard cap on request body size
    for API routes before request parsing.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        request.request_id = request_id

        if request.path.startswith("/api/"):
            content_length = request.META.get("CONTENT_LENGTH")
            if content_length:
                try:
                    content_length_int = int(content_length)
                except (TypeError, ValueError):
                    content_length_int = 0
                max_body = int(getattr(settings, "API_MAX_BODY_SIZE_BYTES", 10485760))
                if content_length_int > max_body:
                    response = JsonResponse(
                        {"error": "Request body too large"},
                        status=413,
                    )
                    response["X-Request-ID"] = request_id
                    return response

        response = self.get_response(request)
        response["X-Request-ID"] = request_id
        response.setdefault(
            "Permissions-Policy",
            getattr(
                settings,
                "SECURITY_PERMISSIONS_POLICY",
                "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
            ),
        )
        if bool(getattr(settings, "SECURITY_ENABLE_CSP", False)):
            csp_header = (
                "Content-Security-Policy-Report-Only"
                if bool(getattr(settings, "SECURITY_CSP_REPORT_ONLY", True))
                else "Content-Security-Policy"
            )
            response.setdefault(
                csp_header,
                getattr(settings, "SECURITY_CSP_POLICY", "default-src 'self'"),
            )
        return response
