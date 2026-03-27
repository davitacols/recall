from datetime import datetime
from html import unescape

from django.db.models import Q
from django.utils.html import strip_tags

from apps.conversations.models import ActionItem, Conversation, ConversationReply
from apps.decisions.models import Decision
from apps.organizations.models import User

try:
    from apps.business.models import CalendarConnection, Goal, Meeting, Task
    from apps.business.document_models import Document
    from apps.business.advanced_models import Milestone
    from apps.agile.models import Blocker, Issue, Project, Sprint, SprintUpdate
except Exception:  # pragma: no cover - optional in some test environments
    CalendarConnection = None
    Goal = None
    Meeting = None
    Task = None
    Document = None
    Milestone = None
    Blocker = None
    Issue = None
    Project = None
    Sprint = None
    SprintUpdate = None

try:
    from apps.integrations.models import (
        Commit as IntegrationCommit,
        GitHubIntegration,
        JiraIntegration,
        PullRequest as IntegrationPullRequest,
        SlackIntegration,
    )
except Exception:  # pragma: no cover - optional in some test environments
    IntegrationCommit = None
    GitHubIntegration = None
    JiraIntegration = None
    IntegrationPullRequest = None
    SlackIntegration = None


QUERY_STOP_WORDS = {
    'a', 'an', 'and', 'app', 'are', 'about', 'at', 'can', 'do', 'does', 'find', 'for', 'from',
    'how', 'i', 'in', 'is', 'it', 'me', 'of', 'on', 'or', 'project', 'projects', 'show', 'sprint',
    'sprints', 'task', 'tasks', 'tell', 'the', 'to', 'what', 'where', 'who', 'with',
}

PHRASE_WINDOW_STOP_WORDS = {
    'a', 'an', 'and', 'are', 'about', 'at', 'can', 'do', 'does', 'find', 'for', 'from',
    'how', 'i', 'in', 'is', 'it', 'me', 'of', 'on', 'or', 'show', 'tell', 'the', 'to', 'what',
    'where', 'who', 'with',
}

CONNECTOR_KEYWORDS = {
    'integration', 'integrations', 'connector', 'connectors', 'connected', 'connection', 'connections',
    'sync', 'synchronized', 'linked', 'workspace', 'systems',
}


