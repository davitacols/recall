import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)


def _client_ip(request):
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    if xff:
        return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def _is_loopback_host(hostname):
    normalized = (hostname or "").strip().lower().strip("[]")
    if not normalized:
        return False
    return normalized in {"localhost", "127.0.0.1", "::1", "0.0.0.0"} or normalized.endswith(".localhost")


def _request_targets_local_backend(request):
    host_header = (request.get_host() or "").split(":", 1)[0]
    return _is_loopback_host(host_header)


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

    # Keep localhost development usable even when prod-like env vars leak into
    # a developer shell. Only bypass when the backend itself is being served on
    # a loopback host, so hosted environments still enforce Turnstile.
    if _request_targets_local_backend(request):
        return True, None

    # Optional controlled bypass for native mobile clients.
    # Keep disabled in production unless intentionally configured.
    allow_mobile_bypass = bool(getattr(settings, "TURNSTILE_ALLOW_MOBILE_BYPASS", False))
    mobile_bypass_token = (getattr(settings, "TURNSTILE_MOBILE_BYPASS_TOKEN", "") or "").strip()
    header_bypass_token = (request.META.get("HTTP_X_MOBILE_BYPASS_TOKEN", "") or "").strip()
    if allow_mobile_bypass and mobile_bypass_token and (
        token == mobile_bypass_token or header_bypass_token == mobile_bypass_token
    ):
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
