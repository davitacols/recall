"""Tool catalog for the Knoledgr autonomous agent.

Each tool is a typed function the agent can call. Read tools execute
immediately; write tools are queued for human approval before they run.

Adding a tool:
    @register_tool(name="my_tool", description="...", schema={...})
    def my_tool(*, org, user, **kwargs):
        ...
"""

from __future__ import annotations

import logging
from datetime import date
from typing import Any, Callable, Dict, List, Optional

from django.contrib.auth import get_user_model
from django.utils.html import strip_tags

from apps.business.models import Task
from apps.decisions.models import Decision

logger = logging.getLogger(__name__)
User = get_user_model()

# ----------------------------------------------------------------------------
# Registry
# ----------------------------------------------------------------------------

# Each entry: {name: ToolSpec}
_REGISTRY: Dict[str, "ToolSpec"] = {}


class ToolSpec:
    __slots__ = ("name", "description", "schema", "fn", "is_write")

    def __init__(
        self,
        name: str,
        description: str,
        schema: Dict[str, Any],
        fn: Callable[..., Any],
        is_write: bool,
    ) -> None:
        self.name = name
        self.description = description
        self.schema = schema
        self.fn = fn
        self.is_write = is_write

    def to_anthropic(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "description": self.description,
            "input_schema": self.schema,
        }


def register_tool(
    *,
    name: str,
    description: str,
    schema: Dict[str, Any],
    is_write: bool = False,
):
    def decorate(fn: Callable[..., Any]) -> Callable[..., Any]:
        _REGISTRY[name] = ToolSpec(name=name, description=description, schema=schema, fn=fn, is_write=is_write)
        return fn

    return decorate


def all_tool_specs() -> List[ToolSpec]:
    return list(_REGISTRY.values())


def get_tool(name: str) -> Optional[ToolSpec]:
    return _REGISTRY.get(name)


# ----------------------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------------------

def _truncate(value, limit: int = 480) -> str:
    text = strip_tags(str(value or "")).replace("\r", " ").replace("\n", " ").strip()
    return text if len(text) <= limit else text[: limit - 1] + "…"


def _person(user) -> Optional[Dict[str, Any]]:
    if not user:
        return None
    return {
        "id": user.id,
        "name": getattr(user, "full_name", "") or getattr(user, "username", "") or "",
        "email": getattr(user, "email", ""),
        "role": getattr(user, "role", ""),
    }


# ----------------------------------------------------------------------------
# Read tools
# ----------------------------------------------------------------------------

@register_tool(
    name="search_workspace",
    description=(
        "Search the entire workspace memory: conversations, decisions, "
        "documents, issues, tasks, meetings, goals. Use this first to find "
        "relevant context before reading specific records."
    ),
    schema={
        "type": "object",
        "properties": {
            "query": {"type": "string", "description": "Natural language search query."},
            "limit": {"type": "integer", "description": "Max results per bucket (1-20).", "default": 6},
        },
        "required": ["query"],
    },
)
def search_workspace(*, org, user, query: str, limit: int = 6, **_):
    from apps.knowledge.search_engine import get_search_engine

    engine = get_search_engine()
    data = engine.search(query, org.id, filters={}, limit=max(1, min(int(limit or 6), 20)))
    # Normalize to a compact, agent-friendly summary.
    buckets = {}
    for key, value in (data or {}).items():
        if isinstance(value, list):
            buckets[key] = [
                {
                    "id": item.get("id"),
                    "type": item.get("type") or key.rstrip("s"),
                    "title": item.get("title") or item.get("name") or "",
                    "preview": _truncate(item.get("preview") or item.get("summary") or ""),
                    "url": item.get("url") or "",
                }
                for item in value[:6]
            ]
    return {"total": (data or {}).get("total", 0), "buckets": buckets}


@register_tool(
    name="list_open_issues",
    description=(
        "List issues that are not done. Optionally filter by assignee, project, "
        "or priority. Use this to plan a sprint or check what's in flight."
    ),
    schema={
        "type": "object",
        "properties": {
            "project_id": {"type": "integer"},
            "assignee_id": {"type": "integer"},
            "priority": {"type": "string", "enum": ["lowest", "low", "medium", "high", "highest"]},
            "limit": {"type": "integer", "default": 15},
        },
    },
)
def list_open_issues(*, org, user, project_id=None, assignee_id=None, priority=None, limit=15, **_):
    from apps.agile.models import Issue

    qs = Issue.objects.filter(organization=org).exclude(status="done").order_by("-priority", "-created_at")
    if project_id:
        qs = qs.filter(project_id=int(project_id))
    if assignee_id:
        qs = qs.filter(assignee_id=int(assignee_id))
    if priority:
        qs = qs.filter(priority=priority)
    limit = max(1, min(int(limit or 15), 50))
    return [
        {
            "id": iss.id,
            "key": iss.key,
            "title": iss.title,
            "status": iss.status,
            "priority": iss.priority,
            "assignee": _person(iss.assignee),
            "project_id": iss.project_id,
            "sprint_id": iss.sprint_id,
        }
        for iss in qs[:limit]
    ]


