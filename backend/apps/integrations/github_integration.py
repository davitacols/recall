from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.integrations.github_endpoints import (
    connect_github as canonical_connect_github,
    github_activity as canonical_github_activity,
    github_webhook as canonical_github_webhook,
    issue_commits as canonical_issue_commits,
    issue_pull_requests as canonical_issue_pull_requests,
)
from apps.integrations.models import GitHubIntegration


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
    """Compatibility wrapper for recent GitHub activity."""
    return canonical_github_activity(getattr(request, "_request", request))


@api_view(["POST"])
@permission_classes([AllowAny])
def github_webhook(request):
    """Compatibility wrapper for the canonical public webhook handler."""
    return canonical_github_webhook(getattr(request, "_request", request))


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def connect_github(request):
    """Compatibility wrapper for GitHub connection setup."""
    return canonical_connect_github(getattr(request, "_request", request))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def github_commits(request, issue_id):
    """Compatibility wrapper for issue commits."""
    return canonical_issue_commits(getattr(request, "_request", request), issue_id)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def github_prs(request, issue_id):
    """Compatibility wrapper for issue pull requests."""
    return canonical_issue_pull_requests(getattr(request, "_request", request), issue_id)
