import hashlib
import hmac
import json
import re

from django.core.exceptions import ValidationError
from django.core.validators import URLValidator
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.agile.models import DecisionIssueLink, Deployment, Issue
from apps.decisions.models import Decision
from apps.integrations.github_engineering import (
    get_decision_github_timeline,
    get_issue_github_timeline,
    get_recent_github_activity,
    link_manual_pr_to_decision,
    save_github_config,
    serialize_github_config,
)
from apps.integrations.models import Commit as IntegrationCommit
from apps.integrations.models import GitHubIntegration
from apps.integrations.models import GitHubWebhookDelivery
from apps.integrations.utils import search_github_prs as search_pull_request_candidates
from apps.users.auth_utils import check_rate_limit

url_validator = URLValidator()
DEPLOY_STATUS_CHOICES = {"pending", "in_progress", "success", "failed"}


def _response_message(response):
    data = getattr(response, "data", None)
    if isinstance(data, dict):
        return data.get("message") or data.get("error") or ""
    return ""


def _delivery_state_from_response(response):
    if response.status_code >= 400:
        return "failed"
    message = (_response_message(response) or "").lower()
    if any(
        token in message
        for token in (
            "no decision id found",
            "decision not found",
            "no decision-linked commits found",
            "integration not found",
            "event received",
        )
    ):
        return "ignored"
    return "processed"


def _delivery_summary(event, payload):
    repo = payload.get("repository", {}) or {}
    summary = {
        "repository": repo.get("full_name") or repo.get("name"),
    }
    if event == "pull_request":
        pr_data = payload.get("pull_request", {}) or {}
        summary.update(
            {
                "pr_number": pr_data.get("number"),
                "pr_title": pr_data.get("title"),
                "branch_name": pr_data.get("head", {}).get("ref"),
            }
        )
    elif event == "push":
        summary.update(
            {
                "branch_name": (payload.get("ref") or "").replace("refs/heads/", ""),
                "commit_count": len(payload.get("commits", []) or []),
            }
        )
    return {key: value for key, value in summary.items() if value not in (None, "", [])}


def _record_webhook_delivery(integration, payload, event, response, signature_valid, request=None):
    repo = payload.get("repository", {}) or {}
    GitHubWebhookDelivery.objects.create(
        organization=integration.organization,
        integration=integration,
        event=event or "",
        action=(payload.get("action") or "")[:100],
        delivery_id=((request.headers.get("X-GitHub-Delivery") if request else "") or "")[:255],
        repository_owner=(repo.get("owner", {}) or {}).get("login", "")[:100],
        repository_name=(repo.get("name") or "")[:100],
        processing_state=_delivery_state_from_response(response),
        status_code=response.status_code,
        signature_valid=signature_valid,
        message=_response_message(response)[:2000],
        summary=_delivery_summary(event, payload),
    )


def extract_decision_id(text):
    """Extract decision ID from text like DECISION-123, RECALL-123, or #123."""
    match = re.search(r"(?:DECISION-|RECALL-|#)(\d+)", text or "", re.IGNORECASE)
    return int(match.group(1)) if match else None


def handle_pull_request_event(data, integration):
    """Handle pull request webhook events and attach them to matching decisions."""
    pr_data = data.get("pull_request", {}) or {}

    pr_url = pr_data.get("html_url")
    title = pr_data.get("title", "")
    state = pr_data.get("state", "open")
    merged = pr_data.get("merged", False)
    branch_name = pr_data.get("head", {}).get("ref", "")
    author = pr_data.get("user", {}).get("login", "")

    decision_id = extract_decision_id(title) or extract_decision_id(branch_name)
    if not decision_id:
        return Response({"message": "No decision ID found"}, status=status.HTTP_200_OK)

    try:
        decision = Decision.objects.get(id=decision_id, organization=integration.organization)
    except Decision.DoesNotExist:
        return Response({"message": "Decision not found"}, status=status.HTTP_200_OK)

    pr = link_manual_pr_to_decision(
        decision,
        pr_url,
        title=title,
        status="merged" if merged else state,
        author=author,
        branch_name=branch_name,
        source="github_webhook",
    )
    if pr:
        pr.created_at = timezone.now()
        pr.merged_at = timezone.now() if merged else pr.merged_at
        pr.save()

    if merged and decision.status != "implemented":
        decision.status = "implemented"
        decision.save()

    return Response({"message": "PR processed", "decision_updated": merged}, status=status.HTTP_200_OK)