@register_tool(
    name="read_issue",
    description="Fetch a single issue's full record (description, comments count, links).",
    schema={
        "type": "object",
        "properties": {"issue_id": {"type": "integer"}},
        "required": ["issue_id"],
    },
)
def read_issue(*, org, user, issue_id, **_):
    from apps.agile.models import Issue

    iss = Issue.objects.filter(organization=org, id=int(issue_id)).first()
    if not iss:
        return {"error": f"Issue {issue_id} not found in this workspace"}
    return {
        "id": iss.id,
        "key": iss.key,
        "title": iss.title,
        "description": _truncate(iss.description, limit=1600),
        "status": iss.status,
        "priority": iss.priority,
        "issue_type": iss.issue_type,
        "story_points": iss.story_points,
        "assignee": _person(iss.assignee),
        "reporter": _person(iss.reporter),
        "due_date": iss.due_date.isoformat() if iss.due_date else None,
        "project_id": iss.project_id,
        "sprint_id": iss.sprint_id,
        "parent_issue_id": iss.parent_issue_id,
        "subtask_count": iss.subtasks.count(),
        "comments_count": getattr(iss, "comments", None) and iss.comments.count() or 0,
        "url": f"/issues/{iss.id}",
    }


@register_tool(
    name="list_decisions",
    description="List recent decisions in the workspace, optionally filtered by status.",
    schema={
        "type": "object",
        "properties": {
            "status": {
                "type": "string",
                "enum": ["proposed", "under_review", "approved", "rejected", "implemented", "cancelled"],
            },
            "limit": {"type": "integer", "default": 10},
        },
    },
)
def list_decisions(*, org, user, status=None, limit=10, **_):
    qs = Decision.objects.filter(organization=org).order_by("-created_at")
    if status:
        qs = qs.filter(status=status)
    limit = max(1, min(int(limit or 10), 40))
    return [
        {
            "id": dec.id,
            "title": dec.title,
            "status": dec.status,
            "impact_level": dec.impact_level,
            "decision_maker": _person(dec.decision_maker),
            "created_at": dec.created_at.isoformat() if dec.created_at else None,
            "url": f"/decisions/{dec.id}",
        }
        for dec in qs[:limit]
    ]


@register_tool(
    name="read_decision",
    description="Fetch a single decision's full record (rationale, stakeholders, impact).",
    schema={
        "type": "object",
        "properties": {"decision_id": {"type": "integer"}},
        "required": ["decision_id"],
    },
)
def read_decision(*, org, user, decision_id, **_):
    dec = Decision.objects.filter(organization=org, id=int(decision_id)).first()
    if not dec:
        return {"error": f"Decision {decision_id} not found in this workspace"}
    return {
        "id": dec.id,
        "title": dec.title,
        "description": _truncate(dec.description, limit=1600),
        "rationale": _truncate(dec.rationale, limit=1200),
        "status": dec.status,
        "impact_level": dec.impact_level,
        "impact_assessment": _truncate(dec.impact_assessment, limit=600),
        "decision_maker": _person(dec.decision_maker),
        "stakeholders": [_person(u) for u in dec.stakeholders.all()[:10]],
        "if_this_fails": _truncate(dec.if_this_fails, limit=480),
        "confidence_level": dec.confidence_level,
        "url": f"/decisions/{dec.id}",
    }


@register_tool(
    name="list_members",
    description="List workspace members so you can pick assignees / stakeholders.",
    schema={
        "type": "object",
        "properties": {
            "query": {"type": "string", "description": "Optional name/email substring filter."},
            "limit": {"type": "integer", "default": 20},
        },
    },
)
def list_members(*, org, user, query=None, limit=20, **_):
    qs = User.objects.filter(organization=org, is_active=True).order_by("full_name", "username")
    if query:
        from django.db.models import Q
        qs = qs.filter(Q(full_name__icontains=query) | Q(email__icontains=query) | Q(username__icontains=query))
    limit = max(1, min(int(limit or 20), 50))
    return [_person(m) for m in qs[:limit]]


