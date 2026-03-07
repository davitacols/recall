import csv
import hashlib
import io
import json
import re
from collections import Counter

from django.db import transaction

from apps.agile.models import Board, Column, Issue, Project
from apps.conversations.models import Conversation

SUPPORTED_PLATFORMS = ("notion", "jira", "github", "jetbrains_space")


def parse_uploaded_file(uploaded_file):
    name = (uploaded_file.name or "").lower()
    if name.endswith(".json"):
        return json.load(uploaded_file)
    if name.endswith(".csv"):
        content = uploaded_file.read().decode("utf-8")
        return list(csv.DictReader(io.StringIO(content)))
    raise ValueError("Unsupported file format. Use .json or .csv")


def import_platform_payload(*, organization, user, platform, payload, project_name="", include_context=True):
    normalized = normalize_platform_payload(platform=platform, payload=payload, project_name=project_name)
    issues_data, context_rows = prepare_import_records(normalized=normalized, include_context=include_context)
    stages = normalized.get("workflow_stages", [])

    if not issues_data:
        raise ValueError("No issues/tasks found in uploaded export")

    with transaction.atomic():
        project = Project.objects.create(
            organization=organization,
            name=normalized["project_name"],
            key=_generate_project_key(normalized["project_name"]),
            description=f"Imported from {platform.replace('_', ' ').title()}",
            lead=user,
        )
        board = Board.objects.create(
            organization=organization,
            project=project,
            name=f"{project.name} Board",
            board_type="kanban",
        )

        stage_columns = {}
        for index, stage in enumerate(stages):
            col = Column.objects.create(board=board, name=stage, order=index)
            stage_columns[stage] = col

        issue_count = 0
        for idx, row in enumerate(issues_data, start=1):
            status = row.get("status")
            column = stage_columns.get(_status_to_stage_label(status))
            key = f"{project.key}-{idx}"
            Issue.objects.create(
                organization=organization,
                project=project,
                board=board,
                column=column,
                key=key,
                title=row.get("title") or f"Imported item {idx}",
                description=(row.get("description") or "").strip(),
                issue_type=row.get("issue_type"),
                priority=row.get("priority"),
                status=status,
                reporter=user,
                assignee=user if row.get("has_assignee") else None,
                in_backlog=status == "backlog",
            )
            issue_count += 1

        context_count = 0
        for row in context_rows:
            Conversation.objects.create(
                organization=organization,
                author=user,
                post_type="update",
                title=row["title"],
                content=row["content"],
                why_this_matters=f"Imported platform context from {platform.replace('_', ' ').title()}",
                priority="medium",
            )
            context_count += 1

    return {
        "platform": platform,
        "project_id": project.id,
        "project_name": project.name,
        "board_id": board.id,
        "workflow_stages": stages,
        "issues_imported": issue_count,
        "context_imported": context_count,
    }


def normalize_platform_payload(*, platform, payload, project_name=""):
    platform_key = (platform or "").strip().lower()
    if platform_key not in SUPPORTED_PLATFORMS:
        raise ValueError(f"Unsupported platform '{platform}'. Supported: {', '.join(SUPPORTED_PLATFORMS)}")

    if platform_key == "jira":
        return _normalize_jira(payload, project_name)
    if platform_key == "notion":
        return _normalize_notion(payload, project_name)
    if platform_key == "github":
        return _normalize_github(payload, project_name)
    return _normalize_jetbrains_space(payload, project_name)


def preview_platform_payload(*, platform, payload, project_name="", include_context=True):
    normalized = normalize_platform_payload(platform=platform, payload=payload, project_name=project_name)
    issues, context_rows = prepare_import_records(normalized=normalized, include_context=include_context)
    status_counts = Counter()
    priority_counts = Counter()
    type_counts = Counter()

    for issue in issues:
        status_counts[issue.get("status")] += 1
        priority_counts[issue.get("priority")] += 1
        type_counts[issue.get("issue_type")] += 1

    sample_issues = []
    for row in issues[:10]:
        sample_issues.append(
            {
                "title": row.get("title"),
                "status": row.get("status"),
                "priority": row.get("priority"),
                "issue_type": row.get("issue_type"),
            }
        )

    preview_hash = build_preview_hash(
        platform=platform,
        normalized=normalized,
        include_context=include_context,
    )

    return {
        "platform": platform,
        "project_name": normalized.get("project_name"),
        "workflow_stages": normalized.get("workflow_stages", []),
        "issues_detected": len(issues),
        "context_items_detected": len(context_rows),
        "include_context": bool(include_context),
        "preview_hash": preview_hash,
        "status_distribution": dict(status_counts),
        "priority_distribution": dict(priority_counts),
        "issue_type_distribution": dict(type_counts),
        "sample_issues": sample_issues,
        "field_mapping": {
            "title": "title/name/summary",
            "description": "description/body/details",
            "status": "status/state/column",
            "priority": "priority",
            "issue_type": "type/issue type",
            "assignee": "assignee/owner",
            "context": "comments/notes/discussion",
        },
    }


