"""GDPR-style 'export everything I have on this user' endpoint.

Returns a downloadable JSON archive of every workspace record authored by,
assigned to, or directly about the requesting user. Designed to satisfy the
right-to-data-portability requirement and to give power users a way to audit
their own footprint.

Endpoint:
    GET /api/auth/me/export/

Response:
    application/json; download
"""

from __future__ import annotations

import json
import logging

from django.http import HttpResponse
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

logger = logging.getLogger(__name__)


def _safe(qs, mapper, *, limit=2000):
    """Serialize a queryset slice, swallowing per-row mapper errors."""
    out = []
    try:
        for row in qs[:limit]:
            try:
                out.append(mapper(row))
            except Exception as exc:  # pragma: no cover - defensive
                logger.warning("Export row failed (%s): %s", type(row).__name__, exc)
    except Exception as exc:
        logger.warning("Export queryset failed: %s", exc)
    return out


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def export_my_data(request):
    user = request.user
    payload = {
        "generated_at": timezone.now().isoformat(),
        "user": {
            "id": user.id,
            "email": getattr(user, "email", ""),
            "username": getattr(user, "username", ""),
            "full_name": getattr(user, "full_name", "") or "",
            "role": getattr(user, "role", ""),
            "organization": {
                "id": getattr(user.organization, "id", None) if getattr(user, "organization", None) else None,
                "name": getattr(user.organization, "name", "") if getattr(user, "organization", None) else "",
                "slug": getattr(user.organization, "slug", "") if getattr(user, "organization", None) else "",
            },
            "created_at": user.date_joined.isoformat() if getattr(user, "date_joined", None) else None,
        },
    }

    # ---- decisions made / authored ----
    try:
        from apps.decisions.models import Decision
        payload["decisions_made"] = _safe(
            Decision.objects.filter(decision_maker=user).order_by("-created_at"),
            lambda d: {
                "id": d.id, "title": d.title, "status": d.status, "impact_level": d.impact_level,
                "created_at": d.created_at.isoformat() if d.created_at else None,
            },
        )
    except Exception as exc:
        logger.warning("export decisions failed: %s", exc)

    # ---- predictions + retrospectives I logged ----
    try:
        from apps.decisions.intelligence_models import (
            DecisionPrediction, DecisionOutcomeCheck, DecisionRetrospective,
        )
        payload["predictions_created"] = _safe(
            DecisionPrediction.objects.filter(created_by=user).order_by("-created_at"),
            lambda p: {
                "id": p.id, "decision_id": p.decision_id, "dimension": p.dimension,
                "statement": p.statement, "metric_kind": p.metric_kind,
                "target_value": p.target_value, "check_at": p.check_at.isoformat() if p.check_at else None,
            },
        )
        payload["outcome_checks_logged"] = _safe(
            DecisionOutcomeCheck.objects.filter(observed_by=user).order_by("-observed_at"),
            lambda c: {
                "id": c.id, "prediction_id": c.prediction_id,
                "observed_value": c.observed_value, "drift_pct": c.drift_pct,
                "drift_band": c.drift_band, "observed_at": c.observed_at.isoformat() if c.observed_at else None,
            },
        )
        payload["retrospectives_authored"] = _safe(
            DecisionRetrospective.objects.filter(author=user).order_by("-created_at"),
            lambda r: {
                "id": r.id, "decision_id": r.decision_id, "summary": r.summary,
                "lesson": r.lesson, "confidence_delta": r.confidence_delta, "tags": r.tags,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            },
        )
    except Exception as exc:
        logger.warning("export decision intelligence failed: %s", exc)

    # ---- issues reported / assigned ----
    try:
        from apps.agile.models import Issue
        payload["issues_reported"] = _safe(
            Issue.objects.filter(reporter=user).order_by("-created_at"),
            lambda i: {
                "id": i.id, "key": i.key, "title": i.title, "status": i.status,
                "priority": i.priority, "project_id": i.project_id,
                "created_at": i.created_at.isoformat() if i.created_at else None,
            },
        )
        payload["issues_assigned"] = _safe(
            Issue.objects.filter(assignee=user).order_by("-created_at"),
            lambda i: {
                "id": i.id, "key": i.key, "title": i.title, "status": i.status,
                "project_id": i.project_id,
            },
        )
    except Exception as exc:
        logger.warning("export issues failed: %s", exc)

    # ---- conversations + replies authored ----
    try:
        from apps.conversations.models import Conversation
        payload["conversations_authored"] = _safe(
            Conversation.objects.filter(author=user).order_by("-created_at"),
            lambda c: {
                "id": c.id, "title": c.title,
                "post_type": getattr(c, "post_type", ""),
                "created_at": c.created_at.isoformat() if c.created_at else None,
            },
        )
    except Exception as exc:
        logger.warning("export conversations failed: %s", exc)

    # ---- agent runs I started ----
    try:
        from apps.knowledge.models import AgentRun
        payload["agent_runs"] = _safe(
            AgentRun.objects.filter(user=user).order_by("-created_at"),
            lambda r: {
                "id": r.id, "goal": r.goal, "profile_slug": r.profile_slug,
                "status": r.status, "iterations": r.iterations,
                "final_answer": r.final_answer[:2000] if r.final_answer else "",
                "created_at": r.created_at.isoformat() if r.created_at else None,
            },
        )
    except Exception as exc:
        logger.warning("export agent runs failed: %s", exc)

    # ---- tasks ----
    try:
        from apps.business.models import Task
        payload["tasks_assigned"] = _safe(
            Task.objects.filter(assigned_to=user).order_by("-created_at"),
            lambda t: {
                "id": t.id, "title": t.title, "status": t.status, "priority": t.priority,
                "due_date": t.due_date.isoformat() if t.due_date else None,
            },
        )
    except Exception as exc:
        logger.warning("export tasks failed: %s", exc)

    # ---- notifications received ----
    try:
        from apps.notifications.models import Notification
        payload["notifications"] = _safe(
            Notification.objects.filter(user=user).order_by("-created_at"),
            lambda n: {
                "id": n.id, "type": n.notification_type, "title": n.title,
                "message": n.message, "link": n.link, "is_read": n.is_read,
                "created_at": n.created_at.isoformat() if n.created_at else None,
            },
            limit=500,
        )
    except Exception as exc:
        logger.warning("export notifications failed: %s", exc)

    body = json.dumps(payload, indent=2, default=str)
    response = HttpResponse(body, content_type="application/json")
    fname = f"knoledgr-export-{user.id}-{timezone.now().date().isoformat()}.json"
    response["Content-Disposition"] = f'attachment; filename="{fname}"'
    return response
