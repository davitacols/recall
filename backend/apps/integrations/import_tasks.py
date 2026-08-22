"""Walking a repository's merged pull requests in the background.

Capture rides live merge events, so a newly connected repository shows nothing
until the next substantive pull request lands. The management command
`backfill_pr_capture` fixes that from a shell, which is fine for an operator
and useless for a customer: they cannot SSH into the box, so their own history
stays unread and their workspace stays empty on the day it matters most.

This is the same walk, enqueued from the repository row in the interface.

Status lives in the cache rather than a table. It is progress on a job that
runs once and is interesting for about a minute; the durable answer to "did
this work" is the conversations it created, which are already rows. A table
would also mean a migration, and there is an uncommitted one in flight.
"""

from __future__ import annotations

import logging

from celery import shared_task
from django.core.cache import cache

logger = logging.getLogger(__name__)

#: Long enough to read after a job finishes, short enough that a stale
#: "running" from a killed worker clears itself rather than jamming the button.
STATUS_TTL_SECONDS = 60 * 30

#: Merged pull requests examined per run. Each costs three API calls to judge,
#: and beyond this the discussions are old enough that nobody is asking.
DEFAULT_LIMIT = 50

STATUS_QUEUED = "queued"
STATUS_RUNNING = "running"
STATUS_DONE = "done"
STATUS_FAILED = "failed"


def status_key(repo_id: int) -> str:
    return f"ghapp:pr-import:{int(repo_id)}"


def get_status(repo_id: int) -> dict | None:
    return cache.get(status_key(repo_id))


def set_status(repo_id: int, **fields) -> dict:
    current = cache.get(status_key(repo_id)) or {}
    current.update(fields)
    cache.set(status_key(repo_id), current, timeout=STATUS_TTL_SECONDS)
    return current


def clear_status(repo_id: int) -> None:
    cache.delete(status_key(repo_id))


def is_active(state: dict | None) -> bool:
    return bool(state) and state.get("status") in (STATUS_QUEUED, STATUS_RUNNING)


@shared_task(name="integrations.import_repo_pr_history")
def import_repo_pr_history(repo_id: int, limit: int = DEFAULT_LIMIT) -> dict:
    """Capture what can be captured from a repo's already-merged PRs.

    Never raises through to Celery. A failure here is reported to the person
    who pressed the button, and a retry storm on a repository the App has lost
    access to helps nobody.
    """
    from apps.integrations.github_app import list_recent_merged_prs
    from apps.integrations.github_app_models import GitHubRepo
    from apps.integrations.github_pr_capture import (
        already_captured,
        maybe_capture_pr_discussion,
    )

    repo = GitHubRepo.objects.select_related("installation", "organization").filter(
        pk=repo_id
    ).first()
    if not repo:
        return set_status(repo_id, status=STATUS_FAILED, error="Repository not found")

    installation = repo.installation
    if not installation or not installation.is_active:
        return set_status(
            repo_id,
            status=STATUS_FAILED,
            error="The GitHub connection for this repository is no longer active.",
        )

    set_status(
        repo_id, status=STATUS_RUNNING, examined=0, total=0, captured=0,
        already=0, error="",
    )

    try:
        prs = list_recent_merged_prs(
            installation.installation_id, repo.full_name, limit=limit
        )
    except Exception as exc:
        logger.exception("PR import: could not list pulls for %s", repo.full_name)
        return set_status(
            repo_id,
            status=STATUS_FAILED,
            error=f"Could not read pull requests from GitHub: {exc}",
        )

    total = len(prs)
    set_status(repo_id, total=total)

    if not total:
        # Distinct from "nothing met the bar". A repository with no merged pull
        # requests cannot produce anything, ever, and the interface says so
        # rather than reporting a zero that reads like a fault.
        return set_status(
            repo_id, status=STATUS_DONE, examined=0, captured=0, no_pull_requests=True
        )

    captured = 0
    already = 0
    for index, pr in enumerate(prs, start=1):
        # Asked separately, because capture returns None both for a pull
        # request we already hold and for one that did not clear the bar.
        # Telling somebody their discussion was not substantive when we
        # simply had it already is a different statement entirely.
        if already_captured(repo, pr.get("number")):
            already += 1
            set_status(repo_id, examined=index, captured=captured, already=already)
            continue
        try:
            conversation = maybe_capture_pr_discussion(installation, repo, pr)
        except Exception:
            # One unreadable pull request must not end the walk.
            logger.exception(
                "PR import: %s#%s failed", repo.full_name, pr.get("number")
            )
            conversation = None
        if conversation is not None:
            captured += 1
        set_status(repo_id, examined=index, captured=captured, already=already)

    logger.info(
        "PR import: %s captured %d of %d merged PR(s)",
        repo.full_name, captured, total,
    )
    return set_status(
        repo_id, status=STATUS_DONE, examined=total, captured=captured,
        already=already,
    )
