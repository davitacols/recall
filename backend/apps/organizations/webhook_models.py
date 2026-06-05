"""Outbound webhooks.

Orgs can subscribe to workspace events (decision approved, prediction logged,
agent run completed, …) and have Knoledgr POST a signed payload to a URL of
their choice. This turns Knoledgr from a tool you log into into a platform
other tools can react to.

Design:
- `WebhookSubscription` — one row per (org, event, url). Has a shared secret
  used for HMAC-SHA256 signatures so the receiver can verify the payload.
- `WebhookDelivery` — every fire becomes a row. Records attempt count, response
  status, response body (first 1KB), and the next retry time.

Signing scheme:
- Each request carries `X-Knoledgr-Signature: sha256=<hex>` computed over the
  raw JSON body using the subscription's `secret`. Receivers should reject
  any mismatched signature.

Retries: 3 attempts with backoff 30s / 5m / 30m. Failures past attempt 3 are
recorded but not retried.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
from typing import Iterable

import requests
from django.db import models
from django.utils import timezone

from apps.organizations.models import Organization

logger = logging.getLogger(__name__)

# Supported event names — kept as constants so callers don't typo strings.
EVENT_DECISION_CREATED = "decision.created"
EVENT_DECISION_STATUS_CHANGED = "decision.status_changed"
EVENT_PREDICTION_LOGGED = "decision.prediction_logged"
EVENT_OUTCOME_LOGGED = "decision.outcome_logged"
EVENT_RETRO_OPENED = "decision.retro_opened"
EVENT_AGENT_RUN_COMPLETED = "agent.run_completed"
EVENT_AGENT_RUN_AWAITING_APPROVAL = "agent.run_awaiting_approval"
EVENT_ISSUE_CREATED = "issue.created"

ALL_EVENTS = [
    EVENT_DECISION_CREATED,
    EVENT_DECISION_STATUS_CHANGED,
    EVENT_PREDICTION_LOGGED,
    EVENT_OUTCOME_LOGGED,
    EVENT_RETRO_OPENED,
    EVENT_AGENT_RUN_COMPLETED,
    EVENT_AGENT_RUN_AWAITING_APPROVAL,
    EVENT_ISSUE_CREATED,
]


def _new_secret() -> str:
    import secrets as _secrets
    return _secrets.token_urlsafe(32)


class WebhookSubscription(models.Model):
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="webhook_subscriptions"
    )
    url = models.URLField(max_length=1024)
    event = models.CharField(max_length=64, db_index=True)

    # Shared secret used to sign payloads. Created automatically.
    secret = models.CharField(max_length=128, default=_new_secret)

    is_active = models.BooleanField(default=True)
    description = models.CharField(max_length=255, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_fired_at = models.DateTimeField(null=True, blank=True)
    fail_count = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "webhook_subscriptions"
        indexes = [
            models.Index(fields=["organization", "event"]),
        ]


class WebhookDelivery(models.Model):
    STATUS_CHOICES = [
        ("queued", "Queued"),
        ("succeeded", "Succeeded"),
        ("failed", "Failed"),
        ("retrying", "Retrying"),
    ]

    subscription = models.ForeignKey(
        WebhookSubscription, on_delete=models.CASCADE, related_name="deliveries"
    )
    event = models.CharField(max_length=64, db_index=True)
    payload = models.JSONField(default=dict, blank=True)

    attempt = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default="queued", db_index=True)
    response_status = models.PositiveIntegerField(null=True, blank=True)
    response_body = models.CharField(max_length=1024, blank=True)
    error = models.CharField(max_length=512, blank=True)

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    last_attempt_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "webhook_deliveries"
        ordering = ["-created_at"]


# ----------------------------------------------------------------------------
# Dispatch
# ----------------------------------------------------------------------------

def _sign(body: bytes, secret: str) -> str:
    digest = hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()
    return f"sha256={digest}"


def _do_post(subscription: WebhookSubscription, delivery: WebhookDelivery):
    body = json.dumps(delivery.payload, default=str).encode("utf-8")
    sig = _sign(body, subscription.secret)
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Knoledgr-Webhooks/1.0",
        "X-Knoledgr-Event": delivery.event,
        "X-Knoledgr-Delivery": str(delivery.id),
        "X-Knoledgr-Signature": sig,
    }
    delivery.attempt += 1
    delivery.last_attempt_at = timezone.now()
    try:
        resp = requests.post(subscription.url, data=body, headers=headers, timeout=10)
        delivery.response_status = resp.status_code
        delivery.response_body = (resp.text or "")[:1024]
        if 200 <= resp.status_code < 300:
            delivery.status = "succeeded"
            subscription.last_fired_at = timezone.now()
            subscription.fail_count = 0
        else:
            delivery.status = "retrying" if delivery.attempt < 3 else "failed"
            subscription.fail_count += 1
    except Exception as exc:
        delivery.error = str(exc)[:512]
        delivery.status = "retrying" if delivery.attempt < 3 else "failed"
        subscription.fail_count += 1
    delivery.save(update_fields=["attempt", "last_attempt_at", "status",
                                  "response_status", "response_body", "error"])
    subscription.save(update_fields=["last_fired_at", "fail_count"])


def dispatch(*, organization, event: str, payload: dict, subscriptions: Iterable | None = None):
    """Fan a workspace event out to every active subscription.

    Best-effort, synchronous. Failures are recorded as WebhookDelivery rows
    so a Celery task can retry. Returns the count of subscriptions fired.
    """
    if not organization or event not in ALL_EVENTS:
        return 0
    qs = subscriptions if subscriptions is not None else (
        WebhookSubscription.objects.filter(
            organization=organization, event=event, is_active=True
        )
    )
    count = 0
    for sub in qs:
        try:
            delivery = WebhookDelivery.objects.create(
                subscription=sub, event=event, payload=payload, status="queued"
            )
            _do_post(sub, delivery)
            count += 1
        except Exception as exc:  # pragma: no cover - defensive
            logger.warning("dispatch %s to sub %s failed: %s", event, sub.id, exc)
    return count