TYPE_CONFIG = {
    'conversation': {
        'bucket': 'conversations',
        'model': Conversation,
        'org_filter': 'organization_id',
        'order_by': '-created_at',
        'search_fields': ('title', 'content'),
        'date_field': 'created_at',
        'suggest_field': 'title',
        'serialize': lambda item: {
            'id': item.id,
            'title': item.title,
            'content_preview': _truncate(item.content),
            'type': 'conversation',
            'post_type': item.post_type,
            'author': item.author.username if item.author else '',
            'status_label': item.status_label,
            'created_at': _iso(item.created_at),
            'url': f'/conversations/{item.id}',
        },
    },
    'reply': {
        'bucket': 'replies',
        'model': ConversationReply,
        'org_filter': 'conversation__organization_id',
        'order_by': '-created_at',
        'search_fields': ('content', 'conversation__title', 'author__username', 'author__full_name'),
        'date_field': 'created_at',
        'suggest_field': 'conversation__title',
        'serialize': lambda item: {
            'id': item.id,
            'title': f'Reply in {item.conversation.title}',
            'content_preview': _truncate(item.content),
            'type': 'reply',
            'author': item.author.get_full_name() if item.author else '',
            'conversation_title': item.conversation.title if item.conversation else '',
            'created_at': _iso(item.created_at),
            'updated_at': _iso(item.updated_at),
            'url': f'/conversations/{item.conversation_id}',
        },
    },
    'action_item': {
        'bucket': 'action_items',
        'model': ActionItem,
        'org_filter': 'conversation__organization_id',
        'order_by': '-created_at',
        'search_fields': ('title', 'description', 'conversation__title', 'assignee__username', 'assignee__full_name'),
        'date_field': 'created_at',
        'suggest_field': 'title',
        'serialize': lambda item: {
            'id': item.id,
            'title': item.title,
            'content_preview': _truncate(' '.join(filter(None, [
                item.description,
                f'Conversation {item.conversation.title}' if item.conversation else '',
            ]))),
            'type': 'action_item',
            'status': item.status,
            'priority': item.priority,
            'assignee_name': item.assignee.get_full_name() if item.assignee else '',
            'conversation_title': item.conversation.title if item.conversation else '',
            'created_at': _iso(item.created_at),
            'due_date': _iso(item.due_date),
            'url': f'/conversations/{item.conversation_id}',
        },
    },
    'decision': {
        'bucket': 'decisions',
        'model': Decision,
        'org_filter': 'organization_id',
        'order_by': '-created_at',
        'search_fields': ('title', 'description', 'rationale', 'plain_language_summary'),
        'date_field': 'created_at',
        'suggest_field': 'title',
        'serialize': lambda item: {
            'id': item.id,
            'title': item.title,
            'content_preview': _truncate(' '.join(filter(None, [item.description, item.rationale, item.plain_language_summary]))),
            'type': 'decision',
            'status': item.status,
            'impact_level': item.impact_level,
            'author': item.decision_maker.username if item.decision_maker else '',
            'created_at': _iso(item.created_at),
            'url': f'/decisions/{item.id}',
        },
    },
    'goal': {
        'bucket': 'goals',
        'model': Goal,
        'org_filter': 'organization_id',
        'order_by': '-created_at',
        'search_fields': ('title', 'description'),
        'date_field': 'created_at',
        'suggest_field': 'title',
        'serialize': lambda item: {
            'id': item.id,
            'title': item.title,
            'content_preview': _truncate(item.description),
            'type': 'goal',
            'status': item.status,
            'progress': item.progress,
            'owner_name': item.owner.get_full_name() if item.owner else '',
            'created_at': _iso(item.created_at),
            'url': f'/business/goals/{item.id}',
        },
    },
    'milestone': {
        'bucket': 'milestones',
        'model': Milestone,
        'org_filter': 'goal__organization_id',
        'order_by': '-created_at',
        'search_fields': ('title', 'description', 'goal__title'),
        'date_field': 'created_at',
        'suggest_field': 'title',
        'serialize': lambda item: {
            'id': item.id,
            'title': item.title,
            'content_preview': _truncate(' '.join(filter(None, [
                item.description,
                f'Goal {item.goal.title}' if item.goal else '',
            ]))),
            'type': 'milestone',
            'status': 'completed' if item.completed else 'open',
            'goal_title': item.goal.title if item.goal else '',
            'created_at': _iso(item.created_at),
            'due_date': _iso(item.due_date),
            'completed_at': _iso(item.completed_at),
            'url': f'/business/goals/{item.goal_id}',
        },
    },
    'task': {
        'bucket': 'tasks',
        'model': Task,
        'org_filter': 'organization_id',
        'order_by': '-created_at',
        'search_fields': ('title', 'description'),
        'date_field': 'created_at',
        'suggest_field': 'title',
        'serialize': lambda item: {
            'id': item.id,
            'title': item.title,
            'content_preview': _truncate(item.description),
            'type': 'task',
            'status': item.status,
            'priority': item.priority,
            'assignee_name': item.assigned_to.get_full_name() if item.assigned_to else '',
            'created_at': _iso(item.created_at),
            'url': '/business/tasks',
        },
    },
    'meeting': {
        'bucket': 'meetings',
        'model': Meeting,
        'org_filter': 'organization_id',
        'order_by': '-created_at',
        'search_fields': ('title', 'description', 'notes'),
        'date_field': 'created_at',
        'suggest_field': 'title',
        'serialize': lambda item: {
            'id': item.id,
            'title': item.title,
            'content_preview': _truncate(' '.join(filter(None, [item.description, item.notes]))),
            'type': 'meeting',
            'created_at': _iso(item.created_at),
            'meeting_date': _iso(item.meeting_date),
            'created_by_name': item.created_by.get_full_name() if item.created_by else '',
            'url': f'/business/meetings/{item.id}',
        },
    },
    'document': {
        'bucket': 'documents',
        'model': Document,
        'org_filter': 'organization_id',
        'order_by': '-updated_at',
        'search_fields': ('title', 'description', 'content'),
        'date_field': 'updated_at',
        'suggest_field': 'title',
        'serialize': lambda item: {
            'id': item.id,
            'title': item.title,
            'content_preview': _truncate(item.description or item.content),
            'type': 'document',
            'document_type': item.document_type,
            'created_at': _iso(item.created_at),
            'updated_at': _iso(item.updated_at),
            'updated_by_name': item.updated_by.get_full_name() if item.updated_by else '',
            'url': f'/business/documents/{item.id}',
        },
    },
    'project': {
        'bucket': 'projects',
        'model': Project,
        'org_filter': 'organization_id',
        'order_by': '-updated_at',
        'search_fields': ('name', 'key', 'description'),
        'date_field': 'updated_at',
        'suggest_field': 'name',
        'serialize': lambda item: {
            'id': item.id,
            'title': item.name,
            'content_preview': _truncate(' '.join(filter(None, [item.description, f'Project key {item.key}']))),
            'type': 'project',
            'key': item.key,
            'lead_name': item.lead.get_full_name() if item.lead else '',
            'created_at': _iso(item.created_at),
            'updated_at': _iso(item.updated_at),
            'url': f'/projects/{item.id}',
        },
    },
    'sprint': {
        'bucket': 'sprints',
        'model': Sprint,
        'org_filter': 'organization_id',
        'order_by': '-start_date',
        'search_fields': ('name', 'goal', 'summary', 'project__name', 'project__key'),
        'date_field': 'created_at',
        'suggest_field': 'name',
        'serialize': lambda item: {
            'id': item.id,
            'title': item.name,
            'content_preview': _truncate(' '.join(filter(None, [
                item.goal,
                item.summary,
                f'Project {item.project.name}' if item.project else '',
            ]))),
            'type': 'sprint',
            'status': item.status,
            'project_name': item.project.name if item.project else '',
            'created_at': _iso(item.created_at),
            'start_date': _iso(item.start_date),
            'end_date': _iso(item.end_date),
            'url': f'/sprints/{item.id}',
        },
    },
    'sprint_update': {
        'bucket': 'sprint_updates',
        'model': SprintUpdate,
        'org_filter': 'organization_id',
        'order_by': '-created_at',
        'search_fields': ('title', 'content', 'ai_summary', 'sprint__name', 'sprint__project__name'),
        'date_field': 'created_at',
        'suggest_field': 'title',
        'serialize': lambda item: {
            'id': item.id,
            'title': item.title,
            'content_preview': _truncate(item.ai_summary or item.content),
            'type': 'sprint_update',
            'status': item.type,
            'author': item.author.get_full_name() if item.author else '',
            'project_name': item.sprint.project.name if item.sprint and item.sprint.project else '',
            'sprint_name': item.sprint.name if item.sprint else '',
            'created_at': _iso(item.created_at),
            'url': f'/sprints/{item.sprint_id}',
        },
    },
    'issue': {
        'bucket': 'issues',
        'model': Issue,
        'org_filter': 'organization_id',
        'order_by': '-updated_at',
        'search_fields': ('title', 'description', 'key', 'project__name', 'project__key', 'sprint__name'),
        'date_field': 'updated_at',
        'suggest_field': 'title',
        'serialize': lambda item: {
            'id': item.id,
            'title': item.title,
            'content_preview': _truncate(' '.join(filter(None, [
                item.description,
                item.project.name if item.project else '',
                item.sprint.name if item.sprint else '',
            ]))),
            'type': 'issue',
            'key': item.key,
            'status': item.status,
            'priority': item.priority,
            'project_name': item.project.name if item.project else '',
            'sprint_name': item.sprint.name if item.sprint else '',
            'assignee_name': item.assignee.get_full_name() if item.assignee else '',
            'created_at': _iso(item.created_at),
            'updated_at': _iso(item.updated_at),
            'url': f'/issues/{item.id}',
        },
    },
    'blocker': {
        'bucket': 'blockers',
        'model': Blocker,
        'org_filter': 'organization_id',
        'order_by': '-created_at',
        'search_fields': ('title', 'description', 'blocker_type', 'ticket_id', 'conversation__title', 'sprint__name'),
        'date_field': 'created_at',
        'suggest_field': 'title',
        'serialize': lambda item: {
            'id': item.id,
            'title': item.title,
            'content_preview': _truncate(' '.join(filter(None, [
                item.description,
                f'Sprint {item.sprint.name}' if item.sprint else '',
                f'Conversation {item.conversation.title}' if item.conversation else '',
            ]))),
            'type': 'blocker',
            'status': item.status,
            'priority': item.blocker_type,
            'assignee_name': item.assigned_to.get_full_name() if item.assigned_to else '',
            'created_at': _iso(item.created_at),
            'resolved_at': _iso(item.resolved_at),
            'sprint_name': item.sprint.name if item.sprint else '',
            'url': '/blockers',
        },
    },
    'person': {
        'bucket': 'people',
        'model': User,
        'org_filter': 'organization_id',
        'order_by': '-last_active',
        'search_fields': ('username', 'full_name', 'email', 'bio', 'role'),
        'date_field': 'last_active',
        'suggest_field': 'full_name',
        'serialize': lambda item: {
            'id': item.id,
            'title': item.get_full_name(),
            'content_preview': _truncate(' '.join(filter(None, [
                f'Role {item.role}',
                item.bio,
            ]))),
            'type': 'person',
            'role': item.role,
            'status': 'active' if item.is_active else 'inactive',
            'created_at': _iso(item.last_active),
            'last_active': _iso(item.last_active),
            'url': '/team',
        },
    },
    'github_integration': {
        'bucket': 'github_integrations',
        'model': GitHubIntegration,
        'org_filter': 'organization_id',
        'order_by': '-created_at',
        'search_fields': ('repo_owner', 'repo_name'),
        'date_field': 'created_at',
        'suggest_field': 'repo_name',
        'broad_match_terms': CONNECTOR_KEYWORDS | {'github', 'repo', 'repository', 'repositories'},
        'serialize': lambda item: {
            'id': item.id,
            'title': f'GitHub: {item.repo_owner}/{item.repo_name}',
            'content_preview': _truncate(
                ' '.join(
                    filter(
                        None,
                        [
                            'Connected GitHub repository',
                            f'Repo {item.repo_owner}/{item.repo_name}',
                            f'Auto link PRs {"enabled" if item.auto_link_prs else "disabled"}',
                        ],
                    )
                )
            ),
            'type': 'github_integration',
            'status': 'enabled' if item.enabled else 'disabled',
            'created_at': _iso(item.created_at),
            'url': '/integrations',
        },
    },
    'jira_integration': {
        'bucket': 'jira_integrations',
        'model': JiraIntegration,
        'org_filter': 'organization_id',
        'order_by': '-created_at',
        'search_fields': ('site_url', 'email'),
        'date_field': 'created_at',
        'suggest_field': 'site_url',
        'broad_match_terms': CONNECTOR_KEYWORDS | {'jira', 'atlassian', 'ticket', 'tickets'},
        'serialize': lambda item: {
            'id': item.id,
            'title': f'Jira: {item.site_url}',
            'content_preview': _truncate(
                ' '.join(
                    filter(
                        None,
                        [
                            'Connected Jira workspace',
                            f'Admin {item.email}',
                            f'Issue sync {"enabled" if item.auto_sync_issues else "disabled"}',
                        ],
                    )
                )
            ),
            'type': 'jira_integration',
            'status': 'enabled' if item.enabled else 'disabled',
            'created_at': _iso(item.created_at),
            'url': '/integrations',
        },
    },
    'slack_integration': {
        'bucket': 'slack_integrations',
        'model': SlackIntegration,
        'org_filter': 'organization_id',
        'order_by': '-created_at',
        'search_fields': ('channel',),
        'date_field': 'created_at',
        'suggest_field': 'channel',
        'broad_match_terms': CONNECTOR_KEYWORDS | {'slack', 'channel', 'alerts', 'notifications'},
        'serialize': lambda item: {
            'id': item.id,
            'title': f'Slack: {item.channel}',
            'content_preview': _truncate(
                ' '.join(
                    filter(
                        None,
                        [
                            'Connected Slack channel',
                            f'Decision posts {"on" if item.post_decisions else "off"}',
                            f'Blocker posts {"on" if item.post_blockers else "off"}',
                            f'Sprint summaries {"on" if item.post_sprint_summary else "off"}',
                        ],
                    )
                )
            ),
            'type': 'slack_integration',
            'status': 'enabled' if item.enabled else 'disabled',
            'created_at': _iso(item.created_at),
            'url': '/integrations',
        },
    },
    'calendar_connection': {
        'bucket': 'calendar_connections',
        'model': CalendarConnection,
        'org_filter': 'organization_id',
        'order_by': '-updated_at',
        'search_fields': ('provider', 'external_calendar_id', 'user__username', 'user__full_name'),
        'date_field': 'updated_at',
        'suggest_field': 'provider',
        'broad_match_terms': CONNECTOR_KEYWORDS | {'calendar', 'google', 'outlook', 'schedule', 'scheduling', 'availability'},
        'serialize': lambda item: {
            'id': item.id,
            'title': f'{item.provider.title()} calendar for {item.user.get_full_name() or item.user.username}',
            'content_preview': _truncate(
                ' '.join(
                    filter(
                        None,
                        [
                            'External calendar connection',
                            f'Calendar {item.external_calendar_id}' if item.external_calendar_id else '',
                            f'Connected {"yes" if item.is_connected else "no"}',
                        ],
                    )
                )
            ),
            'type': 'calendar_connection',
            'status': 'connected' if item.is_connected else 'disconnected',
            'created_at': _iso(item.created_at),
            'updated_at': _iso(item.updated_at),
            'last_synced_at': _iso(item.last_synced_at),
            'url': '/business/calendar',
        },
    },
    'pull_request': {
        'bucket': 'pull_requests',
        'model': IntegrationPullRequest,
        'org_filter': 'organization_id',
        'order_by': '-created_at',
        'search_fields': ('title', 'branch_name', 'author', 'decision__title', 'pr_url'),
        'date_field': 'created_at',
        'suggest_field': 'title',
        'serialize': lambda item: {
            'id': item.id,
            'title': item.title,
            'content_preview': _truncate(
                ' '.join(
                    filter(
                        None,
                        [
                            f'PR #{item.pr_number}',
                            f'Branch {item.branch_name}',
                            f'Decision {item.decision.title}' if item.decision else '',
                        ],
                    )
                )
            ),
            'type': 'pull_request',
            'status': item.status,
            'author': item.author,
            'created_at': _iso(item.created_at),
            'merged_at': _iso(item.merged_at),
            'closed_at': _iso(item.closed_at),
            'url': item.pr_url,
        },
    },
    'commit': {
        'bucket': 'commits',
        'model': IntegrationCommit,
        'org_filter': 'organization_id',
        'order_by': '-committed_at',
        'search_fields': ('message', 'author', 'sha', 'decision__title', 'pull_request__title'),
        'date_field': 'committed_at',
        'suggest_field': 'message',
        'serialize': lambda item: {
            'id': item.id,
            'title': f'{item.sha[:7]} {item.message[:80]}'.strip(),
            'content_preview': _truncate(
                ' '.join(
                    filter(
                        None,
                        [
                            item.message,
                            f'Author {item.author}',
                            f'PR {item.pull_request.title}' if item.pull_request else '',
                            f'Decision {item.decision.title}' if item.decision else '',
                        ],
                    )
                )
            ),
            'type': 'commit',
            'status': 'recorded',
            'author': item.author,
            'created_at': _iso(item.committed_at),
            'committed_at': _iso(item.committed_at),
            'url': item.commit_url,
        },
    },
}