def handle_push_event(data, integration):
    """Handle push webhook events and persist decision-linked commits."""
    commits = data.get("commits", []) or []
    processed_count = 0

    for commit_data in commits:
        message = commit_data.get("message", "")
        decision_id = extract_decision_id(message)
        if not decision_id:
            continue

        try:
            decision = Decision.objects.get(id=decision_id, organization=integration.organization)
        except Decision.DoesNotExist:
            continue

        IntegrationCommit.objects.get_or_create(
            sha=commit_data.get("id"),
            defaults={
                "organization": integration.organization,
                "decision": decision,
                "message": message,
                "author": commit_data.get("author", {}).get("name", ""),
                "commit_url": commit_data.get("url", ""),
                "committed_at": timezone.now(),
            },
        )
        processed_count += 1

    if processed_count == 0:
        return Response({"message": "No decision-linked commits found"}, status=status.HTTP_200_OK)

    return Response({"message": "Commits processed", "processed_commits": processed_count}, status=status.HTTP_200_OK)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def github_config(request):
    """Canonical GitHub integration configuration and health endpoint."""
    config = GitHubIntegration.objects.filter(organization=request.user.organization).first()

    if request.method == "GET":
        return Response(serialize_github_config(config, request=request))

    if not check_rate_limit(f"github_config:{request.user.id}", limit=60, window=3600):
        return Response({"error": "Too many requests"}, status=429)

    try:
        config = save_github_config(request.user.organization, request.data)
    except ValueError as exc:
        return Response({"error": str(exc)}, status=400)

    return Response(
        {
            "message": "GitHub integration configured",
            "github": serialize_github_config(config, request=request),
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def connect_github(request):
    """Compatibility endpoint that stores GitHub repo credentials via the canonical config flow."""
    if not check_rate_limit(f"github_connect:{request.user.id}", limit=30, window=3600):
        return Response({"error": "Too many requests"}, status=429)

    repo_url = (request.data.get("repo_url") or "").strip()
    github_token = (request.data.get("github_token") or "").strip()
    if not repo_url or not github_token:
        return Response({"error": "repo_url and github_token required"}, status=400)

    parts = repo_url.split("/")
    if len(parts) != 2 or not parts[0] or not parts[1]:
        return Response({"error": "Invalid repo URL format. Use: owner/repo"}, status=400)

    try:
        config = save_github_config(
            request.user.organization,
            {
                "access_token": github_token,
                "repo_owner": parts[0],
                "repo_name": parts[1],
                "enabled": True,
            },
        )
    except ValueError as exc:
        return Response({"error": str(exc)}, status=400)
    return Response({"status": "GitHub connected", "github": serialize_github_config(config, request=request)})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def github_activity(request):
    """Return recent GitHub activity for the connected repository."""
    if not check_rate_limit(f"github_activity:{request.user.id}", limit=120, window=3600):
        return Response({"error": "Too many requests"}, status=429)

    github = GitHubIntegration.objects.filter(organization=request.user.organization).first()
    if not github:
        return Response([])
    return Response(get_recent_github_activity(request.user.organization, config=github, limit=10, include_remote=True))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def issue_commits(request, issue_id):
    """Legacy-compatible issue commits endpoint backed by the canonical issue timeline."""
    issue = Issue.objects.filter(id=issue_id, organization=request.user.organization).first()
    if not issue:
        return Response({"error": "Issue not found"}, status=404)
    return Response({"commits": get_issue_github_timeline(request.user.organization, issue)["commits"]})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def issue_pull_requests(request, issue_id):
    """Legacy-compatible issue pull request endpoint backed by the canonical issue timeline."""
    issue = Issue.objects.filter(id=issue_id, organization=request.user.organization).first()
    if not issue:
        return Response({"error": "Issue not found"}, status=404)
    return Response({"prs": get_issue_github_timeline(request.user.organization, issue)["pull_requests"]})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def decision_pull_requests(request, decision_id):
    """Return all tracked pull requests already linked to a decision."""
    try:
        decision = Decision.objects.get(id=decision_id, organization=request.user.organization)
    except Decision.DoesNotExist:
        return Response({"error": "Decision not found"}, status=404)

    return Response(
        [
            {
                "id": pr.id,
                "pr_number": pr.pr_number,
                "pr_url": pr.pr_url,
                "title": pr.title,
                "status": pr.status,
                "branch_name": pr.branch_name,
                "author": pr.author,
                "created_at": pr.created_at,
                "merged_at": pr.merged_at,
                "commits_count": pr.commits_count,
            }
            for pr in decision.pull_requests.all()
        ]
    )


@csrf_exempt
@api_view(["POST"])
@permission_classes([AllowAny])
def github_webhook(request):
    """Canonical public webhook endpoint for GitHub delivery processing."""
    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
    except Exception:
        return Response({"error": "invalid_json"}, status=status.HTTP_400_BAD_REQUEST)

    repo = payload.get("repository", {}) or {}
    repo_owner = (repo.get("owner", {}) or {}).get("login")
    repo_name = repo.get("name")
    if not repo_owner or not repo_name:
        return Response({"error": "invalid_repository_payload"}, status=status.HTTP_400_BAD_REQUEST)

    integration = GitHubIntegration.objects.filter(repo_owner=repo_owner, repo_name=repo_name).first()
    if not integration:
        return Response({"error": "integration_not_found"}, status=status.HTTP_404_NOT_FOUND)

    signature_valid = False
    signature = request.headers.get("X-Hub-Signature-256", "")
    webhook_secret = integration.get_webhook_secret()
    if webhook_secret:
        if not signature.startswith("sha256="):
            response = Response({"error": "missing_signature"}, status=status.HTTP_401_UNAUTHORIZED)
            _record_webhook_delivery(integration, payload, request.headers.get("X-GitHub-Event", ""), response, False, request=request)
            return response
        expected = hmac.new(webhook_secret.encode("utf-8"), request.body, hashlib.sha256).hexdigest()
        provided = signature.split("=", 1)[1]
        if not hmac.compare_digest(expected, provided):
            response = Response({"error": "invalid_signature"}, status=status.HTTP_401_UNAUTHORIZED)
            _record_webhook_delivery(integration, payload, request.headers.get("X-GitHub-Event", ""), response, False, request=request)
            return response
        signature_valid = True

    event = request.headers.get("X-GitHub-Event", "")
    if event == "pull_request":
        response = handle_pull_request_event(payload, integration)
    elif event == "push":
        response = handle_push_event(payload, integration)
    else:
        response = Response({"message": "Event received"}, status=status.HTTP_200_OK)

    _record_webhook_delivery(integration, payload, event, response, signature_valid or not webhook_secret, request=request)
    return response


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def link_commit_to_decision(request, decision_id):
    """Link a commit directly to a decision for implementation tracking."""
    if not check_rate_limit(f"link_commit_decision:{request.user.id}", limit=240, window=3600):
        return Response({"error": "Too many requests"}, status=429)

    try:
        decision = Decision.objects.get(id=decision_id, organization=request.user.organization)
    except Decision.DoesNotExist:
        return Response({"error": "Decision not found"}, status=404)

    commit_hash = (request.data.get("commit_hash") or "").strip()
    message = (request.data.get("message") or "").strip()
    author = (request.data.get("author") or "").strip()
    url = (request.data.get("url") or "").strip()
    if not commit_hash or len(commit_hash) < 7:
        return Response({"error": "Valid commit_hash required"}, status=400)
    if not message:
        return Response({"error": "message is required"}, status=400)
    if len(message) > 5000:
        return Response({"error": "message too long"}, status=400)
    if url:
        try:
            url_validator(url)
        except ValidationError:
            return Response({"error": "Invalid url"}, status=400)

    commit, created = IntegrationCommit.objects.get_or_create(
        sha=commit_hash,
        defaults={
            "organization": request.user.organization,
            "decision": decision,
            "message": message,
            "author": author,
            "commit_url": url,
            "committed_at": timezone.now(),
        },
    )
    if not created:
        commit.organization = request.user.organization
        commit.decision = decision
        commit.message = message
        commit.author = author
        commit.commit_url = url or commit.commit_url
        commit.save()

    return Response(
        {
            "id": commit.id,
            "decision_id": decision.id,
            "commit_hash": commit.sha,
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def decision_code_links(request, decision_id):
    """Compatibility endpoint returning the full decision GitHub timeline."""
    try:
        decision = Decision.objects.get(id=decision_id, organization=request.user.organization)
    except Decision.DoesNotExist:
        return Response({"error": "Decision not found"}, status=404)
    return Response(get_decision_github_timeline(request.user.organization, decision))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def decision_timeline(request, decision_id):
    """Canonical decision engineering timeline endpoint."""
    try:
        decision = Decision.objects.get(id=decision_id, organization=request.user.organization)
    except Decision.DoesNotExist:
        return Response({"error": "Decision not found"}, status=404)
    return Response(get_decision_github_timeline(request.user.organization, decision))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def issue_timeline(request, issue_id):
    """Canonical issue engineering timeline endpoint."""
    try:
        issue = Issue.objects.select_related("project", "sprint").get(
            id=issue_id,
            organization=request.user.organization,
        )
    except Issue.DoesNotExist:
        return Response({"error": "Issue not found"}, status=404)
    return Response(get_issue_github_timeline(request.user.organization, issue))


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def link_pr_to_decision(request, decision_id):
    """Canonical pull request search and linking for decisions."""
    try:
        decision = Decision.objects.get(id=decision_id, organization=request.user.organization)
    except Decision.DoesNotExist:
        return Response({"error": "Decision not found"}, status=404)

    if request.method == "GET":
        if not check_rate_limit(f"search_pr_decision:{request.user.id}", limit=120, window=3600):
            return Response({"error": "Too many requests"}, status=429)
        try:
            github = GitHubIntegration.objects.get(organization=request.user.organization)
        except GitHubIntegration.DoesNotExist:
            return Response({"error": "GitHub not configured"}, status=400)

        prs = search_pull_request_candidates(github, decision.title)
        return Response(
            {
                "decision_id": decision.id,
                "query": decision.title,
                "repo_slug": f"{github.repo_owner}/{github.repo_name}",
                "prs": [
                    {
                        "number": pr.get("number"),
                        "title": pr.get("title"),
                        "url": pr.get("html_url"),
                        "state": pr.get("state"),
                        "created_at": pr.get("created_at"),
                    }
                    for pr in prs
                ],
            }
        )

    if not check_rate_limit(f"link_pr_decision:{request.user.id}", limit=240, window=3600):
        return Response({"error": "Too many requests"}, status=429)

    pr_url = (request.data.get("url") or request.data.get("pr_url") or "").strip()
    if not pr_url:
        return Response({"error": "url or pr_url is required"}, status=400)
    try:
        url_validator(pr_url)
    except ValidationError:
        return Response({"error": "Invalid url"}, status=400)

    linked_pr = link_manual_pr_to_decision(
        decision,
        pr_url,
        title=(request.data.get("title") or "").strip() or None,
        status=(request.data.get("status") or "open").strip(),
        author=(request.data.get("author") or "").strip(),
        branch_name=(request.data.get("branch_name") or "").strip(),
        source="github_fresh",
    )
    decision.refresh_from_db(fields=["code_links"])

    return Response(
        {
            "message": "PR linked",
            "decision_id": decision.id,
            "pull_request_id": linked_pr.id if linked_pr else None,
            "code_links": decision.code_links or [],
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def update_pr_status(request, pr_id):
    """Update tracked pull request status."""
    from apps.integrations.models import PullRequest as IntegrationPullRequest

    try:
        pr = IntegrationPullRequest.objects.get(id=pr_id, organization=request.user.organization)
    except IntegrationPullRequest.DoesNotExist:
        return Response({"error": "PR not found"}, status=404)

    status_value = (request.data.get("status") or pr.status).strip()
    if status_value not in {"open", "closed", "merged"}:
        return Response({"error": "Invalid status"}, status=400)

    pr.status = status_value
    if status_value == "merged" and not pr.merged_at:
        pr.merged_at = timezone.now()
    if status_value == "closed" and not pr.closed_at:
        pr.closed_at = timezone.now()
    pr.save()
    return Response({"message": "PR updated", "status": pr.status})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def record_deployment(request, decision_id):
    """Record a deployment related to a decision's implementation flow."""
    if not check_rate_limit(f"record_deployment:{request.user.id}", limit=240, window=3600):
        return Response({"error": "Too many requests"}, status=429)

    try:
        decision = Decision.objects.get(id=decision_id, organization=request.user.organization)
    except Decision.DoesNotExist:
        return Response({"error": "Decision not found"}, status=404)

    environment = (request.data.get("environment") or "").strip()
    commit_hash = (request.data.get("commit_hash") or "").strip()
    status_value = (request.data.get("status") or "pending").strip()
    branch = (request.data.get("branch") or "").strip()
    deployed_by = (request.data.get("deployed_by") or request.user.get_full_name() or request.user.username).strip()
    url = (request.data.get("url") or "").strip()

    if not environment or not commit_hash:
        return Response({"error": "environment and commit_hash are required"}, status=400)
    if status_value not in DEPLOY_STATUS_CHOICES:
        return Response({"error": "Invalid status"}, status=400)
    if url:
        try:
            url_validator(url)
        except ValidationError:
            return Response({"error": "Invalid url"}, status=400)

    if not branch:
        linked_issue = (
            DecisionIssueLink.objects.filter(decision=decision)
            .select_related("issue")
            .first()
        )
        if linked_issue and linked_issue.issue.branch_name:
            branch = linked_issue.issue.branch_name

    deployment = Deployment.objects.create(
        organization=request.user.organization,
        environment=environment,
        status=status_value,
        commit_hash=commit_hash,
        branch=branch,
        deployed_by=deployed_by,
        deployed_at=timezone.now(),
        url=url,
    )

    return Response(
        {
            "id": deployment.id,
            "decision_id": decision.id,
            "environment": deployment.environment,
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def decision_implementation_status(request, decision_id):
    """Compatibility endpoint returning the implementation summary from the timeline."""
    try:
        decision = Decision.objects.get(id=decision_id, organization=request.user.organization)
    except Decision.DoesNotExist:
        return Response({"error": "Decision not found"}, status=404)

    timeline = get_decision_github_timeline(request.user.organization, decision)
    summary = timeline["summary"]
    return Response(
        {
            "decision_id": decision.id,
            "implementation_status": timeline["implementation_status"],
            "commits": summary["commits"],
            "pull_requests": summary["decision_pull_requests"] + summary["issue_pull_requests"],
            "deployments": summary["deployments"],
            "linked_issues": summary["linked_issues"],
        }
    )
