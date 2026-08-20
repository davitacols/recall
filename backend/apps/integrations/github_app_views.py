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

from django.core.cache import cache
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
        "project_id": repo.project_id,
        "project_name": repo.project.name if repo.project_id else None,
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
        metadata = {
            "full_name": r.get("full_name", ""),
            "owner_login": (r.get("owner") or {}).get("login", ""),
            "name": r.get("name", ""),
            "default_branch": r.get("default_branch", ""),
            "private": bool(r.get("private")),
            "archived": bool(r.get("archived")),
            "html_url": r.get("html_url", ""),
            "last_synced_at": now,
        }
        existing = GitHubRepo.objects.filter(
            installation=installation, repo_id=repo_id
        ).first()
        if existing is None:
            # New to us: it starts in the workspace that owns the installation.
            # That is a default, not a rule — it can be reassigned afterwards.
            GitHubRepo.objects.create(
                organization=installation.organization,
                installation=installation,
                repo_id=repo_id,
                **metadata,
            )
        else:
            # Metadata only. organization is deliberately excluded: this runs
            # on every webhook and every manual resync, and including it would
            # drag a repo assigned to another workspace back to the installing
            # one, silently, on a schedule.
            for field, value in metadata.items():
                setattr(existing, field, value)
            existing.save(update_fields=list(metadata.keys()) + ["updated_at"])

    # Repos the install no longer has access to should be detached. We
    # disable rather than delete so historical delivery rows still resolve.
    # Keyed on the installation rather than the organization so repos handed
    # to other workspaces are still covered.
    stale = GitHubRepo.objects.filter(installation=installation).exclude(
        repo_id__in=seen_repo_ids
    )
    stale.update(is_enabled_for_decisions=False)
    return GitHubRepo.objects.filter(
        installation=installation, is_enabled_for_decisions=True
    ).count()


# Per-user install_url state, held in the shared cache.
#
# This was a module-level dict, on the reasoning that a CSRF token living for
# one minute does not need durable storage. That is true, but it does need to
# be *shared*: production runs gunicorn with 3 workers, so install-url/ and
# callback/ are almost never served by the same process. The state was written
# into one worker's memory and looked up in another's, so a legitimate install
# failed with "Install state did not match" about two times in three, and
# retrying only re-rolled the dice. Restarting the backend wiped any in flight.
#
# The cache is Redis (see CACHES in settings), which every worker shares, and
# the TTL replaces the manual sweep the dict needed.
_STATE_PREFIX = "ghapp:install-state:"
_STATE_TTL_SECONDS = 600


def _state_key(token: str) -> str:
    return f"{_STATE_PREFIX}{token}"


def _put_state(token: str, user_id: int, org_id: int) -> None:
    cache.set(
        _state_key(token),
        {"user_id": user_id, "org_id": org_id},
        timeout=_STATE_TTL_SECONDS,
    )


def _pop_state(token: str) -> Optional[dict]:
    """Read a state once. Single-use: a replayed token must not validate."""
    key = _state_key(token)
    record = cache.get(key)
    if record is not None:
        cache.delete(key)
    return record


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

    # State is mandatory. It used to be enforced only when present, so a
    # request with no state skipped the check entirely — and since the binding
    # below trusts request.user.organization, an authenticated user in any
    # workspace could POST another workspace's installation_id (a small,
    # enumerable integer) and take over its GitHub connection, inheriting its
    # repository list and webhook events. Anyone with a stale install URL can
    # simply reconnect; that is a far better outcome than leaving the hole.
    if not state:
        return Response(
            {"error": "Missing install state. Start the connection again from Integrations."},
            status=400,
        )
    record = _pop_state(state)
    if not record or record["user_id"] != request.user.id:
        return Response({"error": "Install state did not match. Try connecting again."}, status=400)

    # An installation belongs to exactly one workspace. Without this, completing
    # the callback from a different workspace silently moved it — the previous
    # owner lost GitHub linking with no notice, and its repo rows were left
    # behind pointing at an installation it no longer held.
    existing = GitHubAppInstallation.objects.filter(installation_id=installation_id).first()
    if existing and existing.organization_id != request.user.organization_id:
        logger.warning(
            "Refused to rebind GitHub installation %s from org %s to org %s (user %s)",
            installation_id, existing.organization_id,
            request.user.organization_id, request.user.id,
        )
        return Response(
            {
                "error": (
                    "This GitHub installation is already connected to another "
                    "workspace. Uninstall the Knoledgr app from that account "
                    "first, or install it on a different account."
                )
            },
            status=409,
        )

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
    """List the workspace's connected repos with their enable/disable state.

    Repos are found by workspace, not by who owns the installation. A
    workspace can be served by an installation another workspace administers —
    that is the point of allowing one GitHub account to feed several — and
    looking the installation up first would show such a workspace nothing.
    """
    org = request.user.organization
    repos = list(GitHubRepo.objects.filter(organization=org).order_by("full_name"))

    installation = GitHubAppInstallation.objects.filter(organization=org).first()
    if installation is None and repos:
        installation = repos[0].installation

    if installation is None:
        return Response({"results": [], "github_app": _serialize_installation(None)})

    return Response({
        "results": [_serialize_repo(r) for r in repos],
        "github_app": _serialize_installation(installation),
        # Where else this user could send a repo. Empty for the common case of
        # someone who only belongs to one workspace.
        "available_workspaces": _sibling_workspaces(request.user),
        # Which projects a repo in this workspace can be the code for.
        "available_projects": _workspace_projects(org),
    })