def prepare_import_records(*, normalized, include_context=True):
    raw_issues = normalized.get("issues", [])
    issues_data = []
    for row in raw_issues:
        title = _truncate((row.get("title") or "").strip(), 255)
        if not title:
            continue
        issues_data.append(
            {
                "title": title,
                "description": (row.get("description") or "").strip(),
                "status": _map_status(row.get("status")),
                "priority": _map_priority(row.get("priority")),
                "issue_type": _map_issue_type(row.get("issue_type")),
                "has_assignee": bool((row.get("assignee") or "").strip()),
            }
        )

    context_rows = []
    if include_context:
        for row in normalized.get("context_rows", [])[:300]:
            title = (row.get("title") or "").strip()[:255]
            content = (row.get("content") or "").strip()
            if len(title) < 5 or len(content) < 10:
                continue
            context_rows.append({"title": title, "content": content})

    return issues_data, context_rows


def build_preview_hash(*, platform, normalized, include_context=True):
    issues_data, context_rows = prepare_import_records(normalized=normalized, include_context=include_context)
    canonical_payload = {
        "platform": platform,
        "project_name": normalized.get("project_name"),
        "workflow_stages": normalized.get("workflow_stages", []),
        "include_context": bool(include_context),
        "issues": issues_data,
        "context_rows": context_rows,
    }
    encoded = json.dumps(canonical_payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def _normalize_jira(payload, project_name):
    rows = _coerce_rows(payload, list_keys=("issues", "items", "data", "values"))
    issues = []
    context = []
    for row in rows:
        title = _pick(row, "Summary", "summary", "title", "Issue summary")
        description = _pick(row, "Description", "description", "details")
        status = _pick(row, "Status", "status")
        priority = _pick(row, "Priority", "priority")
        issue_type = _pick(row, "Issue Type", "type", "issue_type")
        assignee = _pick(row, "Assignee", "assignee", "owner")
        issue_key = _pick(row, "Issue key", "Key", "key")
        if title:
            issues.append(
                {
                    "external_id": issue_key,
                    "title": title,
                    "description": description,
                    "status": status,
                    "priority": priority,
                    "issue_type": issue_type,
                    "assignee": assignee,
                }
            )
        comments = _pick(row, "Comment", "Comments", "comments")
        if comments:
            context.append(
                {
                    "title": f"Jira context: {title or issue_key or 'Imported issue'}",
                    "content": str(comments),
                }
            )

    resolved_name = project_name or _derive_name_from_rows(rows, "projectName", "Project name", "Project")
    return _build_normalized_payload(resolved_name, issues, context)


def _normalize_notion(payload, project_name):
    rows = _coerce_rows(payload, list_keys=("results", "items", "data", "pages"))
    issues = []
    context = []
    for row in rows:
        properties = row.get("properties", row)
        title = _pick(properties, "Name", "name", "Title", "title", "Task")
        description = _pick(properties, "Description", "description", "Details")
        status = _pick(properties, "Status", "status", "State")
        priority = _pick(properties, "Priority", "priority")
        issue_type = _pick(properties, "Type", "type")
        notes = _pick(properties, "Notes", "notes", "Context", "context")
        if title:
            issues.append(
                {
                    "title": title,
                    "description": description,
                    "status": status,
                    "priority": priority,
                    "issue_type": issue_type,
                    "assignee": _pick(properties, "Assignee", "Owner", "owner"),
                }
            )
        if notes:
            context.append({"title": f"Notion note: {title or 'Imported'}", "content": str(notes)})

    resolved_name = project_name or _derive_name_from_rows(rows, "database", "workspace", "project", default="Notion Import")
    return _build_normalized_payload(resolved_name, issues, context)


def _normalize_github(payload, project_name):
    rows = _coerce_rows(payload, list_keys=("items", "cards", "issues", "nodes", "data"))
    issues = []
    context = []
    for row in rows:
        title = _pick(row, "title", "name")
        description = _pick(row, "body", "description", "content")
        status = _pick(row, "status", "state", "column")
        priority = _pick(row, "priority")
        issue_type = _pick(row, "type")
        assignee = _first_from_list(_pick(row, "assignees", "assignee"))
        if title:
            issues.append(
                {
                    "title": title,
                    "description": description,
                    "status": status,
                    "priority": priority,
                    "issue_type": issue_type,
                    "assignee": assignee,
                }
            )
        comments = _pick(row, "comments", "discussion", "activity")
        if comments:
            context.append({"title": f"GitHub context: {title or 'Imported item'}", "content": str(comments)})

    resolved_name = project_name or _derive_name_from_rows(rows, "project", "repository", "repo", default="GitHub Project Import")
    return _build_normalized_payload(resolved_name, issues, context)


def _normalize_jetbrains_space(payload, project_name):
    rows = _coerce_rows(payload, list_keys=("issues", "items", "data", "results"))
    issues = []
    context = []
    for row in rows:
        title = _pick(row, "title", "summary", "name")
        description = _pick(row, "description", "details")
        status = _pick(row, "status", "state", "stage")
        priority = _pick(row, "priority")
        issue_type = _pick(row, "type")
        assignee = _pick(row, "assignee", "owner")
        if title:
            issues.append(
                {
                    "title": title,
                    "description": description,
                    "status": status,
                    "priority": priority,
                    "issue_type": issue_type,
                    "assignee": assignee,
                }
            )
        if row.get("description"):
            context.append(
                {
                    "title": f"Space context: {title or 'Imported item'}",
                    "content": str(row.get("description")),
                }
            )

    resolved_name = project_name or _derive_name_from_rows(rows, "project", "team", default="JetBrains Space Import")
    return _build_normalized_payload(resolved_name, issues, context)


def _build_normalized_payload(project_name, issues, context):
    stages = _derive_workflow_stages(issues)
    return {
        "project_name": _truncate((project_name or "Imported Project").strip(), 255),
        "workflow_stages": stages,
        "issues": issues,
        "context_rows": context,
    }


def _derive_workflow_stages(issues):
    seen = []
    for item in issues:
        label = _status_to_stage_label(_map_status(item.get("status")))
        if label not in seen:
            seen.append(label)
    if not seen:
        return ["Backlog", "To Do", "In Progress", "In Review", "Done"]
    required = ["Backlog", "To Do", "In Progress", "Done"]
    for stage in required:
        if stage not in seen:
            seen.append(stage)
    return seen


def _coerce_rows(payload, list_keys):
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict):
        for key in list_keys:
            value = payload.get(key)
            if isinstance(value, list):
                return value
    return []


