"""PR search + decision linking on top of the GitHub App.

Two surfaces:

1. **PR search** (`GET /api/integrations/github/app/repos/<pk>/pulls/`) —
   used by the picker on the decision detail page to find a PR to link.
   Hits GitHub's `/repos/{owner}/{repo}/pulls` endpoint using the
   installation token, optionally filtered by query string.

2. **Decision-PR linking** (`GET / POST /api/decisions/<id>/github/links/`,
   `DELETE /api/decisions/<id>/github/links/<link_id>/`) — persists a
   structured `DecisionPullRequest` row instead of relying on regex
   scraping of PR body text.
"""

from __future__ import annotations

import logging
from typing import Optional

import requests
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.decisions.models import Decision
from apps.integrations.github_app import (
    GITHUB_API,
    get_installation_token,
)
from apps.integrations.github_app_models import (
    DecisionPullRequest,
    GitHubRepo,
)
from apps.users.auth_utils import check_rate_limit

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _serialize_pr(pr: dict, repo: GitHubRepo) -> dict:
    """Normalize a GitHub PR API response to the shape the frontend renders."""
    user = pr.get("user") or {}
    head = pr.get("head") or {}
    base = pr.get("base") or {}
    return {
        "pr_number": pr.get("number"),
        "pr_node_id": pr.get("node_id") or "",
        "title": pr.get("title") or "",
        "html_url": pr.get("html_url") or "",
        "state": "merged" if pr.get("merged_at") else (pr.get("state") or "open"),
        "author_login": user.get("login") or "",
        "author_avatar_url": user.get("avatar_url") or "",
        "base_branch": base.get("ref") or "",
        "head_branch": head.get("ref") or "",
        "merged_at": pr.get("merged_at"),
        "updated_at": pr.get("updated_at"),
        "body_excerpt": (pr.get("body") or "")[:512],
        "repo": {
            "id": repo.id,
            "full_name": repo.full_name,
            "owner_login": repo.owner_login,
            "name": repo.name,
        },
    }


def _serialize_link(link: DecisionPullRequest) -> dict:
    return {
        "id": link.id,
        "decision_id": link.decision_id,
        "pr_number": link.pr_number,
        "title": link.title,
        "html_url": link.html_url,
        "state": link.state,
        "author_login": link.author_login,
        "author_avatar_url": link.author_avatar_url,
        "base_branch": link.base_branch,
        "head_branch": link.head_branch,
        "merged_at": link.merged_at.isoformat() if link.merged_at else None,
        "pr_updated_at": link.pr_updated_at.isoformat() if link.pr_updated_at else None,
        "linked_at": link.linked_at.isoformat() if link.linked_at else None,
        "link_source": link.link_source,
        "linked_by": link.linked_by.get_full_name() if link.linked_by else None,
        "repo": {
            "id": link.repo_id,
            "full_name": link.repo.full_name,
        },
    }


def _decision_or_404(org, decision_id):
    return Decision.objects.filter(organization=org, id=decision_id).first()


# ---------------------------------------------------------------------------
# PR search
# ---------------------------------------------------------------------------

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def github_app_repo_pulls(request, repo_pk: int):
    """List PRs on a connected repo, optionally filtered by query.

    Query params:
        state — open | closed | all (default: open)
        q     — case-insensitive substring filter on title or author login
        limit — max results to return (default 20, max 50)

    GitHub paginates; we pull the first 100 then filter client-side. The
    picker only needs recent matches, so this is fine for the standard
    case of "I just opened this PR" within the last few weeks.
    """
    if not check_rate_limit(f"github_app_pulls:{request.user.id}", limit=120, window=3600):
        return Response({"error": "Too many requests"}, status=429)

    repo = GitHubRepo.objects.filter(
        organization=request.user.organization, pk=repo_pk
    ).first()
    if not repo:
        return Response({"error": "Repo not found"}, status=404)
    if not repo.is_enabled_for_decisions:
        return Response({"error": "Repo is disabled for decision tracking"}, status=400)

    state = (request.GET.get("state") or "open").lower()
    if state not in {"open", "closed", "all"}:
        state = "open"
    q = (request.GET.get("q") or "").strip().lower()
    try:
        limit = max(1, min(50, int(request.GET.get("limit") or 20)))
    except (TypeError, ValueError):
        limit = 20

    try:
        token = get_installation_token(repo.installation.installation_id)
    except Exception as exc:
        logger.exception("PR list failed (token mint): %s", exc)
        return Response({"error": "Could not authenticate with GitHub. Reconnect the App."}, status=502)

    try:
        resp = requests.get(
            f"{GITHUB_API}/repos/{repo.owner_login}/{repo.name}/pulls",
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
            },
            params={"state": state, "per_page": 100, "sort": "updated", "direction": "desc"},
            timeout=15,
        )
    except requests.RequestException as exc:
        logger.warning("GitHub PR list network error: %s", exc)
        return Response({"error": "Could not reach GitHub. Please retry."}, status=502)

    if resp.status_code != 200:
        logger.warning("GitHub PR list rejected (%s): %s", resp.status_code, resp.text[:200])
        return Response({"error": f"GitHub returned {resp.status_code}"}, status=502)

    raw = resp.json() if isinstance(resp.json(), list) else []
    items = []
    for pr in raw:
        if q:
            blob = f"{pr.get('title') or ''} {(pr.get('user') or {}).get('login') or ''} #{pr.get('number') or ''}".lower()
            if q not in blob:
                continue
        items.append(_serialize_pr(pr, repo))
        if len(items) >= limit:
            break

    return Response({"results": items, "repo": {
        "id": repo.id, "full_name": repo.full_name, "default_branch": repo.default_branch,
    }})


