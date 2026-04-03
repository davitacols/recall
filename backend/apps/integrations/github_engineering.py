from __future__ import annotations

import re

import requests
from django.conf import settings
from django.db.models import Q
from django.utils import timezone
from django.utils.text import slugify

from apps.agile.models import (
    CodeCommit,
    DecisionIssueLink,
    Deployment,
    Issue,
    PullRequest as AgilePullRequest,
)
from apps.integrations.models import (
    Commit as IntegrationCommit,
    GitHubIntegration,
    PullRequest as IntegrationPullRequest,
)

PR_URL_RE = re.compile(r"github\.com/([^/]+)/([^/]+)/pull/(\d+)", re.IGNORECASE)


def _iso(value):
    return value.isoformat() if value else None


def _public_api_url(path, request=None):
    base_url = (getattr(settings, "PUBLIC_API_URL", "") or "").strip().rstrip("/")
    if not base_url and request:
        base_url = request.build_absolute_uri("/").rstrip("/")
    if not base_url:
        return None
    normalized_path = path if str(path).startswith("/") else f"/{path}"
    return f"{base_url}{normalized_path}"


def extract_github_pr_metadata(pr_url):
    match = PR_URL_RE.search(pr_url or "")
    if not match:
        return None
    owner, repo, pr_number = match.groups()
    return {
        "owner": owner,
        "repo": repo,
        "pr_number": int(pr_number),
    }


def _webhook_readiness_payload(config, request=None):
    if not config:
        return {
            "state": "not_configured",
            "label": "Not configured",
            "detail": "Connect a GitHub repository to enable webhooks, pull request linking, and delivery signals.",
            "webhook_url": None,
        }

    webhook_url = None
    if request or getattr(settings, "PUBLIC_API_URL", ""):
        webhook_url = _public_api_url("/api/integrations/github/webhook/", request=request)

    if not config.enabled:
        state = "disabled"
        label = "Disabled"
        detail = "GitHub is configured but disabled for this workspace."
    elif config.get_webhook_secret():
        state = "ready"
        label = "Ready"
        detail = "Webhook secret is configured. Point GitHub pull_request and push events to the webhook URL."
    else:
        state = "missing_secret"
        label = "Missing secret"
        detail = "Add a webhook secret so GitHub can deliver verified pull_request and push events."

    return {
        "state": state,
        "label": label,
        "detail": detail,
        "webhook_url": webhook_url,
    }


def _serialize_webhook_delivery(delivery):
    return {
        "id": delivery.id,
        "event": delivery.event,
        "action": delivery.action,
        "delivery_id": delivery.delivery_id,
        "processing_state": delivery.processing_state,
        "status_code": delivery.status_code,
        "signature_valid": delivery.signature_valid,
        "message": delivery.message,
        "repository_owner": delivery.repository_owner,
        "repository_name": delivery.repository_name,
        "summary": delivery.summary or {},
        "created_at": _iso(delivery.created_at),
    }


def get_webhook_observability(config):
    if not config:
        return {
            "health": "not_configured",
            "last_delivery_at": None,
            "last_success_at": None,
            "recent_failure_count": 0,
            "recent_processed_count": 0,
            "recent_ignored_count": 0,
            "recent_deliveries": [],
        }

    deliveries = list(config.webhook_deliveries.order_by("-created_at")[:8])
    last_delivery = deliveries[0] if deliveries else None
    last_success = next((item for item in deliveries if item.processing_state == "processed"), None)
    recent_failure_count = sum(1 for item in deliveries if item.processing_state == "failed")
    recent_processed_count = sum(1 for item in deliveries if item.processing_state == "processed")
    recent_ignored_count = sum(1 for item in deliveries if item.processing_state == "ignored")

    if not deliveries:
        health = "awaiting_events"
    elif recent_failure_count and recent_processed_count == 0:
        health = "failing"
    elif recent_failure_count:
        health = "attention"
    else:
        health = "healthy"

    return {
        "health": health,
        "last_delivery_at": _iso(last_delivery.created_at) if last_delivery else None,
        "last_success_at": _iso(last_success.created_at) if last_success else None,
        "recent_failure_count": recent_failure_count,
        "recent_processed_count": recent_processed_count,
        "recent_ignored_count": recent_ignored_count,
        "recent_deliveries": [_serialize_webhook_delivery(item) for item in deliveries],
    }