def _iso(value):
    return value.isoformat() if value else None


def _truncate(text, limit=220):
    text = unescape(strip_tags((text or '').replace('<br>', '\n').replace('<br/>', '\n').replace('<br />', '\n')))
    text = ' '.join(text.split())
    if len(text) <= limit:
        return text
    return f'{text[:limit].rstrip()}...'


def _parse_iso(value):
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value).replace('Z', '+00:00'))
    except Exception:
        return None


def _tokenize_query(query):
    tokens = []
    for raw in str(query or '').lower().replace('-', ' ').split():
        cleaned = ''.join(ch for ch in raw if ch.isalnum())
        if len(cleaned) < 3 or cleaned in QUERY_STOP_WORDS:
            continue
        tokens.append(cleaned)
    return tokens


def _build_phrase_windows(query, min_size=2, max_size=3):
    base_tokens = []
    for raw in str(query or '').lower().replace('-', ' ').split():
        cleaned = ''.join(ch for ch in raw if ch.isalnum())
        if len(cleaned) < 3 or cleaned in PHRASE_WINDOW_STOP_WORDS:
            continue
        base_tokens.append(cleaned)

    windows = []
    seen = set()
    for size in range(min_size, max_size + 1):
        for index in range(0, max(0, len(base_tokens) - size + 1)):
            phrase = ' '.join(base_tokens[index:index + size]).strip()
            if not phrase or phrase in seen:
                continue
            seen.add(phrase)
            windows.append(phrase)
    return windows