@register_tool(
    name="list_blockers",
    description="List blockers in the workspace, optionally filtered by status (default active).",
    schema={
        "type": "object",
        "properties": {
            "status": {"type": "string", "default": "active"},
            "limit": {"type": "integer", "default": 10},
        },
    },
)
def list_blockers(*, org, user, status="active", limit=10, **_):
    try:
        from apps.agile.models import Blocker
    except Exception:
        return {"error": "Blockers feature not available in this deployment."}
    qs = Blocker.objects.filter(organization=org).order_by("-created_at")
    if status:
        qs = qs.filter(status=status)
    limit = max(1, min(int(limit or 10), 40))
    out = []
    for b in qs[:limit]:
        out.append({
            "id": b.id,
            "title": getattr(b, "title", ""),
            "description": _truncate(getattr(b, "description", ""), limit=400),
            "status": getattr(b, "status", ""),
            "sprint_id": getattr(b, "sprint_id", None),
        })
    return out


# ----------------------------------------------------------------------------
# Write tools (queued for approval)
# ----------------------------------------------------------------------------

@register_tool(
    name="create_task",
    description=(
        "Create a new task in the workspace. Use this when the user (or your "
        "plan) wants to capture follow-up work. REQUIRES HUMAN APPROVAL."
    ),
    schema={
        "type": "object",
        "properties": {
            "title": {"type": "string"},
            "description": {"type": "string"},
            "assignee_id": {"type": "integer"},
            "priority": {"type": "string", "enum": ["low", "medium", "high"], "default": "medium"},
            "due_date": {"type": "string", "description": "ISO date YYYY-MM-DD"},
        },
        "required": ["title"],
    },
    is_write=True,
)
def create_task(*, org, user, title, description="", assignee_id=None, priority="medium", due_date=None, **_):
    assignee = None
    if assignee_id:
        assignee = User.objects.filter(organization=org, id=int(assignee_id)).first()
    parsed_due = None
    if due_date:
        try:
            parsed_due = date.fromisoformat(due_date)
        except ValueError:
            return {"error": f"Invalid due_date '{due_date}' (expected YYYY-MM-DD)"}
    task = Task.objects.create(
        organization=org,
        title=title.strip()[:255],
        description=(description or "").strip(),
        priority=priority if priority in {"low", "medium", "high"} else "medium",
        assigned_to=assignee,
        due_date=parsed_due,
    )
    return {
        "id": task.id,
        "title": task.title,
        "status": task.status,
        "priority": task.priority,
        "assigned_to": _person(task.assigned_to),
        "due_date": task.due_date.isoformat() if task.due_date else None,
        "url": f"/business/tasks?focus={task.id}",
    }


@register_tool(
    name="assign_issue",
    description="Set the assignee for an issue. REQUIRES HUMAN APPROVAL.",
    schema={
        "type": "object",
        "properties": {
            "issue_id": {"type": "integer"},
            "assignee_id": {"type": "integer", "description": "Set null to unassign."},
        },
        "required": ["issue_id"],
    },
    is_write=True,
)
def assign_issue(*, org, user, issue_id, assignee_id=None, **_):
    from apps.agile.models import Issue

    iss = Issue.objects.filter(organization=org, id=int(issue_id)).first()
    if not iss:
        return {"error": f"Issue {issue_id} not found in this workspace"}
    if assignee_id is None:
        iss.assignee = None
    else:
        assignee = User.objects.filter(organization=org, id=int(assignee_id)).first()
        if not assignee:
            return {"error": f"User {assignee_id} not found in this workspace"}
        iss.assignee = assignee
    iss.save(update_fields=["assignee"])
    return {
        "id": iss.id,
        "key": iss.key,
        "assignee": _person(iss.assignee),
    }


@register_tool(
    name="post_issue_comment",
    description="Post a comment on an issue. REQUIRES HUMAN APPROVAL.",
    schema={
        "type": "object",
        "properties": {
            "issue_id": {"type": "integer"},
            "body": {"type": "string"},
        },
        "required": ["issue_id", "body"],
    },
    is_write=True,
)
def post_issue_comment(*, org, user, issue_id, body, **_):
    from apps.agile.models import Issue, IssueComment

    iss = Issue.objects.filter(organization=org, id=int(issue_id)).first()
    if not iss:
        return {"error": f"Issue {issue_id} not found in this workspace"}
    text = (body or "").strip()
    if not text:
        return {"error": "Comment body is required"}
    fields = {"issue": iss, "body": text}
    # Best-effort author attribution — IssueComment may use different field names.
    for candidate in ("author", "user", "created_by"):
        try:
            IssueComment._meta.get_field(candidate)
            fields[candidate] = user
            break
        except Exception:
            continue
    comment = IssueComment.objects.create(**fields)
    return {
        "id": comment.id,
        "issue_id": iss.id,
        "body": text[:400],
    }


