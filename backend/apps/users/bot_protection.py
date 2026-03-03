import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)


def _client_ip(request):
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    if xff:
        return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def verify_turnstile_token(request, token):
    """
    Verify Cloudflare Turnstile token.
    Returns (ok: bool, message: str|None)
    """
    enabled = bool(getattr(settings, "TURNSTILE_ENABLED", False))
    secret_key = (getattr(settings, "TURNSTILE_SECRET_KEY", "") or "").strip()
    verify_url = getattr(
        settings,
        "TURNSTILE_VERIFY_URL",
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    )

    if not enabled:
        return True, None
    if not secret_key:
        logger.warning("TURNSTILE_ENABLED is true but TURNSTILE_SECRET_KEY is not configured")
        return False, "Bot protection is temporarily unavailable."
    if not token:
        return False, "Bot verification is required."

    payload = {
        "secret": secret_key,
        "response": token,
        "remoteip": _client_ip(request),
    }
    try:
        response = requests.post(verify_url, data=payload, timeout=5)
        data = response.json() if response.ok else {}
    except Exception:
        logger.exception("Turnstile verification request failed")
        return False, "Bot verification failed. Please try again."

    if not data.get("success", False):
        return False, "Bot verification failed. Please try again."
    return True, None
