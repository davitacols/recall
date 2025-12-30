from rest_framework.decorators import api_view
from rest_framework.response import Response
from apps.integrations.models import SlackIntegration, GitHubIntegration, JiraIntegration
from apps.integrations.utils import post_to_slack, fetch_github_pr, sync_jira_issue
import requests

@api_view(['GET', 'POST'])
def slack_integration(request):
    if request.method == 'GET':
        try:
            slack = SlackIntegration.objects.get(organization=request.user.organization)
            return Response({
                'enabled': slack.enabled,
                'channel': slack.channel,
                'post_decisions': slack.post_decisions,
                'post_blockers': slack.post_blockers,
                'post_sprint_summary': slack.post_sprint_summary
            })
        except SlackIntegration.DoesNotExist:
            return Response({'enabled': False})
    
    elif request.method == 'POST':
        slack, created = SlackIntegration.objects.update_or_create(
            organization=request.user.organization,
            defaults={
                'webhook_url': request.data['webhook_url'],
                'channel': request.data.get('channel', '#general'),
                'enabled': request.data.get('enabled', True),
                'post_decisions': request.data.get('post_decisions', True),
                'post_blockers': request.data.get('post_blockers', True),
                'post_sprint_summary': request.data.get('post_sprint_summary', False)
            }
        )
        
        # Test connection
        post_to_slack(request.user.organization, "✅ Recall connected to Slack!")
        
        return Response({'message': 'Slack connected'})

@api_view(['GET', 'POST'])
def github_integration(request):
    if request.method == 'GET':
        try:
            github = GitHubIntegration.objects.get(organization=request.user.organization)
            return Response({
                'enabled': github.enabled,
                'repo_owner': github.repo_owner,
                'repo_name': github.repo_name,
                'auto_link_prs': github.auto_link_prs
            })
        except GitHubIntegration.DoesNotExist:
            return Response({'enabled': False})
    
    elif request.method == 'POST':
        github, created = GitHubIntegration.objects.update_or_create(
            organization=request.user.organization,
            defaults={
                'access_token': request.data['access_token'],
                'repo_owner': request.data['repo_owner'],
                'repo_name': request.data['repo_name'],
                'enabled': request.data.get('enabled', True),
                'auto_link_prs': request.data.get('auto_link_prs', True)
            }
        )
        
        return Response({'message': 'GitHub connected'})

@api_view(['GET', 'POST'])
def jira_integration(request):
    if request.method == 'GET':
        try:
            jira = JiraIntegration.objects.get(organization=request.user.organization)
            return Response({
                'enabled': jira.enabled,
                'site_url': jira.site_url,
                'email': jira.email,
                'auto_sync_issues': jira.auto_sync_issues
            })
        except JiraIntegration.DoesNotExist:
            return Response({'enabled': False})
    
    elif request.method == 'POST':
        jira, created = JiraIntegration.objects.update_or_create(
            organization=request.user.organization,
            defaults={
                'site_url': request.data['site_url'],
                'email': request.data['email'],
                'api_token': request.data['api_token'],
                'enabled': request.data.get('enabled', True),
                'auto_sync_issues': request.data.get('auto_sync_issues', False)
            }
        )
        
        return Response({'message': 'Jira connected'})

@api_view(['POST'])
def test_integration(request, integration_type):
    """Test integration connection"""
    if integration_type == 'slack':
        post_to_slack(request.user.organization, "✅ Test message from Recall")
        return Response({'message': 'Test message sent'})
    
    elif integration_type == 'github':
        try:
            github = GitHubIntegration.objects.get(organization=request.user.organization)
            url = f"https://api.github.com/repos/{github.repo_owner}/{github.repo_name}"
            headers = {'Authorization': f'token {github.access_token}'}
            response = requests.get(url, headers=headers, timeout=5)
            if response.status_code == 200:
                repo = response.json()
                return Response({'message': 'GitHub connected', 'repo': repo.get('name')})
            return Response({'error': 'Failed to connect'}, status=400)
        except GitHubIntegration.DoesNotExist:
            return Response({'error': 'GitHub not configured'}, status=400)
        except Exception as e:
            return Response({'error': str(e)}, status=400)
    
    elif integration_type == 'jira':
        try:
            jira = JiraIntegration.objects.get(organization=request.user.organization)
            url = f"{jira.site_url}/rest/api/3/serverInfo"
            auth = (jira.email, jira.api_token)
            response = requests.get(url, auth=auth, timeout=5)
            if response.status_code == 200:
                return Response({'message': 'Jira connected'})
            return Response({'error': 'Failed to connect'}, status=400)
        except JiraIntegration.DoesNotExist:
            return Response({'error': 'Jira not configured'}, status=400)
        except Exception as e:
            return Response({'error': str(e)}, status=400)
    
    return Response({'error': 'Invalid integration type'}, status=400)

@api_view(['GET'])
def search_github_prs(request, decision_id):
    """Search GitHub for PRs related to a decision"""
    from apps.decisions.models import Decision
    from apps.integrations.utils import search_github_prs as search_prs
    
    try:
        decision = Decision.objects.get(id=decision_id, organization=request.user.organization)
        github = GitHubIntegration.objects.get(organization=request.user.organization)
        prs = search_prs(github, decision.title)
        return Response({
            'prs': [{
                'number': pr.get('number'),
                'title': pr.get('title'),
                'url': pr.get('html_url'),
                'state': pr.get('state'),
                'created_at': pr.get('created_at')
            } for pr in prs]
        })
    except Decision.DoesNotExist:
        return Response({'error': 'Decision not found'}, status=404)
    except GitHubIntegration.DoesNotExist:
        return Response({'error': 'GitHub not configured'}, status=400)

@api_view(['POST'])
def link_github_pr(request, decision_id):
    """Link a GitHub PR to a decision"""
    from apps.decisions.models import Decision
    from django.utils import timezone
    
    try:
        decision = Decision.objects.get(id=decision_id, organization=request.user.organization)
        pr_url = request.data.get('pr_url')
        
        if not decision.code_links:
            decision.code_links = []
        
        decision.code_links.append({
            'type': 'github_pr',
            'url': pr_url,
            'linked_at': timezone.now().isoformat()
        })
        
        decision.save()
        return Response({'message': 'PR linked', 'code_links': decision.code_links})
    except Decision.DoesNotExist:
        return Response({'error': 'Decision not found'}, status=404)

@api_view(['POST'])
def create_jira_issue(request, blocker_id):
    """Create Jira issue for a blocker"""
    from apps.agile.models import Blocker
    from apps.integrations.utils import auto_sync_jira_blocker
    
    try:
        blocker = Blocker.objects.get(id=blocker_id, organization=request.user.organization)
        auto_sync_jira_blocker(blocker)
        
        if blocker.ticket_url:
            return Response({
                'message': 'Jira issue created',
                'ticket_id': blocker.ticket_id,
                'ticket_url': blocker.ticket_url
            })
        return Response({'error': 'Failed to create Jira issue'}, status=400)
    except Blocker.DoesNotExist:
        return Response({'error': 'Blocker not found'}, status=404)