@register_tool(
    name="list_active_sprints",
    description="List active or in-flight sprints across the workspace (or for a specific project).",
    schema={
        "type": "object",
        "properties": {
            "project_id": {"type": "integer"},
            "limit": {"type": "integer", "default": 6},
        },
    },
)
def list_active_sprints(*, org, user, project_id=None, limit=6, **_):
    from apps.agile.models import Sprint

    qs = Sprint.objects.filter(organization=org, status="active").order_by("-start_date")
    if project_id:
        qs = qs.filter(project_id=int(project_id))
    limit = max(1, min(int(limit or 6), 20))
    return [
        {
            "id": s.id,
            "name": s.name,
            "project_id": s.project_id,
            "start_date": s.start_date.isoformat() if s.start_date else None,
            "end_date": s.end_date.isoformat() if s.end_date else None,
            "goal": _truncate(s.goal, limit=400),
            "completed_count": s.completed_count,
            "blocked_count": s.blocked_count,
            "url": f"/sprints/{s.id}",
        }
        for s in qs[:limit]
    ]


@register_tool(
    name="read_sprint",
    description="Fetch a sprint with its issues bucketed by status (todo / in_progress / done).",
    schema={
        "type": "object",
        "properties": {"sprint_id": {"type": "integer"}},
        "required": ["sprint_id"],
    },
)
def read_sprint(*, org, user, sprint_id, **_):
    from apps.agile.models import Sprint, Issue

    sprint = Sprint.objects.filter(organization=org, id=int(sprint_id)).first()
    if not sprint:
        return {"error": f"Sprint {sprint_id} not found in this workspace"}
    issues = Issue.objects.filter(organization=org, sprint=sprint).select_related("assignee")
    buckets = {"backlog": [], "todo": [], "in_progress": [], "in_review": [], "testing": [], "done": []}
    for iss in issues[:80]:
        buckets.setdefault(iss.status, []).append({
            "id": iss.id,
            "key": iss.key,
            "title": iss.title,
            "priority": iss.priority,
            "story_points": iss.story_points,
            "assignee": _person(iss.assignee),
        })
    return {
        "id": sprint.id,
        "name": sprint.name,
        "status": sprint.status,
        "goal": _truncate(sprint.goal, limit=480),
        "start_date": sprint.start_date.isoformat() if sprint.start_date else None,
        "end_date": sprint.end_date.isoformat() if sprint.end_date else None,
        "summary": _truncate(sprint.summary, limit=480),
        "issues_by_status": buckets,
        "total_issues": sum(len(v) for v in buckets.values()),
        "url": f"/sprints/{sprint.id}",
    }


@register_tool(
    name="list_my_tasks",
    description=(
        "List the tasks assigned to the current user (the person who started "
        "the agent), optionally filtered by status. Use this to answer "
        "questions like 'what's on my plate'."
    ),
    schema={
        "type": "object",
        "properties": {
            "status": {"type": "string", "enum": ["todo", "in_progress", "done"]},
            "limit": {"type": "integer", "default": 15},
        },
    },
)
def list_my_tasks(*, org, user, status=None, limit=15, **_):
    if not user or not getattr(user, "id", None):
        return {"error": "No acting user in this run"}
    qs = Task.objects.filter(organization=org, assigned_to=user).order_by("-created_at")
    if status:
        qs = qs.filter(status=status)
    limit = max(1, min(int(limit or 15), 50))
    return [
        {
            "id": t.id,
            "title": t.title,
            "status": t.status,
            "priority": t.priority,
            "due_date": t.due_date.isoformat() if t.due_date else None,
        }
        for t in qs[:limit]
    ]


@register_tool(
    name="read_document",
    description="Read a workspace page/document by id (returns title, type, content, owner).",
    schema={
        "type": "object",
        "properties": {"document_id": {"type": "integer"}},
        "required": ["document_id"],
    },
)
def read_document(*, org, user, document_id, **_):
    from apps.business.document_models import Document

    doc = Document.objects.filter(organization=org, id=int(document_id)).first()
    if not doc:
        return {"error": f"Document {document_id} not found in this workspace"}
    return {
        "id": doc.id,
        "title": doc.title,
        "description": _truncate(doc.description, limit=480),
        "document_type": doc.document_type,
        "content": _truncate(doc.content, limit=2400),
        "version": doc.version,
        "created_by": _person(doc.created_by),
        "tags": doc.tags or [],
        "updated_at": doc.updated_at.isoformat() if doc.updated_at else None,
        "url": f"/business/documents/{doc.id}",
    }


