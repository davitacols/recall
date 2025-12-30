from rest_framework.decorators import api_view
from rest_framework.response import Response
from apps.integrations.models import SlackIntegration, GitHubIntegration, JiraIntegration
from apps.integrations.utils import post_to_slack, fetch_github_pr, sync_jira_issue

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
        github = GitHubIntegration.objects.get(organization=request.user.organization)
        pr = fetch_github_pr(github, 1)
        if pr:
            return Response({'message': 'GitHub connected', 'test_pr': pr.get('title')})
        return Response({'error': 'Failed to connect'}, status=400)
    
    elif integration_type == 'jira':
        jira = JiraIntegration.objects.get(organization=request.user.organization)
        issue = sync_jira_issue(jira, request.data.get('test_issue', 'TEST-1'))
        if issue:
            return Response({'message': 'Jira connected', 'test_issue': issue.get('key')})
        return Response({'error': 'Failed to connect'}, status=400)
    
    return Response({'error': 'Invalid integration type'}, status=400)