def _requested_types(filters):
    requested = filters.get('types') or []
    if isinstance(requested, str):
        requested = [part.strip().lower() for part in requested.split(',')]
    requested = {item.strip().lower() for item in requested if str(item).strip()}
    valid = {item for item in requested if item in TYPE_CONFIG and TYPE_CONFIG[item]['model'] is not None}
    return valid


def _build_query(search_fields, query):
    conditions = Q()
    for field in search_fields:
        conditions |= Q(**{f'{field}__icontains': query})

    for phrase in _build_phrase_windows(query):
        for field in search_fields:
            conditions |= Q(**{f'{field}__icontains': phrase})

    tokens = _tokenize_query(query)
    if not tokens:
        return conditions

    token_conditions = Q()
    for token in tokens:
        token_match = Q()
        for field in search_fields:
            token_match |= Q(**{f'{field}__icontains': token})
        token_conditions &= token_match

    return conditions | token_conditions


def _query_matches_terms(query, match_terms):
    text = str(query or '').lower()
    if not text or not match_terms:
        return False

    tokens = set(_tokenize_query(query))
    raw_tokens = {
        ''.join(ch for ch in part.lower() if ch.isalnum())
        for part in str(query or '').replace('-', ' ').split()
    }
    raw_tokens.discard('')

    for term in match_terms:
        normalized = str(term or '').strip().lower()
        if not normalized:
            continue
        if ' ' in normalized:
            if normalized in text:
                return True
            continue
        compact = ''.join(ch for ch in normalized if ch.isalnum())
        if compact and (compact in tokens or compact in raw_tokens):
            return True
    return False


