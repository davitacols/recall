from django.core.exceptions import ValidationError
from django.core.validators import URLValidator
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.agile.models import DecisionIssueLink, Deployment, Issue
from apps.decisions.models import Decision
from apps.integrations.github_engineering import (
    get_decision_github_timeline,
    get_issue_github_timeline,
    link_manual_pr_to_decision,
    save_github_config,
    serialize_github_config,
)
from apps.integrations.models import Commit as IntegrationCommit
from apps.integrations.models import GitHubIntegration
from apps.users.auth_utils import check_rate_limit

url_validator = URLValidator()
DEPLOY_STATUS_CHOICES = {"pending", "in_progress", "success", "failed"}


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


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def link_pr_to_decision(request, decision_id):
    """Canonical pull request linking for decisions."""
    if not check_rate_limit(f"link_pr_decision:{request.user.id}", limit=240, window=3600):
        return Response({"error": "Too many requests"}, status=429)

    try:
        decision = Decision.objects.get(id=decision_id, organization=request.user.organization)
    except Decision.DoesNotExist:
        return Response({"error": "Decision not found"}, status=404)

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

