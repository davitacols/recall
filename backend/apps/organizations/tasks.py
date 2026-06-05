"""Celery tasks for the organizations app."""

from __future__ import annotations

import logging
from datetime import timedelta

from celery import shared_task
from django.db.models import Q
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task
def webhook_retry_sweep():
    """Retry deliveries that didn't succeed.

    Retry policy (cumulative backoff measured from the last attempt):
      attempt 1 → 30s
      attempt 2 →  5m
      attempt 3 → 30m

    Anything still failing after 3 attempts is marked `failed` and never
    re-tried. We cap the per-sweep batch at 100 deliveries so this stays cheap.
    """
    from apps.organizations.webhook_models import (
        WebhookDelivery,
        _do_post,
    )

    now = timezone.now()
    backoffs = {1: timedelta(seconds=30), 2: timedelta(minutes=5), 3: timedelta(minutes=30)}

    candidates = WebhookDelivery.objects.filter(
        Q(status="retrying") | Q(status="queued"),
        attempt__lt=3,
    ).select_related("subscription").order_by("created_at")[:100]

    retried = 0
    for delivery in candidates:
        next_attempt = delivery.attempt + 1
        wait = backoffs.get(next_attempt, timedelta(minutes=30))
        last = delivery.last_attempt_at or delivery.created_at
        if last and (now - last) < wait:
            continue
        if not delivery.subscription.is_active:
            delivery.status = "failed"
            delivery.error = "Subscription disabled"
            delivery.save(update_fields=["status", "error"])
            continue
        try:
            _do_post(delivery.subscription, delivery)
            retried += 1
        except Exception as exc:  # pragma: no cover - defensive
            logger.warning("webhook retry sweep: delivery %s failed: %s", delivery.id, exc)

    return {"considered": candidates.count(), "retried": retried}


@shared_task
def disable_failing_webhooks(threshold: int = 25):
    """Park subscriptions whose `fail_count` has crossed the threshold.

    A receiver that's been broken for hundreds of fires is almost certainly
    gone — keep hammering it and we burn capacity. Once disabled, an admin
    must explicitly toggle the subscription back on.
    """
    from apps.organizations.webhook_models import WebhookSubscription
    qs = WebhookSubscription.objects.filter(is_active=True, fail_count__gte=threshold)
    disabled = list(qs.values_list("id", flat=True))
    qs.update(is_active=False)
    if disabled:
        logger.info("Disabled %d webhook subscriptions after %d consecutive failures", len(disabled), threshold)
    return {"disabled": disabled}
