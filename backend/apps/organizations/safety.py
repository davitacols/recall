"""Multi-tenant safety helpers.

Every view that takes an id from the client should validate it against the
requesting user's organization before touching the record. This module
provides the one canonical way to do that so future audits can grep for it
instead of chasing inline patterns.

Usage:
    from apps.organizations.safety import org_safe_get, org_safe_int

    obj, err = org_safe_get(Issue, request, issue_id)
    if err: return err

    user_id, err = org_safe_int(request.data.get("assignee_id"), "assignee_id")
    if err: return err
"""

from __future__ import annotations

from typing import Any, Optional, Tuple

from rest_framework.response import Response


def user_org_or_400(request) -> Tuple[Optional[Any], Optional[Response]]:
    """Return (org, None) when the request carries a valid org, else (None, Response)."""
    org = getattr(request.user, "organization", None)
    if not org:
        return None, Response({"error": "User organization is not configured"}, status=400)
    return org, None


def org_safe_get(
    model,
    request,
    pk,
    *,
    pk_field: str = "id",
    field_set=None,
    not_found_status: int = 404,
):
    """Fetch a model row only if it belongs to request.user.organization.

    Returns (instance, None) on success, or (None, Response) on failure
    so the caller can `if err: return err`.

    Set `field_set` to constrain the fetched columns (perf). The model must
    have an `organization` FK; this is enforced by the queryset filter.
    """
    org, err = user_org_or_400(request)
    if err:
        return None, err

    qs = model.objects.filter(**{pk_field: pk, "organization": org})
    if field_set:
        qs = qs.only(*field_set)
    instance = qs.first()
    if not instance:
        return None, Response(
            {"error": f"{model.__name__} not found in this workspace"},
            status=not_found_status,
        )
    return instance, None


def org_safe_int(value, field_name: str, *, allow_blank: bool = True):
    """Coerce a value that came from the client to int, or return (None, Response).

    Treats None / "" / "null" / 0 / "0" as "not provided" when allow_blank=True.
    """
    if allow_blank and value in (None, "", "null", 0, "0"):
        return None, None
    try:
        return int(value), None
    except (TypeError, ValueError):
        return None, Response({"error": f"{field_name} must be an integer"}, status=400)


def org_safe_fk_exists(model, fk_id, org, field_name: str = "id"):
    """Return (True, None) iff the FK id belongs to the given org. Else (False, Response)."""
    if not model.objects.filter(**{field_name: fk_id, "organization": org}).exists():
        return False, Response(
            {"error": f"Invalid {model.__name__.lower()} reference for this workspace"},
            status=400,
        )
    return True, None
