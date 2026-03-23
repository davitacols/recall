from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.agile.models import Issue
from apps.integrations.github_engineering import (
    get_issue_github_timeline,
    get_recent_github_activity,
    save_github_config,
    serialize_github_config,
)
from apps.integrations.models import GitHubIntegration
from apps.integrations.github_views import github_webhook as verified_github_webhook
from apps.users.auth_utils import check_rate_limit


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_integrations(request):
    """List all integrations for organization."""
    integrations = []
    github = GitHubIntegration.objects.filter(organization=request.user.organization).first()
    if github:
        integrations.append(
            {
                "id": github.id,
                "type": "github",
                "name": f"{github.repo_owner}/{github.repo_name}",
                "enabled": github.enabled,
                "created_at": github.created_at.isoformat() if github.created_at else None,
            }
        )
    return Response(integrations)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def github_activity(request):
    """Get recent GitHub activity (commits and PRs)."""
    if not check_rate_limit(f"github_activity:{request.user.id}", limit=120, window=3600):
        return Response({"error": "Too many requests"}, status=429)

    github = GitHubIntegration.objects.filter(organization=request.user.organization).first()
    if not github:
        return Response([])
    return Response(get_recent_github_activity(request.user.organization, config=github, limit=10, include_remote=True))


@api_view(["POST"])
@permission_classes([AllowAny])
def github_webhook(request):
    """Compatibility wrapper to the verified public webhook handler."""
    return verified_github_webhook(request)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def connect_github(request):
    """Connect GitHub repository to Recall."""
    if not check_rate_limit(f"github_connect:{request.user.id}", limit=30, window=3600):
        return Response({"error": "Too many requests"}, status=429)

    repo_url = (request.data.get("repo_url") or "").strip()
    github_token = (request.data.get("github_token") or "").strip()
    if not repo_url or not github_token:
        return Response({"error": "repo_url and github_token required"}, status=400)

    parts = repo_url.split("/")
    if len(parts) != 2:
        return Response({"error": "Invalid repo URL format. Use: owner/repo"}, status=400)
    repo_owner, repo_name = parts
    if not repo_owner or not repo_name:
        return Response({"error": "Invalid repo URL format. Use: owner/repo"}, status=400)

    config = save_github_config(
        request.user.organization,
        {
            "access_token": github_token,
            "repo_owner": repo_owner,
            "repo_name": repo_name,
            "enabled": True,
        },
    )
    return Response({"status": "GitHub connected", "github": serialize_github_config(config, request=request)})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def github_commits(request, issue_id):
    """Get commits linked to an issue."""
    issue = Issue.objects.filter(id=issue_id, organization=request.user.organization).first()
    if not issue:
        return Response({"error": "Issue not found"}, status=404)
    return Response({"commits": get_issue_github_timeline(request.user.organization, issue)["commits"]})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def github_prs(request, issue_id):
    """Get PRs linked to an issue."""
    issue = Issue.objects.filter(id=issue_id, organization=request.user.organization).first()
    if not issue:
        return Response({"error": "Issue not found"}, status=404)
    return Response({"prs": get_issue_github_timeline(request.user.organization, issue)["pull_requests"]})