@register_tool(
    name="update_issue_status",
    description=(
        "Transition an issue to a new status (e.g. todo → in_progress, "
        "in_review → done). REQUIRES HUMAN APPROVAL."
    ),
    schema={
        "type": "object",
        "properties": {
            "issue_id": {"type": "integer"},
            "status": {"type": "string", "enum": ["backlog", "todo", "in_progress", "in_review", "testing", "done"]},
        },
        "required": ["issue_id", "status"],
    },
    is_write=True,
)
def update_issue_status(*, org, user, issue_id, status, **_):
    from apps.agile.models import Issue

    iss = Issue.objects.filter(organization=org, id=int(issue_id)).first()
    if not iss:
        return {"error": f"Issue {issue_id} not found in this workspace"}
    iss.status = status
    iss.save(update_fields=["status", "status_changed_at"])
    return {"id": iss.id, "key": iss.key, "status": iss.status}


@register_tool(
    name="link_decision_to_issue",
    description=(
        "Link a decision to an issue so the decision rationale is reachable "
        "from the issue. REQUIRES HUMAN APPROVAL."
    ),
    schema={
        "type": "object",
        "properties": {
            "decision_id": {"type": "integer"},
            "issue_id": {"type": "integer"},
        },
        "required": ["decision_id", "issue_id"],
    },
    is_write=True,
)
def link_decision_to_issue(*, org, user, decision_id, issue_id, **_):
    from apps.agile.models import Issue, DecisionIssueLink
    from apps.decisions.models import Decision

    dec = Decision.objects.filter(organization=org, id=int(decision_id)).first()
    if not dec:
        return {"error": f"Decision {decision_id} not found"}
    iss = Issue.objects.filter(organization=org, id=int(issue_id)).first()
    if not iss:
        return {"error": f"Issue {issue_id} not found"}
    link, created = DecisionIssueLink.objects.get_or_create(decision=dec, issue=iss)
    return {
        "link_id": link.id,
        "decision_id": dec.id,
        "issue_id": iss.id,
        "created": created,
    }


@register_tool(
    name="find_similar_issues",
    description=(
        "Find prior issues in this workspace similar to a draft title and "
        "description. Use this BEFORE proposing a new issue to surface past "
        "similar work — including its status, owner, and resolution. Helps "
        "answer 'have we tried this before?'."
    ),
    schema={
        "type": "object",
        "properties": {
            "title": {"type": "string", "description": "Draft issue title or short topic."},
            "description": {"type": "string", "description": "Optional richer description."},
            "limit": {"type": "integer", "default": 5},
        },
        "required": ["title"],
    },
)
def find_similar_issues(*, org, user, title, description="", limit=5, **_):
    from apps.agile.models import Issue
    from apps.knowledge.search_engine import get_search_engine

    query = " ".join(filter(None, [title, description])).strip()
    if not query:
        return {"error": "title (or description) is required"}

    engine = get_search_engine()
    data = engine.search(query, org.id, filters={"kinds": ["issue"]}, limit=max(1, min(int(limit or 5), 15)))

    bucket = (data or {}).get("issues") or (data or {}).get("issue") or []
    if not bucket and isinstance(data, dict):
        for value in data.values():
            if isinstance(value, list) and value and isinstance(value[0], dict) and "issue" in str(value[0].get("type", "")).lower():
                bucket = value
                break

    ids = [item.get("id") for item in bucket if item.get("id")]
    if not ids:
        return []
    issues = Issue.objects.filter(organization=org, id__in=ids).select_related("assignee", "project")
    order = {iid: i for i, iid in enumerate(ids)}
    issues = sorted(issues, key=lambda i: order.get(i.id, 999))

    rows = []
    for iss in issues:
        rows.append({
            "id": iss.id,
            "key": iss.key,
            "title": iss.title,
            "status": iss.status,
            "priority": iss.priority,
            "issue_type": iss.issue_type,
            "story_points": iss.story_points,
            "assignee": _person(iss.assignee),
            "project_name": getattr(iss.project, "name", None),
            "is_resolved": iss.status in {"done", "closed", "resolved"},
            "url": "/issues/" + str(iss.id),
        })
    return rows