class EnhancedSearchEngine:
    def search(self, query, organization_id, filters=None, limit=10):
        filters = filters or {}
        date_from = _parse_iso(filters.get('date_from'))
        date_to = _parse_iso(filters.get('date_to'))
        requested_types = _requested_types(filters)
        allowed_types = requested_types or {
            item_type for item_type, config in TYPE_CONFIG.items() if config['model'] is not None
        }

        results = {}
        for config in TYPE_CONFIG.values():
            bucket = config['bucket']
            if bucket not in results:
                results[bucket] = []

        for item_type, config in TYPE_CONFIG.items():
            model = config['model']
            if model is None or item_type not in allowed_types:
                continue

            filters_q = Q(**{config['org_filter']: organization_id})
            if query:
                broad_match_terms = config.get('broad_match_terms') or set()
                if not (broad_match_terms and _query_matches_terms(query, broad_match_terms)):
                    filters_q &= _build_query(config['search_fields'], query)

            if date_from:
                filters_q &= Q(**{f"{config['date_field']}__gte": date_from})
            if date_to:
                filters_q &= Q(**{f"{config['date_field']}__lte": date_to})

            if filters.get('author'):
                author_query = str(filters['author']).strip()
                if item_type == 'conversation':
                    filters_q &= Q(author__username__icontains=author_query)
                elif item_type == 'decision':
                    filters_q &= Q(decision_maker__username__icontains=author_query)
                elif item_type == 'reply':
                    filters_q &= Q(author__username__icontains=author_query)
                elif item_type == 'sprint_update':
                    filters_q &= Q(author__username__icontains=author_query)
                elif item_type == 'person':
                    filters_q &= (Q(username__icontains=author_query) | Q(full_name__icontains=author_query))

            if filters.get('status'):
                status_query = str(filters['status']).strip()
                if item_type == 'conversation':
                    filters_q &= Q(status_label=status_query)
                elif item_type in {'decision', 'goal', 'task', 'issue', 'sprint', 'blocker', 'action_item'}:
                    filters_q &= Q(status=status_query)
                elif item_type == 'milestone':
                    filters_q &= Q(completed=status_query.lower() in {'completed', 'done', 'true', '1'})

            queryset = model.objects.filter(filters_q).order_by(config['order_by'])[:limit]
            results[config['bucket']] = [config['serialize'](item) for item in queryset]

        results['total'] = sum(len(value) for value in results.values() if isinstance(value, list))
        return results

    def get_suggestions(self, query, organization_id, limit=8):
        if len(query) < 2:
            return []

        suggestions = []
        seen = set()
        lowered = query.lower()

        def add_suggestion(value):
            label = (value or '').strip()
            if not label:
                return
            normalized = label.lower()
            if normalized in seen or lowered not in normalized:
                return
            seen.add(normalized)
            suggestions.append(label)

        conversation_titles = Conversation.objects.filter(
            organization_id=organization_id,
            title__icontains=query,
        ).values_list('title', flat=True)[:limit]
        for title in conversation_titles:
            add_suggestion(title)

        for keyword_list in Conversation.objects.filter(
            organization_id=organization_id,
            ai_processed=True,
        ).values_list('ai_keywords', flat=True)[: max(limit * 3, 12)]:
            for keyword in keyword_list or []:
                add_suggestion(keyword)

        for item_type, config in TYPE_CONFIG.items():
            model = config['model'] if config else None
            if model is None:
                continue
            suggest_field = config.get('suggest_field', 'title')
            titles = model.objects.filter(
                **{config['org_filter']: organization_id},
                **{f'{suggest_field}__icontains': query},
            ).values_list(suggest_field, flat=True)[:limit]
            for title in titles:
                add_suggestion(title)

        return suggestions[:limit]


def get_search_engine():
    return EnhancedSearchEngine()