def _serialize_recent_stored_activity(organization, limit=8):
    items = []

    for pr in IntegrationPullRequest.objects.filter(organization=organization).order_by("-created_at")[:limit]:
        items.append(
            {
                "type": "pull_request",
                "source": "decision_link",
                "title": pr.title or f"PR #{pr.pr_number}",
                "subtitle": f"{pr.status} · #{pr.pr_number}",
                "author": pr.author,
                "url": pr.pr_url,
                "timestamp": _iso(pr.merged_at or pr.closed_at or pr.created_at),
            }
        )

    for pr in AgilePullRequest.objects.filter(organization=organization).select_related("issue").order_by("-created_at")[:limit]:
        items.append(
            {
                "type": "pull_request",
                "source": "issue_execution",
                "title": pr.title or f"PR #{pr.pr_number}",
                "subtitle": f"{pr.status} · {pr.issue.key if pr.issue else 'Unlinked issue'}",
                "author": pr.author,
                "url": pr.url,
                "timestamp": _iso(pr.merged_at or pr.created_at),
            }
        )

    for commit in IntegrationCommit.objects.filter(organization=organization).select_related("decision").order_by("-committed_at")[:limit]:
        items.append(
            {
                "type": "commit",
                "source": "decision_link",
                "title": (commit.message or "").splitlines()[0][:120] or commit.sha[:8],
                "subtitle": commit.decision.title if commit.decision else commit.sha[:8],
                "author": commit.author,
                "url": commit.commit_url,
                "timestamp": _iso(commit.committed_at),
            }
        )

    for commit in CodeCommit.objects.filter(organization=organization).select_related("issue").order_by("-created_at")[:limit]:
        items.append(
            {
                "type": "commit",
                "source": "issue_execution",
                "title": (commit.message or "").splitlines()[0][:120] or commit.commit_hash[:8],
                "subtitle": commit.issue.key if commit.issue else commit.commit_hash[:8],
                "author": commit.author,
                "url": commit.url,
                "timestamp": _iso(commit.created_at),
            }
        )

    for deployment in Deployment.objects.filter(organization=organization).order_by("-deployed_at", "-created_at")[:limit]:
        items.append(
            {
                "type": "deployment",
                "source": "delivery",
                "title": f"{deployment.environment} deployment",
                "subtitle": deployment.status,
                "author": deployment.deployed_by,
                "url": deployment.url,
                "timestamp": _iso(deployment.deployed_at or deployment.created_at),
            }
        )

    items.sort(key=lambda item: item.get("timestamp") or "", reverse=True)
    deduped = []
    seen = set()
    for item in items:
        key = (item.get("type"), item.get("url"), item.get("timestamp"))
        if key in seen:
            continue
        seen.add(key)
        deduped.append(item)
        if len(deduped) >= limit:
            break
    return deduped


def get_recent_github_activity(organization, config=None, limit=8, include_remote=False):
    activity = _serialize_recent_stored_activity(organization, limit=limit)
    if not include_remote or not config:
        return activity[:limit]

    headers = {"Authorization": f"token {config.get_access_token()}"}
    remote = []
    try:
        commits_url = f"https://api.github.com/repos/{config.repo_owner}/{config.repo_name}/commits"
        commits_resp = requests.get(commits_url, headers=headers, params={"per_page": limit}, timeout=5)
        if commits_resp.status_code == 200:
            for commit in commits_resp.json():
                remote.append(
                    {
                        "type": "commit",
                        "source": "github_remote",
                        "title": commit.get("commit", {}).get("message", "").split("\n")[0],
                        "subtitle": config.repo_name,
                        "author": commit.get("commit", {}).get("author", {}).get("name", ""),
                        "url": commit.get("html_url"),
                        "timestamp": commit.get("commit", {}).get("author", {}).get("date"),
                    }
                )
    except Exception:
        pass

    try:
        prs_url = f"https://api.github.com/repos/{config.repo_owner}/{config.repo_name}/pulls"
        prs_resp = requests.get(prs_url, headers=headers, params={"per_page": limit, "state": "all"}, timeout=5)
        if prs_resp.status_code == 200:
            for pr in prs_resp.json():
                remote.append(
                    {
                        "type": "pull_request",
                        "source": "github_remote",
                        "title": pr.get("title", ""),
                        "subtitle": pr.get("state", ""),
                        "author": pr.get("user", {}).get("login", ""),
                        "url": pr.get("html_url"),
                        "timestamp": pr.get("merged_at") or pr.get("updated_at") or pr.get("created_at"),
                    }
                )
    except Exception:
        pass

    merged = activity + remote
    merged.sort(key=lambda item: item.get("timestamp") or "", reverse=True)
    deduped = []
    seen = set()
    for item in merged:
        key = (item.get("type"), item.get("url"))
        if key in seen:
            continue
        seen.add(key)
        deduped.append(item)
        if len(deduped) >= limit:
            break
    return deduped