@register_tool(
    name="find_similar_decisions",
    description=(
        "Find prior decisions in this workspace similar to a draft title and "
        "description. Use this BEFORE proposing or committing a new decision "
        "to surface past similar calls — including their outcomes and any "
        "lessons learned. Critical for 'have we done this before?' checks."
    ),
    schema={
        "type": "object",
        "properties": {
            "title": {"type": "string", "description": "Draft decision title or short topic."},
            "description": {"type": "string", "description": "Optional richer description."},
            "limit": {"type": "integer", "default": 5},
        },
        "required": ["title"],
    },
)
def find_similar_decisions(*, org, user, title, description="", limit=5, **_):
    from apps.knowledge.search_engine import get_search_engine

    query = " ".join(filter(None, [title, description])).strip()
    if not query:
        return {"error": "title (or description) is required"}

    engine = get_search_engine()
    data = engine.search(query, org.id, filters={"kinds": ["decision"]}, limit=max(1, min(int(limit or 5), 15)))

    # Search hits may live under a "decisions" bucket. Collect them.
    bucket = (data or {}).get("decisions") or (data or {}).get("decision") or []
    if not bucket and isinstance(data, dict):
        for key, value in data.items():
            if isinstance(value, list) and value and isinstance(value[0], dict) and value[0].get("type", "").startswith("decision"):
                bucket = value
                break

    ids = [item.get("id") for item in bucket if item.get("id")]
    if not ids:
        return []

    # Pull full decisions with their predictions / retrospectives so the
    # agent can compare outcomes to the draft, not just titles.
    decisions = (
        Decision.objects.filter(organization=org, id__in=ids)
        .prefetch_related("predictions", "predictions__checks", "retrospectives")
    )

    rows = []
    for dec in decisions:
        # Outcome summary across all predictions for the decision
        bands = []
        for p in dec.predictions.all():
            latest = p.checks.order_by("-observed_at").first()
            if latest:
                bands.append(latest.drift_band)
        outcome_label = "no outcomes logged"
        if bands:
            if any(b == "off_track" for b in bands):
                outcome_label = "drifted off track"
            elif any(b == "drifting" for b in bands):
                outcome_label = "drifted"
            elif all(b in {"on_track", "exceeded"} for b in bands):
                outcome_label = "on track or better"

        retros = list(dec.retrospectives.all()[:2])

        rows.append({
            "id": dec.id,
            "title": dec.title,
            "status": dec.status,
            "impact_level": dec.impact_level,
            "decision_maker": _person(dec.decision_maker),
            "predicted_count": dec.predictions.count(),
            "outcome": outcome_label,
            "lessons": [
                {
                    "summary": _truncate(r.summary, limit=200),
                    "lesson": _truncate(r.lesson, limit=200),
                    "tags": r.tags or [],
                }
                for r in retros
            ],
            "url": f"/decisions/{dec.id}",
        })
    return rows


@register_tool(
    name="get_decision_outcome",
    description=(
        "Fetch a decision's full outcome record: all logged predictions, "
        "their latest reality observations, calculated drift, and any "
        "retrospectives. Use this when reviewing or comparing decisions."
    ),
    schema={
        "type": "object",
        "properties": {"decision_id": {"type": "integer"}},
        "required": ["decision_id"],
    },
)
def get_decision_outcome(*, org, user, decision_id, **_):
    dec = (
        Decision.objects.filter(organization=org, id=int(decision_id))
        .prefetch_related("predictions", "predictions__checks", "retrospectives")
        .first()
    )
    if not dec:
        return {"error": f"Decision {decision_id} not found in this workspace"}

    predictions = []
    for p in dec.predictions.all():
        checks = []
        for c in p.checks.all()[:5]:
            checks.append({
                "observed_value": c.observed_value,
                "drift_pct": c.drift_pct,
                "drift_band": c.drift_band,
                "notes": _truncate(c.notes, limit=320),
                "observed_at": c.observed_at.isoformat() if c.observed_at else None,
                "observed_by": _person(c.observed_by),
            })
        predictions.append({
            "id": p.id,
            "dimension": p.dimension,
            "statement": _truncate(p.statement, limit=480),
            "metric_kind": p.metric_kind,
            "target_value": p.target_value,
            "baseline_value": p.baseline_value,
            "check_at": p.check_at.isoformat() if p.check_at else None,
            "latest_check": checks[0] if checks else None,
            "check_history": checks,
        })

    retros = []
    for r in dec.retrospectives.all()[:5]:
        retros.append({
            "id": r.id,
            "triggered_by": r.triggered_by,
            "summary": _truncate(r.summary, limit=400),
            "root_cause": _truncate(r.root_cause, limit=400),
            "lesson": _truncate(r.lesson, limit=400),
            "confidence_delta": r.confidence_delta,
            "tags": r.tags or [],
            "author": _person(r.author),
            "created_at": r.created_at.isoformat() if r.created_at else None,
        })

    return {
        "id": dec.id,
        "title": dec.title,
        "status": dec.status,
        "impact_level": dec.impact_level,
        "decision_maker": _person(dec.decision_maker),
        "predictions": predictions,
        "retrospectives": retros,
        "url": f"/decisions/{dec.id}",
    }


