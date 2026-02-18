from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from apps.integrations.webhook_models import Webhook, ExternalIntegration, WebhookDelivery
from apps.integrations.webhook_service import WebhookService, SlackService, TeamsService, GitService
import secrets

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def webhooks(request):
    """List or create webhooks"""
    org = request.user.organization
    
    if request.method == 'GET':
        webhooks = Webhook.objects.filter(organization=org)
        data = [{
            'id': w.id,
            'name': w.name,
            'url': w.url,
            'events': w.events,
            'is_active': w.is_active,
            'created_at': w.created_at
        } for w in webhooks]
        return Response(data)
    
    elif request.method == 'POST':
        webhook = Webhook.objects.create(
            organization=org,
            name=request.data.get('name'),
            url=request.data.get('url'),
            events=request.data.get('events', []),
            secret=secrets.token_hex(32)
        )
        return Response({
            'id': webhook.id,
            'name': webhook.name,
            'url': webhook.url,
            'events': webhook.events,
            'secret': webhook.secret
        }, status=201)

@api_view(['PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def webhook_detail(request, webhook_id):
    """Update or delete webhook"""
    try:
        webhook = Webhook.objects.get(id=webhook_id, organization=request.user.organization)
    except Webhook.DoesNotExist:
        return Response({'error': 'Not found'}, status=404)
    
    if request.method == 'PUT':
        webhook.name = request.data.get('name', webhook.name)
        webhook.url = request.data.get('url', webhook.url)
        webhook.events = request.data.get('events', webhook.events)
        webhook.is_active = request.data.get('is_active', webhook.is_active)
        webhook.save()
        return Response({'message': 'Updated'})
    
    elif request.method == 'DELETE':
        webhook.delete()
        return Response({'message': 'Deleted'})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def test_webhook(request, webhook_id):
    """Test webhook delivery"""
    try:
        webhook = Webhook.objects.get(id=webhook_id, organization=request.user.organization)
    except Webhook.DoesNotExist:
        return Response({'error': 'Not found'}, status=404)
    
    test_payload = {
        'event': 'test',
        'timestamp': '2024-01-01T00:00:00Z',
        'data': {'message': 'Test webhook'}
    }
    
    WebhookService.deliver(webhook, 'test', test_payload)
    return Response({'message': 'Test sent'})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def webhook_deliveries(request, webhook_id):
    """Get webhook delivery history"""
    deliveries = WebhookDelivery.objects.filter(
        webhook_id=webhook_id,
        webhook__organization=request.user.organization
    ).order_by('-delivered_at')[:50]
    
    data = [{
        'id': d.id,
        'event': d.event,
        'success': d.success,
        'status': d.response_status,
        'delivered_at': d.delivered_at
    } for d in deliveries]
    
    return Response(data)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def integrations(request):
    """List or create integrations"""
    org = request.user.organization
    
    if request.method == 'GET':
        integrations = ExternalIntegration.objects.filter(organization=org)
        data = [{
            'id': i.id,
            'type': i.type,
            'name': i.name,
            'is_active': i.is_active,
            'created_at': i.created_at
        } for i in integrations]
        return Response(data)
    
    elif request.method == 'POST':
        integration = ExternalIntegration.objects.create(
            organization=org,
            type=request.data.get('type'),
            name=request.data.get('name'),
            config=request.data.get('config', {})
        )
        return Response({
            'id': integration.id,
            'type': integration.type,
            'name': integration.name
        }, status=201)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def integration_detail(request, integration_id):
    """Delete integration"""
    try:
        integration = ExternalIntegration.objects.get(id=integration_id, organization=request.user.organization)
        integration.delete()
        return Response({'message': 'Deleted'})
    except ExternalIntegration.DoesNotExist:
        return Response({'error': 'Not found'}, status=404)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def slack_test(request):
    """Test Slack integration"""
    webhook_url = request.data.get('webhook_url')
    if not webhook_url:
        return Response({'error': 'webhook_url required'}, status=400)
    
    success = SlackService.send_message(
        webhook_url,
        'Test message from Recall',
        [{'type': 'section', 'text': {'type': 'mrkdwn', 'text': '*Integration successful!*'}}]
    )
    
    return Response({'success': success})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def teams_test(request):
    """Test Teams integration"""
    webhook_url = request.data.get('webhook_url')
    if not webhook_url:
        return Response({'error': 'webhook_url required'}, status=400)
    
    success = TeamsService.send_message(
        webhook_url,
        'Test from Recall',
        'Integration successful!'
    )
    
    return Response({'success': success})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def gitlab_commits(request):
    """Fetch GitLab commits"""
    project_id = request.data.get('project_id')
    token = request.data.get('token')
    
    if not project_id or not token:
        return Response({'error': 'project_id and token required'}, status=400)
    
    commits = GitService.get_gitlab_commits(project_id, token)
    return Response({'commits': commits})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bitbucket_commits(request):
    """Fetch Bitbucket commits"""
    workspace = request.data.get('workspace')
    repo = request.data.get('repo')
    token = request.data.get('token')
    
    if not all([workspace, repo, token]):
        return Response({'error': 'workspace, repo, and token required'}, status=400)
    
    commits = GitService.get_bitbucket_commits(workspace, repo, token)
    return Response({'commits': commits})
