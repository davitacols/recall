"""Diagnose the Claude/Anthropic LLM connection used by Ask Recall.

Usage:
    python manage.py check_llm
    python manage.py check_llm --model claude-sonnet-4-6

Prints whether the API key is configured and whether a minimal live request
succeeds, with an actionable reason when it does not. Designed to isolate the
common Ask Recall failure modes (missing key, bad key, no network egress,
timeout) without touching the rest of the stack.
"""

import time

from django.conf import settings
from django.core.management.base import BaseCommand

try:
    import anthropic
except Exception:  # pragma: no cover - import guard
    anthropic = None


def _resolve_key():
    return (
        (getattr(settings, "ANTHROPIC_API_KEY", "") or "").strip()
        or (getattr(settings, "CLAUDE_API_KEY", "") or "").strip()
    )


def _mask(key):
    if not key:
        return "(none)"
    if len(key) <= 12:
        return "****"
    return f"{key[:7]}…{key[-4:]} ({len(key)} chars)"


class Command(BaseCommand):
    help = "Check that the Anthropic/Claude API used by Ask Recall is reachable and authorized."

    def add_arguments(self, parser):
        parser.add_argument("--model", default=None, help="Override the model id to test.")
        parser.add_argument("--timeout", type=float, default=20.0, help="Request timeout in seconds.")

    def handle(self, *args, **opts):
        ok = self.style.SUCCESS
        warn = self.style.WARNING
        bad = self.style.ERROR

        if anthropic is None:
            self.stdout.write(bad("FAIL  The 'anthropic' package is not installed in this environment."))
            self.stdout.write("      Fix: pip install anthropic")
            return

        key = _resolve_key()
        model = opts["model"] or (getattr(settings, "CLAUDE_MODEL", "") or "").strip() or "claude-sonnet-4-6"

        self.stdout.write("Ask Recall LLM check")
        self.stdout.write("--------------------")
        self.stdout.write(f"  SDK version : {getattr(anthropic, '__version__', 'unknown')}")
        self.stdout.write(f"  API key     : {_mask(key)}")
        self.stdout.write(f"  Model       : {model}")
        self.stdout.write(f"  Timeout     : {opts['timeout']}s")
        self.stdout.write("")

        if not key:
            self.stdout.write(bad("FAIL  No API key configured."))
            self.stdout.write("      Ask Recall will silently fall back to the rules engine.")
            self.stdout.write("      Fix: set ANTHROPIC_API_KEY (or CLAUDE_API_KEY) in the backend .env and restart.")
            return

        client = anthropic.Anthropic(api_key=key, timeout=opts["timeout"], max_retries=0)

        started = time.monotonic()
        try:
            message = client.messages.create(
                model=model,
                max_tokens=16,
                temperature=0,
                messages=[{"role": "user", "content": "Reply with the single word: pong"}],
            )
        except Exception as exc:  # noqa: BLE001 - we want to classify every failure
            elapsed = time.monotonic() - started
            self._report_failure(exc, elapsed, bad, warn)
            return

        elapsed = time.monotonic() - started
        text = "".join(
            getattr(block, "text", "") for block in getattr(message, "content", [])
            if getattr(block, "type", "") == "text"
        ).strip()
        self.stdout.write(ok(f"OK    Live response in {elapsed:.2f}s."))
        self.stdout.write(f"      Reply: {text or '(empty)'}")
        usage = getattr(message, "usage", None)
        if usage is not None:
            self.stdout.write(
                f"      Tokens: in={getattr(usage, 'input_tokens', '?')} out={getattr(usage, 'output_tokens', '?')}"
            )
        self.stdout.write("")
        self.stdout.write("Ask Recall should return grounded LLM answers normally.")

    def _report_failure(self, exc, elapsed, bad, warn):
        name = type(exc).__name__
        msg = str(exc) or repr(exc)

        # Classify the common, actionable cases.
        auth = getattr(anthropic, "AuthenticationError", ())
        conn = getattr(anthropic, "APIConnectionError", ())
        tmo = getattr(anthropic, "APITimeoutError", ())
        rate = getattr(anthropic, "RateLimitError", ())
        notfound = getattr(anthropic, "NotFoundError", ())
        status_err = getattr(anthropic, "APIStatusError", ())

        if isinstance(exc, tmo) or "timeout" in msg.lower():
            self.stdout.write(bad(f"FAIL  Request timed out after {elapsed:.1f}s ({name})."))
            self.stdout.write("      The backend likely has no outbound network to api.anthropic.com,")
            self.stdout.write("      or the API is overloaded. Check egress/proxy/firewall and retry.")
            return
        if isinstance(exc, auth):
            self.stdout.write(bad(f"FAIL  Authentication rejected ({name})."))
            self.stdout.write("      The API key is set but invalid, revoked, or for the wrong account.")
            self.stdout.write("      Fix: regenerate the key in the Anthropic console and update .env.")
            return
        if isinstance(exc, notfound):
            self.stdout.write(bad(f"FAIL  Model not found ({name}): {msg}"))
            self.stdout.write("      The CLAUDE_MODEL id is wrong or your account can't access it.")
            self.stdout.write("      Fix: set a model you have access to (e.g. claude-sonnet-4-6).")
            return
        if isinstance(exc, rate):
            self.stdout.write(warn(f"WARN  Rate limited ({name}): {msg}"))
            self.stdout.write("      The key works but is currently throttled. Retry shortly.")
            return
        if isinstance(exc, conn):
            self.stdout.write(bad(f"FAIL  Could not connect to the API ({name}) after {elapsed:.1f}s."))
            self.stdout.write("      No network egress from the backend, or DNS/proxy is blocking it.")
            self.stdout.write(f"      Detail: {msg}")
            return
        if isinstance(exc, status_err):
            code = getattr(exc, "status_code", "?")
            self.stdout.write(bad(f"FAIL  API returned HTTP {code} ({name}): {msg}"))
            return

        self.stdout.write(bad(f"FAIL  Unexpected error ({name}): {msg}"))