# ---------------------------------------------------------------------------
# Decision-PR linking
# ---------------------------------------------------------------------------

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def decision_github_links(request, decision_id: int):
    """List or create persistent decision↔PR links."""
    org = request.user.organization
    decision = _decision_or_404(org, decision_id)
    if not decision:
        return Response({"error": "Decision not found"}, status=404)

    if request.method == "GET":
        links = (
            DecisionPullRequest.objects
            .filter(decision=decision, organization=org)
            .select_related("repo")
            .order_by("-linked_at")
        )
        return Response({"results": [_serialize_link(l) for l in links]})

    # POST
    if not check_rate_limit(f"github_pr_link:{request.user.id}", limit=120, window=3600):
        return Response({"error": "Too many requests"}, status=429)

    data = request.data or {}
    repo_id = data.get("repo_id")
    pr_number = data.get("pr_number")
    if not repo_id or not pr_number:
        return Response({"error": "repo_id and pr_number are required"}, status=400)

    try:
        repo_id = int(repo_id)
        pr_number = int(pr_number)
    except (TypeError, ValueError):
        return Response({"error": "repo_id and pr_number must be integers"}, status=400)

    repo = GitHubRepo.objects.filter(organization=org, pk=repo_id).first()
    if not repo:
        return Response({"error": "Repo not found in this workspace"}, status=404)

    # Pull a fresh copy of the PR from GitHub so we cache accurate metadata
    # on the link row. The picker has already shown this PR so the call
    # ought to succeed, but we guard against repo permission changes
    # between picker render and link.
    try:
        token = get_installation_token(repo.installation.installation_id)
        resp = requests.get(
            f"{GITHUB_API}/repos/{repo.owner_login}/{repo.name}/pulls/{pr_number}",
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
            },
            timeout=15,
        )
    except Exception as exc:
        logger.exception("PR link fetch failed: %s", exc)
        return Response({"error": "Could not fetch PR from GitHub."}, status=502)

    if resp.status_code == 404:
        return Response({"error": "PR not found on GitHub"}, status=404)
    if resp.status_code != 200:
        return Response({"error": f"GitHub returned {resp.status_code}"}, status=502)

    pr = resp.json()
    user = pr.get("user") or {}
    head = pr.get("head") or {}
    base = pr.get("base") or {}

    pr_updated_at = pr.get("updated_at")
    merged_at = pr.get("merged_at")
    state = "merged" if merged_at else (pr.get("state") or "open")

    link, _ = DecisionPullRequest.objects.update_or_create(
        decision=decision,
        repo=repo,
        pr_number=pr_number,
        defaults={
            "organization": org,
            "pr_node_id": pr.get("node_id") or "",
            "title": (pr.get("title") or "")[:512],
            "html_url": (pr.get("html_url") or "")[:512],
            "state": state,
            "author_login": (user.get("login") or "")[:128],
            "author_avatar_url": (user.get("avatar_url") or "")[:512],
            "base_branch": (base.get("ref") or "")[:255],
            "head_branch": (head.get("ref") or "")[:255],
            "body_excerpt": ((pr.get("body") or ""))[:512],
            "merged_at": merged_at,
            "pr_updated_at": pr_updated_at,
            "link_source": DecisionPullRequest.LINK_SOURCE_MANUAL,
            "linked_by": request.user,
        },
    )
    return Response(_serialize_link(link), status=201)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def decision_github_link_detail(request, decision_id: int, link_id: int):
    """Remove a decision↔PR link."""
    org = request.user.organization
    decision = _decision_or_404(org, decision_id)
    if not decision:
        return Response({"error": "Decision not found"}, status=404)
    link = DecisionPullRequest.objects.filter(
        organization=org, decision=decision, id=link_id
    ).first()
    if not link:
        return Response({"error": "Link not found"}, status=404)
    link.delete()
    return Response(status=204)
