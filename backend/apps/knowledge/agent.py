"""Autonomous agent runtime for Knoledgr.

Drives a Claude tool-use loop until the model emits a final answer, the run
hits the iteration cap, or a write tool requires human approval. The trace of
every step is persisted on the AgentRun so the frontend can render the agent's
reasoning + tool calls + results live.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone as dt_timezone
from typing import Any, Dict, List, Optional, Tuple

from django.conf import settings
from django.utils import timezone

from apps.knowledge.agent_tools import all_tool_specs, get_tool, ToolSpec
from apps.knowledge.agent_profiles import (
    all_profiles,
    get_profile,
    profile_payload,
)
from apps.knowledge.models import AgentRun

logger = logging.getLogger(__name__)

MAX_ITERATIONS = 12
MAX_TOOL_OUTPUT_CHARS = 6000


def _now_iso() -> str:
    return timezone.now().isoformat()


def _fire_run_webhook(run: AgentRun, phase: str) -> None:
    """Best-effort outbound webhook for agent run lifecycle changes.

    Also fans the same lifecycle event out over websocket so any open trace
    panels can stop showing the spinner.
    """
    try:
        from apps.organizations.webhook_models import (
            dispatch,
            EVENT_AGENT_RUN_COMPLETED,
            EVENT_AGENT_RUN_AWAITING_APPROVAL,
        )
        event = (
            EVENT_AGENT_RUN_COMPLETED if phase == "completed"
            else EVENT_AGENT_RUN_AWAITING_APPROVAL
        )
        dispatch(
            organization=run.organization,
            event=event,
            payload={
                "run_id": run.id,
                "profile_slug": getattr(run, "profile_slug", "") or "",
                "status": run.status,
                "final_answer": (run.final_answer or "")[:4000],
                "pending_tool_calls": list(run.pending_tool_calls or []),
                "user_id": getattr(run.user, "id", None),
            },
        )
    except Exception:
        pass
    try:
        from apps.knowledge.consumers import broadcast_run_event
        broadcast_run_event(run.id, {
            "type": "status",
            "status": run.status,
            "final_answer": run.final_answer or None,
            "pending_tool_calls": list(run.pending_tool_calls or []),
        })
    except Exception:
        pass


def _append_step(run: AgentRun, kind: str, payload: Dict[str, Any]) -> None:
    step = {"kind": kind, "payload": payload, "ts": _now_iso()}
    # Dual-write during the transition: JSONField on the run for legacy
    # readers, AgentStep row for everyone else. Once existing runs have all
    # been re-rendered through the new reader, the JSONField becomes the
    # backup and can be dropped.
    run.steps.append(step)
    try:
        from apps.knowledge.models import AgentStep
        ordinal = len(run.steps)  # we just appended → 1-based ordinal
        AgentStep.objects.create(
            run=run, ordinal=ordinal, kind=kind, payload=payload,
        )
    except Exception:
        # Never fail the run because the step table couldn't write — the
        # JSON copy already has it.
        logger.exception("AgentStep persist failed for run %s", run.id)
    try:
        from apps.knowledge.consumers import broadcast_run_event
        broadcast_run_event(run.id, {"type": "step", **step})
    except Exception:
        pass


def _to_anthropic_tool_input(value: Any) -> Dict[str, Any]:
    if isinstance(value, dict):
        return value
    if value is None:
        return {}
    if isinstance(value, str):
        try:
            data = json.loads(value)
            if isinstance(data, dict):
                return data
        except Exception:
            pass
    return {}


def _safe_json(value: Any) -> str:
    try:
        out = json.dumps(value, default=str)
    except Exception:
        out = json.dumps({"error": "Could not serialize tool result"})
    if len(out) > MAX_TOOL_OUTPUT_CHARS:
        return out[: MAX_TOOL_OUTPUT_CHARS - 1] + "…"
    return out


def _get_client():
    try:
        import anthropic
    except Exception as exc:
        logger.warning("Anthropic SDK not available: %s", exc)
        return None, None
    api_key = ((getattr(settings, "ANTHROPIC_API_KEY", "") or "").strip()
               or (getattr(settings, "CLAUDE_API_KEY", "") or "").strip())
    if not api_key:
        return None, None
    model = ((getattr(settings, "CLAUDE_MODEL", "") or "").strip()
             or "claude-3-5-sonnet-20241022")
    try:
        return anthropic.Anthropic(api_key=api_key), model
    except Exception as exc:
        logger.exception("Failed to construct Anthropic client: %s", exc)
        return None, None


# ----------------------------------------------------------------------------
# Tool execution
# ----------------------------------------------------------------------------

def _execute_tool(spec: ToolSpec, *, org, user, tool_input: Dict[str, Any]) -> Tuple[Any, Optional[str]]:
    try:
        result = spec.fn(org=org, user=user, **(tool_input or {}))
        return result, None
    except Exception as exc:  # pragma: no cover - exercised at runtime
        logger.exception("Tool '%s' raised: %s", spec.name, exc)
        return None, f"{type(exc).__name__}: {exc}"


# ----------------------------------------------------------------------------
# Agent loop
# ----------------------------------------------------------------------------

def _content_blocks_to_payload(content) -> list:
    """Convert Anthropic response.content blocks into a JSON-safe list."""
    out: list = []
    for block in content or []:
        block_type = getattr(block, "type", None)
        if block_type == "text":
            out.append({"type": "text", "text": getattr(block, "text", "")})
        elif block_type == "tool_use":
            out.append({
                "type": "tool_use",
                "id": getattr(block, "id", ""),
                "name": getattr(block, "name", ""),
                "input": _to_anthropic_tool_input(getattr(block, "input", {})),
            })
    return out


def _run_loop(run: AgentRun, *, org, user) -> AgentRun:
    """Drive the Claude tool-use loop on an existing AgentRun.

    The loop is resumable: replays `run.messages` so the model has full context,
    advances until either a final answer, a write tool blocks, or the iteration
    cap. Persists the AgentRun after every iteration.
    """

    client, model = _get_client()
    if not client:
        run.status = "failed"
        run.error = "Anthropic API key is not configured for this deployment."
        _append_step(run, "final", {"text": run.error})
        run.save()
        _fire_run_webhook(run, "failed")
        return run

    profile = get_profile(run.profile_slug)
    if profile.tool_names:
        allowed = set(profile.tool_names)
        tool_specs = [s for s in all_tool_specs() if s.name in allowed]
    else:
        tool_specs = all_tool_specs()
    tools_payload = [spec.to_anthropic() for spec in tool_specs]
    system_prompt = profile.system_prompt

    while run.iterations < MAX_ITERATIONS:
        run.iterations += 1

        try:
            response = client.messages.create(
                model=model,
                max_tokens=2048,
                system=system_prompt,
                tools=tools_payload,
                messages=run.messages,
                temperature=0.2,
            )
        except Exception as exc:
            logger.exception("Anthropic call failed: %s", exc)
            run.status = "failed"
            run.error = f"Model call failed: {exc}"
            _append_step(run, "final", {"text": run.error})
            run.save()
            _fire_run_webhook(run, "failed")
            return run

        assistant_blocks = _content_blocks_to_payload(getattr(response, "content", []))
        # Record any assistant text as "thought" steps.
        for block in assistant_blocks:
            if block.get("type") == "text" and (block.get("text") or "").strip():
                _append_step(run, "thought", {"text": block["text"]})

        # Capture tool_use blocks.
        tool_uses = [b for b in assistant_blocks if b.get("type") == "tool_use"]

        # Always echo the assistant turn into the conversation so the next
        # iteration can match tool_result -> tool_use ids.
        run.messages.append({"role": "assistant", "content": assistant_blocks})

        if not tool_uses:
            # Model returned a final answer.
            final_text = "\n\n".join(
                b["text"] for b in assistant_blocks if b.get("type") == "text" and b.get("text")
            ).strip()
            run.final_answer = final_text or run.final_answer
            _append_step(run, "final", {"text": final_text})
            run.status = "completed"
            run.save()
            _fire_run_webhook(run, "completed")
            return run

        # Process each tool call.
        tool_results: list = []
        pending_writes: list = []
        for tu in tool_uses:
            name = tu.get("name", "")
            tu_id = tu.get("id", "")
            tu_input = _to_anthropic_tool_input(tu.get("input"))
            spec = get_tool(name)

            if not spec:
                _append_step(run, "tool_call", {
                    "id": tu_id,
                    "name": name,
                    "input": tu_input,
                    "is_write": False,
                    "approval_required": False,
                })
                err = f"Unknown tool '{name}'"
                _append_step(run, "tool_result", {"tool_call_id": tu_id, "error": err})
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": tu_id,
                    "content": json.dumps({"error": err}),
                    "is_error": True,
                })
                continue

            _append_step(run, "tool_call", {
                "id": tu_id,
                "name": name,
                "input": tu_input,
                "is_write": spec.is_write,
                "approval_required": spec.is_write,
            })

            if spec.is_write:
                pending_writes.append({
                    "id": tu_id,
                    "name": name,
                    "input": tu_input,
                    "description": spec.description,
                })
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": tu_id,
                    "content": json.dumps({"status": "awaiting_human_approval"}),
                })
                continue

            # Read tool — execute now.
            result, err = _execute_tool(spec, org=org, user=user, tool_input=tu_input)
            if err:
                _append_step(run, "tool_result", {"tool_call_id": tu_id, "error": err})
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": tu_id,
                    "content": json.dumps({"error": err}),
                    "is_error": True,
                })
            else:
                _append_step(run, "tool_result", {"tool_call_id": tu_id, "output": result})
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": tu_id,
                    "content": _safe_json(result),
                })

        # Feed all tool results back as a single user turn.
        run.messages.append({"role": "user", "content": tool_results})

        if pending_writes:
            run.pending_tool_calls = pending_writes
            run.status = "awaiting_approval"
            run.save()
            _fire_run_webhook(run, "awaiting_approval")
            return run

        run.save()

    # Iteration cap exhausted.
    run.status = "failed"
    run.error = "Reached maximum iterations without producing a final answer."
    _append_step(run, "final", {"text": run.error})
    run.save()
    _fire_run_webhook(run, "failed")
    return run


# ----------------------------------------------------------------------------
# Public API
# ----------------------------------------------------------------------------

def _kick_background(run: AgentRun) -> bool:
    """Hand off the loop to Celery if available; otherwise run inline.

    Returns True when the loop was dispatched to a background worker (and the
    caller should respond immediately with the run as it stands). Returns False
    when no Celery worker is reachable and the caller should run inline.
    """
    try:
        from apps.knowledge.tasks import drive_agent_run  # local import: optional
    except Exception:
        return False
    try:
        # In dev settings CELERY_TASK_ALWAYS_EAGER is True, which makes .delay()
        # equivalent to inline execution; that's fine.
        drive_agent_run.delay(run.id)
        return True
    except Exception as exc:
        logger.warning("Could not dispatch agent run %s to Celery: %s", run.id, exc)
        return False


class AgentBudgetExceeded(Exception):
    """Raised when an org has exhausted its monthly agent budget."""

    def __init__(self, info):
        super().__init__("Monthly agent budget exceeded")
        self.info = info or {}


def start_run(
    *,
    org,
    user,
    goal: str,
    profile_slug: str = "general",
    background: bool = True,
) -> AgentRun:
    """Start a new agent run for the given workspace goal.

    Raises `AgentBudgetExceeded` (with usage info) when the org has used up
    its monthly run cap. Callers should translate that into a 402 response.
    """
    goal = (goal or "").strip()
    if not goal:
        raise ValueError("goal is required")
    if len(goal) > 2000:
        goal = goal[:2000]

    # Budget check — 402 instead of 500 when the org has run out.
    try:
        from apps.organizations.budget_models import check_budget, increment
        allowed, info = check_budget(org, kind="run")
        if not allowed:
            raise AgentBudgetExceeded(info)
        increment(org, kind="run")
    except AgentBudgetExceeded:
        raise
    except Exception as exc:  # pragma: no cover - never block on budget bookkeeping
        logger.warning("Budget check failed (allowing run): %s", exc)

    # Resolve profile so we persist the canonical slug (unknown → general).
    profile = get_profile(profile_slug)

    run = AgentRun.objects.create(
        organization=org,
        user=user,
        goal=goal,
        status="running",
        profile_slug=profile.slug,
        messages=[{"role": "user", "content": goal}],
        steps=[{"kind": "user_goal", "payload": {"text": goal}, "ts": _now_iso()}],
    )

    if background and _kick_background(run):
        return run
    return _run_loop(run, org=org, user=user)


def resume_run(run: AgentRun, *, org, user, background: bool = True) -> AgentRun:
    """Resume a paused run after pending writes have been resolved."""
    if run.status not in {"running", "awaiting_approval"}:
        return run
    run.status = "running"
    run.save(update_fields=["status"])
    if background and _kick_background(run):
        return run
    return _run_loop(run, org=org, user=user)


def apply_approval(
    run: AgentRun,
    *,
    org,
    user,
    decisions: List[Dict[str, Any]],
    background: bool = True,
) -> AgentRun:
    """Apply user decisions on pending write tool calls.

    `decisions`: [{id, approved: bool, edited_input?: dict}]
    Executes approved tools, records denials, feeds results back into the loop,
    and resumes the agent.
    """

    pending = {item["id"]: item for item in run.pending_tool_calls}
    decision_map = {d.get("id"): d for d in (decisions or []) if d.get("id")}
    if not pending or not decision_map:
        # Nothing to do — just resume.
        run.pending_tool_calls = []
        return resume_run(run, org=org, user=user, background=background)

    tool_results: list = []
    for tu_id, item in pending.items():
        choice = decision_map.get(tu_id) or {}
        spec = get_tool(item["name"])
        if not spec:
            err = f"Unknown tool '{item['name']}'"
            _append_step(run, "tool_result", {"tool_call_id": tu_id, "error": err})
            tool_results.append({
                "type": "tool_result", "tool_use_id": tu_id,
                "content": json.dumps({"error": err}), "is_error": True,
            })
            continue

        if not choice.get("approved"):
            note = (choice.get("reason") or "Denied by user").strip()
            _append_step(run, "tool_result", {"tool_call_id": tu_id, "denied": True, "reason": note})
            tool_results.append({
                "type": "tool_result", "tool_use_id": tu_id,
                "content": json.dumps({"status": "denied", "reason": note}),
            })
            continue

        tool_input = choice.get("edited_input") or item.get("input") or {}
        if not isinstance(tool_input, dict):
            tool_input = {}
        result, err = _execute_tool(spec, org=org, user=user, tool_input=tool_input)
        if err:
            _append_step(run, "tool_result", {"tool_call_id": tu_id, "error": err})
            tool_results.append({
                "type": "tool_result", "tool_use_id": tu_id,
                "content": json.dumps({"error": err}), "is_error": True,
            })
        else:
            _append_step(run, "tool_result", {"tool_call_id": tu_id, "output": result, "executed": True})
            tool_results.append({
                "type": "tool_result", "tool_use_id": tu_id,
                "content": _safe_json(result),
            })

    # Replace the most-recent placeholder tool_result block with the real results.
    # The loop earlier appended user/tool_result content for the pending writes;
    # we need to overwrite that turn so Claude sees the actual outcomes.
    if run.messages and run.messages[-1].get("role") == "user":
        run.messages[-1]["content"] = tool_results
    else:
        run.messages.append({"role": "user", "content": tool_results})

    run.pending_tool_calls = []
    run.status = "running"
    run.save()

    if background and _kick_background(run):
        return run
    return _run_loop(run, org=org, user=user)


def serialize_run(run: AgentRun) -> Dict[str, Any]:
    """Render-ready JSON payload for the frontend."""
    profile = get_profile(run.profile_slug)
    if profile.tool_names:
        allowed = set(profile.tool_names)
        tool_specs = [s for s in all_tool_specs() if s.name in allowed]
    else:
        tool_specs = all_tool_specs()

    # Prefer the AgentStep table when it has rows (new runs); fall back to
    # the JSON field for historical runs that predate the table.
    steps = run.steps or []
    try:
        rows = list(run.step_rows.all().order_by("ordinal"))
        if rows:
            steps = [
                {
                    "kind": r.kind,
                    "payload": r.payload,
                    "ts": r.created_at.isoformat() if r.created_at else None,
                }
                for r in rows
            ]
    except Exception:
        pass

    return {
        "id": run.id,
        "goal": run.goal,
        "status": run.status,
        "iterations": run.iterations,
        "steps": steps,
        "pending_tool_calls": run.pending_tool_calls,
        "final_answer": run.final_answer,
        "error": run.error,
        "created_at": run.created_at.isoformat() if run.created_at else None,
        "updated_at": run.updated_at.isoformat() if run.updated_at else None,
        "profile": profile_payload(profile),
        "tools_available": [
            {"name": spec.name, "description": spec.description, "is_write": spec.is_write}
            for spec in tool_specs
        ],
    }


def serialize_profiles() -> List[Dict[str, Any]]:
    return [profile_payload(p) for p in all_profiles()]
