"""CRUD for outbound webhook subscriptions."""

from __future__ import annotations

import logging

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.organizations.safety import user_org_or_400
from apps.organizations.webhook_models import (
    ALL_EVENTS,
    WebhookDelivery,
    WebhookSubscription,
)

logger = logging.getLogger(__name__)


def _serialize_subscription(sub, *, reveal_secret: bool = False):
    return {
        "id": sub.id,
        "url": sub.url,
        "event": sub.event,
        "is_active": sub.is_active,
        "description": sub.description,
        "fail_count": sub.fail_count,
        "last_fired_at": sub.last_fired_at.isoformat() if sub.last_fired_at else None,
        "created_at": sub.created_at.isoformat() if sub.created_at else None,
        "secret": sub.secret if reveal_secret else None,
    }


def _require_admin(request):
    role = getattr(request.user, "role", "")
    if role not in {"admin", "manager"}:
        return Response({"error": "Only admins or managers can manage webhooks"}, status=403)
    return None


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def webhook_subscriptions(request):
    org, err = user_org_or_400(request)
    if err:
        return err
    err = _require_admin(request)
    if err:
        return err

    if request.method == "GET":
        qs = org.webhook_subscriptions.all().order_by("-created_at")
        return Response({
            "available_events": ALL_EVENTS,
            "results": [_serialize_subscription(s) for s in qs],
        })

    data = request.data or {}
    url = (data.get("url") or "").strip()
    event = (data.get("event") or "").strip()
    description = (data.get("description") or "").strip()[:255]
    if not url or not event:
        return Response({"error": "url and event are required"}, status=400)
    if event not in ALL_EVENTS:
        return Response({
            "error": "Unknown event",
            "available_events": ALL_EVENTS,
        }, status=400)

    sub = WebhookSubscription.objects.create(
        organization=org,
        url=url,
        event=event,
        description=description,
    )
    # Return the secret once — the caller needs it to verify signatures and
    # we never reveal it on subsequent reads.
    return Response(_serialize_subscription(sub, reveal_secret=True), status=201)


@api_view(["PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def webhook_subscription_detail(request, subscription_id):
    org, err = user_org_or_400(request)
    if err:
        return err
    err = _require_admin(request)
    if err:
        return err

    sub = WebhookSubscription.objects.filter(organization=org, id=subscription_id).first()
    if not sub:
        return Response({"error": "Webhook subscription not found"}, status=404)

    if request.method == "DELETE":
        sub.delete()
        return Response(status=204)

    data = request.data or {}
    if "is_active" in data:
        sub.is_active = bool(data["is_active"])
    if "description" in data:
        sub.description = str(data["description"] or "")[:255]
    if "url" in data and data["url"]:
        sub.url = str(data["url"])[:1024]
    sub.save()
    return Response(_serialize_subscription(sub))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def webhook_deliveries(request, subscription_id):
    """Recent delivery attempts for a subscription — admin-readable audit trail."""
    org, err = user_org_or_400(request)
    if err:
        return err
    err = _require_admin(request)
    if err:
        return err
    sub = WebhookSubscription.objects.filter(organization=org, id=subscription_id).first()
    if not sub:
        return Response({"error": "Webhook subscription not found"}, status=404)
    deliveries = WebhookDelivery.objects.filter(subscription=sub).order_by("-created_at")[:50]
    return Response({
        "results": [
            {
                "id": d.id, "event": d.event, "attempt": d.attempt,
                "status": d.status, "response_status": d.response_status,
                "response_body": d.response_body, "error": d.error,
                "created_at": d.created_at.isoformat() if d.created_at else None,
                "last_attempt_at": d.last_attempt_at.isoformat() if d.last_attempt_at else None,
            }
            for d in deliveries
        ],
    })
