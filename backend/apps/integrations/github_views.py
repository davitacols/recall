from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated

from apps.integrations.github_endpoints import (
    decision_pull_requests as canonical_decision_pull_requests,
    github_webhook as canonical_github_webhook,
    link_pr_to_decision as canonical_link_pr_to_decision,
)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def link_pr_to_decision(request, decision_id):
    """Compatibility wrapper for manual decision PR linking."""
    return canonical_link_pr_to_decision(getattr(request, "_request", request), decision_id)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_decision_prs(request, decision_id):
    """Compatibility wrapper for decision-linked pull request listings."""
    return canonical_decision_pull_requests(getattr(request, "_request", request), decision_id)


@api_view(["POST"])
@permission_classes([AllowAny])
def github_webhook(request):
    """Compatibility wrapper for the canonical GitHub webhook endpoint."""
    return canonical_github_webhook(getattr(request, "_request", request))
