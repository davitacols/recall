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

def search_github_prs(integration, query):
    """Search for PRs matching a query"""
    url = f"https://api.github.com/search/issues"
    headers = {'Authorization': f'token {integration.access_token}'}
    search_query = f"repo:{integration.repo_owner}/{integration.repo_name} type:pr {query}"
    params = {'q': search_query, 'per_page': 5}
    try:
        response = requests.get(url, headers=headers, params=params, timeout=5)
        if response.status_code == 200:
            return response.json().get('items', [])
    except Exception as e:
        print(f"GitHub search error: {e}")
    return []

def auto_link_github_prs(decision):
    """Auto-link GitHub PRs to a decision"""
    try:
        github = GitHubIntegration.objects.get(organization=decision.organization, enabled=True)
        if not github.auto_link_prs:
            return
        
        prs = search_github_prs(github, decision.title)
        if prs:
            if not decision.code_links:
                decision.code_links = []
            
            for pr in prs[:3]:  # Link top 3 PRs
                decision.code_links.append({
                    'type': 'github_pr',
                    'url': pr.get('html_url'),
                    'title': pr.get('title'),
                    'number': pr.get('number'),
                    'auto_linked': True
                })
            
            decision.save()
    except GitHubIntegration.DoesNotExist:
        pass
    except Exception as e:
        print(f"Auto-link error: {e}")

def auto_sync_jira_blocker(blocker):
    """Auto-sync blocker to Jira"""
    try:
        jira = JiraIntegration.objects.get(organization=blocker.organization, enabled=True)
        if not jira.auto_sync_issues:
            return
        
        # Create issue in Jira
        url = f"{jira.site_url}/rest/api/3/issue"
        auth = (jira.email, jira.api_token)
        payload = {
            'fields': {
                'project': {'key': 'RECALL'},
                'summary': blocker.title,
                'description': blocker.description,
                'issuetype': {'name': 'Bug'}
            }
        }
        response = requests.post(url, json=payload, auth=auth, timeout=5)
        if response.status_code == 201:
            issue = response.json()
            blocker.ticket_id = issue.get('key')
            blocker.ticket_url = f"{jira.site_url}/browse/{issue.get('key')}"
            blocker.save()
    except JiraIntegration.DoesNotExist:
        pass
    except Exception as e:
        print(f"Jira sync error: {e}")

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
