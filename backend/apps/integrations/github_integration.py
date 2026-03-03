from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

import requests

from apps.integrations.models import GitHubIntegration
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

    activity = []
    headers = {"Authorization": f"token {github.get_access_token()}"}

    try:
        commits_url = f"https://api.github.com/repos/{github.repo_owner}/{github.repo_name}/commits"
        commits_resp = requests.get(commits_url, headers=headers, params={"per_page": 5}, timeout=5)
        if commits_resp.status_code == 200:
            commits = commits_resp.json()
            for commit in commits:
                activity.append(
                    {
                        "type": "commit",
                        "message": commit.get("commit", {}).get("message", "").split("\n")[0],
                        "author": commit.get("commit", {}).get("author", {}).get("name", ""),
                        "date": commit.get("commit", {}).get("author", {}).get("date"),
                        "url": commit.get("html_url"),
                    }
                )
    except Exception:
        pass

    try:
        prs_url = f"https://api.github.com/repos/{github.repo_owner}/{github.repo_name}/pulls"
        prs_resp = requests.get(prs_url, headers=headers, params={"per_page": 5, "state": "all"}, timeout=5)
        if prs_resp.status_code == 200:
            prs = prs_resp.json()
            for pr in prs:
                activity.append(
                    {
                        "type": "pr",
                        "title": pr.get("title", ""),
                        "author": pr.get("user", {}).get("login", ""),
                        "date": pr.get("created_at"),
                        "url": pr.get("html_url"),
                    }
                )
    except Exception:
        pass

    activity.sort(key=lambda x: x.get("date") or "", reverse=True)
    return Response(activity[:10])


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def github_webhook(request):
    """Placeholder webhook endpoint (non-public route should enforce auth)."""
    return Response({"status": "received"})


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

    GitHubIntegration.objects.update_or_create(
        organization=request.user.organization,
        defaults={
            "access_token": github_token,
            "repo_owner": repo_owner,
            "repo_name": repo_name,
            "enabled": True,
        },
    )
    return Response({"status": "GitHub connected", "repo": f"{repo_owner}/{repo_name}"})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def github_commits(request, issue_id):
    """Get commits linked to an issue."""
    return Response({"commits": []})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def github_prs(request, issue_id):
    """Get PRs linked to an issue."""
    return Response({"prs": []})