def _workspace_projects(org) -> list[dict]:
    from apps.agile.models import Project

    return [
        {"id": p.id, "name": p.name, "key": p.key}
        for p in Project.objects.filter(organization=org).order_by("name")
    ]


def _sibling_workspaces(user) -> list[dict]:
    """Workspaces this user belongs to, other than their current one.

    Membership is one User row per workspace, keyed by email — the same rule
    the workspace switcher uses. Reassignment is checked against this so a
    repo can never be handed to a workspace the requester cannot already see.
    """
    from apps.organizations.models import User

    return [
        {"org_id": u.organization_id, "org_name": u.organization.name}
        for u in User.objects.filter(email__iexact=user.email, is_active=True)
        .exclude(organization_id=user.organization_id)
        .select_related("organization")
        .order_by("organization__name")
    ]


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


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def github_app_repo_project(request, repo_pk: int):
    """Say which project a repository is the code for.

    One repo, one project. GitHub holds the code; Knoledgr holds what the team
    decided and why — and in a workspace with several projects those two have
    to line up, or the record becomes one pool covering unrelated work and
    "why is this like this?" gets answered from the wrong project.

    The link is what makes attribution automatic afterwards: a decision reached
    through this repository inherits its project without anyone remembering to
    say so.

    Pass a null org_id to clear it. The project must live in the same workspace
    as the repo — a project from elsewhere would put this workspace's decisions
    under another workspace's heading.
    """
    from apps.agile.models import Project

    if not check_rate_limit(f"github_app_project:{request.user.id}", limit=60, window=3600):
        return Response({"error": "Too many requests"}, status=429)

    repo = GitHubRepo.objects.filter(
        organization=request.user.organization, pk=repo_pk
    ).first()
    if not repo:
        return Response({"error": "Repo not found"}, status=404)

    raw = request.data.get("project_id", "__missing__")
    if raw == "__missing__":
        return Response({"error": "project_id is required (null to clear)"}, status=400)

    if raw in (None, "", "null"):
        repo.project = None
        repo.save(update_fields=["project", "updated_at"])
        return Response(_serialize_repo(repo))

    try:
        project_id = int(raw)
    except (TypeError, ValueError):
        return Response({"error": "project_id must be numeric or null"}, status=400)

    project = Project.objects.filter(
        id=project_id, organization=request.user.organization
    ).first()
    if not project:
        return Response({"error": "Project not found in this workspace"}, status=404)

    # OneToOne means the database would reject this anyway; catching it here
    # turns a 500 into an explanation of the rule.
    taken = GitHubRepo.objects.filter(project=project).exclude(pk=repo.pk).first()
    if taken:
        return Response(
            {"error": f"{project.name} is already the project for {taken.full_name}."},
            status=409,
        )

    repo.project = project
    repo.save(update_fields=["project", "updated_at"])
    logger.info("Repo %s is now the code for project %s", repo.full_name, project_id)
    return Response(_serialize_repo(repo))


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def github_app_repo_workspace(request, repo_pk: int):
    """Move a repo to another workspace this user belongs to.

    GitHub allows one installation per account, so a developer with two
    projects under one login used to be able to connect only one workspace —
    connecting the second silently revoked the first. Which workspace a repo
    feeds is now a property of the repo, and this is how it gets set.

    Two checks, and both matter. The requester must be able to see the repo
    where it is, and must already belong to where it is going: without the
    second, an authenticated user could push a repo into any workspace by id
    and start streaming its pull requests, decisions and review discussion
    into a workspace they have no access to — the same shape of hole as the
    installation rebinding fixed earlier, arriving by a different door.
    """
    from apps.organizations.models import Organization, User

    if not check_rate_limit(f"github_app_move:{request.user.id}", limit=60, window=3600):
        return Response({"error": "Too many requests"}, status=429)

    repo = GitHubRepo.objects.filter(
        organization=request.user.organization, pk=repo_pk
    ).first()
    if not repo:
        return Response({"error": "Repo not found"}, status=404)

    target_id = request.data.get("org_id")
    if not target_id:
        return Response({"error": "org_id is required"}, status=400)
    try:
        target_id = int(target_id)
    except (TypeError, ValueError):
        return Response({"error": "org_id must be numeric"}, status=400)

    if target_id == repo.organization_id:
        return Response(_serialize_repo(repo))

    member = User.objects.filter(
        email__iexact=request.user.email, is_active=True, organization_id=target_id
    ).first()
    if not member:
        logger.warning(
            "Refused to move repo %s to org %s: user %s is not a member",
            repo.full_name, target_id, request.user.id,
        )
        return Response(
            {"error": "You do not have access to that workspace."}, status=403
        )

    target = Organization.objects.filter(id=target_id).first()
    if not target:
        return Response({"error": "Workspace not found"}, status=404)

    previous = repo.organization_id
    repo.organization = target
    # A repo arriving in a new workspace starts disabled. Its decisions and
    # links live in the workspace it came from, so leaving it on would have it
    # commenting immediately against a record that has nothing to say.
    repo.is_enabled_for_decisions = False
    repo.save(update_fields=["organization", "is_enabled_for_decisions", "updated_at"])

    logger.info(
        "Moved repo %s from org %s to org %s (user %s)",
        repo.full_name, previous, target_id, request.user.id,
    )
    # Existing links and file attributions deliberately stay behind: they point
    # at decisions that live in the old workspace, and following the repo would
    # orphan them.
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

    # Repos are not the only thing that drifts. If the admin accepted a
    # permission change while a deploy was rolling, the webhook carrying it is
    # gone for good — this button is then the only way back to the truth.
    try:
        meta = fetch_installation_metadata(installation.installation_id)
        _refresh_permissions(installation, {"installation": meta})
    except Exception as exc:
        logger.warning("Permission refresh during manual resync failed: %s", exc)

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
        # Keyed on the installation, not its owning workspace. A repo assigned
        # to a different workspace still belongs to this installation, and
        # filtering by organization here would silently drop every event for it.
        repo = GitHubRepo.objects.filter(
            installation=installation,
            repo_id=int(repo_payload["id"]),
        ).first()

    action = (payload.get("action") or "")[:64]

    GitHubAppDelivery.objects.create(
        organization=(repo.organization if repo else installation.organization),
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


def _refresh_permissions(installation: GitHubAppInstallation, payload: dict) -> bool:
    """Sync the stored permission set from an installation webhook payload.

    Returns True when the stored set actually changed. Logs the transition,
    because "the permission is granted but the feature is still off" is
    otherwise invisible, and the grant happens on GitHub where we have no
    other signal.
    """
    incoming = (payload.get("installation") or {}).get("permissions")
    if not isinstance(incoming, dict) or not incoming:
        return False

    current = installation.permissions or {}
    if incoming == current:
        return False

    installation.permissions = incoming
    installation.save(update_fields=["permissions", "updated_at"])
    logger.info(
        "Installation %s permissions updated: %s -> %s",
        installation.installation_id, current, incoming,
    )
    return True


def _dispatch_event(event: str, action: str, payload: dict, installation: GitHubAppInstallation, repo):
    """Route an event to the right handler.

    - installation.* — keep our install row in sync with GitHub's view.
    - installation_repositories.* — resync the local repo list.
    - pull_request.* — Phase 3: auto-link via inline marker / branch
      pattern, then refresh cached metadata on any existing DecisionPullRequest
      rows so the decision detail page stays accurate.
    """
    if event == "installation":
        # Every installation event carries the current permission set, and it is
        # the only thing that does. Without this the row keeps whatever was
        # captured at install time forever: an admin can grant pull_requests:
        # write, accept it on GitHub, see it granted there — and the feature
        # stays dormant here with nothing anywhere saying why.
        _refresh_permissions(installation, payload)

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
