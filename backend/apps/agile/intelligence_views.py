"""Lightweight intelligence endpoints for the agile app.

For now: "Before-you-create" similarity search for issues, surfaced on the
new-issue form. Mirrors the Decision Intelligence pattern.
"""

from __future__ import annotations

import logging

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.agile.models import Issue

logger = logging.getLogger(__name__)


def _person(u):
    if not u:
        return None
    return {
        "id": u.id,
        "name": getattr(u, "full_name", "") or getattr(u, "username", ""),
        "email": getattr(u, "email", ""),
    }


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def similar_issues(request):
    """Surface similar past issues for a draft title and description.

    Body: { "title": "...", "description": "..."?, "limit": 5? }
    """
    org = getattr(request.user, "organization", None)
    if not org:
        return Response({"error": "User organization is not configured"}, status=400)

    data = request.data or {}
    title = (data.get("title") or "").strip()
    description = (data.get("description") or "").strip()
    if not title and not description:
        return Response({"results": []})

    query = " ".join(filter(None, [title, description])).strip()
    limit = max(1, min(int(data.get("limit") or 5), 12))

    from apps.knowledge.search_engine import get_search_engine
    engine = get_search_engine()
    search_data = engine.search(query, org.id, filters={"kinds": ["issue"]}, limit=limit)

    bucket = (search_data or {}).get("issues") or (search_data or {}).get("issue") or []
    if not bucket and isinstance(search_data, dict):
        for value in search_data.values():
            if (
                isinstance(value, list)
                and value
                and isinstance(value[0], dict)
                and "issue" in str(value[0].get("type", "")).lower()
            ):
                bucket = value
                break

    ids = [item.get("id") for item in bucket if item.get("id")]
    if not ids:
        return Response({"results": []})

    issues = (
        Issue.objects.filter(organization=org, id__in=ids)
        .select_related("assignee", "project")
    )
    order = {iid: idx for idx, iid in enumerate(ids)}
    issues = sorted(issues, key=lambda i: order.get(i.id, 999))

    results = []
    for iss in issues:
        results.append({
            "id": iss.id,
            "key": iss.key,
            "title": iss.title,
            "status": iss.status,
            "priority": iss.priority,
            "issue_type": iss.issue_type,
            "story_points": iss.story_points,
            "assignee": _person(iss.assignee),
            "project_name": getattr(iss.project, "name", None) or "",
            "is_resolved": iss.status in {"done", "closed", "resolved"},
            "created_at": iss.created_at.isoformat() if iss.created_at else None,
            "url": "/issues/" + str(iss.id),
        })
    return Response({"results": results})
