import uuid

from django.conf import settings
from django.http import JsonResponse


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
        return response
