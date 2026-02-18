import requests
import json
from django.conf import settings
from apps.integrations.webhook_models import Webhook, WebhookDelivery

class WebhookService:
    @staticmethod
    def trigger(organization_id, event, payload):
        """Trigger webhooks for an event"""
        webhooks = Webhook.objects.filter(
            organization_id=organization_id,
            is_active=True,
            events__contains=[event]
        )
        
        for webhook in webhooks:
            WebhookService.deliver(webhook, event, payload)
    
    @staticmethod
    def deliver(webhook, event, payload):
        """Deliver webhook to endpoint"""
        data = {
            'event': event,
            'timestamp': payload.get('timestamp'),
            'data': payload
        }
        
        json_payload = json.dumps(data)
        headers = {'Content-Type': 'application/json'}
        
        if webhook.secret:
            signature = webhook.generate_signature(json_payload)
            headers['X-Webhook-Signature'] = signature
        
        try:
            response = requests.post(
                webhook.url,
                data=json_payload,
                headers=headers,
                timeout=10
            )
            
            WebhookDelivery.objects.create(
                webhook=webhook,
                event=event,
                payload=data,
                response_status=response.status_code,
                response_body=response.text[:1000],
                success=200 <= response.status_code < 300
            )
        except Exception as e:
            WebhookDelivery.objects.create(
                webhook=webhook,
                event=event,
                payload=data,
                response_body=str(e)[:1000],
                success=False
            )

class SlackService:
    @staticmethod
    def send_message(webhook_url, text, blocks=None):
        """Send message to Slack"""
        payload = {'text': text}
        if blocks:
            payload['blocks'] = blocks
        
        try:
            response = requests.post(webhook_url, json=payload, timeout=5)
            return response.status_code == 200
        except:
            return False
    
    @staticmethod
    def format_issue_created(issue):
        """Format issue created message"""
        return {
            'text': f'New Issue: {issue.title}',
            'blocks': [
                {
                    'type': 'section',
                    'text': {
                        'type': 'mrkdwn',
                        'text': f'*New Issue Created*\n*{issue.title}*\n{issue.description or ""}'
                    }
                },
                {
                    'type': 'context',
                    'elements': [
                        {'type': 'mrkdwn', 'text': f'Priority: {issue.priority}'},
                        {'type': 'mrkdwn', 'text': f'Status: {issue.status}'}
                    ]
                }
            ]
        }

class TeamsService:
    @staticmethod
    def send_message(webhook_url, title, text):
        """Send message to Microsoft Teams"""
        payload = {
            '@type': 'MessageCard',
            '@context': 'https://schema.org/extensions',
            'summary': title,
            'themeColor': '0078D4',
            'title': title,
            'text': text
        }
        
        try:
            response = requests.post(webhook_url, json=payload, timeout=5)
            return response.status_code == 200
        except:
            return False

class GitService:
    @staticmethod
    def get_gitlab_commits(project_id, token, branch='main'):
        """Fetch commits from GitLab"""
        url = f'https://gitlab.com/api/v4/projects/{project_id}/repository/commits'
        headers = {'PRIVATE-TOKEN': token}
        params = {'ref_name': branch, 'per_page': 10}
        
        try:
            response = requests.get(url, headers=headers, params=params, timeout=10)
            return response.json() if response.status_code == 200 else []
        except:
            return []
    
    @staticmethod
    def get_bitbucket_commits(workspace, repo, token):
        """Fetch commits from Bitbucket"""
        url = f'https://api.bitbucket.org/2.0/repositories/{workspace}/{repo}/commits'
        headers = {'Authorization': f'Bearer {token}'}
        
        try:
            response = requests.get(url, headers=headers, timeout=10)
            return response.json().get('values', []) if response.status_code == 200 else []
        except:
            return []
