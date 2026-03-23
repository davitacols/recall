import hashlib
import hmac
import json
import re

from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.decisions.models import Decision
from .github_engineering import link_manual_pr_to_decision
from .models import Commit, GitHubIntegration, GitHubWebhookDelivery


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


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def link_pr_to_decision(request, decision_id):
    """Manually link a PR to a decision."""
    pr_url = request.data.get("pr_url")
    if not pr_url:
        return Response({"error": "PR URL required"}, status=status.HTTP_400_BAD_REQUEST)

    match = re.search(r"/pull/(\d+)", pr_url)
    if not match:
        return Response({"error": "Invalid PR URL"}, status=status.HTTP_400_BAD_REQUEST)

    pr_number = int(match.group(1))
    try:
        decision = Decision.objects.get(id=decision_id, organization=request.user.organization)
        pr = link_manual_pr_to_decision(
            decision,
            pr_url,
            title=f"PR #{pr_number}",
            source="github_manual",
        )
        return Response({"message": "PR linked successfully", "pr_id": pr.id})
    except Decision.DoesNotExist:
        return Response({"error": "Decision not found"}, status=status.HTTP_404_NOT_FOUND)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_decision_prs(request, decision_id):
    """Get all PRs linked to a decision."""
    try:
        decision = Decision.objects.get(id=decision_id, organization=request.user.organization)
        prs = decision.pull_requests.all()
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
                for pr in prs
            ]
        )
    except Decision.DoesNotExist:
        return Response({"error": "Decision not found"}, status=status.HTTP_404_NOT_FOUND)


@csrf_exempt
@api_view(["POST"])
@permission_classes([AllowAny])
def github_webhook(request):
    """Handle GitHub webhook events and log delivery outcomes."""
    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
    except Exception:
        return Response({"error": "invalid_json"}, status=status.HTTP_400_BAD_REQUEST)

    repo = payload.get("repository", {})
    repo_owner = repo.get("owner", {}).get("login")
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
        expected = hmac.new(
            webhook_secret.encode("utf-8"),
            request.body,
            hashlib.sha256,
        ).hexdigest()
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


def handle_pull_request_event(data, integration):
    """Handle PR opened/closed/merged events."""
    pr_data = data.get("pull_request", {})

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
    except Decision.DoesNotExist:
        return Response({"message": "Decision not found"}, status=status.HTTP_200_OK)


def handle_push_event(data, integration):
    """Handle push events to track commits."""
    commits = data.get("commits", [])
    processed_count = 0

    for commit_data in commits:
        message = commit_data.get("message", "")
        decision_id = extract_decision_id(message)
        if not decision_id:
            continue

        try:
            decision = Decision.objects.get(id=decision_id, organization=integration.organization)
            Commit.objects.get_or_create(
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
        except Decision.DoesNotExist:
            continue

    if processed_count == 0:
        return Response({"message": "No decision-linked commits found"}, status=status.HTTP_200_OK)

    return Response({"message": "Commits processed", "processed_commits": processed_count}, status=status.HTTP_200_OK)


def extract_decision_id(text):
    """Extract decision ID from text like DECISION-123, RECALL-123, or #123."""
    match = re.search(r"(?:DECISION-|RECALL-|#)(\d+)", text, re.IGNORECASE)
    return int(match.group(1)) if match else None
