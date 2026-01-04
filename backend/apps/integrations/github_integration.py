from rest_framework.decorators import api_view
from rest_framework.response import Response

@api_view(['GET'])
def list_integrations(request):
    """List all integrations for organization"""
    from apps.integrations.models import GitHubIntegration
    
    integrations = []
    
    try:
        github = GitHubIntegration.objects.get(organization=request.user.organization)
        print(f"DEBUG: Found GitHub integration: {github.repo_owner}/{github.repo_name}")
        integrations.append({
            'id': github.id,
            'type': 'github',
            'name': f'{github.repo_owner}/{github.repo_name}',
            'enabled': github.enabled,
            'created_at': github.created_at.isoformat() if github.created_at else None
        })
    except GitHubIntegration.DoesNotExist:
        print(f"DEBUG: No GitHub integration found for org {request.user.organization}")
    
    print(f"DEBUG: Returning {len(integrations)} integrations")
    return Response(integrations)

@api_view(['GET'])
def github_activity(request):
    """Get recent GitHub activity (commits and PRs)"""
    from apps.integrations.models import GitHubIntegration
    import requests
    
    try:
        github = GitHubIntegration.objects.get(organization=request.user.organization)
        print(f"DEBUG: Found GitHub integration: {github.repo_owner}/{github.repo_name}")
    except GitHubIntegration.DoesNotExist:
        print(f"DEBUG: No GitHub integration found")
        return Response([])
    
    activity = []
    headers = {'Authorization': f'token {github.access_token}'}
    
    try:
        # Fetch recent commits
        commits_url = f"https://api.github.com/repos/{github.repo_owner}/{github.repo_name}/commits"
        print(f"DEBUG: Fetching commits from {commits_url}")
        commits_resp = requests.get(commits_url, headers=headers, params={'per_page': 5}, timeout=5)
        print(f"DEBUG: Commits response status: {commits_resp.status_code}")
        if commits_resp.status_code == 200:
            commits = commits_resp.json()
            print(f"DEBUG: Got {len(commits)} commits")
            for commit in commits:
                activity.append({
                    'type': 'commit',
                    'message': commit['commit']['message'].split('\n')[0],
                    'author': commit['commit']['author']['name'],
                    'date': commit['commit']['author']['date'],
                    'url': commit['html_url']
                })
    except Exception as e:
        print(f"Failed to fetch commits: {e}")
    
    try:
        # Fetch recent PRs
        prs_url = f"https://api.github.com/repos/{github.repo_owner}/{github.repo_name}/pulls"
        print(f"DEBUG: Fetching PRs from {prs_url}")
        prs_resp = requests.get(prs_url, headers=headers, params={'per_page': 5, 'state': 'all'}, timeout=5)
        print(f"DEBUG: PRs response status: {prs_resp.status_code}")
        if prs_resp.status_code == 200:
            prs = prs_resp.json()
            print(f"DEBUG: Got {len(prs)} PRs")
            for pr in prs:
                activity.append({
                    'type': 'pr',
                    'title': pr['title'],
                    'author': pr['user']['login'],
                    'date': pr['created_at'],
                    'url': pr['html_url']
                })
    except Exception as e:
        print(f"Failed to fetch PRs: {e}")
    
    # Sort by date descending
    activity.sort(key=lambda x: x['date'], reverse=True)
    print(f"DEBUG: Returning {len(activity)} activity items")
    return Response(activity[:10])

@api_view(['POST'])
def github_webhook(request):
    """Handle GitHub webhook events"""
    return Response({'status': 'received'})

@api_view(['POST'])
def connect_github(request):
    """Connect GitHub repository to Recall"""
    try:
        repo_url = request.data.get('repo_url')
        github_token = request.data.get('github_token')
        
        if not repo_url or not github_token:
            return Response({'error': 'repo_url and github_token required'}, status=400)
        
        parts = repo_url.split('/')
        if len(parts) != 2:
            return Response({'error': 'Invalid repo URL format. Use: username/repo-name'}, status=400)
        
        repo_owner, repo_name = parts
        
        from apps.integrations.models import GitHubIntegration
        
        org = request.user.organization
        if not org:
            return Response({'error': 'User not part of any organization'}, status=400)
        
        integration, created = GitHubIntegration.objects.update_or_create(
            organization=org,
            defaults={
                'access_token': github_token,
                'repo_owner': repo_owner,
                'repo_name': repo_name,
                'enabled': True
            }
        )
        
        return Response({
            'status': 'GitHub connected',
            'repo': f'{repo_owner}/{repo_name}',
            'created': created
        })
    except Exception as e:
        return Response({'error': str(e)}, status=400)

@api_view(['GET'])
def github_commits(request, issue_id):
    """Get commits linked to an issue"""
    return Response({'commits': []})

@api_view(['GET'])
def github_prs(request, issue_id):
    """Get PRs linked to an issue"""
    return Response({'prs': []})