@register_tool(
    name="log_prediction",
    description=(
        "Attach a predicted outcome to an existing decision. Every prediction "
        "has a dimension (e.g. 'latency'), a statement, a metric kind "
        "(number/percent/binary/text), a target value, and a check date. "
        "REQUIRES HUMAN APPROVAL."
    ),
    schema={
        "type": "object",
        "properties": {
            "decision_id": {"type": "integer"},
            "dimension": {"type": "string", "description": "Short label, e.g. 'latency', 'adoption', 'cost'."},
            "statement": {"type": "string", "description": "Human-readable prediction statement."},
            "metric_kind": {
                "type": "string",
                "enum": ["number", "percent", "binary", "text"],
                "default": "text",
            },
            "target_value": {
                "type": "object",
                "description": "Target as an object, e.g. {\"value\": 30, \"unit\": \"ms\"} or {\"value\": true}.",
            },
            "baseline_value": {"type": "object"},
            "check_at": {"type": "string", "description": "ISO date YYYY-MM-DD."},
        },
        "required": ["decision_id", "dimension", "statement", "check_at"],
    },
    is_write=True,
)
def log_prediction(*, org, user, decision_id, dimension, statement, metric_kind="text", target_value=None, baseline_value=None, check_at=None, **_):
    from apps.decisions.intelligence_models import DecisionPrediction

    dec = Decision.objects.filter(organization=org, id=int(decision_id)).first()
    if not dec:
        return {"error": f"Decision {decision_id} not found"}
    if metric_kind not in {"number", "percent", "binary", "text"}:
        return {"error": "metric_kind must be one of number/percent/binary/text"}
    try:
        parsed = date.fromisoformat(str(check_at)[:10])
    except (TypeError, ValueError):
        return {"error": "check_at must be a valid ISO date (YYYY-MM-DD)"}

    prediction = DecisionPrediction.objects.create(
        organization=org,
        decision=dec,
        dimension=str(dimension)[:80].strip() or "outcome",
        statement=str(statement).strip(),
        metric_kind=metric_kind,
        target_value=target_value if isinstance(target_value, dict) else {},
        baseline_value=baseline_value if isinstance(baseline_value, dict) else None,
        check_at=parsed,
        created_by=user,
    )
    return {
        "id": prediction.id,
        "decision_id": dec.id,
        "dimension": prediction.dimension,
        "metric_kind": prediction.metric_kind,
        "check_at": prediction.check_at.isoformat(),
    }


@register_tool(
    name="log_outcome_check",
    description=(
        "Record an observation of reality against a DecisionPrediction. The "
        "drift band (on_track / drifting / off_track / exceeded) is computed "
        "automatically. If reality is off_track, a retrospective is opened. "
        "REQUIRES HUMAN APPROVAL."
    ),
    schema={
        "type": "object",
        "properties": {
            "prediction_id": {"type": "integer"},
            "observed_value": {
                "type": "object",
                "description": "Observed value in the same shape as target_value.",
            },
            "notes": {"type": "string"},
        },
        "required": ["prediction_id", "observed_value"],
    },
    is_write=True,
)
def log_outcome_check(*, org, user, prediction_id, observed_value, notes="", **_):
    from apps.decisions.intelligence_models import (
        DecisionOutcomeCheck,
        DecisionPrediction,
        DecisionRetrospective,
    )
    from apps.decisions.intelligence_views import _compute_drift

    p = DecisionPrediction.objects.filter(organization=org, id=int(prediction_id)).first()
    if not p:
        return {"error": f"Prediction {prediction_id} not found"}
    if not isinstance(observed_value, dict):
        return {"error": "observed_value must be an object"}

    drift_pct, drift_band = _compute_drift(p, observed_value)
    check = DecisionOutcomeCheck.objects.create(
        organization=org,
        prediction=p,
        observed_value=observed_value,
        drift_pct=drift_pct,
        drift_band=drift_band,
        notes=(notes or "").strip(),
        observed_by=user,
    )

    auto_retro_id = None
    if drift_band == "off_track":
        retro = DecisionRetrospective.objects.create(
            organization=org,
            decision=p.decision,
            triggered_by="drift",
            triggered_by_check=check,
            summary=(
                f"Auto-opened: reality drifted off-track on '{p.dimension}'."
                + (f" Latest observation deviates {drift_pct:+.1f}% from target." if drift_pct is not None else "")
            ),
        )
        auto_retro_id = retro.id

    return {
        "id": check.id,
        "prediction_id": p.id,
        "drift_pct": drift_pct,
        "drift_band": drift_band,
        "auto_opened_retrospective_id": auto_retro_id,
    }


