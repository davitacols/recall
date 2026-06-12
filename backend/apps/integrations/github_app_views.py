"""HTTP endpoints for the GitHub App integration.

Three surfaces:

1. **Install flow** — produce an install URL with state CSRF, accept the
   GitHub redirect, persist the installation + repos.
2. **Repo management** — list, toggle enable/disable per repo, manually
   resync the repo list.
3. **Webhook receiver** — verify GitHub's signature, persist a delivery
   audit row, dispatch to event handlers.

The legacy PAT-based endpoints in github_endpoints.py stay live so existing
workspaces keep working until they reconnect.
"""

from __future__ import annotations

import hashlib
import json
import logging
import secrets
from typing import Optional

from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.integrations.github_app import (
    fetch_installation_metadata,
    get_app_config,
    invalidate_installation_token,
    list_installation_repos,
    verify_webhook_signature,
)
from apps.integrations.github_app_models import (
    DecisionPullRequest,
    GitHubAppDelivery,
    GitHubAppInstallation,
    GitHubRepo,
)
from apps.users.auth_utils import check_rate_limit

# Phase 3 linking handlers
from apps.integrations.github_app_linkers import (
    handle_pull_request_event,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _serialize_installation(installation: Optional[GitHubAppInstallation]) -> dict:
    if not installation:
        return {"connected": False}
    return {
        "connected": True,
        "installation_id": installation.installation_id,
        "account_login": installation.account_login,
        "account_type": installation.account_type,
        "account_avatar_url": installation.account_avatar_url,
        "repository_selection": installation.repository_selection,
        "permissions": installation.permissions,
        "is_active": installation.is_active,
        "suspended_at": installation.suspended_at.isoformat() if installation.suspended_at else None,
        "revoked_at": installation.revoked_at.isoformat() if installation.revoked_at else None,
        "created_at": installation.created_at.isoformat() if installation.created_at else None,
        "installed_by": (
            installation.installed_by.get_full_name() if installation.installed_by else None
        ),
        "repo_count": installation.repos.count(),
    }


def _serialize_repo(repo: GitHubRepo) -> dict:
    return {
        "id": repo.id,
        "repo_id": repo.repo_id,
        "full_name": repo.full_name,
        "owner_login": repo.owner_login,
        "name": repo.name,
        "default_branch": repo.default_branch,
        "private": repo.private,
        "archived": repo.archived,
        "html_url": repo.html_url,
        "is_enabled_for_decisions": repo.is_enabled_for_decisions,
        "last_synced_at": repo.last_synced_at.isoformat() if repo.last_synced_at else None,
    }


def _sync_installation_repos(installation: GitHubAppInstallation) -> int:
    """Pull the current repo list from GitHub and reconcile our local rows.

    Returns the count of repos that ended up enabled after sync.
    """
    repos = list_installation_repos(installation.installation_id)
    now = timezone.now()
    seen_repo_ids = set()
    for r in repos:
        repo_id = int(r["id"])
        seen_repo_ids.add(repo_id)
        GitHubRepo.objects.update_or_create(
            organization=installation.organization,
            repo_id=repo_id,
            defaults={
                "installation": installation,
                "full_name": r.get("full_name", ""),
                "owner_login": (r.get("owner") or {}).get("login", ""),
                "name": r.get("name", ""),
                "default_branch": r.get("default_branch", ""),
                "private": bool(r.get("private")),
                "archived": bool(r.get("archived")),
                "html_url": r.get("html_url", ""),
                "last_synced_at": now,
            },
        )
    # Repos the install no longer has access to should be detached. We
    # disable rather than delete so historical delivery rows still resolve.
    stale = GitHubRepo.objects.filter(
        organization=installation.organization, installation=installation
    ).exclude(repo_id__in=seen_repo_ids)
    stale.update(is_enabled_for_decisions=False)
    return GitHubRepo.objects.filter(
        organization=installation.organization, is_enabled_for_decisions=True
    ).count()


# Per-user install_url state cache. Memory-only is fine for a CSRF token
# that lives for one minute and can fall back to "missing state" message.
_install_states: dict[str, dict] = {}


def _put_state(token: str, user_id: int, org_id: int) -> None:
    _install_states[token] = {
        "user_id": user_id,
        "org_id": org_id,
        "created_at": timezone.now().timestamp(),
    }
    # Sweep stale states older than 10 minutes
    now = timezone.now().timestamp()
    for k in list(_install_states.keys()):
        if now - _install_states[k]["created_at"] > 600:
            _install_states.pop(k, None)


def _pop_state(token: str) -> Optional[dict]:
    return _install_states.pop(token, None)


# ---------------------------------------------------------------------------
# Install flow
# ---------------------------------------------------------------------------

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def github_app_install_url(request):
    """Return the GitHub App install URL with a state token.

    Frontend opens this URL in a popup (or top-level window) and once the
    user picks an org + repos and accepts, GitHub redirects to our
    pre-registered setup URL with the installation_id appended. The
    frontend then calls github_app_install_callback with both ids.
    """
    cfg = get_app_config()
    if not cfg:
        return Response(
            {"error": "GitHub App is not configured for this deployment"},
            status=503,
        )

    state = secrets.token_urlsafe(24)
    _put_state(state, request.user.id, request.user.organization_id)

    return Response({
        "install_url": f"{cfg.install_url}?state={state}",
        "state": state,
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def github_app_install_callback(request):
    """Persist a new installation after GitHub redirects back.

    Body: { "installation_id": int, "state": str }
    The frontend gets these from the GitHub redirect URL parameters.
    """
    if not check_rate_limit(f"github_app_callback:{request.user.id}", limit=20, window=3600):
        return Response({"error": "Too many requests"}, status=429)

    installation_id = request.data.get("installation_id")
    state = (request.data.get("state") or "").strip()
    if not installation_id:
        return Response({"error": "installation_id is required"}, status=400)

    try:
        installation_id = int(installation_id)
    except (TypeError, ValueError):
        return Response({"error": "installation_id must be numeric"}, status=400)

    # CSRF: state must match the one we issued for this user. We don't fail
    # hard if state is missing (the frontend can also accept a callback
    # without state for users who opened a stale install URL), but if state
    # is present we enforce it.
    if state:
        record = _pop_state(state)
        if not record or record["user_id"] != request.user.id:
            return Response({"error": "Install state did not match. Try connecting again."}, status=400)

    # Fetch the install record from GitHub to confirm it actually exists
    # and the App has access. This also gives us account_login + permissions.
    try:
        meta = fetch_installation_metadata(installation_id)
    except Exception as exc:
        logger.exception("Failed to fetch installation metadata: %s", exc)
        return Response(
            {"error": "Could not verify the install with GitHub. Please retry."},
            status=502,
        )

    account = meta.get("account") or {}

    installation, _ = GitHubAppInstallation.objects.update_or_create(
        installation_id=installation_id,
        defaults={
            "organization": request.user.organization,
            "account_id": account.get("id") or 0,
            "account_login": account.get("login", "")[:128],
            "account_type": account.get("type") or GitHubAppInstallation.ACCOUNT_ORG,
            "account_avatar_url": (account.get("avatar_url") or "")[:512],
            "permissions": meta.get("permissions") or {},
            "repository_selection": meta.get("repository_selection") or "selected",
            "suspended_at": None,
            "revoked_at": None,
            "installed_by": request.user,
        },
    )

    # Sync the repos in the background — synchronous here for the install
    # response, but a worker could pick it up later for very large installs.
    try:
        _sync_installation_repos(installation)
    except Exception as exc:
        logger.exception("Repo sync failed after install: %s", exc)
        # Don't fail the install — the admin can hit "Resync" from the UI.

    return Response({
        "github_app": _serialize_installation(installation),
        "message": "GitHub App connected",
    })


@api_view(["GET", "DELETE"])
@permission_classes([IsAuthenticated])
def github_app_installation(request):
    """Read or delete the workspace's GitHub App connection."""
    installation = GitHubAppInstallation.objects.filter(
        organization=request.user.organization
    ).first()

    if request.method == "DELETE":
        if not installation:
            return Response({"github_app": _serialize_installation(None)})
        if not check_rate_limit(f"github_app_disconnect:{request.user.id}", limit=20, window=3600):
            return Response({"error": "Too many requests"}, status=429)
        invalidate_installation_token(installation.installation_id)
        installation.delete()
        return Response({
            "message": "GitHub App disconnected on the Knoledgr side. To revoke at the GitHub side, uninstall the App from your GitHub organization settings.",
            "github_app": _serialize_installation(None),
        })

    return Response({"github_app": _serialize_installation(installation)})


# ---------------------------------------------------------------------------
# Repo management
# ---------------------------------------------------------------------------

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def github_app_repos(request):
    """List the workspace's connected repos with their enable/disable state."""
    installation = GitHubAppInstallation.objects.filter(
        organization=request.user.organization
    ).first()
    if not installation:
        return Response({"results": [], "github_app": _serialize_installation(None)})

    repos = GitHubRepo.objects.filter(organization=request.user.organization).order_by("full_name")
    return Response({
        "results": [_serialize_repo(r) for r in repos],
        "github_app": _serialize_installation(installation),
    })


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def github_app_repo_toggle(request, repo_pk: int):
    """Toggle is_enabled_for_decisions for a single repo."""
    if not check_rate_limit(f"github_app_toggle:{request.user.id}", limit=120, window=3600):
        return Response({"error": "Too many requests"}, status=429)

    repo = GitHubRepo.objects.filter(
        organization=request.user.organization, pk=repo_pk
    ).first()
    if not repo:
        return Response({"error": "Repo not found"}, status=404)

    is_enabled = request.data.get("is_enabled_for_decisions")
    if is_enabled is None:
        return Response({"error": "is_enabled_for_decisions is required"}, status=400)
    repo.is_enabled_for_decisions = bool(is_enabled)
    repo.save(update_fields=["is_enabled_for_decisions", "updated_at"])
    return Response(_serialize_repo(repo))


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def github_app_resync(request):
    """Force a fresh sync of the repo list from GitHub.

    Useful when the admin granted access to additional repos in GitHub
    after the initial install — GitHub does fire installation_repositories
    webhooks for that, but if our webhook receiver missed one (e.g.
    deployment was rolling), this gives the admin a manual recovery path.
    """
    if not check_rate_limit(f"github_app_resync:{request.user.id}", limit=30, window=3600):
        return Response({"error": "Too many requests"}, status=429)

    installation = GitHubAppInstallation.objects.filter(
        organization=request.user.organization
    ).first()
    if not installation:
        return Response({"error": "GitHub App is not connected for this workspace"}, status=400)

    try:
        enabled_count = _sync_installation_repos(installation)
    except Exception as exc:
        logger.exception("Manual resync failed: %s", exc)
        return Response(
            {"error": "Could not sync repos with GitHub. Please retry shortly."},
            status=502,
        )

    return Response({
        "message": f"Synced repos with GitHub. {enabled_count} enabled for decisions.",
        "results": [
            _serialize_repo(r)
            for r in GitHubRepo.objects.filter(
                organization=request.user.organization
            ).order_by("full_name")
        ],
    })


# ---------------------------------------------------------------------------
# Webhook receiver
# ---------------------------------------------------------------------------

@csrf_exempt
@api_view(["POST"])
@permission_classes([])
def github_app_webhook(request):
    """Receive a webhook from the Knoledgr GitHub App.

    Steps:
    1. Verify X-Hub-Signature-256 against our shared secret.
    2. Parse the body, find the installation_id.
    3. Resolve the installation to a Knoledgr organization.
    4. Persist an audit row.
    5. Dispatch to a handler for the event type.

    Always returns 200 once signature verification passes, even when we
    can't find a matching installation — GitHub considers any 4xx/5xx a
    redelivery candidate and we'd rather not churn on installs we don't
    own (e.g. a stale install_id from a deleted org).
    """
    body = request.body or b""
    signature = request.META.get("HTTP_X_HUB_SIGNATURE_256", "")
    event = request.META.get("HTTP_X_GITHUB_EVENT", "")
    delivery_id = request.META.get("HTTP_X_GITHUB_DELIVERY", "")

    signature_valid = verify_webhook_signature(body, signature)
    if not signature_valid:
        # We deliberately don't 401 here. Returning 200 prevents retry
        # storms from spoofed senders; the audit row records the bad sig.
        logger.warning("GitHub webhook signature mismatch (event=%s)", event)
        return Response({"status": "ignored"})

    try:
        payload = json.loads(body.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        return Response({"status": "ignored"})

    installation_id = (payload.get("installation") or {}).get("id")
    if not installation_id:
        # System events (e.g. ping, github_app_authorization) have no
        # installation — we acknowledge but don't act.
        return Response({"status": "ok"})

    installation = GitHubAppInstallation.objects.filter(
        installation_id=int(installation_id)
    ).first()
    if not installation:
        # An install we don't have a row for — either pre-storage race or
        # a stale install for a deleted workspace.
        logger.info("Webhook for unknown installation_id=%s event=%s", installation_id, event)
        return Response({"status": "ok"})

    # Find or null the repo
    repo_payload = payload.get("repository") or {}
    repo = None
    if repo_payload.get("id"):
        repo = GitHubRepo.objects.filter(
            organization=installation.organization,
            repo_id=int(repo_payload["id"]),
        ).first()

    action = (payload.get("action") or "")[:64]

    GitHubAppDelivery.objects.create(
        organization=installation.organization,
        installation=installation,
        repo=repo,
        event=(event or "")[:64],
        action=action,
        delivery_id=(delivery_id or "")[:255],
        signature_valid=True,
        status="received",
        summary=_summarize(event, action, payload)[:512],
    )

    # Dispatch to handlers. These are best-effort; failures are logged
    # but don't propagate so GitHub doesn't retry on our internal bugs.
    try:
        _dispatch_event(event, action, payload, installation, repo)
    except Exception as exc:
        logger.exception("Webhook dispatch failed (event=%s, action=%s): %s", event, action, exc)

    return Response({"status": "ok"})


def _summarize(event: str, action: str, payload: dict) -> str:
    """Build a short, human-readable summary for the delivery audit row."""
    repo = (payload.get("repository") or {}).get("full_name") or "?"
    if event == "pull_request":
        pr = payload.get("pull_request") or {}
        return f"{event}.{action}: {repo} #{pr.get('number', '?')} {pr.get('title', '')}"
    if event == "push":
        commits = payload.get("commits") or []
        return f"push: {repo} {len(commits)} commit(s) by {payload.get('pusher', {}).get('name', '?')}"
    if event == "installation":
        return f"installation.{action}: {payload.get('installation', {}).get('account', {}).get('login', '?')}"
    if event == "installation_repositories":
        added = len(payload.get("repositories_added") or [])
        removed = len(payload.get("repositories_removed") or [])
        return f"installation_repositories.{action}: +{added} -{removed} repos"
    return f"{event}{('.' + action) if action else ''}: {repo}"


def _dispatch_event(event: str, action: str, payload: dict, installation: GitHubAppInstallation, repo):
    """Route an event to the right handler.

    - installation.* — keep our install row in sync with GitHub's view.
    - installation_repositories.* — resync the local repo list.
    - pull_request.* — Phase 3: auto-link via inline marker / branch
      pattern, then refresh cached metadata on any existing DecisionPullRequest
      rows so the decision detail page stays accurate.
    """
    if event == "installation":
        if action in ("suspend", "suspended"):
            installation.suspended_at = timezone.now()
            installation.save(update_fields=["suspended_at", "updated_at"])
            invalidate_installation_token(installation.installation_id)
        elif action in ("unsuspend", "unsuspended"):
            installation.suspended_at = None
            installation.save(update_fields=["suspended_at", "updated_at"])
        elif action in ("deleted", "delete"):
            installation.revoked_at = timezone.now()
            installation.save(update_fields=["revoked_at", "updated_at"])
            invalidate_installation_token(installation.installation_id)
        return

    if event == "installation_repositories":
        # Repo selection changed at the GitHub side — resync our local list.
        try:
            _sync_installation_repos(installation)
        except Exception as exc:
            logger.warning("installation_repositories resync failed: %s", exc)
        return

    if event == "pull_request" and repo is not None:
        try:
            handle_pull_request_event(action, payload, installation, repo)
        except Exception as exc:
            logger.warning("pull_request handler failed (action=%s): %s", action, exc)
        return

    # Push, pull_request_review, deployment_status etc. fall through and
    # only land in the audit row for now. The hooks are in place to add
    # per-event behavior without touching the receiver itself.
    return
