import requests
from apps.integrations.models import SlackIntegration, GitHubIntegration, JiraIntegration

def post_to_slack(organization, message, blocks=None):
    """Post message to Slack"""
    try:
        slack = SlackIntegration.objects.get(organization=organization, enabled=True)
        payload = {'text': message}
        if blocks:
            payload['blocks'] = blocks
        requests.post(slack.webhook_url, json=payload, timeout=5)
    except SlackIntegration.DoesNotExist:
        pass
    except Exception as e:
        print(f"Slack error: {e}")

def notify_decision_created(decision):
    """Notify Slack when decision is created"""
    if not decision.organization.slack or not decision.organization.slack.post_decisions:
        return
    
    message = f"*New Decision:* {decision.title}\n*Impact:* {decision.impact_level}\n*Owner:* {decision.decision_maker.get_full_name()}"
    post_to_slack(decision.organization, message)

def notify_blocker_created(blocker):
    """Notify Slack when blocker is reported"""
    if not blocker.organization.slack or not blocker.organization.slack.post_blockers:
        return
    
    message = f"🚧 *Blocker:* {blocker.title}\n*Type:* {blocker.blocker_type}\n*Reported by:* {blocker.blocked_by.get_full_name()}"
    post_to_slack(blocker.organization, message)

def post_sprint_summary(organization, summary):
    """Post sprint summary to Slack"""
    if not organization.slack or not organization.slack.post_sprint_summary:
        return
    
    message = f"*{summary['sprint_name']}* - {summary['days_remaining']} days left\n"
    message += f"✅ {summary['completed']} completed | "
    message += f"🔄 {summary['in_progress']} in progress | "
    message += f"🚧 {summary['blocked']} blocked | "
    message += f"📋 {summary['decisions_made']} decisions"
    
    post_to_slack(organization, message)

def fetch_github_pr(integration, pr_number):
    """Fetch PR details from GitHub"""
    url = f"https://api.github.com/repos/{integration.repo_owner}/{integration.repo_name}/pulls/{pr_number}"
    headers = {'Authorization': f'token {integration.access_token}'}
    try:
        response = requests.get(url, headers=headers, timeout=5)
        if response.status_code == 200:
            return response.json()
    except Exception as e:
        print(f"GitHub error: {e}")
    return None

def sync_jira_issue(integration, issue_key):
    """Fetch issue from Jira"""
    url = f"{integration.site_url}/rest/api/3/issue/{issue_key}"
    auth = (integration.email, integration.api_token)
    try:
        response = requests.get(url, auth=auth, timeout=5)
        if response.status_code == 200:
            return response.json()
    except Exception as e:
        print(f"Jira error: {e}")
    return None