def _derive_name_from_rows(rows, *keys, default="Imported Project"):
    for row in rows[:50]:
        for key in keys:
            value = row.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
    return default


def _pick(row, *keys):
    for key in keys:
        value = row.get(key)
        value = _extract_value(value)
        if value not in (None, "", []):
            return value
    return ""


def _extract_value(value):
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, list):
        extracted = [_extract_value(item) for item in value]
        extracted = [item for item in extracted if item]
        return ", ".join(extracted)
    if isinstance(value, dict):
        for key in ("name", "title", "content", "text", "value"):
            if key in value:
                extracted = _extract_value(value.get(key))
                if extracted:
                    return extracted
        return json.dumps(value)
    return str(value)


def _first_from_list(value):
    if not value:
        return ""
    if isinstance(value, str):
        parts = [v.strip() for v in value.split(",") if v.strip()]
        return parts[0] if parts else ""
    return str(value)


def _map_status(raw):
    value = (raw or "").strip().lower()
    mapping = {
        "backlog": "backlog",
        "new": "todo",
        "to do": "todo",
        "todo": "todo",
        "selected for development": "todo",
        "in progress": "in_progress",
        "in-progress": "in_progress",
        "doing": "in_progress",
        "in review": "in_review",
        "review": "in_review",
        "qa": "testing",
        "testing": "testing",
        "done": "done",
        "closed": "done",
        "complete": "done",
        "completed": "done",
        "resolved": "done",
        "merged": "done",
    }
    return mapping.get(value, "backlog")


def _status_to_stage_label(status):
    labels = {
        "backlog": "Backlog",
        "todo": "To Do",
        "in_progress": "In Progress",
        "in_review": "In Review",
        "testing": "Testing",
        "done": "Done",
    }
    return labels.get(status, "Backlog")


def _map_priority(raw):
    value = (raw or "").strip().lower()
    if value in ("highest", "critical", "blocker", "p0"):
        return "highest"
    if value in ("high", "p1"):
        return "high"
    if value in ("medium", "normal", "p2"):
        return "medium"
    if value in ("low", "p3"):
        return "low"
    if value in ("lowest", "trivial", "p4"):
        return "lowest"
    return "medium"


def _map_issue_type(raw):
    value = (raw or "").strip().lower()
    if value in ("epic",):
        return "epic"
    if value in ("story", "user story"):
        return "story"
    if value in ("bug", "defect"):
        return "bug"
    if value in ("subtask", "sub-task", "sub task"):
        return "subtask"
    return "task"


def _generate_project_key(name):
    cleaned = re.sub(r"[^A-Za-z0-9 ]+", " ", name or "").strip()
    words = [w for w in cleaned.split() if w]
    if words:
        base = "".join(w[0].upper() for w in words[:3])
    else:
        base = "IMP"
    base = (base or "IMP")[:8]

    key = base
    suffix = 1
    while Project.objects.filter(key=key).exists():
        key = f"{base}{suffix}"
        suffix += 1
    return key


def _truncate(value, limit):
    return (value or "")[:limit]
