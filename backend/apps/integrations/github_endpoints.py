from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
import re
from apps.integrations.models import GitHubIntegration
from apps.agile.models import CodeCommit, PullRequest, Deployment
from apps.decisions.models import Decision

@api_view(['POST', 'GET'])
@permission_classes([IsAuthenticated])
def github_config(request):
    """Configure GitHub integration"""
    if request.method == 'GET':
        try:
            config = GitHubIntegration.objects.get(organization=request.user.organization)
            return Response({
                'repo_owner': config.repo_owner,
                'repo_name': config.repo_name,
                'configured': True
            })
        except GitHubIntegration.DoesNotExist:
            return Response({'configured': False})
    
    # POST - Configure
    config, created = GitHubIntegration.objects.update_or_create(
        organization=request.user.organization,
        defaults={
            'access_token': request.data['access_token'],
            'repo_owner': request.data['repo_owner'],
            'repo_name': request.data['repo_name']
        }
    )
    
    return Response({'message': 'GitHub integration configured'})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def link_commit_to_decision(request, decision_id):
    """Link commit to decision by parsing commit message"""
    try:
        decision = Decision.objects.get(id=decision_id, organization=request.user.organization)
    except Decision.DoesNotExist:
        return Response({'error': 'Decision not found'}, status=404)
    
    commit_hash = request.data.get('commit_hash')
    message = request.data.get('message', '')
    author = request.data.get('author', '')
    branch = request.data.get('branch', '')
    url = request.data.get('url', '')
    
    # Parse decision reference from commit message (e.g., "DECISION-123: implement auth")
    decision_ref = re.search(r'DECISION-(\d+)', message, re.IGNORECASE)
    if decision_ref:
        try:
            ref_decision = Decision.objects.get(id=decision_ref.group(1), organization=request.user.organization)
            decision = ref_decision
        except Decision.DoesNotExist:
            pass
    
    commit = CodeCommit.objects.create(
        organization=request.user.organization,
        commit_hash=commit_hash,
        message=message,
        author=author,
        branch=branch,
        url=url
    )
    
    return Response({'id': commit.id, 'decision_id': decision.id})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def decision_code_links(request, decision_id):
    """Get all code links for a decision"""
    try:
        decision = Decision.objects.get(id=decision_id, organization=request.user.organization)
    except Decision.DoesNotExist:
        return Response({'error': 'Decision not found'}, status=404)
    
    commits = CodeCommit.objects.filter(organization=request.user.organization)
    prs = PullRequest.objects.filter(organization=request.user.organization)
    deployments = Deployment.objects.filter(organization=request.user.organization)
    
    return Response({
        'decision_id': decision.id,
        'commits': [{
            'id': c.id,
            'hash': c.commit_hash[:8],
            'message': c.message[:100],
            'author': c.author,
            'branch': c.branch,
            'url': c.url,
            'created_at': c.created_at.isoformat()
        } for c in commits[:10]],
        'pull_requests': [{
            'id': p.id,
            'number': p.pr_number,
            'title': p.title,
            'status': p.status,
            'author': p.author,
            'url': p.url,
            'merged_at': p.merged_at.isoformat() if p.merged_at else None
        } for p in prs[:10]],
        'deployments': [{
            'id': d.id,
            'environment': d.environment,
            'status': d.status,
            'branch': d.branch,
            'deployed_by': d.deployed_by,
            'deployed_at': d.deployed_at.isoformat() if d.deployed_at else None
        } for d in deployments[:10]]
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def link_pr_to_decision(request, decision_id):
    """Link PR to decision"""
    try:
        decision = Decision.objects.get(id=decision_id, organization=request.user.organization)
    except Decision.DoesNotExist:
        return Response({'error': 'Decision not found'}, status=404)
    
    pr = PullRequest.objects.create(
        organization=request.user.organization,
        pr_number=request.data['pr_number'],
        title=request.data['title'],
        description=request.data.get('description', ''),
        status=request.data.get('status', 'open'),
        url=request.data['url'],
        author=request.data.get('author', ''),
        reviewers=request.data.get('reviewers', [])
    )
    
    return Response({'id': pr.id, 'pr_number': pr.pr_number})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_pr_status(request, pr_id):
    """Update PR status"""
    try:
        pr = PullRequest.objects.get(id=pr_id, organization=request.user.organization)
    except PullRequest.DoesNotExist:
        return Response({'error': 'PR not found'}, status=404)
    
    pr.status = request.data.get('status', pr.status)
    if request.data.get('merged'):
        pr.merged_at = request.data.get('merged_at')
    pr.save()
    
    return Response({'message': 'PR updated', 'status': pr.status})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def record_deployment(request):
    """Record deployment"""
    deployment = Deployment.objects.create(
        organization=request.user.organization,
        environment=request.data['environment'],
        status=request.data.get('status', 'pending'),
        commit_hash=request.data['commit_hash'],
        branch=request.data.get('branch', ''),
        deployed_by=request.data.get('deployed_by', ''),
        deployed_at=request.data.get('deployed_at'),
        url=request.data.get('url', '')
    )
    
    return Response({'id': deployment.id, 'environment': deployment.environment})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def decision_implementation_status(request, decision_id):
    """Get implementation status of decision"""
    try:
        decision = Decision.objects.get(id=decision_id, organization=request.user.organization)
    except Decision.DoesNotExist:
        return Response({'error': 'Decision not found'}, status=404)
    
    commits = CodeCommit.objects.filter(organization=request.user.organization).count()
    prs = PullRequest.objects.filter(organization=request.user.organization)
    merged_prs = prs.filter(status='merged').count()
    deployments = Deployment.objects.filter(organization=request.user.organization)
    successful_deployments = deployments.filter(status='success').count()
    
    implementation_status = 'not_started'
    if commits > 0:
        implementation_status = 'in_progress'
    if merged_prs > 0:
        implementation_status = 'code_merged'
    if successful_deployments > 0:
        implementation_status = 'deployed'
    
    return Response({
        'decision_id': decision.id,
        'implementation_status': implementation_status,
        'commits': commits,
        'pull_requests': prs.count(),
        'merged_prs': merged_prs,
        'deployments': deployments.count(),
        'successful_deployments': successful_deployments,
        'environments': list(set([d.environment for d in deployments]))
    })