@register_tool(
    name="open_decision_retrospective",
    description=(
        "Open a retrospective record on a decision — captures what happened, "
        "root cause, and the lesson to propagate to future similar decisions. "
        "REQUIRES HUMAN APPROVAL."
    ),
    schema={
        "type": "object",
        "properties": {
            "decision_id": {"type": "integer"},
            "summary": {"type": "string"},
            "root_cause": {"type": "string"},
            "lesson": {"type": "string"},
            "confidence_delta": {
                "type": "integer",
                "description": "How much this raises (+) or lowers (-) confidence in similar future decisions, range -10..10.",
            },
            "tags": {"type": "array", "items": {"type": "string"}},
        },
        "required": ["decision_id"],
    },
    is_write=True,
)
def open_decision_retrospective(*, org, user, decision_id, summary="", root_cause="", lesson="", confidence_delta=None, tags=None, **_):
    from apps.decisions.intelligence_models import DecisionRetrospective

    dec = Decision.objects.filter(organization=org, id=int(decision_id)).first()
    if not dec:
        return {"error": f"Decision {decision_id} not found"}

    retro = DecisionRetrospective.objects.create(
        organization=org,
        decision=dec,
        triggered_by="agent",
        summary=str(summary or "").strip(),
        root_cause=str(root_cause or "").strip(),
        lesson=str(lesson or "").strip(),
        confidence_delta=int(confidence_delta) if isinstance(confidence_delta, (int, float)) else None,
        tags=tags if isinstance(tags, list) else [],
        author=user,
    )
    return {
        "id": retro.id,
        "decision_id": dec.id,
        "triggered_by": retro.triggered_by,
        "confidence_delta": retro.confidence_delta,
    }


@register_tool(
    name="run_decision_twin",
    description=(
        "Kick off a counterfactual analysis of a decision: 'what if we'd "
        "chosen differently?'. Records the twin and points it at a fresh "
        "agent run that will produce the side-by-side analysis. "
        "REQUIRES HUMAN APPROVAL."
    ),
    schema={
        "type": "object",
        "properties": {
            "decision_id": {"type": "integer"},
            "counterfactual_premise": {"type": "string", "description": "The 'what if' question."},
        },
        "required": ["decision_id", "counterfactual_premise"],
    },
    is_write=True,
)
def run_decision_twin(*, org, user, decision_id, counterfactual_premise, **_):
    from apps.decisions.intelligence_models import DecisionTwinRun

    dec = Decision.objects.filter(organization=org, id=int(decision_id)).first()
    if not dec:
        return {"error": f"Decision {decision_id} not found"}
    premise = (counterfactual_premise or "").strip()
    if not premise:
        return {"error": "counterfactual_premise is required"}

    twin = DecisionTwinRun.objects.create(
        organization=org,
        decision=dec,
        counterfactual_premise=premise,
        status="queued",
        requested_by=user,
    )

    # NOTE: we intentionally don't auto-kick off another agent run from inside
    # the current run. The frontend's twin endpoint kicks off a fresh run when
    # the twin is created directly via API; when an agent calls this tool, the
    # twin row is created and a human can promote it to a full run from the UI.
    return {
        "id": twin.id,
        "decision_id": dec.id,
        "status": twin.status,
        "premise": premise,
    }


@register_tool(
    name="update_decision_status",
    description=(
        "Move a decision through its lifecycle (e.g. proposed → approved, "
        "approved → implemented). REQUIRES HUMAN APPROVAL."
    ),
    schema={
        "type": "object",
        "properties": {
            "decision_id": {"type": "integer"},
            "status": {
                "type": "string",
                "enum": ["proposed", "under_review", "approved", "rejected", "implemented", "cancelled"],
            },
        },
        "required": ["decision_id", "status"],
    },
    is_write=True,
)
def update_decision_status(*, org, user, decision_id, status, **_):
    dec = Decision.objects.filter(organization=org, id=int(decision_id)).first()
    if not dec:
        return {"error": f"Decision {decision_id} not found in this workspace"}
    dec.status = status
    dec.save(update_fields=["status"])
    return {"id": dec.id, "title": dec.title, "status": dec.status}