def serialize_github_config(config, request=None, include_remote_activity=False):
    if not config:
        return {
            "configured": False,
            "enabled": False,
            "repo_owner": "",
            "repo_name": "",
            "auto_link_prs": True,
            "has_webhook_secret": False,
            "engineering_summary": {
                "decision_pull_requests": 0,
                "issue_pull_requests": 0,
                "commits": 0,
                "deployments": 0,
            },
            "recent_activity": [],
            "webhook_readiness": _webhook_readiness_payload(None, request=request),
            "webhook_observability": get_webhook_observability(None),
        }

    organization = config.organization
    return {
        "configured": True,
        "enabled": config.enabled,
        "repo_owner": config.repo_owner,
        "repo_name": config.repo_name,
        "repo_slug": f"{config.repo_owner}/{config.repo_name}",
        "auto_link_prs": config.auto_link_prs,
        "has_webhook_secret": bool(config.get_webhook_secret()),
        "engineering_summary": {
            "decision_pull_requests": IntegrationPullRequest.objects.filter(organization=organization).count(),
            "issue_pull_requests": AgilePullRequest.objects.filter(organization=organization).count(),
            "commits": IntegrationCommit.objects.filter(organization=organization).count()
            + CodeCommit.objects.filter(organization=organization).count(),
            "deployments": Deployment.objects.filter(organization=organization).count(),
        },
        "recent_activity": get_recent_github_activity(
            organization,
            config=config,
            limit=6,
            include_remote=include_remote_activity,
        ),
        "webhook_readiness": _webhook_readiness_payload(config, request=request),
        "webhook_observability": get_webhook_observability(config),
    }


def save_github_config(organization, payload):
    existing = GitHubIntegration.objects.filter(organization=organization).first()
    access_token = (payload.get("access_token") or "").strip()
    repo_owner = (payload.get("repo_owner") or "").strip()
    repo_name = (payload.get("repo_name") or "").strip()
    webhook_secret = (payload.get("webhook_secret") or "").strip()
    enabled = payload.get("enabled", True)
    auto_link_prs = payload.get("auto_link_prs", True)

    if not repo_owner or not repo_name:
        raise ValueError("repo_owner and repo_name are required")
    if not access_token and not existing:
        raise ValueError("access_token is required")

    defaults = {
        "repo_owner": repo_owner,
        "repo_name": repo_name,
        "enabled": enabled,
        "auto_link_prs": auto_link_prs,
    }
    if access_token:
        defaults["access_token"] = access_token
    elif existing:
        defaults["access_token"] = existing.get_access_token()

    if webhook_secret:
        defaults["webhook_secret"] = webhook_secret
    elif existing:
        defaults["webhook_secret"] = existing.get_webhook_secret()

    config, _ = GitHubIntegration.objects.update_or_create(
        organization=organization,
        defaults=defaults,
    )
    return config


def ensure_decision_code_link(decision, link_payload):
    links = list(decision.code_links or [])
    incoming_url = (link_payload.get("url") or "").strip()
    existing_index = next(
        (index for index, link in enumerate(links) if (link.get("url") or "").strip() == incoming_url),
        None,
    )
    if existing_index is None:
        links.append(link_payload)
    else:
        links[existing_index] = {**links[existing_index], **link_payload}
    decision.code_links = links
    decision.save(update_fields=["code_links"])


