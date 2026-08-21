"""Start and watch a one-off import of a repository's merged pull requests.

Lives in its own module rather than beside the other repo endpoints because it
is a self-contained pair, and github_app_views.py is already the busiest file
in the app.

Two endpoints, both scoped to the requesting user's workspace:

    POST /github/app/repos/<pk>/import/    start one
    GET  /github/app/repos/<pk>/import/    where it got to
"""

from __future__ import annotations

import logging

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.integrations.github_app_models import GitHubRepo
from apps.integrations.import_tasks import (
    DEFAULT_LIMIT,
    STATUS_QUEUED,
    get_status,
    import_repo_pr_history,
    is_active,
    set_status,
)
from apps.users.auth_utils import check_rate_limit

logger = logging.getLogger(__name__)


def _repo_or_none(request, repo_pk: int):
    return GitHubRepo.objects.select_related("installation").filter(
        organization=request.user.organization, pk=repo_pk
    ).first()


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def github_app_repo_import(request, repo_pk: int):
    """Import the discussion on pull requests that merged before we watched.

    Capture is forward-only, so a repository connected today shows nothing
    until the next substantive merge — possibly a fortnight, since most merges
    are deliberately skipped. The team's own history is the best demonstration
    the product has, and without this it is only reachable from a shell on the
    server, which no customer has.
    """
    repo = _repo_or_none(request, repo_pk)
    if not repo:
        return Response({"error": "Repo not found"}, status=404)

    state = get_status(repo.id)

    if request.method == "GET":
        return Response(_serialize(repo, state))

    if is_active(state):
        # Pressing twice must not queue twice. The second press is almost
        # always impatience with a job that is already running.
        return Response(_serialize(repo, state), status=202)

    installation = repo.installation
    if not installation or not installation.is_active:
        return Response(
            {"error": "The GitHub connection for this repository is no longer active."},
            status=409,
        )
    if not repo.is_enabled_for_decisions:
        return Response(
            {"error": "This repository is switched off for decisions."},
            status=409,
        )

    # Deliberately tight. A full run is up to 150 GitHub API calls, and there
    # is no reason to start one repeatedly.
    if not check_rate_limit(
        f"github_pr_import:{request.user.id}", action="github_pr_import",
        limit=10, window=3600,
    ):
        return Response(
            {"error": "Too many imports started. Try again later."}, status=429
        )

    state = set_status(
        repo.id, status=STATUS_QUEUED, examined=0, total=0, captured=0, error="",
        no_pull_requests=False,
    )
    import_repo_pr_history.delay(repo.id, DEFAULT_LIMIT)
    logger.info(
        "PR import queued for %s by user %s", repo.full_name, request.user.id
    )
    return Response(_serialize(repo, state), status=202)


def _serialize(repo: GitHubRepo, state: dict | None) -> dict:
    from apps.conversations.models import Conversation

    captured_total = Conversation.objects.filter(
        organization_id=repo.organization_id,
        source=Conversation.SOURCE_GITHUB_PR,
        external_id__startswith=f"{repo.repo_id}:",
    ).count()

    payload = {
        "repo_id": repo.id,
        "full_name": repo.full_name,
        # The durable answer to "did this ever work" is the conversations that
        # exist, not the cached status of the last run.
        "conversations_captured_total": captured_total,
        "status": None,
    }
    if state:
        payload.update({
            "status": state.get("status"),
            "examined": state.get("examined", 0),
            "total": state.get("total", 0),
            "captured": state.get("captured", 0),
            "error": state.get("error", ""),
            "no_pull_requests": bool(state.get("no_pull_requests")),
        })
    return payload
