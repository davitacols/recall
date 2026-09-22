"""Background checks for external integration state."""

from __future__ import annotations

import logging

from celery import shared_task

from apps.integrations.github_app import get_app_config, list_app_installations
from apps.integrations.github_app_models import (
    GitHubAppDriftCheck,
    GitHubAppInstallation,
)

logger = logging.getLogger(__name__)


@shared_task
def check_github_app_installation_drift():
    """Compare GitHub's App-level installation list with local active rows.

    A webhook cannot report that the row needed to receive it has vanished.
    This independent reconciliation turns that otherwise silent state into a
    persisted health result consumed by the public health endpoint.
    """
    local_ids = set(
        GitHubAppInstallation.objects.filter(revoked_at__isnull=True)
        .values_list("installation_id", flat=True)
    )

    if not get_app_config():
        check = GitHubAppDriftCheck.objects.create(
            status=GitHubAppDriftCheck.STATUS_NOT_CONFIGURED,
            local_installation_count=len(local_ids),
        )
        return {"status": check.status, "checked_at": check.checked_at.isoformat()}

    try:
        remote_rows = list_app_installations()
        remote_ids = {
            int(row["id"])
            for row in remote_rows
            if isinstance(row, dict) and row.get("id") is not None
        }
    except Exception:
        logger.exception("GitHub App installation drift check failed")
        check = GitHubAppDriftCheck.objects.create(
            status=GitHubAppDriftCheck.STATUS_ERROR,
            local_installation_count=len(local_ids),
        )
        return {"status": check.status, "checked_at": check.checked_at.isoformat()}

    missing_locally = sorted(remote_ids - local_ids)
    missing_on_github = sorted(local_ids - remote_ids)
    status = (
        GitHubAppDriftCheck.STATUS_DRIFT
        if missing_locally or missing_on_github
        else GitHubAppDriftCheck.STATUS_HEALTHY
    )
    check = GitHubAppDriftCheck.objects.create(
        status=status,
        local_installation_count=len(local_ids),
        github_installation_count=len(remote_ids),
        missing_locally=missing_locally,
        missing_on_github=missing_on_github,
    )

    if status == GitHubAppDriftCheck.STATUS_DRIFT:
        logger.error(
            "GitHub App installation drift detected: missing_locally=%s missing_on_github=%s",
            missing_locally,
            missing_on_github,
        )

    return {
        "status": status,
        "checked_at": check.checked_at.isoformat(),
        "local_count": len(local_ids),
        "github_count": len(remote_ids),
        "missing_locally": missing_locally,
        "missing_on_github": missing_on_github,
    }