def link_manual_pr_to_decision(decision, pr_url, title=None, status="open", author="", branch_name="", source="manual"):
    pr_url = (pr_url or "").strip()
    metadata = extract_github_pr_metadata(pr_url)
    if not metadata:
        ensure_decision_code_link(
            decision,
            {
                "type": "link",
                "url": pr_url,
                "title": title or pr_url,
                "source": source,
                "linked_at": timezone.now().isoformat(),
            },
        )
        return None

    pr, _ = IntegrationPullRequest.objects.update_or_create(
        organization=decision.organization,
        pr_number=metadata["pr_number"],
        defaults={
            "decision": decision,
            "pr_url": pr_url,
            "title": title or f"{metadata['owner']}/{metadata['repo']}#{metadata['pr_number']}",
            "status": status or "open",
            "branch_name": branch_name or "",
            "author": author or "",
            "created_at": timezone.now(),
        },
    )

    ensure_decision_code_link(
        decision,
        {
            "type": "github_pr",
            "url": pr.pr_url,
            "title": pr.title,
            "number": pr.pr_number,
            "source": source,
            "linked_at": timezone.now().isoformat(),
        },
    )
    return pr


def _manual_links_for_decision(decision, known_pr_urls):
    items = []
    for link in decision.code_links or []:
        url = (link.get("url") or "").strip()
        if not url or url in known_pr_urls:
            continue
        items.append(
            {
                "type": link.get("type") or "link",
                "title": link.get("title") or url,
                "url": url,
                "number": link.get("number"),
                "linked_at": link.get("linked_at"),
                "source": link.get("source") or "manual",
            }
        )
    return items


def _serialize_integration_pr(pr):
    return {
        "id": pr.id,
        "number": pr.pr_number,
        "title": pr.title,
        "status": pr.status,
        "author": pr.author,
        "branch_name": pr.branch_name,
        "url": pr.pr_url,
        "created_at": _iso(pr.created_at),
        "merged_at": _iso(pr.merged_at),
        "closed_at": _iso(pr.closed_at),
        "source": "decision_link",
    }


def _serialize_agile_pr(pr):
    return {
        "id": pr.id,
        "number": pr.pr_number,
        "title": pr.title,
        "status": pr.status,
        "author": pr.author,
        "reviewers": pr.reviewers or [],
        "url": pr.url,
        "created_at": _iso(pr.created_at),
        "merged_at": _iso(pr.merged_at),
        "source": "issue_execution",
        "issue": {
            "id": pr.issue_id,
            "key": pr.issue.key if pr.issue else None,
            "title": pr.issue.title if pr.issue else None,
        },
    }


def _serialize_integration_commit(commit):
    return {
        "id": commit.id,
        "hash": commit.sha,
        "short_hash": commit.sha[:8],
        "message": commit.message,
        "author": commit.author,
        "url": commit.commit_url,
        "committed_at": _iso(commit.committed_at),
        "source": "decision_link",
        "pull_request_id": commit.pull_request_id,
    }


def _serialize_agile_commit(commit):
    return {
        "id": commit.id,
        "hash": commit.commit_hash,
        "short_hash": commit.commit_hash[:8],
        "message": commit.message,
        "author": commit.author,
        "branch": commit.branch,
        "url": commit.url,
        "committed_at": _iso(commit.created_at),
        "source": "issue_execution",
        "issue": {
            "id": commit.issue_id,
            "key": commit.issue.key if commit.issue else None,
            "title": commit.issue.title if commit.issue else None,
        },
    }


def _serialize_deployment(deployment):
    return {
        "id": deployment.id,
        "environment": deployment.environment,
        "status": deployment.status,
        "branch": deployment.branch,
        "commit_hash": deployment.commit_hash,
        "deployed_by": deployment.deployed_by,
        "deployed_at": _iso(deployment.deployed_at),
        "url": deployment.url,
    }


def _serialize_linked_issue(issue):
    return {
        "id": issue.id,
        "key": issue.key,
        "title": issue.title,
        "status": issue.status,
        "branch_name": issue.branch_name,
        "pr_url": issue.pr_url,
        "commit_hash": issue.commit_hash,
        "ci_status": issue.ci_status,
        "ci_url": issue.ci_url,
        "project_id": issue.project_id,
        "project_name": issue.project.name if issue.project else None,
        "sprint_id": issue.sprint_id,
        "sprint_name": issue.sprint.name if issue.sprint else None,
    }


def _decision_status_from_signals(pull_requests, commits, deployments, linked_issues):
    if any(item.get("status") == "success" for item in deployments):
        return "deployed"
    if any(item.get("status") == "merged" for item in pull_requests):
        return "code_merged"
    if commits or pull_requests:
        return "in_progress"
    if any(issue.get("branch_name") or issue.get("pr_url") or issue.get("commit_hash") for issue in linked_issues):
        return "in_progress"
    return "not_started"


