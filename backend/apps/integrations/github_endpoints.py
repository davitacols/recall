from django.core.exceptions import ValidationError
from django.core.validators import URLValidator
from django.utils.dateparse import parse_datetime
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

import re

from apps.agile.models import CodeCommit, Deployment, PullRequest
from apps.decisions.models import Decision
from apps.integrations.models import GitHubIntegration
from apps.users.auth_utils import check_rate_limit

url_validator = URLValidator()
PR_STATUS_CHOICES = {"open", "approved", "changes_requested", "merged", "closed"}
DEPLOY_STATUS_CHOICES = {"pending", "in_progress", "success", "failed"}


@api_view(["POST", "GET"])
@permission_classes([IsAuthenticated])
def github_config(request):
    """Configure GitHub integration."""
    if request.method == "GET":
        config = GitHubIntegration.objects.filter(organization=request.user.organization).first()
        if not config:
            return Response({"configured": False})
        return Response(
            {
                "repo_owner": config.repo_owner,
                "repo_name": config.repo_name,
                "configured": True,
            }
        )

    if not check_rate_limit(f"github_config:{request.user.id}", limit=60, window=3600):
        return Response({"error": "Too many requests"}, status=429)

    access_token = (request.data.get("access_token") or "").strip()
    repo_owner = (request.data.get("repo_owner") or "").strip()
    repo_name = (request.data.get("repo_name") or "").strip()
    if not all([access_token, repo_owner, repo_name]):
        return Response({"error": "access_token, repo_owner and repo_name are required"}, status=400)

    GitHubIntegration.objects.update_or_create(
        organization=request.user.organization,
        defaults={
            "access_token": access_token,
            "repo_owner": repo_owner,
            "repo_name": repo_name,
        },
    )
    return Response({"message": "GitHub integration configured"})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def link_commit_to_decision(request, decision_id):
    """Link commit to decision by parsing commit message."""
    if not check_rate_limit(f"link_commit_decision:{request.user.id}", limit=240, window=3600):
        return Response({"error": "Too many requests"}, status=429)

    try:
        decision = Decision.objects.get(id=decision_id, organization=request.user.organization)
    except Decision.DoesNotExist:
        return Response({"error": "Decision not found"}, status=404)

    commit_hash = (request.data.get("commit_hash") or "").strip()
    message = (request.data.get("message") or "").strip()
    author = (request.data.get("author") or "").strip()
    branch = (request.data.get("branch") or "").strip()
    url = (request.data.get("url") or "").strip()
    if not commit_hash or len(commit_hash) < 7:
        return Response({"error": "Valid commit_hash required"}, status=400)
    if len(message) > 5000:
        return Response({"error": "message too long"}, status=400)
    if url:
        try:
            url_validator(url)
        except ValidationError:
            return Response({"error": "Invalid url"}, status=400)

    decision_ref = re.search(r"DECISION-(\d+)", message, re.IGNORECASE)
    if decision_ref:
        ref_decision = Decision.objects.filter(
            id=decision_ref.group(1), organization=request.user.organization
        ).first()
        if ref_decision:
            decision = ref_decision

    commit = CodeCommit.objects.create(
        organization=request.user.organization,
        commit_hash=commit_hash,
        message=message,
        author=author,
        branch=branch,
        url=url,
    )
    return Response({"id": commit.id, "decision_id": decision.id})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def decision_code_links(request, decision_id):
    """Get all code links for a decision."""
    try:
        decision = Decision.objects.get(id=decision_id, organization=request.user.organization)
    except Decision.DoesNotExist:
        return Response({"error": "Decision not found"}, status=404)

    commits = CodeCommit.objects.filter(organization=request.user.organization)[:10]
    prs = PullRequest.objects.filter(organization=request.user.organization)[:10]
    deployments = Deployment.objects.filter(organization=request.user.organization)[:10]

    return Response(
        {
            "decision_id": decision.id,
            "commits": [
                {
                    "id": c.id,
                    "hash": c.commit_hash[:8],
                    "message": c.message[:100],
                    "author": c.author,
                    "branch": c.branch,
                    "url": c.url,
                    "created_at": c.created_at.isoformat(),
                }
                for c in commits
            ],
            "pull_requests": [
                {
                    "id": p.id,
                    "number": p.pr_number,
                    "title": p.title,
                    "status": p.status,
                    "author": p.author,
                    "url": p.url,
                    "merged_at": p.merged_at.isoformat() if p.merged_at else None,
                }
                for p in prs
            ],
            "deployments": [
                {
                    "id": d.id,
                    "environment": d.environment,
                    "status": d.status,
                    "branch": d.branch,
                    "deployed_by": d.deployed_by,
                    "deployed_at": d.deployed_at.isoformat() if d.deployed_at else None,
                }
                for d in deployments
            ],
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def link_pr_to_decision(request, decision_id):
    """Link PR to decision."""
    if not check_rate_limit(f"link_pr_decision:{request.user.id}", limit=240, window=3600):
        return Response({"error": "Too many requests"}, status=429)

    try:
        Decision.objects.get(id=decision_id, organization=request.user.organization)
    except Decision.DoesNotExist:
        return Response({"error": "Decision not found"}, status=404)

    try:
        pr_number = int(request.data.get("pr_number"))
    except (TypeError, ValueError):
        return Response({"error": "Valid pr_number required"}, status=400)

    title = (request.data.get("title") or "").strip()
    pr_url = (request.data.get("url") or "").strip()
    if not title or not pr_url:
        return Response({"error": "title and url are required"}, status=400)
    try:
        url_validator(pr_url)
    except ValidationError:
        return Response({"error": "Invalid url"}, status=400)

    status_value = (request.data.get("status") or "open").strip()
    if status_value not in PR_STATUS_CHOICES:
        return Response({"error": "Invalid status"}, status=400)

    pr = PullRequest.objects.create(
        organization=request.user.organization,
        pr_number=pr_number,
        title=title,
        description=request.data.get("description", ""),
        status=status_value,
        url=pr_url,
        author=request.data.get("author", ""),
        reviewers=request.data.get("reviewers", []),
    )
    return Response({"id": pr.id, "pr_number": pr.pr_number})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def update_pr_status(request, pr_id):
    """Update PR status."""
    try:
        pr = PullRequest.objects.get(id=pr_id, organization=request.user.organization)
    except PullRequest.DoesNotExist:
        return Response({"error": "PR not found"}, status=404)

    status_value = (request.data.get("status") or pr.status).strip()
    if status_value not in PR_STATUS_CHOICES:
        return Response({"error": "Invalid status"}, status=400)
    pr.status = status_value
    if request.data.get("merged"):
        merged_at = parse_datetime(request.data.get("merged_at") or "")
        pr.merged_at = merged_at
    pr.save()
    return Response({"message": "PR updated", "status": pr.status})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def record_deployment(request):
    """Record deployment."""
    if not check_rate_limit(f"record_deployment:{request.user.id}", limit=240, window=3600):
        return Response({"error": "Too many requests"}, status=429)

    environment = (request.data.get("environment") or "").strip()
    commit_hash = (request.data.get("commit_hash") or "").strip()
    if not environment or not commit_hash:
        return Response({"error": "environment and commit_hash are required"}, status=400)

    status_value = (request.data.get("status") or "pending").strip()
    if status_value not in DEPLOY_STATUS_CHOICES:
        return Response({"error": "Invalid status"}, status=400)

    url = (request.data.get("url") or "").strip()
    if url:
        try:
            url_validator(url)
        except ValidationError:
            return Response({"error": "Invalid url"}, status=400)

    deployment = Deployment.objects.create(
        organization=request.user.organization,
        environment=environment,
        status=status_value,
        commit_hash=commit_hash,
        branch=request.data.get("branch", ""),
        deployed_by=request.data.get("deployed_by", ""),
        deployed_at=parse_datetime(request.data.get("deployed_at") or ""),
        url=url,
    )

    return Response({"id": deployment.id, "environment": deployment.environment})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def decision_implementation_status(request, decision_id):
    """Get implementation status of decision."""
    try:
        decision = Decision.objects.get(id=decision_id, organization=request.user.organization)
    except Decision.DoesNotExist:
        return Response({"error": "Decision not found"}, status=404)

    commits = CodeCommit.objects.filter(organization=request.user.organization).count()
    prs = PullRequest.objects.filter(organization=request.user.organization)
    merged_prs = prs.filter(status="merged").count()
    deployments = Deployment.objects.filter(organization=request.user.organization)
    successful_deployments = deployments.filter(status="success").count()

    implementation_status = "not_started"
    if commits > 0:
        implementation_status = "in_progress"
    if merged_prs > 0:
        implementation_status = "code_merged"
    if successful_deployments > 0:
        implementation_status = "deployed"

    return Response(
        {
            "decision_id": decision.id,
            "implementation_status": implementation_status,
            "commits": commits,
            "pull_requests": prs.count(),
            "merged_prs": merged_prs,
            "deployments": deployments.count(),
            "successful_deployments": successful_deployments,
            "environments": list({d.environment for d in deployments}),
        }
    )
