from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
import hmac
import hashlib
import json
import re

from .models import GitHubIntegration, PullRequest, Commit
from apps.decisions.models import Decision

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def link_pr_to_decision(request, decision_id):
    """Manually link a PR to a decision"""
    pr_url = request.data.get('pr_url')
    
    if not pr_url:
        return Response({'error': 'PR URL required'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Extract PR number from URL
    match = re.search(r'/pull/(\d+)', pr_url)
    if not match:
        return Response({'error': 'Invalid PR URL'}, status=status.HTTP_400_BAD_REQUEST)
    
    pr_number = int(match.group(1))
    
    try:
        decision = Decision.objects.get(id=decision_id, organization=request.user.organization)
        
        # Create or update PR
        pr, created = PullRequest.objects.get_or_create(
            organization=request.user.organization,
            pr_number=pr_number,
            defaults={
                'pr_url': pr_url,
                'title': f'PR #{pr_number}',
                'status': 'open',
                'branch_name': '',
                'author': '',
                'created_at': timezone.now()
            }
        )
        
        pr.decision = decision
        pr.save()
        
        return Response({'message': 'PR linked successfully', 'pr_id': pr.id})
    except Decision.DoesNotExist:
        return Response({'error': 'Decision not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_decision_prs(request, decision_id):
    """Get all PRs linked to a decision"""
    try:
        decision = Decision.objects.get(id=decision_id, organization=request.user.organization)
        prs = decision.pull_requests.all()
        
        return Response([{
            'id': pr.id,
            'pr_number': pr.pr_number,
            'pr_url': pr.pr_url,
            'title': pr.title,
            'status': pr.status,
            'branch_name': pr.branch_name,
            'author': pr.author,
            'created_at': pr.created_at,
            'merged_at': pr.merged_at,
            'commits_count': pr.commits_count
        } for pr in prs])
    except Decision.DoesNotExist:
        return Response({'error': 'Decision not found'}, status=status.HTTP_404_NOT_FOUND)


@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def github_webhook(request):
    """Handle GitHub webhook events"""
    
    # Verify webhook signature
    signature = request.headers.get('X-Hub-Signature-256', '')
    event = request.headers.get('X-GitHub-Event', '')
    
    if event == 'pull_request':
        return handle_pull_request_event(request.data)
    elif event == 'push':
        return handle_push_event(request.data)
    
    return Response({'message': 'Event received'})


def handle_pull_request_event(data):
    """Handle PR opened/closed/merged events"""
    action = data.get('action')
    pr_data = data.get('pull_request', {})
    repo = data.get('repository', {})
    
    pr_number = pr_data.get('number')
    pr_url = pr_data.get('html_url')
    title = pr_data.get('title', '')
    state = pr_data.get('state', 'open')
    merged = pr_data.get('merged', False)
    branch_name = pr_data.get('head', {}).get('ref', '')
    author = pr_data.get('user', {}).get('login', '')
    
    # Extract decision ID from PR title or branch name
    decision_id = extract_decision_id(title) or extract_decision_id(branch_name)
    
    if not decision_id:
        return Response({'message': 'No decision ID found'})
    
    try:
        # Find organization by repo
        integration = GitHubIntegration.objects.filter(
            repo_owner=repo.get('owner', {}).get('login'),
            repo_name=repo.get('name')
        ).first()
        
        if not integration:
            return Response({'message': 'Integration not found'})
        
        decision = Decision.objects.get(id=decision_id, organization=integration.organization)
        
        # Create or update PR
        pr, created = PullRequest.objects.update_or_create(
            organization=integration.organization,
            pr_number=pr_number,
            defaults={
                'decision': decision,
                'pr_url': pr_url,
                'title': title,
                'status': 'merged' if merged else state,
                'branch_name': branch_name,
                'author': author,
                'created_at': timezone.now(),
                'merged_at': timezone.now() if merged else None
            }
        )
        
        # Auto-update decision status
        if merged and decision.status != 'implemented':
            decision.status = 'implemented'
            decision.save()
        
        return Response({'message': 'PR processed', 'decision_updated': merged})
    except Decision.DoesNotExist:
        return Response({'message': 'Decision not found'})


def handle_push_event(data):
    """Handle push events to track commits"""
    commits = data.get('commits', [])
    repo = data.get('repository', {})
    
    integration = GitHubIntegration.objects.filter(
        repo_owner=repo.get('owner', {}).get('login'),
        repo_name=repo.get('name')
    ).first()
    
    if not integration:
        return Response({'message': 'Integration not found'})
    
    for commit_data in commits:
        message = commit_data.get('message', '')
        decision_id = extract_decision_id(message)
        
        if decision_id:
            try:
                decision = Decision.objects.get(id=decision_id, organization=integration.organization)
                
                Commit.objects.get_or_create(
                    sha=commit_data.get('id'),
                    defaults={
                        'organization': integration.organization,
                        'decision': decision,
                        'message': message,
                        'author': commit_data.get('author', {}).get('name', ''),
                        'commit_url': commit_data.get('url', ''),
                        'committed_at': timezone.now()
                    }
                )
            except Decision.DoesNotExist:
                pass
    
    return Response({'message': 'Commits processed'})


def extract_decision_id(text):
    """Extract decision ID from text like RECALL-123 or #123"""
    match = re.search(r'(?:RECALL-|#)(\d+)', text, re.IGNORECASE)
    return int(match.group(1)) if match else None
