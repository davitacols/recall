"""Whether the model API is actually answering, as opposed to configured.

A configuration check cannot tell you this. The key is present and correct
while an exhausted credit balance rejects every request, so "is ANTHROPIC_API_KEY
set" answers a question nobody asked. Probing on demand is worse: the probe is
the same call that fails, so it costs money to learn that you have none.

So this records what actually happened. A call that fails for a reason that
will keep failing - credit, authentication, a disabled key - marks the
extractor unavailable with the reason. Any success clears it.

The point is to stop the interface promising something it cannot do. A landing
page whose most prominent control is a question box should not accept a
question, spin, and return an error that reads like the product is broken.
"""

from __future__ import annotations

import logging

from django.core.cache import cache

logger = logging.getLogger(__name__)

_KEY = "ai:extractor-unavailable"

#: Long enough to cover a billing problem nobody is watching for, short enough
#: that a transient outage clears itself rather than showing a stale warning
#: after someone tops the balance back up.
_TTL_SECONDS = 60 * 60 * 6

#: Failures worth surfacing. A timeout or a 500 from the provider is worth a
#: retry and will clear on its own; these will not, and the person needs to be
#: told rather than left guessing at an error message.
_PERSISTENT_MARKERS = (
    "credit balance",
    "billing",
    "quota",
    "authentication_error",
    "invalid x-api-key",
    "permission_error",
    "account is not active",
)


def _is_persistent(reason: str) -> bool:
    lowered = str(reason or "").lower()
    return any(marker in lowered for marker in _PERSISTENT_MARKERS)


def record_failure(reason: str) -> None:
    """Note a model call that failed in a way that will keep failing."""
    if not _is_persistent(reason):
        return
    cache.set(_KEY, {"reason": _summarise(reason)}, timeout=_TTL_SECONDS)
    logger.warning("Model API marked unavailable: %s", _summarise(reason))


def record_success() -> None:
    """Any answer at all means it is working again."""
    cache.delete(_KEY)


def get_state() -> dict:
    """{'available': bool, 'reason': str} for the interface to read."""
    state = cache.get(_KEY)
    if not state:
        return {"available": True, "reason": ""}
    return {"available": False, "reason": state.get("reason", "")}


def _summarise(reason: str) -> str:
    """A sentence a person can act on, not a stack trace."""
    lowered = str(reason or "").lower()
    if "credit balance" in lowered or "billing" in lowered or "quota" in lowered:
        return "The AI credit balance is exhausted."
    if "authentication" in lowered or "invalid x-api-key" in lowered:
        return "The AI API key is not being accepted."
    if "permission" in lowered or "not active" in lowered:
        return "The AI account is not active."
    return "The AI service is not responding."