def get_decision_github_timeline(organization, decision):
    config = GitHubIntegration.objects.filter(organization=organization).first()
    linked_issues = [
        link.issue
        for link in DecisionIssueLink.objects.filter(decision=decision)
        .select_related("issue__project", "issue__sprint")
    ]
    issue_ids = [issue.id for issue in linked_issues]

    decision_prs = list(
        IntegrationPullRequest.objects.filter(organization=organization, decision=decision).order_by("-created_at")
    )
    issue_prs = list(
        AgilePullRequest.objects.filter(organization=organization, issue_id__in=issue_ids)
        .select_related("issue")
        .order_by("-created_at")
    )
    decision_commits = list(
        IntegrationCommit.objects.filter(organization=organization, decision=decision)
        .select_related("pull_request")
        .order_by("-committed_at")
    )
    issue_commits = list(
        CodeCommit.objects.filter(organization=organization, issue_id__in=issue_ids)
        .select_related("issue")
        .order_by("-created_at")
    )

    commit_hashes = {
        commit.sha
        for commit in decision_commits
        if commit.sha
    } | {
        commit.commit_hash
        for commit in issue_commits
        if commit.commit_hash
    } | {
        issue.commit_hash
        for issue in linked_issues
        if issue.commit_hash
    }
    branches = {
        commit.branch
        for commit in issue_commits
        if commit.branch
    } | {
        issue.branch_name
        for issue in linked_issues
        if issue.branch_name
    }
    deployments = list(
        Deployment.objects.filter(organization=organization)
        .filter(Q(commit_hash__in=commit_hashes) | Q(branch__in=branches))
        .order_by("-deployed_at", "-created_at")
    )

    serialized_decision_prs = [_serialize_integration_pr(pr) for pr in decision_prs]
    serialized_issue_prs = [_serialize_agile_pr(pr) for pr in issue_prs]
    serialized_decision_commits = [_serialize_integration_commit(commit) for commit in decision_commits]
    serialized_issue_commits = [_serialize_agile_commit(commit) for commit in issue_commits]
    serialized_deployments = [_serialize_deployment(item) for item in deployments]
    serialized_linked_issues = [_serialize_linked_issue(issue) for issue in linked_issues]

    known_pr_urls = {
        item["url"]
        for item in serialized_decision_prs + serialized_issue_prs
        if item.get("url")
    }
    manual_links = _manual_links_for_decision(decision, known_pr_urls)
    branch_stub = slugify(decision.title)[:48] or f"decision-{decision.id}"

    combined_prs = serialized_decision_prs + serialized_issue_prs
    combined_commits = serialized_decision_commits + serialized_issue_commits

    return {
        "decision_id": decision.id,
        "repository": serialize_github_config(config, include_remote_activity=False, request=None),
        "implementation_status": _decision_status_from_signals(
            combined_prs,
            combined_commits,
            serialized_deployments,
            serialized_linked_issues,
        ),
        "summary": {
            "decision_pull_requests": len(serialized_decision_prs),
            "issue_pull_requests": len(serialized_issue_prs),
            "commits": len(combined_commits),
            "deployments": len(serialized_deployments),
            "linked_issues": len(serialized_linked_issues),
            "manual_links": len(manual_links),
        },
        "naming": {
            "suggested_branch": f"decision/{decision.id}-{branch_stub}",
            "suggested_pr_title": f"DECISION-{decision.id}: {decision.title}",
        },
        "linked_issues": serialized_linked_issues,
        "pull_requests": combined_prs,
        "commits": combined_commits,
        "deployments": serialized_deployments,
        "manual_links": manual_links,
        "recent_activity": sorted(
            [
                *[
                    {
                        "type": "pull_request",
                        "title": item["title"],
                        "subtitle": item["status"],
                        "author": item.get("author"),
                        "url": item.get("url"),
                        "timestamp": item.get("merged_at") or item.get("created_at"),
                    }
                    for item in combined_prs
                ],
                *[
                    {
                        "type": "commit",
                        "title": (item.get("message") or "").splitlines()[0][:120],
                        "subtitle": item.get("short_hash"),
                        "author": item.get("author"),
                        "url": item.get("url"),
                        "timestamp": item.get("committed_at"),
                    }
                    for item in combined_commits
                ],
                *[
                    {
                        "type": "deployment",
                        "title": f"{item['environment']} deployment",
                        "subtitle": item["status"],
                        "author": item.get("deployed_by"),
                        "url": item.get("url"),
                        "timestamp": item.get("deployed_at"),
                    }
                    for item in serialized_deployments
                ],
            ],
            key=lambda item: item.get("timestamp") or "",
            reverse=True,
        )[:10],
    }


