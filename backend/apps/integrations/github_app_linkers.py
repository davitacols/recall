"""Decision↔PR linking handlers for the GitHub App webhook receiver.

Three surfaces in the linking pipeline:

1. **Manual picker** (Phase 2) — handled in github_app_pr_views.py.
2. **Inline marker** (this module) — a PR body containing
   ``<!-- knoledgr-decision:42 -->`` auto-creates the link with
   ``link_source=badge``. Teams add the marker to their PR template once
   and never have to use the picker.
3. **Branch pattern** (this module, optional) — a head branch named
   ``dec/42-…``, ``decision/42-…``, or ``knoledgr/42-…`` matches
   decision 42 in the workspace. Off by default to avoid surprising teams
   whose branch names happen to start with ``dec``; a workspace setting
   could turn it on later if there is demand.

Every PR webhook also refreshes the cached metadata on any existing
``DecisionPullRequest`` rows for that PR so the decision detail page
shows the current state without re-fetching GitHub on every render.
"""

from __future__ import annotations

import logging
import re
from typing import Optional

from django.utils import timezone
from django.utils.dateparse import parse_datetime

from apps.decisions.models import Decision
from apps.integrations.github_app_models import (
    DecisionPullRequest,
    GitHubAppInstallation,
    GitHubRepo,
)

logger = logging.getLogger(__name__)


# Pattern matches the canonical marker emitted by the docs example:
#   <!-- knoledgr-decision:42 -->
# Whitespace around the id is tolerated; the comment is case-insensitive.
_MARKER_RE = re.compile(
    r"<!--\s*knoledgr-decision\s*:\s*(\d+)\s*-->",
    re.IGNORECASE,
)

# Branch-name pattern: dec/42-..., decision/42-..., knoledgr/42-...
# Only enabled when a workspace opts in (env-gated for now — true safe default).
_BRANCH_RE = re.compile(
    r"^(?:dec|decision|knoledgr)[/_-](\d+)\b",
    re.IGNORECASE,
)

# How many auto-creates we allow per PR body in a single webhook event.
# Stops a maliciously crafted body from creating thousands of link rows.
_MAX_AUTOLINKS_PER_PR = 4


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def handle_pull_request_event(
    action: str,
    payload: dict,
    installation: GitHubAppInstallation,
    repo: GitHubRepo,
) -> None:
    """Process a pull_request webhook event.

    Steps:
        1. Build the cached metadata snapshot from the PR payload.
        2. Refresh every existing DecisionPullRequest row that points at
           this PR — keeps state, title, merged_at, etc. accurate.
        3. If the PR body has at least one inline knoledgr-decision marker,
           auto-create links for each decision id that's not already linked.
        4. Optionally try the branch-name pattern as a fallback.
    """
    pr = payload.get("pull_request") or {}
    if not pr:
        return

    pr_number = pr.get("number")
    if not pr_number:
        return

    snapshot = _pr_snapshot(pr)

    # 1 + 2: refresh existing rows for this PR (cheap, always run).
    _refresh_existing_links(repo, pr_number, snapshot)

    # 3: parse inline markers from the body.
    body = pr.get("body") or ""
    decision_ids = _extract_marker_decision_ids(body)

    # 4: optional branch fallback. We try it after the marker so an
    # explicit marker always wins over a fuzzy branch match.
    if not decision_ids:
        head_ref = (pr.get("head") or {}).get("ref") or ""
        branch_id = _extract_branch_decision_id(head_ref)
        if branch_id is not None:
            decision_ids = [branch_id]
            link_source = DecisionPullRequest.LINK_SOURCE_BRANCH
        else:
            link_source = None
    else:
        link_source = DecisionPullRequest.LINK_SOURCE_BADGE

    if not decision_ids:
        return

    for decision_id in decision_ids[:_MAX_AUTOLINKS_PER_PR]:
        try:
            _auto_link(
                installation=installation,
                repo=repo,
                pr_number=pr_number,
                pr_node_id=pr.get("node_id") or "",
                snapshot=snapshot,
                decision_id=decision_id,
                link_source=link_source or DecisionPullRequest.LINK_SOURCE_BADGE,
            )
        except Exception as exc:
            logger.warning(
                "auto-link failed for decision=%s pr=%s#%s: %s",
                decision_id, repo.full_name, pr_number, exc,
            )


