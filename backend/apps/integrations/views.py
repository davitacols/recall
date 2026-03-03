from django.core.exceptions import ValidationError
from django.core.validators import URLValidator
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

import requests

from apps.integrations.models import GitHubIntegration, JiraIntegration, SlackIntegration
from apps.integrations.utils import post_to_slack
from apps.users.auth_utils import check_rate_limit, validate_email

url_validator = URLValidator()


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def slack_integration(request):
    if request.method == "GET":
        try:
            slack = SlackIntegration.objects.get(organization=request.user.organization)
            return Response(
                {
                    "enabled": slack.enabled,
                    "channel": slack.channel,
                    "post_decisions": slack.post_decisions,
                    "post_blockers": slack.post_blockers,
                    "post_sprint_summary": slack.post_sprint_summary,
                }
            )
        except SlackIntegration.DoesNotExist:
            return Response({"enabled": False})

    webhook_url = (request.data.get("webhook_url") or "").strip()
    if not webhook_url:
        return Response({"error": "webhook_url is required"}, status=400)
    try:
        url_validator(webhook_url)
    except ValidationError:
        return Response({"error": "Invalid webhook_url"}, status=400)

    SlackIntegration.objects.update_or_create(
        organization=request.user.organization,
        defaults={
            "webhook_url": webhook_url,
            "channel": request.data.get("channel", "#general"),
            "enabled": request.data.get("enabled", True),
            "post_decisions": request.data.get("post_decisions", True),
            "post_blockers": request.data.get("post_blockers", True),
            "post_sprint_summary": request.data.get("post_sprint_summary", False),
        },
    )

    post_to_slack(request.user.organization, "Recall connected to Slack")
    return Response({"message": "Slack connected"})


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def github_integration(request):
    if request.method == "GET":
        try:
            github = GitHubIntegration.objects.get(organization=request.user.organization)
            return Response(
                {
                    "enabled": github.enabled,
                    "repo_owner": github.repo_owner,
                    "repo_name": github.repo_name,
                    "auto_link_prs": github.auto_link_prs,
                }
            )
        except GitHubIntegration.DoesNotExist:
            return Response({"enabled": False})

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
            "enabled": request.data.get("enabled", True),
            "auto_link_prs": request.data.get("auto_link_prs", True),
        },
    )

    return Response({"message": "GitHub connected"})


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def jira_integration(request):
    if request.method == "GET":
        try:
            jira = JiraIntegration.objects.get(organization=request.user.organization)
            return Response(
                {
                    "enabled": jira.enabled,
                    "site_url": jira.site_url,
                    "email": jira.email,
                    "auto_sync_issues": jira.auto_sync_issues,
                }
            )
        except JiraIntegration.DoesNotExist:
            return Response({"enabled": False})

    site_url = (request.data.get("site_url") or "").strip()
    email = (request.data.get("email") or "").strip().lower()
    api_token = (request.data.get("api_token") or "").strip()
    if not all([site_url, email, api_token]):
        return Response({"error": "site_url, email and api_token are required"}, status=400)
    try:
        url_validator(site_url)
        validate_email(email)
    except ValidationError as e:
        return Response({"error": str(e)}, status=400)

    JiraIntegration.objects.update_or_create(
        organization=request.user.organization,
        defaults={
            "site_url": site_url,
            "email": email,
            "api_token": api_token,
            "enabled": request.data.get("enabled", True),
            "auto_sync_issues": request.data.get("auto_sync_issues", False),
        },
    )

    return Response({"message": "Jira connected"})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def test_integration(request, integration_type):
    """Test integration connection."""
    if not check_rate_limit(f"integration_test:{request.user.id}", limit=60, window=3600):
        return Response({"error": "Too many test requests"}, status=429)

    if integration_type == "slack":
        post_to_slack(request.user.organization, "Test message from Recall")
        return Response({"message": "Test message sent"})

    if integration_type == "github":
        try:
            github = GitHubIntegration.objects.get(organization=request.user.organization)
            url = f"https://api.github.com/repos/{github.repo_owner}/{github.repo_name}"
            headers = {"Authorization": f"token {github.get_access_token()}"}
            response = requests.get(url, headers=headers, timeout=5)
            if response.status_code == 200:
                repo = response.json()
                return Response({"message": "GitHub connected", "repo": repo.get("name")})
            return Response({"error": "Failed to connect"}, status=400)
        except GitHubIntegration.DoesNotExist:
            return Response({"error": "GitHub not configured"}, status=400)
        except Exception:
            return Response({"error": "Failed to connect"}, status=400)

    if integration_type == "jira":
        try:
            jira = JiraIntegration.objects.get(organization=request.user.organization)
            url = f"{jira.site_url}/rest/api/3/serverInfo"
            auth = (jira.email, jira.get_api_token())
            response = requests.get(url, auth=auth, timeout=5)
            if response.status_code == 200:
                return Response({"message": "Jira connected"})
            return Response({"error": "Failed to connect"}, status=400)
        except JiraIntegration.DoesNotExist:
            return Response({"error": "Jira not configured"}, status=400)
        except Exception:
            return Response({"error": "Failed to connect"}, status=400)

    return Response({"error": "Invalid integration type"}, status=400)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def search_github_prs(request, decision_id):
    """Search GitHub for PRs related to a decision."""
    from apps.decisions.models import Decision
    from apps.integrations.utils import search_github_prs as search_prs

    try:
        decision = Decision.objects.get(id=decision_id, organization=request.user.organization)
        github = GitHubIntegration.objects.get(organization=request.user.organization)
        prs = search_prs(github, decision.title)
        return Response(
            {
                "prs": [
                    {
                        "number": pr.get("number"),
                        "title": pr.get("title"),
                        "url": pr.get("html_url"),
                        "state": pr.get("state"),
                        "created_at": pr.get("created_at"),
                    }
                    for pr in prs
                ]
            }
        )
    except Decision.DoesNotExist:
        return Response({"error": "Decision not found"}, status=404)
    except GitHubIntegration.DoesNotExist:
        return Response({"error": "GitHub not configured"}, status=400)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def link_github_pr(request, decision_id):
    """Link a GitHub PR to a decision."""
    from apps.decisions.models import Decision

    try:
        decision = Decision.objects.get(id=decision_id, organization=request.user.organization)
        pr_url = (request.data.get("pr_url") or "").strip()
        if not pr_url:
            return Response({"error": "pr_url is required"}, status=400)
        try:
            url_validator(pr_url)
        except ValidationError:
            return Response({"error": "Invalid pr_url"}, status=400)

        if not decision.code_links:
            decision.code_links = []

        decision.code_links.append(
            {
                "type": "github_pr",
                "url": pr_url,
                "linked_at": timezone.now().isoformat(),
            }
        )

        decision.save()
        return Response({"message": "PR linked", "code_links": decision.code_links})
    except Decision.DoesNotExist:
        return Response({"error": "Decision not found"}, status=404)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_jira_issue(request, blocker_id):
    """Create Jira issue for a blocker."""
    from apps.agile.models import Blocker
    from apps.integrations.utils import auto_sync_jira_blocker

    try:
        blocker = Blocker.objects.get(id=blocker_id, organization=request.user.organization)
        auto_sync_jira_blocker(blocker)

        if blocker.ticket_url:
            return Response(
                {
                    "message": "Jira issue created",
                    "ticket_id": blocker.ticket_id,
                    "ticket_url": blocker.ticket_url,
                }
            )
        return Response({"error": "Failed to create Jira issue"}, status=400)
    except Blocker.DoesNotExist:
        return Response({"error": "Blocker not found"}, status=404)