def get_issue_github_timeline(organization, issue):
    config = GitHubIntegration.objects.filter(organization=organization).first()
    issue_prs = list(
        AgilePullRequest.objects.filter(organization=organization, issue=issue)
        .select_related("issue")
        .order_by("-created_at")
    )
    issue_commits = list(
        CodeCommit.objects.filter(organization=organization, issue=issue)
        .select_related("issue")
        .order_by("-created_at")
    )
    commit_hashes = {issue.commit_hash} if issue.commit_hash else set()
    commit_hashes |= {commit.commit_hash for commit in issue_commits if commit.commit_hash}
    branches = {issue.branch_name} if issue.branch_name else set()
    branches |= {commit.branch for commit in issue_commits if commit.branch}

    deployments = list(
        Deployment.objects.filter(organization=organization)
        .filter(Q(commit_hash__in=commit_hashes) | Q(branch__in=branches))
        .order_by("-deployed_at", "-created_at")
    )
    linked_decisions = list(
        DecisionIssueLink.objects.filter(issue=issue).select_related("decision").order_by("-created_at")
    )

    serialized_prs = [_serialize_agile_pr(pr) for pr in issue_prs]
    serialized_commits = [_serialize_agile_commit(commit) for commit in issue_commits]
    serialized_deployments = [_serialize_deployment(item) for item in deployments]

    implementation_status = _decision_status_from_signals(
        serialized_prs,
        serialized_commits,
        serialized_deployments,
        [_serialize_linked_issue(issue)],
    )
    issue_stub = slugify(issue.title)[:48] or (issue.key or f"issue-{issue.id}").lower()

    return {
        "issue_id": issue.id,
        "repository": serialize_github_config(config, include_remote_activity=False, request=None),
        "implementation_status": implementation_status,
        "engineering_signals": {
            "branch_name": issue.branch_name,
            "pull_request_url": issue.pr_url,
            "commit_hash": issue.commit_hash,
            "ci_status": issue.ci_status,
            "ci_url": issue.ci_url,
            "code_review_status": issue.code_review_status,
            "test_coverage": issue.test_coverage,
        },
        "summary": {
            "pull_requests": len(serialized_prs),
            "commits": len(serialized_commits),
            "deployments": len(serialized_deployments),
            "linked_decisions": len(linked_decisions),
        },
        "naming": {
            "suggested_branch": f"{(issue.key or 'issue').lower()}/{issue_stub}",
            "suggested_pr_title": f"{issue.key}: {issue.title}" if issue.key else issue.title,
        },
        "linked_decisions": [
            {
                "id": link.decision_id,
                "title": link.decision.title,
                "impact_type": link.impact_type,
            }
            for link in linked_decisions
        ],
        "pull_requests": serialized_prs,
        "commits": serialized_commits,
        "deployments": serialized_deployments,
        "recent_activity": sorted(
            [
                *[
                    {
                        "type": "pull_request",
                        "title": item["title"],
                        "subtitle": item["status"],
                        "author": item.get("author"),
                        "url": item.get("url"),
                        "timestamp": item.get("merged_at") or item.get("created_at"),
                    }
                    for item in serialized_prs
                ],
                *[
                    {
                        "type": "commit",
                        "title": (item.get("message") or "").splitlines()[0][:120],
                        "subtitle": item.get("short_hash"),
                        "author": item.get("author"),
                        "url": item.get("url"),
                        "timestamp": item.get("committed_at"),
                    }
                    for item in serialized_commits
                ],
                *[
                    {
                        "type": "deployment",
                        "title": f"{item['environment']} deployment",
                        "subtitle": item["status"],
                        "author": item.get("deployed_by"),
                        "url": item.get("url"),
                        "timestamp": item.get("deployed_at"),
                    }
                    for item in serialized_deployments
                ],
            ],
            key=lambda item: item.get("timestamp") or "",
            reverse=True,
        )[:8],
    }