# ---------------------------------------------------------------------------
# Snapshot + refresh
# ---------------------------------------------------------------------------

def _pr_snapshot(pr: dict) -> dict:
    """Build the field dict we use to update or create a DecisionPullRequest."""
    user = pr.get("user") or {}
    head = pr.get("head") or {}
    base = pr.get("base") or {}
    merged_at_str = pr.get("merged_at")
    pr_updated_at_str = pr.get("updated_at")
    return {
        "pr_node_id": pr.get("node_id") or "",
        "title": (pr.get("title") or "")[:512],
        "html_url": (pr.get("html_url") or "")[:512],
        "state": "merged" if merged_at_str else (pr.get("state") or "open"),
        "author_login": (user.get("login") or "")[:128],
        "author_avatar_url": (user.get("avatar_url") or "")[:512],
        "base_branch": (base.get("ref") or "")[:255],
        "head_branch": (head.get("ref") or "")[:255],
        "body_excerpt": ((pr.get("body") or ""))[:512],
        "merged_at": _parse_datetime(merged_at_str),
        "pr_updated_at": _parse_datetime(pr_updated_at_str),
    }


def _refresh_existing_links(repo: GitHubRepo, pr_number: int, snapshot: dict) -> int:
    """Update cached metadata on every DecisionPullRequest tied to this PR."""
    rows = list(DecisionPullRequest.objects.filter(repo=repo, pr_number=pr_number))
    if not rows:
        return 0
    update_fields = list(snapshot.keys()) + ["updated_at"]
    for row in rows:
        for k, v in snapshot.items():
            setattr(row, k, v)
        row.save(update_fields=update_fields)
    logger.info("Refreshed %d decision link(s) for %s#%s", len(rows), repo.full_name, pr_number)
    return len(rows)


# ---------------------------------------------------------------------------
# Marker + branch extraction
# ---------------------------------------------------------------------------

def _extract_marker_decision_ids(body: str) -> list[int]:
    """Pull every decision id mentioned by an inline marker, in order, deduped."""
    seen = []
    for match in _MARKER_RE.finditer(body or ""):
        try:
            decision_id = int(match.group(1))
        except (TypeError, ValueError):
            continue
        if decision_id not in seen:
            seen.append(decision_id)
    return seen


def _extract_branch_decision_id(ref: str) -> Optional[int]:
    """Match dec/<id>-…, decision/<id>-…, knoledgr/<id>-…."""
    m = _BRANCH_RE.match(ref or "")
    if not m:
        return None
    try:
        return int(m.group(1))
    except (TypeError, ValueError):
        return None


# ---------------------------------------------------------------------------
# Auto-link
# ---------------------------------------------------------------------------

def _auto_link(
    *,
    installation: GitHubAppInstallation,
    repo: GitHubRepo,
    pr_number: int,
    pr_node_id: str,
    snapshot: dict,
    decision_id: int,
    link_source: str,
) -> Optional[DecisionPullRequest]:
    """Upsert a DecisionPullRequest row for an auto-detected decision/PR pair.

    Returns the row if a link was created or refreshed, ``None`` if the
    decision id doesn't belong to the workspace (the most common rejection
    case — a marker for a decision that lives elsewhere).
    """
    org = installation.organization
    decision = Decision.objects.filter(id=decision_id, organization=org).first()
    if not decision:
        logger.info(
            "Marker decision id=%s not found in workspace %s — ignoring",
            decision_id, org.id,
        )
        return None

    link, created = DecisionPullRequest.objects.get_or_create(
        decision=decision,
        repo=repo,
        pr_number=pr_number,
        defaults={
            "organization": org,
            "pr_node_id": pr_node_id,
            **snapshot,
            "link_source": link_source,
            "linked_by": None,  # webhook-driven; no user attribution
        },
    )

    if not created:
        # Existing row — _refresh_existing_links already updated the
        # cached metadata. We deliberately don't change link_source on
        # update; the original provenance is more useful than the most
        # recent event source.
        return link

    logger.info(
        "Auto-linked decision=%s to %s#%s via %s",
        decision_id, repo.full_name, pr_number, link_source,
    )
    return link


# ---------------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------------

def _parse_datetime(value):
    if not value:
        return None
    if hasattr(value, "tzinfo"):
        return value
    try:
        return parse_datetime(str(value))
    except (TypeError, ValueError):
        return None
