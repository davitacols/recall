"""HTTP API for the autonomous workspace agent."""

from __future__ import annotations

import logging

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.knowledge.agent import (
    AgentBudgetExceeded,
    apply_approval,
    resume_run,
    serialize_profiles,
    serialize_run,
    start_run,
)
from apps.knowledge.models import AgentRun

logger = logging.getLogger(__name__)


def _user_org_or_400(request):
    org = getattr(request.user, "organization", None)
    if not org:
        return None, Response({"error": "User organization is not configured"}, status=400)
    return org, None


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def start_agent_run(request):
    """Kick off a new agent run.

    Body: {"goal": "..."}
    Returns the serialized run after the first batch of iterations.
    The run may be:
      - completed (final_answer ready)
      - awaiting_approval (pending_tool_calls non-empty)
      - failed (error set)
    """
    org, err = _user_org_or_400(request)
    if err:
        return err
    goal = (request.data.get("goal") or request.data.get("query") or "").strip()
    if not goal:
        return Response({"error": "goal is required"}, status=400)
    profile_slug = (request.data.get("profile_slug") or request.data.get("profile") or "general").strip()
    try:
        run = start_run(
            org=org,
            user=request.user,
            goal=goal,
            profile_slug=profile_slug or "general",
        )
    except AgentBudgetExceeded as exc:
        return Response(
            {
                "error": "Monthly agent budget exceeded for this workspace",
                "budget": exc.info,
            },
            status=402,
        )
    except Exception as exc:
        logger.exception("Failed to start agent run: %s", exc)
        return Response({"error": f"Could not start agent: {exc}"}, status=500)

    # If the run failed instantly because the model is not configured for this
    # deployment, surface that as 503 (Service Unavailable) so clients can
    # distinguish "ops issue" from "your input was bad" or "your run produced
    # nothing useful". The agent still records the failed run for audit.
    payload = serialize_run(run)
    if run.status == "failed" and run.error and "API key" in run.error:
        return Response(
            {
                **payload,
                "error": "Agent backend is not configured for this deployment.",
                "code": "agent_unavailable",
            },
            status=503,
        )
    return Response(payload)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def agent_budget_status(request):
    """Return current workspace agent budget + usage so the UI can render a meter."""
    org, err = _user_org_or_400(request)
    if err:
        return err
    try:
        from apps.organizations.budget_models import check_budget
        run_allowed, run_info = check_budget(org, kind="run")
        copilot_allowed, copilot_info = check_budget(org, kind="copilot")
        return Response({
            "run": {"allowed": run_allowed, **run_info},
            "copilot": {"allowed": copilot_allowed, **copilot_info},
        })
    except Exception as exc:
        logger.warning("agent_budget_status failed: %s", exc)
        return Response({"error": "Could not load budget"}, status=500)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_agent_run(request, run_id: int):
    org, err = _user_org_or_400(request)
    if err:
        return err
    run = AgentRun.objects.filter(organization=org, id=run_id).first()
    if not run:
        return Response({"error": "Run not found"}, status=404)
    return Response(serialize_run(run))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_agent_runs(request):
    org, err = _user_org_or_400(request)
    if err:
        return err
    qs = AgentRun.objects.filter(organization=org).order_by("-created_at")[:25]
    return Response({
        "results": [
            {
                "id": r.id,
                "goal": r.goal[:200],
                "status": r.status,
                "iterations": r.iterations,
                "profile_slug": r.profile_slug,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in qs
        ],
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_agent_profiles(request):
    """Catalog of available agent profiles (general + specialists)."""
    return Response({"results": serialize_profiles()})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def approve_agent_run(request, run_id: int):
    """Apply approval decisions for pending write tool calls.

    Body: {"decisions": [{"id": "<tool_use_id>", "approved": true|false, "reason"?: "...", "edited_input"?: {...}}]}
    """
    org, err = _user_org_or_400(request)
    if err:
        return err
    run = AgentRun.objects.filter(organization=org, id=run_id).first()
    if not run:
        return Response({"error": "Run not found"}, status=404)
    if run.status != "awaiting_approval":
        return Response({"error": "Run is not awaiting approval"}, status=400)
    decisions = request.data.get("decisions") or []
    if not isinstance(decisions, list):
        return Response({"error": "`decisions` must be a list"}, status=400)
    try:
        run = apply_approval(run, org=org, user=request.user, decisions=decisions)
    except Exception as exc:
        logger.exception("Failed to apply approval on run %s: %s", run_id, exc)
        return Response({"error": f"Could not resume agent: {exc}"}, status=500)
    return Response(serialize_run(run))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def agent_audit_log(request):
    """Workspace-wide audit feed of agent runs and their write actions.

    Admin/manager only. Surfaces every write action ever proposed by an agent
    in this workspace, along with who approved or denied it. Filters:

      ?status=running|awaiting_approval|completed|failed|cancelled
      ?user_id=<int>           (the user who started the run)
      ?days=<int>              (default 30)
      ?write_only=true|false   (default true — write actions are the audit point)

    Returns an ordered list of audit events, not paginated yet (capped at 200).
    """
    from datetime import timedelta
    from django.utils import timezone

    org, err = _user_org_or_400(request)
    if err:
        return err
    role = getattr(request.user, "role", "")
    if role not in {"admin", "manager"}:
        return Response({"error": "Only admins or managers can view the audit log"}, status=403)

    days = max(1, min(int(request.query_params.get("days", 30) or 30), 365))
    cutoff = timezone.now() - timedelta(days=days)
    write_only = request.query_params.get("write_only", "true").lower() != "false"

    runs = AgentRun.objects.filter(organization=org, created_at__gte=cutoff)

    status_filter = request.query_params.get("status")
    if status_filter:
        runs = runs.filter(status=status_filter)
    user_filter = request.query_params.get("user_id")
    if user_filter:
        try:
            runs = runs.filter(user_id=int(user_filter))
        except ValueError:
            return Response({"error": "user_id must be an integer"}, status=400)

    runs = runs.select_related("user").order_by("-created_at")[:200]

    events = []
    totals = {
        "runs": 0,
        "write_attempts": 0,
        "approved": 0,
        "denied": 0,
        "errored": 0,
        "pending": 0,
    }

    for run in runs:
        totals["runs"] += 1
        steps = run.steps or []
        # Build a map call_id -> result step so we can pair them.
        call_index = {}
        result_for = {}
        for step in steps:
            kind = step.get("kind")
            payload = step.get("payload") or {}
            if kind == "tool_call":
                tcid = payload.get("id")
                if tcid:
                    call_index[tcid] = step
            elif kind == "tool_result":
                tcid = payload.get("tool_call_id")
                if tcid:
                    result_for[tcid] = step

        for tcid, call_step in call_index.items():
            call_payload = call_step.get("payload") or {}
            is_write = bool(call_payload.get("is_write"))
            if write_only and not is_write:
                continue

            result_step = result_for.get(tcid)
            result_payload = (result_step or {}).get("payload") or {}

            if not result_step:
                outcome = "pending"
            elif result_payload.get("denied"):
                outcome = "denied"
            elif result_payload.get("error"):
                outcome = "errored"
            elif result_payload.get("executed") or result_payload.get("output") is not None:
                outcome = "approved" if is_write else "executed"
            else:
                outcome = "pending"

            if is_write:
                totals["write_attempts"] += 1
                if outcome == "approved":
                    totals["approved"] += 1
                elif outcome == "denied":
                    totals["denied"] += 1
                elif outcome == "errored":
                    totals["errored"] += 1
                elif outcome == "pending":
                    totals["pending"] += 1

            events.append({
                "run_id": run.id,
                "run_status": run.status,
                "run_goal": run.goal[:200],
                "profile_slug": run.profile_slug,
                "actor": {
                    "id": run.user_id,
                    "name": getattr(run.user, "full_name", "") or getattr(run.user, "username", "") if run.user else None,
                    "email": getattr(run.user, "email", "") if run.user else "",
                } if run.user_id else None,
                "tool_call_id": tcid,
                "tool_name": call_payload.get("name"),
                "tool_input": call_payload.get("input") or {},
                "is_write": is_write,
                "outcome": outcome,
                "outcome_text": (
                    "Denied: " + str(result_payload.get("reason") or "no reason")
                    if outcome == "denied"
                    else result_payload.get("error") if outcome == "errored"
                    else "Executed" if outcome == "approved"
                    else "Ran" if outcome == "executed"
                    else "Awaiting approval"
                ),
                "ts": call_step.get("ts"),
                "result_ts": (result_step or {}).get("ts") if result_step else None,
            })

    events.sort(key=lambda e: e.get("ts") or "", reverse=True)
    return Response({
        "totals": totals,
        "filters": {
            "days": days,
            "status": status_filter or None,
            "user_id": int(user_filter) if user_filter else None,
            "write_only": write_only,
        },
        "events": events[:200],
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def cancel_agent_run(request, run_id: int):
    org, err = _user_org_or_400(request)
    if err:
        return err
    run = AgentRun.objects.filter(organization=org, id=run_id).first()
    if not run:
        return Response({"error": "Run not found"}, status=404)
    if run.status in {"completed", "failed", "cancelled"}:
        return Response(serialize_run(run))
    run.status = "cancelled"
    run.error = run.error or "Cancelled by user"
    run.save(update_fields=["status", "error", "updated_at"])
    return Response(serialize_run(run))
