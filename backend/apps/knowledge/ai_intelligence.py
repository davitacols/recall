from html import unescape

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Count, Q
from django.utils import timezone
from django.utils.html import strip_tags
from django.core.cache import cache
from datetime import datetime, timedelta, timezone as dt_timezone
from uuid import uuid4
from django.contrib.contenttypes.models import ContentType
from collections import Counter
from apps.conversations.models import Conversation
from apps.decisions.models import Decision
from apps.knowledge.unified_models import ContentLink, UnifiedActivity
from apps.agile.models import Blocker, Project, Release, Sprint
from apps.organizations.auditlog_models import AuditLog
from apps.notifications.utils import create_notification
from apps.users.auth_utils import check_rate_limit
from .ai_service import AIService
from .search_engine import get_search_engine

try:
    from apps.business.models import Goal, Meeting, Task
    from apps.business.document_models import Document
except Exception:  # pragma: no cover - optional in some environments
    Goal = None
    Meeting = None
    Task = None
    Document = None


NAVIGATION_TOOL_REGISTRY = [
    {
        'id': 'agile_board',
        'label': 'Sprint Board',
        'url': '/sprint',
        'keywords': {'agile', 'sprint', 'board', 'scrum', 'kanban'},
        'reason': 'Manage sprint planning and delivery flow.',
    },
    {
        'id': 'projects',
        'label': 'Projects',
        'url': '/projects',
        'keywords': {'project', 'projects', 'roadmap', 'milestone'},
        'reason': 'Browse active projects and ownership.',
    },
    {
        'id': 'tasks',
        'label': 'Task Board',
        'url': '/business/tasks',
        'keywords': {'task', 'tasks', 'todo', 'ticket', 'issue', 'issues'},
        'reason': 'Track and assign implementation tasks.',
    },
    {
        'id': 'decisions',
        'label': 'Decisions',
        'url': '/decisions',
        'keywords': {'decision', 'decisions', 'approve', 'approval'},
        'reason': 'Review decisions, status, and outcomes.',
    },
    {
        'id': 'documents',
        'label': 'Documents',
        'url': '/business/documents',
        'keywords': {'document', 'documents', 'doc', 'docs', 'spec', 'policy'},
        'reason': 'Find team docs and knowledge artifacts.',
    },
    {
        'id': 'conversations',
        'label': 'Conversations',
        'url': '/conversations',
        'keywords': {'conversation', 'conversations', 'chat', 'thread', 'discussion'},
        'reason': 'Open discussion history and linked context.',
    },
]

SOURCE_BUCKET_REGISTRY = [
    {
        'bucket': 'conversations',
        'type': 'conversation',
        'label': 'conversations',
        'date_fields': ('created_at',),
        'fallback_url': lambda item_id: f'/conversations/{item_id}',
    },
    {
        'bucket': 'replies',
        'type': 'reply',
        'label': 'replies',
        'date_fields': ('updated_at', 'created_at'),
        'fallback_url': lambda _item_id: '/conversations',
    },
    {
        'bucket': 'action_items',
        'type': 'action_item',
        'label': 'action items',
        'date_fields': ('due_date', 'created_at'),
        'fallback_url': lambda _item_id: '/conversations',
    },
    {
        'bucket': 'decisions',
        'type': 'decision',
        'label': 'decisions',
        'date_fields': ('created_at',),
        'fallback_url': lambda item_id: f'/decisions/{item_id}',
    },
    {
        'bucket': 'goals',
        'type': 'goal',
        'label': 'goals',
        'date_fields': ('created_at',),
        'fallback_url': lambda item_id: f'/business/goals/{item_id}',
    },
    {
        'bucket': 'milestones',
        'type': 'milestone',
        'label': 'milestones',
        'date_fields': ('due_date', 'created_at'),
        'fallback_url': lambda _item_id: '/business/goals',
    },
    {
        'bucket': 'tasks',
        'type': 'task',
        'label': 'tasks',
        'date_fields': ('created_at',),
        'fallback_url': lambda _item_id: '/business/tasks',
    },
    {
        'bucket': 'meetings',
        'type': 'meeting',
        'label': 'meetings',
        'date_fields': ('meeting_date', 'created_at'),
        'fallback_url': lambda item_id: f'/business/meetings/{item_id}',
    },
    {
        'bucket': 'documents',
        'type': 'document',
        'label': 'documents',
        'date_fields': ('updated_at', 'created_at'),
        'fallback_url': lambda item_id: f'/business/documents/{item_id}',
    },
    {
        'bucket': 'projects',
        'type': 'project',
        'label': 'projects',
        'date_fields': ('updated_at', 'created_at'),
        'fallback_url': lambda item_id: f'/projects/{item_id}',
    },
    {
        'bucket': 'releases',
        'type': 'release',
        'label': 'releases',
        'date_fields': ('release_date', 'created_at'),
        'fallback_url': lambda _item_id: '/projects',
    },
    {
        'bucket': 'sprints',
        'type': 'sprint',
        'label': 'sprints',
        'date_fields': ('start_date', 'created_at'),
        'fallback_url': lambda item_id: f'/sprints/{item_id}',
    },
    {
        'bucket': 'sprint_updates',
        'type': 'sprint_update',
        'label': 'sprint updates',
        'date_fields': ('created_at',),
        'fallback_url': lambda _item_id: '/sprint',
    },
    {
        'bucket': 'issues',
        'type': 'issue',
        'label': 'issues',
        'date_fields': ('updated_at', 'created_at'),
        'fallback_url': lambda item_id: f'/issues/{item_id}',
    },
    {
        'bucket': 'blockers',
        'type': 'blocker',
        'label': 'blockers',
        'date_fields': ('resolved_at', 'created_at'),
        'fallback_url': lambda _item_id: '/blockers',
    },
    {
        'bucket': 'people',
        'type': 'person',
        'label': 'people',
        'date_fields': ('last_active', 'created_at'),
        'fallback_url': lambda _item_id: '/team',
    },
    {
        'bucket': 'github_integrations',
        'type': 'github_integration',
        'label': 'GitHub integrations',
        'date_fields': ('created_at',),
        'fallback_url': lambda _item_id: '/integrations',
    },
    {
        'bucket': 'jira_integrations',
        'type': 'jira_integration',
        'label': 'Jira integrations',
        'date_fields': ('created_at',),
        'fallback_url': lambda _item_id: '/integrations',
    },
    {
        'bucket': 'slack_integrations',
        'type': 'slack_integration',
        'label': 'Slack integrations',
        'date_fields': ('created_at',),
        'fallback_url': lambda _item_id: '/integrations',
    },
    {
        'bucket': 'calendar_connections',
        'type': 'calendar_connection',
        'label': 'calendar connections',
        'date_fields': ('last_synced_at', 'updated_at', 'created_at'),
        'fallback_url': lambda _item_id: '/business/calendar',
    },
    {
        'bucket': 'pull_requests',
        'type': 'pull_request',
        'label': 'pull requests',
        'date_fields': ('merged_at', 'closed_at', 'created_at'),
        'fallback_url': lambda _item_id: '/integrations',
    },
    {
        'bucket': 'commits',
        'type': 'commit',
        'label': 'commits',
        'date_fields': ('committed_at', 'created_at'),
        'fallback_url': lambda _item_id: '/integrations',
    },
]


def _confidence_band(score):
    try:
        value = int(score)
    except (TypeError, ValueError):
        value = 0
    if value >= 75:
        return 'high'
    if value >= 50:
        return 'medium'
    return 'low'


def _parse_source_created_at(value):
    if not value:
        return None
    if hasattr(value, 'tzinfo'):
        return timezone.make_aware(value, dt_timezone.utc) if timezone.is_naive(value) else value
    try:
        text = str(value).strip()
        if not text:
            return None
        # Support ISO timestamps with trailing Z.
        if text.endswith('Z'):
            text = text.replace('Z', '+00:00')
        parsed = datetime.fromisoformat(text)
        if timezone.is_naive(parsed):
            parsed = timezone.make_aware(parsed, dt_timezone.utc)
        return parsed
    except Exception:
        return None


def _human_join(parts):
    cleaned = [str(part).strip() for part in parts if str(part or '').strip()]
    if not cleaned:
        return ''
    if len(cleaned) == 1:
        return cleaned[0]
    if len(cleaned) == 2:
        return f'{cleaned[0]} and {cleaned[1]}'
    return f'{", ".join(cleaned[:-1])}, and {cleaned[-1]}'


def _clean_preview_text(value):
    text = str(value or '')
    if not text.strip():
        return ''
    text = text.replace('<br>', '\n').replace('<br/>', '\n').replace('<br />', '\n')
    text = unescape(strip_tags(text))
    return ' '.join(text.split())


def _iter_source_records(search_data, limit_per_bucket=20):
    for config in SOURCE_BUCKET_REGISTRY:
        bucket = config['bucket']
        for item in (search_data.get(bucket) or [])[:limit_per_bucket]:
            item_id = item.get('id')
            raw_date = None
            for field in config['date_fields']:
                raw_date = item.get(field)
                if raw_date:
                    break
            yield {
                'id': item_id,
                'bucket': bucket,
                'type': config['type'],
                'label': config['label'],
                'title': item.get('title') or f'{config["type"].title()} #{item_id}',
                'url': item.get('url') or config['fallback_url'](item_id),
                'preview': _clean_preview_text(item.get('content_preview') or ''),
                'status': item.get('status') or item.get('post_type') or item.get('document_type') or '',
                'priority': item.get('priority') or '',
                'owner_name': (
                    item.get('owner_name')
                    or item.get('assignee_name')
                    or item.get('created_by_name')
                    or item.get('updated_by_name')
                    or item.get('lead_name')
                    or ''
                ),
                'key': item.get('key') or '',
                'project_name': item.get('project_name') or '',
                'sprint_name': item.get('sprint_name') or '',
                'conversation_title': item.get('conversation_title') or '',
                'goal_title': item.get('goal_title') or '',
                'role': item.get('role') or '',
                'created_at': raw_date,
                '_ts': _parse_source_created_at(raw_date),
            }


def _summarize_source_mix(search_data):
    parts = []
    for config in SOURCE_BUCKET_REGISTRY:
        count = len(search_data.get(config['bucket']) or [])
        if count:
            parts.append(f'{count} {config["label"]}')
    return _human_join(parts)


def _detect_copilot_query_mode(query):
    text = str(query or '').strip().lower()
    if not text:
        return 'diagnosis'

    operational_phrases = [
        'execution risk',
        'delivery risk',
        'what should leadership resolve',
        'highest this week',
        'blocking delivery',
        'run autonomous',
        'autonomous fix',
        'resolve in the next',
        'next 24 hours',
        'reassign now',
        'unblock',
    ]
    operational_tokens = {
        'risk',
        'blocker',
        'blocking',
        'delivery',
        'readiness',
        'intervention',
        'execute',
        'autonomous',
        'fix',
        'resolve',
        'reassign',
        'assign',
        'escalate',
    }
    cleaned_tokens = set(''.join(ch for ch in token if ch.isalnum()) for token in text.replace('-', ' ').split())
    cleaned_tokens.discard('')

    if any(phrase in text for phrase in operational_phrases):
        return 'diagnosis'
    if operational_tokens.intersection(cleaned_tokens):
        return 'diagnosis'
    return 'answer'


def _detect_conversational_opener(query):
    text = ' '.join(str(query or '').strip().lower().split())
    if not text:
        return False

    opener_phrases = {
        'hello',
        'hello there',
        'hi',
        'hi there',
        'hey',
        'hey there',
        'good morning',
        'good afternoon',
        'good evening',
        'howdy',
        'what can you do',
        'who are you',
        'help',
        'help me',
        'thanks',
        'thank you',
    }
    if text in opener_phrases:
        return True

    cleaned_tokens = [token for token in (''.join(ch for ch in part if ch.isalnum()) for part in text.split()) if token]
    if not cleaned_tokens:
        return False

    if len(cleaned_tokens) <= 4 and cleaned_tokens[0] in {'hello', 'hi', 'hey'}:
        return True
    if len(cleaned_tokens) <= 4 and cleaned_tokens[:2] == ['thank', 'you']:
        return True
    return False


def _build_conversational_answer(query):
    text = ' '.join(str(query or '').strip().lower().split())
    if text in {'thanks', 'thank you'}:
        return (
            "Anytime. Ask about a project, sprint, decision, document, teammate, or delivery question "
            "and I'll pull the latest linked context from Knoledgr."
        )
    if text in {'who are you', 'what can you do', 'help', 'help me'}:
        return (
            "I'm Ask Recall, Knoledgr's workspace copilot. I can summarize projects, sprints, decisions, "
            "documents, teammates, blockers, and delivery risk from the records already linked in the workspace."
        )
    return (
        "Hi. I'm Ask Recall, Knoledgr's workspace copilot. Ask about a project, sprint, decision, document, "
        "teammate, blocker, or delivery question and I'll pull the newest linked context."
    )


def _query_mentions(query, *terms):
    text = str(query or '').strip().lower()
    if not text:
        return False
    cleaned_tokens = set(''.join(ch for ch in token if ch.isalnum()) for token in text.replace('-', ' ').split())
    cleaned_tokens.discard('')
    for term in terms:
        normalized = str(term or '').strip().lower()
        if not normalized:
            continue
        compact = ''.join(ch for ch in normalized if ch.isalnum())
        if normalized in text or compact in cleaned_tokens:
            return True
    return False


def _select_relevant_interventions(query, recommended_interventions, limit=3):
    interventions = list(recommended_interventions or [])
    if not interventions:
        return []

    preferred_kinds = []
    if _query_mentions(query, 'task', 'tasks', 'reassign', 'assign', 'owner', 'assignee', 'ownership'):
        preferred_kinds.append('task_ownership')
    if _query_mentions(query, 'blocker', 'blockers', 'blocked', 'unblock'):
        preferred_kinds.append('blocker_escalation')
    if _query_mentions(query, 'decision', 'decisions', 'approval', 'resolve'):
        preferred_kinds.append('decision_resolution')

    for kind in preferred_kinds:
        matching = [item for item in interventions if item.get('kind') == kind]
        if matching:
            return matching[:limit]
    return interventions[:limit]


def _format_answer_date(value):
    dt = _parse_source_created_at(value)
    if dt is None:
        return ''
    try:
        localized = timezone.localtime(dt)
    except Exception:
        localized = dt
    return localized.strftime('%b %d, %Y')


def _build_recent_project_lookup(org, query):
    if not _query_mentions(query, 'recent', 'latest', 'newest'):
        return None
    if not _query_mentions(query, 'project', 'projects'):
        return None

    project = (
        Project.objects.filter(organization=org)
        .select_related('lead')
        .order_by('-updated_at', '-created_at')
        .first()
    )
    if not project:
        return None

    lead_name = project.lead.get_full_name() if project.lead else ''
    updated_at = project.updated_at or project.created_at
    updated_label = _format_answer_date(updated_at)
    preview_parts = [project.description, f'Project key {project.key}']
    if lead_name:
        preview_parts.append(f'Lead {lead_name}')

    answer_parts = [f'The most recent project in Knoledgr is "{project.name}"']
    if project.key:
        answer_parts[-1] += f' ({project.key})'
    if updated_label:
        answer_parts.append(f'It was last updated {updated_label}.')
    if lead_name:
        answer_parts.append(f'The current lead is {lead_name}.')
    answer_parts.append('Open it in Projects to review the latest issues, sprint activity, and ownership.')

    return {
        'search_data': {
            'projects': [
                {
                    'id': project.id,
                    'title': project.name,
                    'content_preview': ' '.join(part for part in preview_parts if part).strip(),
                    'type': 'project',
                    'key': project.key,
                    'lead_name': lead_name,
                    'created_at': project.created_at.isoformat() if project.created_at else '',
                    'updated_at': updated_at.isoformat() if updated_at else '',
                    'url': f'/projects/{project.id}',
                }
            ],
            'total': 1,
        },
        'answer': ' '.join(part for part in answer_parts if part).strip(),
    }


def _build_recent_release_lookup(org, query):
    if not _query_mentions(query, 'recent', 'latest', 'newest'):
        return None
    if not _query_mentions(query, 'release', 'releases', 'ship', 'shipping'):
        return None

    release = (
        Release.objects.filter(project__organization=org)
        .select_related('project')
        .order_by('-release_date', '-created_at')
        .first()
    )
    if not release:
        return None

    release_date = _format_answer_date(release.release_date)
    preview_parts = [release.description, f'Version {release.version}', f'Project {release.project.name}', f'Status {release.status}']
    answer_parts = [f'The most recent release in Knoledgr is "{release.name}"']
    if release.version:
        answer_parts[-1] += f' ({release.version})'
    answer_parts.append(f'It belongs to the {release.project.name} project.')
    if release.status:
        answer_parts.append(f'Current status is {release.status.replace("_", " ")}.')
    if release_date:
        answer_parts.append(f'The release date on record is {release_date}.')
    answer_parts.append('Open Releases from the project workspace to review shipping status and scope.')

    return {
        'search_data': {
            'releases': [
                {
                    'id': release.id,
                    'title': release.name,
                    'content_preview': ' '.join(part for part in preview_parts if part).strip(),
                    'type': 'release',
                    'version': release.version,
                    'status': release.status,
                    'project_name': release.project.name,
                    'project_id': release.project_id,
                    'release_date': release.release_date.isoformat() if release.release_date else '',
                    'created_at': release.created_at.isoformat() if release.created_at else '',
                    'url': f'/projects/{release.project_id}/releases',
                }
            ],
            'total': 1,
        },
        'answer': ' '.join(part for part in answer_parts if part).strip(),
    }


def _build_recent_sprint_lookup(org, query):
    if not _query_mentions(query, 'recent', 'latest', 'newest'):
        return None
    if not _query_mentions(query, 'sprint', 'sprints', 'iteration'):
        return None

    sprint = (
        Sprint.objects.filter(organization=org)
        .select_related('project')
        .order_by('-start_date', '-created_at')
        .first()
    )
    if not sprint:
        return None

    start_label = _format_answer_date(sprint.start_date)
    end_label = _format_answer_date(sprint.end_date)
    preview_parts = [sprint.summary, sprint.goal, f'Status {sprint.status}']
    if sprint.project:
        preview_parts.append(f'Project {sprint.project.name}')

    answer_parts = [f'The most recent sprint in Knoledgr is "{sprint.name}"']
    if sprint.project:
        answer_parts.append(f'It belongs to the {sprint.project.name} project.')
    if sprint.status:
        answer_parts.append(f'Current status is {sprint.status}.')
    if start_label and end_label:
        answer_parts.append(f'It runs from {start_label} to {end_label}.')
    elif start_label:
        answer_parts.append(f'It starts {start_label}.')
    answer_parts.append('Open the sprint workspace to review active issues, blockers, and updates.')

    return {
        'search_data': {
            'sprints': [
                {
                    'id': sprint.id,
                    'title': sprint.name,
                    'content_preview': ' '.join(part for part in preview_parts if part).strip(),
                    'type': 'sprint',
                    'status': sprint.status,
                    'project_name': sprint.project.name if sprint.project else '',
                    'start_date': sprint.start_date.isoformat() if sprint.start_date else '',
                    'end_date': sprint.end_date.isoformat() if sprint.end_date else '',
                    'created_at': sprint.created_at.isoformat() if sprint.created_at else '',
                    'url': f'/sprints/{sprint.id}',
                }
            ],
            'total': 1,
        },
        'answer': ' '.join(part for part in answer_parts if part).strip(),
    }


def _build_recent_decision_lookup(org, query):
    if not _query_mentions(query, 'recent', 'latest', 'newest'):
        return None
    if not _query_mentions(query, 'decision', 'decisions', 'approval', 'approvals'):
        return None

    decision = (
        Decision.objects.filter(organization=org)
        .select_related('decision_maker')
        .order_by('-created_at')
        .first()
    )
    if not decision:
        return None

    created_label = _format_answer_date(decision.created_at)
    maker_name = decision.decision_maker.get_full_name() or decision.decision_maker.username if decision.decision_maker else ''
    preview_parts = [decision.plain_language_summary, decision.description, f'Status {decision.status}', f'Impact {decision.impact_level}']
    if maker_name:
        preview_parts.append(f'Decision maker {maker_name}')

    answer_parts = [f'The most recent decision in Knoledgr is "{decision.title}".']
    if decision.status:
        answer_parts.append(f'It is currently {decision.status.replace("_", " ")}.')
    if maker_name:
        answer_parts.append(f'The decision maker is {maker_name}.')
    if created_label:
        answer_parts.append(f'It was created {created_label}.')
    answer_parts.append('Open it in Decisions to review the rationale, tradeoffs, and follow-through.')

    return {
        'search_data': {
            'decisions': [
                {
                    'id': decision.id,
                    'title': decision.title,
                    'content_preview': ' '.join(part for part in preview_parts if part).strip(),
                    'type': 'decision',
                    'status': decision.status,
                    'impact_level': decision.impact_level,
                    'owner_name': maker_name,
                    'created_at': decision.created_at.isoformat() if decision.created_at else '',
                    'url': f'/decisions/{decision.id}',
                }
            ],
            'total': 1,
        },
        'answer': ' '.join(part for part in answer_parts if part).strip(),
    }


def _build_recent_document_lookup(org, query):
    if Document is None:
        return None
    if not _query_mentions(query, 'recent', 'latest', 'newest'):
        return None
    if not _query_mentions(query, 'document', 'documents', 'doc', 'docs', 'guide', 'policy', 'report'):
        return None

    document = (
        Document.objects.filter(organization=org)
        .select_related('updated_by', 'created_by')
        .order_by('-updated_at', '-created_at')
        .first()
    )
    if not document:
        return None

    updated_label = _format_answer_date(document.updated_at or document.created_at)
    owner = document.updated_by or document.created_by
    owner_name = owner.get_full_name() or owner.username if owner else ''
    preview_parts = [document.description, document.content[:220] if document.content else '', f'Type {document.document_type}', f'Version {document.version}']
    if owner_name:
        preview_parts.append(f'Updated by {owner_name}')

    answer_parts = [f'The most recent document in Knoledgr is "{document.title}".']
    if document.document_type:
        answer_parts.append(f'It is a {document.document_type.replace("_", " ")} document.')
    if updated_label:
        answer_parts.append(f'It was last updated {updated_label}.')
    if owner_name:
        answer_parts.append(f'The latest editor on record is {owner_name}.')
    answer_parts.append('Open it in Documents to review the latest content and linked context.')

    return {
        'search_data': {
            'documents': [
                {
                    'id': document.id,
                    'title': document.title,
                    'content_preview': ' '.join(part for part in preview_parts if part).strip(),
                    'type': 'document',
                    'document_type': document.document_type,
                    'version': document.version,
                    'owner_name': owner_name,
                    'created_at': document.created_at.isoformat() if document.created_at else '',
                    'updated_at': document.updated_at.isoformat() if document.updated_at else '',
                    'url': f'/business/documents/{document.id}',
                }
            ],
            'total': 1,
        },
        'answer': ' '.join(part for part in answer_parts if part).strip(),
    }


def _build_recent_conversation_lookup(org, query):
    if not _query_mentions(query, 'recent', 'latest', 'newest'):
        return None
    if not _query_mentions(query, 'conversation', 'conversations', 'thread', 'threads', 'discussion', 'discussions'):
        return None

    conversation = (
        Conversation.objects.filter(organization=org, is_archived=False)
        .select_related('author')
        .order_by('-updated_at', '-created_at')
        .first()
    )
    if not conversation:
        return None

    updated_label = _format_answer_date(conversation.updated_at or conversation.created_at)
    author_name = conversation.author.get_full_name() or conversation.author.username if conversation.author else ''
    preview_parts = [
        conversation.key_takeaway,
        conversation.plain_language_summary,
        conversation.content[:220] if conversation.content else '',
        f'Post type {conversation.post_type}',
        f'Priority {conversation.priority}',
    ]
    if author_name:
        preview_parts.append(f'Author {author_name}')

    answer_parts = [f'The most recent conversation in Knoledgr is "{conversation.title}".']
    if conversation.post_type:
        answer_parts.append(f'It is a {conversation.post_type} thread.')
    if updated_label:
        answer_parts.append(f'It was last updated {updated_label}.')
    if author_name:
        answer_parts.append(f'The author is {author_name}.')
    answer_parts.append('Open it in Conversations to review the thread, replies, and linked decisions.')

    return {
        'search_data': {
            'conversations': [
                {
                    'id': conversation.id,
                    'title': conversation.title,
                    'content_preview': ' '.join(part for part in preview_parts if part).strip(),
                    'type': 'conversation',
                    'post_type': conversation.post_type,
                    'priority': conversation.priority,
                    'owner_name': author_name,
                    'created_at': conversation.created_at.isoformat() if conversation.created_at else '',
                    'updated_at': conversation.updated_at.isoformat() if conversation.updated_at else '',
                    'url': f'/conversations/{conversation.id}',
                }
            ],
            'total': 1,
        },
        'answer': ' '.join(part for part in answer_parts if part).strip(),
    }


def _sanitize_thread_context(raw_context):
    if not isinstance(raw_context, list):
        return []

    cleaned_entries = []
    for entry in raw_context[:4]:
        if not isinstance(entry, dict):
            continue
        sources = []
        for source in (entry.get('sources') or [])[:4]:
            if not isinstance(source, dict):
                continue
            title = str(source.get('title') or '').strip()
            source_type = str(source.get('type') or '').strip().lower()
            if not title or not source_type:
                continue
            sources.append({
                'id': source.get('id'),
                'type': source_type,
                'title': title[:255],
                'href': str(source.get('href') or '').strip()[:255],
            })
        cleaned_entries.append({
            'id': str(entry.get('id') or '')[:100],
            'question': str(entry.get('question') or '').strip()[:500],
            'response_mode': str(entry.get('response_mode') or '').strip().lower()[:50],
            'generated_at': str(entry.get('generated_at') or '').strip()[:100],
            'sources': sources,
        })
    return cleaned_entries


def _query_needs_thread_anchor(query):
    text = ' '.join(str(query or '').strip().lower().split())
    if not text:
        return False

    explicit_follow_up_starts = (
        'what about',
        'how about',
        'and ',
        'also ',
        'what else',
        'how else',
    )
    if text.startswith(explicit_follow_up_starts):
        return True

    referential_phrases = (
        ' there',
        ' that',
        ' this',
        ' it',
        ' them',
        ' those',
        ' these',
        ' same',
    )
    padded = f' {text} '
    return any(phrase in padded for phrase in referential_phrases)


def _query_prefers_thread_scope(query):
    text = ' '.join(str(query or '').strip().lower().split())
    if not text:
        return False
    if _query_needs_thread_anchor(text):
        return True
    if ' instead' in f' {text} ':
        return True

    tokens = [token for token in (''.join(ch for ch in part if ch.isalnum()) for part in text.split()) if token]
    if len(tokens) <= 7 and _preferred_thread_source_types(query) and not _query_mentions(query, 'recent', 'latest', 'newest'):
        return True
    return False


def _preferred_thread_source_types(query):
    type_hints = []
    mappings = [
        (('project', 'projects'), 'project'),
        (('sprint', 'sprints', 'iteration'), 'sprint'),
        (('decision', 'decisions', 'approval', 'approvals'), 'decision'),
        (('document', 'documents', 'doc', 'docs', 'guide', 'policy', 'report'), 'document'),
        (('release', 'releases', 'ship', 'shipping'), 'release'),
        (('conversation', 'conversations', 'thread', 'threads', 'discussion', 'discussions'), 'conversation'),
        (('issue', 'issues', 'ticket', 'tickets'), 'issue'),
        (('task', 'tasks'), 'task'),
        (('blocker', 'blockers'), 'blocker'),
        (('teammate', 'teammates', 'person', 'people', 'owner', 'owners'), 'person'),
    ]
    for terms, source_type in mappings:
        if _query_mentions(query, *terms):
            type_hints.append(source_type)
    return type_hints


def _pick_thread_anchor(query, thread_context):
    preferred_types = _preferred_thread_source_types(query)
    for entry in reversed(thread_context or []):
        sources = entry.get('sources') or []
        if preferred_types:
            for source in sources:
                if source.get('type') in preferred_types and source.get('title'):
                    return source
    for entry in reversed(thread_context or []):
        for source in entry.get('sources') or []:
            if source.get('title'):
                return source
    return None


def _anchor_match_count(search_data, anchor_title):
    normalized_title = str(anchor_title or '').strip().lower()
    if not normalized_title:
        return 0

    anchor_terms = _tokenize_for_match(normalized_title)
    matches = 0
    for item in _build_evidence_items(search_data):
        blob = _source_match_blob(item)
        if anchor_terms:
            if any(term in blob for term in anchor_terms):
                matches += 1
        elif normalized_title in blob:
            matches += 1
    return matches


def _apply_thread_context_search(query, search_data, thread_context, search_engine, org_id):
    total = int((search_data or {}).get('total', 0) or 0)
    if not thread_context or not _query_prefers_thread_scope(query):
        return search_data, None

    anchor = _pick_thread_anchor(query, thread_context)
    if not anchor:
        return search_data, None

    anchor_title = str(anchor.get('title') or '').strip()
    if not anchor_title:
        return search_data, None

    expanded_query = f'{query} {anchor_title}'.strip()
    anchored_search = search_engine.search(expanded_query, org_id, filters={}, limit=6)
    anchored_total = int((anchored_search or {}).get('total', 0) or 0)
    if anchored_total <= 0:
        return search_data, None

    original_anchor_matches = _anchor_match_count(search_data, anchor_title)
    anchored_anchor_matches = _anchor_match_count(anchored_search, anchor_title)
    if total > 0:
        if anchored_anchor_matches < original_anchor_matches:
            return search_data, None
        if anchored_anchor_matches == original_anchor_matches and not _query_needs_thread_anchor(query):
            return search_data, None

    return anchored_search, {
        'anchor': anchor,
        'expanded_query': expanded_query,
    }


def _apply_workspace_lookup_fallback(org, query, search_data):
    total = int((search_data or {}).get('total', 0) or 0)
    if total > 0:
        return search_data, None, False

    lookup_builders = [
        _build_recent_project_lookup,
        _build_recent_sprint_lookup,
        _build_recent_decision_lookup,
        _build_recent_document_lookup,
        _build_recent_release_lookup,
        _build_recent_conversation_lookup,
    ]
    for builder in lookup_builders:
        lookup = builder(org, query)
        if lookup:
            return lookup['search_data'], lookup['answer'], True

    return search_data, None, False


def _build_diagnosis_answer_text(query, search_data, plan, evidence_contract, recommended_interventions):
    total = int(search_data.get('total', 0) or 0)
    readiness_status = plan.get('status') or 'watch'
    readiness_score = plan.get('readiness_score')
    counts = plan.get('counts') or {}
    highlighted_actions = _select_relevant_interventions(query, recommended_interventions, limit=3)
    action_titles = _human_join([f'"{item.get("title")}"' for item in highlighted_actions if item.get('title')])

    if total > 0:
        evidence_labels = _human_join(
            [f'{item["type"]} "{item["title"]}"' for item in _build_evidence_items(search_data)[:2]]
        )
        evidence_line = (
            f'Strongest matching evidence is {evidence_labels}.'
            if evidence_labels
            else 'Strongest evidence is currently limited; expand linked artifacts for better precision.'
        )
        action_line = f' Highest-leverage moves right now are {action_titles}.' if action_titles else ''
        return (
            f'For "{query}", organizational readiness is {readiness_status} '
            f'with score {readiness_score}. '
            f'I found {total} related workspace records and prepared {len(recommended_interventions or [])} '
            f'interventions to reduce execution risk.{action_line} {evidence_line}'
        ).strip()

    if highlighted_actions:
        if any(item.get('kind') == 'task_ownership' for item in highlighted_actions):
            unassigned = _safe_int(counts.get('high_priority_unassigned_tasks'), 0)
            task_count_text = (
                f'{unassigned} high-priority unassigned task{"s" if unassigned != 1 else ""}'
                if unassigned > 0
                else f'{len(highlighted_actions)} high-priority ownership intervention{"s" if len(highlighted_actions) != 1 else ""}'
            )
            return (
                f'For "{query}", I did not find directly matched workspace records, '
                f'but current operational signals show {task_count_text}. '
                f'The clearest reassignment candidates right now are {action_titles}. '
                f'This is an inference from the live intervention plan rather than directly matched task records. '
                f'Organizational readiness is {readiness_status} with score {readiness_score}.'
            )
        return (
            f'For "{query}", I did not find directly matched workspace records, '
            f'but the live intervention plan points to {action_titles} as the strongest next moves. '
            f'This is an inference from current operational signals rather than directly matched records. '
            f'Organizational readiness is {readiness_status} with score {readiness_score}.'
        )

    return (
        f'For "{query}", I could not find directly matched workspace records. '
        f'Organizational readiness is {readiness_status} with score {readiness_score}, '
        f'but I do not yet have enough linked task, decision, blocker, or document evidence to rank a precise next move.'
    )


def _build_answer_text(query, search_data, plan, evidence_contract):
    records = list(_iter_source_records(search_data, limit_per_bucket=6))
    total = int(search_data.get('total', 0) or 0)
    if not records or total == 0:
        return (
            f'I do not have enough linked workspace context to answer "{query}" yet. '
            'Name a project, sprint, issue, blocker, document, decision, conversation, milestone, or teammate and I can pull the newest linked context.'
        )

    query_lower = str(query or '').lower()
    ownership_hints = ['who owns', 'owner', 'responsible', 'assignee', 'assigned to']
    owned_record = next((item for item in records if item.get('owner_name')), None)
    if owned_record and any(hint in query_lower for hint in ownership_hints):
        owner_label = 'assignee' if owned_record.get('type') == 'task' else 'owner'
        return (
            f'The strongest ownership match for "{query}" is {owned_record["type"]} "{owned_record["title"]}", '
            f'with {owner_label} {owned_record["owner_name"]}. '
            f'I found {total} matching records across {_summarize_source_mix(search_data)}.'
        )

    top_records = records[:3]
    strongest_matches = _human_join([f'{item["type"]} "{item["title"]}"' for item in top_records])
    preview = next((item.get('preview') for item in top_records if item.get('preview')), '')
    preview_text = f' Most relevant context: {preview}' if preview else ''
    freshness_days = evidence_contract.get('freshness_days')
    freshness_text = f' Latest matching evidence is {freshness_days} day(s) old.' if freshness_days is not None else ''
    readiness_text = ''
    if plan.get('readiness_score') is not None:
        readiness_text = f' Current organizational readiness is {plan.get("status")} ({plan.get("readiness_score")}).'

    return (
        f'For "{query}", I found {total} matching records across {_summarize_source_mix(search_data)}. '
        f'The strongest matches are {strongest_matches}.{preview_text}{freshness_text}{readiness_text}'
    ).strip()


def _apply_thread_resolution_to_foundation(answer_foundation, thread_resolution):
    lines = list(answer_foundation or [])
    anchor = (thread_resolution or {}).get('anchor') or {}
    anchor_title = str(anchor.get('title') or '').strip()
    anchor_type = str(anchor.get('type') or '').strip()
    if not anchor_title:
        return lines

    if anchor_type:
        prefix = f'Recent thread context anchored this answer to {anchor_type} "{anchor_title}".'
    else:
        prefix = f'Recent thread context anchored this answer to "{anchor_title}".'
    return [prefix, *lines][:4]


def _copilot_sources_payload(search_data):
    payload = {config['bucket']: search_data.get(config['bucket'], []) for config in SOURCE_BUCKET_REGISTRY}
    payload['total'] = search_data.get('total', 0)
    return payload


def _source_match_blob(item):
    parts = [
        item.get('title'),
        item.get('preview'),
        item.get('status'),
        item.get('priority'),
        item.get('owner_name'),
        item.get('key'),
        item.get('project_name'),
        item.get('sprint_name'),
        item.get('conversation_title'),
        item.get('goal_title'),
        item.get('role'),
    ]
    return ' '.join(str(part).lower() for part in parts if str(part or '').strip())


def _rank_source_citations(search_data, query, limit=5):
    items = _build_evidence_items(search_data)
    if not items:
        return []

    query_terms = _tokenize_for_match(query)
    scored = []
    for item in items:
        blob = _source_match_blob(item)
        title_terms = _tokenize_for_match(item.get('title'))
        matched_terms = sorted(term for term in query_terms if term in blob)
        score = len(matched_terms) * 10
        score += len(query_terms.intersection(title_terms)) * 6
        if item.get('preview'):
            score += 1
        if item.get('_ts') is not None:
            score += 2
        scored.append((score, item, matched_terms))

    scored.sort(key=lambda row: (row[0], row[1].get('_ts') or datetime.min), reverse=True)

    citations = []
    seen = set()
    for score, item, matched_terms in scored:
        key = (item.get('type'), item.get('id'))
        if key in seen:
            continue
        seen.add(key)
        citations.append({
            'id': item.get('id'),
            'type': item.get('type'),
            'title': item.get('title'),
            'url': item.get('url'),
            'created_at': item.get('created_at'),
            'preview': item.get('preview') or '',
            'matched_terms': matched_terms,
            'direct_match': bool(matched_terms),
            'score': score,
        })
        if len(citations) >= limit:
            break
    return citations


def _build_credibility_summary(evidence_contract, citations):
    evidence_count = int(evidence_contract.get('evidence_count', 0) or 0)
    source_types = evidence_contract.get('source_types') or []
    freshness_days = evidence_contract.get('freshness_days')
    direct_matches = sum(1 for item in citations if item.get('direct_match'))

    if evidence_count == 0:
        summary = 'No direct workspace records matched this query.'
        missing_evidence = evidence_contract.get('missing_evidence') or []
        if missing_evidence:
            summary += f' Confidence is limited because {missing_evidence[0].rstrip(".")}.'
        return summary

    summary = (
        f'Grounded in {evidence_count} record'
        f'{"s" if evidence_count != 1 else ""} across {len(source_types)} source type'
        f'{"s" if len(source_types) != 1 else ""}'
    )
    if direct_matches:
        summary += f', with {direct_matches} direct citation{"s" if direct_matches != 1 else ""}'
    if freshness_days is not None:
        summary += f'. Newest matching evidence is {freshness_days} day{"s" if freshness_days != 1 else ""} old.'
    else:
        summary += '.'
    return summary


def _pluralize_source_type(type_name, count):
    base = str(type_name or '').replace('_', ' ').strip()
    if not base:
        return 'records'
    if count == 1:
        return base
    if base == 'reply':
        return 'replies'
    if base == 'person':
        return 'people'
    if base.endswith('s'):
        return base
    return f'{base}s'


def _build_evidence_breakdown(search_data, limit=4):
    breakdown = []
    for config in SOURCE_BUCKET_REGISTRY:
        count = len(search_data.get(config['bucket']) or [])
        if count <= 0:
            continue
        breakdown.append({
            'type': config['type'],
            'label': _pluralize_source_type(config['type'], count),
            'count': count,
        })
    breakdown.sort(key=lambda item: (-item['count'], item['label']))
    return breakdown[:limit]


def _build_answer_foundation(query_mode, evidence_contract, citations, evidence_breakdown, recommended_interventions, plan):
    lines = []
    if citations:
        strongest = _human_join([f'{item.get("type")} "{item.get("title")}"' for item in citations[:3]])
        if strongest:
            lines.append(f'Strongest supporting records were {strongest}.')
    elif query_mode == 'diagnosis' and recommended_interventions:
        strongest_interventions = _human_join([f'"{item.get("title")}"' for item in recommended_interventions[:3] if item.get('title')])
        if strongest_interventions:
            lines.append(f'Strongest recommended moves were {strongest_interventions}.')
    if evidence_breakdown:
        coverage_mix = _human_join([f'{item["count"]} {item["label"]}' for item in evidence_breakdown[:3]])
        lines.append(f'Evidence came from {coverage_mix}.')
    freshness_days = evidence_contract.get('freshness_days')
    if freshness_days is not None:
        lines.append(f'Newest matching evidence is {freshness_days} day{"s" if freshness_days != 1 else ""} old.')
    if query_mode == 'diagnosis' and recommended_interventions:
        lines.append(
            f'Recommended interventions were prioritized against the current {plan.get("status")} readiness signal '
            f'({plan.get("readiness_score")}).'
        )
    missing_evidence = evidence_contract.get('missing_evidence') or []
    if missing_evidence:
        lines.append(f'Confidence is limited because {missing_evidence[0].rstrip(".")}.')
    elif evidence_contract.get('coverage_score', 0) >= 70:
        lines.append('Confidence is stronger because the evidence spans multiple linked parts of the workspace.')
    return lines[:4]


def _build_follow_up_questions(query, query_mode, search_data, citations, evidence_contract, plan, recommended_interventions):
    suggestions = []
    seen = set()

    def add(question):
        text = str(question or '').strip()
        normalized = text.lower()
        if not text or normalized in seen or normalized == str(query or '').strip().lower():
            return
        seen.add(normalized)
        suggestions.append(text)

    top_citation = citations[0] if citations else None
    focus_title = (top_citation or {}).get('title') or 'this topic'
    citation_types = {item.get('type') for item in citations or []}
    counts = plan.get('counts') or {}
    missing_evidence = evidence_contract.get('missing_evidence') or []

    if citation_types.intersection({'project', 'sprint', 'issue', 'blocker', 'task'}):
        add(f'What is blocking {focus_title} right now?')
        add(f'Who owns the next actions related to {focus_title}?')
    if citation_types.intersection({'decision', 'conversation', 'document', 'meeting'}):
        add(f'What decisions or discussions are linked to {focus_title}?')
        add(f'What changed most recently around {focus_title}?')
    if query_mode == 'diagnosis':
        if counts.get('active_blockers'):
            add('Which blocker should leadership resolve first?')
        if counts.get('unresolved_decisions'):
            add('Which unresolved decision is affecting readiness the most?')
        if recommended_interventions:
            add('Which suggested intervention would improve readiness fastest?')
    else:
        add(f'Summarize the newest records related to {focus_title}.')
        add(f'What documents or conversations support {focus_title}?')
    if missing_evidence:
        add('Which linked records are still missing from this answer?')
    if not suggestions:
        add('What should I ask next to improve confidence in this answer?')
        add('Which records are most directly related to this topic?')
    return suggestions[:4]


def _log_copilot_query(request, org, user, query, response_payload):
    try:
        AuditLog.log(
            organization=org,
            user=user,
            action='update',
            resource_type='agi_copilot_query',
            details={
                'analysis_id': response_payload.get('analysis_id'),
                'query': str(query or '').strip()[:500],
                'response_mode': response_payload.get('response_mode'),
                'confidence_band': response_payload.get('confidence_band'),
                'evidence_count': response_payload.get('evidence_count'),
                'coverage_score': response_payload.get('coverage_score'),
                'answer_engine': response_payload.get('answer_engine'),
                'answer_preview': str(response_payload.get('answer') or '').strip()[:600],
                'executed': bool((response_payload.get('execution') or {}).get('performed')),
            },
            request=request,
        )
    except Exception:
        pass


def _generate_llm_copilot_answer(query, query_mode, search_data, plan, evidence_contract, recommended_interventions):
    try:
        service = AIService()
        if not service.is_enabled():
            return None
        return service.answer_workspace_question(
            query=query,
            search_data=search_data,
            plan=plan,
            evidence_contract=evidence_contract,
            recommended_interventions=recommended_interventions,
            query_mode=query_mode,
        )
    except Exception:
        return None


def _build_evidence_contract(search_data, now):
    records = list(_iter_source_records(search_data, limit_per_bucket=20))
    total = int(search_data.get('total', 0) or 0)

    source_types = []
    seen_types = set()
    for item in records:
        item_type = item.get('type')
        if item_type and item_type not in seen_types:
            seen_types.add(item_type)
            source_types.append(item_type)

    timestamps = []
    for item in records:
        dt = item.get('_ts')
        if dt is not None:
            timestamps.append(dt)

    freshness_days = None
    if timestamps:
        try:
            newest = max(timestamps)
            if timezone.is_naive(newest):
                newest = timezone.make_aware(newest, dt_timezone.utc)
            freshness_days = max(0, (now - newest).days)
        except Exception:
            freshness_days = None

    # Coverage balances quantity, evidence diversity, and recency.
    quantity_score = min(60.0, total * 12.0)
    diversity_score = 20.0 if len(source_types) >= 2 else 10.0 if len(source_types) == 1 else 0.0
    recency_score = 0.0
    if freshness_days is not None:
        recency_score = max(0.0, 20.0 - min(20.0, freshness_days * 1.5))
    coverage_score = round(min(100.0, quantity_score + diversity_score + recency_score), 1)

    missing_evidence = []
    if total == 0:
        missing_evidence.extend([
            "I couldn't match this to linked workspace records across conversations, delivery work, documents, or team context yet.",
            'Name or link the related record before relying on this answer.',
        ])
    else:
        if len(source_types) < 2:
            missing_evidence.append('Evidence comes from a narrow slice of the workspace; link related records for better confidence.')
        if freshness_days is not None and freshness_days > 30:
            missing_evidence.append('Most evidence is older than 30 days; refresh with recent updates.')
        if total < 2:
            missing_evidence.append('Evidence set is small; expand linked artifacts for higher confidence.')

    return {
        'evidence_count': total,
        'source_types': source_types,
        'freshness_days': freshness_days,
        'coverage_score': coverage_score,
        'missing_evidence': missing_evidence,
    }


def _tokenize_for_match(text):
    words = []
    for raw in str(text or '').lower().replace('-', ' ').split():
        cleaned = ''.join(ch for ch in raw if ch.isalnum())
        if len(cleaned) >= 4:
            words.append(cleaned)
    return set(words)


def _detect_navigation_intent(query):
    text = str(query or '').lower()
    if not text:
        return False
    navigation_triggers = {
        'where', 'find', 'open', 'navigate', 'location', 'tool', 'page', 'screen', 'go', 'access',
    }
    tokens = set(''.join(ch for ch in part if ch.isalnum()) for part in text.split())
    tokens.discard('')
    if navigation_triggers.intersection(tokens):
        return True
    return any(token in text for token in ['where can i', 'how do i get to', 'take me to'])


def _build_navigation_links(query, limit=4):
    terms = _tokenize_for_match(query)
    scored = []
    for item in NAVIGATION_TOOL_REGISTRY:
        overlap = len(terms.intersection(item['keywords']))
        # Keep broad navigational fallback links even when overlap is low.
        boost = 1 if item['id'] in ['agile_board', 'projects', 'tasks'] else 0
        score = overlap + boost
        scored.append((score, item))

    scored.sort(key=lambda row: (-row[0], row[1]['label']))
    links = []
    for _, item in scored[:limit]:
        links.append({
            'id': item['id'],
            'label': item['label'],
            'url': item['url'],
            'reason': item['reason'],
        })
    return links


def _build_evidence_items(search_data):
    items = list(_iter_source_records(search_data, limit_per_bucket=20))
    items.sort(key=lambda x: x.get('_ts') or datetime.min, reverse=True)
    return items


def _attach_intervention_evidence(interventions, evidence_items):
    enriched = []
    for item in interventions:
        target_terms = _tokenize_for_match(item.get('title')) | _tokenize_for_match(item.get('reason'))
        scored = []
        for evidence in evidence_items:
            evidence_terms = _tokenize_for_match(evidence.get('title'))
            overlap = len(target_terms.intersection(evidence_terms))
            scored.append((overlap, evidence))
        scored.sort(key=lambda pair: (pair[0], pair[1].get('_ts') or datetime.min), reverse=True)
        linked = [row[1] for row in scored[:3]]
        cleaned_links = []
        for ev in linked:
            cleaned_links.append({
                'id': ev.get('id'),
                'type': ev.get('type'),
                'title': ev.get('title'),
                'url': ev.get('url'),
                'created_at': ev.get('created_at'),
            })
        updated = dict(item)
        updated['evidence_links'] = cleaned_links
        enriched.append(updated)
    return enriched


def _safe_int(value, default=0):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _safe_float(value, default=0.0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _status_from_readiness(score):
    if score >= 75:
        return 'stable'
    if score >= 50:
        return 'watch'
    return 'critical'


def _simulate_counterfactual(plan, action_type, units, horizon_days):
    counts = plan.get('counts', {}) or {}
    base_score = float(plan.get('readiness_score') or 50.0)
    unresolved = _safe_int(counts.get('unresolved_decisions'), 0)
    blockers = _safe_int(counts.get('active_blockers'), 0)
    unassigned = _safe_int(counts.get('high_priority_unassigned_tasks'), 0)

    decision_gain = 0.0
    blocker_gain = 0.0
    ownership_gain = 0.0
    assumptions = []

    if action_type == 'resolve_decisions':
        resolved = min(unresolved, units)
        decision_gain = resolved * 3.5
        assumptions.append(f'Resolve up to {resolved} unresolved decisions in {horizon_days} days.')
    elif action_type == 'clear_blockers':
        cleared = min(blockers, units)
        blocker_gain = cleared * 7.0
        assumptions.append(f'Clear up to {cleared} active blockers in {horizon_days} days.')
    elif action_type == 'assign_high_priority_tasks':
        assigned = min(unassigned, units)
        ownership_gain = assigned * 3.0
        assumptions.append(f'Assign owners for up to {assigned} high-priority tasks in {horizon_days} days.')
    else:
        assumptions.append('No recognized action was selected; simulation is baseline only.')

    projected_score = max(5.0, min(100.0, base_score + decision_gain + blocker_gain + ownership_gain))
    delta = round(projected_score - base_score, 1)
    uncertainty = max(2.0, round(9.5 - min(7.0, units * 1.2), 1))

    return {
        'action_type': action_type,
        'units': units,
        'horizon_days': horizon_days,
        'baseline': {
            'readiness_score': round(base_score, 1),
            'status': _status_from_readiness(base_score),
            'counts': {
                'unresolved_decisions': unresolved,
                'active_blockers': blockers,
                'high_priority_unassigned_tasks': unassigned,
            },
        },
        'projected': {
            'readiness_score': round(projected_score, 1),
            'status': _status_from_readiness(projected_score),
            'delta': delta,
            'uncertainty_interval': {
                'low': round(max(5.0, projected_score - uncertainty), 1),
                'high': round(min(100.0, projected_score + uncertainty), 1),
            },
        },
        'assumptions': assumptions,
    }


def _score_intervention(item):
    kind = item.get('kind')
    impact = str(item.get('impact') or 'medium').lower()
    confidence = _safe_float(item.get('confidence'), default=70.0)

    # Conservative defaults tuned for "risk reduction per effort hour".
    effort_hours_by_kind = {
        'decision_resolution': 6.0,
        'blocker_escalation': 4.0,
        'task_ownership': 2.0,
    }
    base_reduction_by_kind = {
        'decision_resolution': 7.0,
        'blocker_escalation': 10.0,
        'task_ownership': 4.5,
    }
    impact_multiplier = {'high': 1.2, 'medium': 1.0, 'low': 0.8}

    effort_hours = effort_hours_by_kind.get(kind, 4.0)
    base_reduction = base_reduction_by_kind.get(kind, 5.0) * impact_multiplier.get(impact, 1.0)
    expected_risk_reduction = round(base_reduction * (confidence / 100.0), 1)
    priority_score = round((expected_risk_reduction / max(1.0, effort_hours)) * 100.0, 1)

    scored = dict(item)
    scored['effort_hours'] = round(effort_hours, 1)
    scored['expected_risk_reduction'] = expected_risk_reduction
    scored['priority_score'] = priority_score
    return scored


def _rank_interventions(interventions):
    scored = [_score_intervention(item) for item in interventions]
    scored.sort(key=lambda x: (-x.get('priority_score', 0), -_safe_float(x.get('confidence'), 0), x.get('title', '')))
    return scored


def _time_decay(days_old, half_life_days=3.0):
    return 0.5 ** (max(days_old, 0.0) / half_life_days)


def _decision_impact_level(decision):
    return getattr(decision, 'impact_level', 'medium') or 'medium'


def _safe_unresolved_decisions_qs(org):
    """
    Use newest decision-outcome fields when available, but gracefully degrade
    if the deployed DB schema is behind.
    """
    try:
        return Decision.objects.filter(
            organization=org
        ).filter(
            Q(status__in=['proposed', 'under_review', 'approved']) |
            Q(status='implemented', review_completed_at__isnull=True)
        )
    except Exception:
        return Decision.objects.filter(
            organization=org,
            status__in=['proposed', 'under_review', 'approved', 'implemented']
        )


def _build_org_learning_profile(org, now, horizon_days=120):
    """
    Build an adaptive profile from organization-wide operational data.
    Cached briefly so the model can evolve with fresh data without heavy query load.
    """
    cache_key = f'agi_learning_profile:{org.id}'
    cached = cache.get(cache_key)
    if cached:
        return cached

    horizon_start = now - timedelta(days=horizon_days)

    conversations = Conversation.objects.filter(
        organization=org,
        created_at__gte=horizon_start
    ).only('ai_keywords', 'priority', 'status_label')

    decisions = Decision.objects.filter(
        organization=org,
        created_at__gte=horizon_start
    ).only('status', 'was_successful')

    tasks = Task.objects.filter(
        organization=org,
        created_at__gte=horizon_start
    ).only('status', 'priority', 'assigned_to_id')

    blockers = Blocker.objects.filter(
        organization=org,
        created_at__gte=horizon_start
    ).only('status', 'blocker_type', 'created_at', 'resolved_at')

    keyword_counter = Counter()
    for conv in conversations[:500]:
        for kw in (conv.ai_keywords or [])[:8]:
            if isinstance(kw, str) and kw.strip():
                keyword_counter[kw.strip().lower()] += 1

    decision_total = decisions.count()
    unresolved_decisions = _safe_unresolved_decisions_qs(org).count()
    decision_success_count = decisions.filter(was_successful=True).count()
    decision_failure_count = decisions.filter(was_successful=False).count()
    decision_reviewed_count = decision_success_count + decision_failure_count
    decision_success_rate = (
        round((decision_success_count / max(1, decision_reviewed_count)) * 100, 1)
        if decision_reviewed_count
        else None
    )

    task_total = tasks.count()
    task_done = tasks.filter(status='done').count()
    high_priority_total = tasks.filter(priority='high').count()
    high_priority_unassigned = tasks.filter(priority='high', assigned_to_id__isnull=True).count()
    task_completion_rate = round((task_done / max(1, task_total)) * 100, 1) if task_total else 0.0

    blocker_total = blockers.count()
    active_blockers = blockers.filter(status='active').count()
    blocker_type_counter = Counter(blockers.values_list('blocker_type', flat=True))
    top_blocker_types = [{'type': t, 'count': c} for t, c in blocker_type_counter.most_common(3)]

    activity_14d = UnifiedActivity.objects.filter(
        organization=org,
        created_at__gte=now - timedelta(days=14)
    ).count()

    decision_pressure = min(0.35, unresolved_decisions / max(1, decision_total))
    blocker_pressure = min(0.35, active_blockers / max(1, blocker_total))
    ownership_pressure = min(0.35, high_priority_unassigned / max(1, high_priority_total))

    decision_bias = 1.0 + decision_pressure
    blocker_bias = 1.0 + blocker_pressure
    ownership_bias = 1.0 + ownership_pressure

    if decision_success_rate is not None:
        if decision_success_rate < 55:
            decision_bias += 0.12
        elif decision_success_rate > 80:
            decision_bias -= 0.06

    if task_completion_rate < 45:
        ownership_bias += 0.10

    profile = {
        'computed_at': now.isoformat(),
        'horizon_days': horizon_days,
        'totals': {
            'conversations': conversations.count(),
            'decisions': decision_total,
            'tasks': task_total,
            'blockers': blocker_total,
            'activity_14d': activity_14d,
        },
        'quality': {
            'decision_success_rate': decision_success_rate,
            'task_completion_rate': task_completion_rate,
        },
        'risk': {
            'unresolved_decisions': unresolved_decisions,
            'active_blockers': active_blockers,
            'high_priority_unassigned_tasks': high_priority_unassigned,
        },
        'top_keywords': [{'keyword': k, 'count': v} for k, v in keyword_counter.most_common(6)],
        'top_blocker_types': top_blocker_types,
        'action_bias': {
            'decision_resolution': round(max(0.8, min(1.5, decision_bias)), 3),
            'blocker_escalation': round(max(0.8, min(1.5, blocker_bias)), 3),
            'task_ownership': round(max(0.8, min(1.5, ownership_bias)), 3),
        },
    }

    cache.set(cache_key, profile, timeout=600)
    return profile


def _build_user_learning_profile(user, now, horizon_days=120):
    """
    Build a personalized user learning profile from the user's own activity,
    authored content, and execution outcomes.
    """
    if not user:
        return {}

    cache_key = f'agi_user_learning_profile:{user.id}'
    cached = cache.get(cache_key)
    if cached:
        return cached

    horizon_start = now - timedelta(days=horizon_days)
    org = getattr(user, 'organization', None)
    if not org:
        return {}

    authored_conversations = Conversation.objects.filter(
        organization=org,
        author=user,
        created_at__gte=horizon_start
    ).only('ai_keywords', 'post_type')

    decisions_by_user = Decision.objects.filter(
        organization=org,
        decision_maker=user,
        created_at__gte=horizon_start
    ).only('status', 'was_successful')

    assigned_tasks = Task.objects.filter(
        organization=org,
        assigned_to=user,
        created_at__gte=horizon_start
    ).only('status', 'priority')

    user_views = UnifiedActivity.objects.filter(
        organization=org,
        user=user,
        activity_type='viewed',
        created_at__gte=now - timedelta(days=30)
    ).count()

    user_keywords = Counter()
    for conv in authored_conversations[:300]:
        for kw in (conv.ai_keywords or [])[:8]:
            if isinstance(kw, str) and kw.strip():
                user_keywords[kw.strip().lower()] += 1

    user_decision_total = decisions_by_user.count()
    user_decision_reviewed = decisions_by_user.filter(
        Q(was_successful=True) | Q(was_successful=False)
    ).count()
    user_decision_success = decisions_by_user.filter(was_successful=True).count()
    user_success_rate = (
        round((user_decision_success / max(1, user_decision_reviewed)) * 100, 1)
        if user_decision_reviewed
        else None
    )

    assigned_total = assigned_tasks.count()
    assigned_done = assigned_tasks.filter(status='done').count()
    assigned_completion_rate = round((assigned_done / max(1, assigned_total)) * 100, 1) if assigned_total else 0.0
    assigned_high = assigned_tasks.filter(priority='high').count()
    assigned_high_open = assigned_tasks.filter(priority='high', status__in=['todo', 'in_progress']).count()

    decision_bias = 1.0
    blocker_bias = 1.0
    ownership_bias = 1.0

    if user_success_rate is not None and user_decision_reviewed >= 3:
        if user_success_rate < 55:
            decision_bias += 0.18
        elif user_success_rate > 80:
            decision_bias -= 0.08

    if assigned_high > 0:
        ownership_pressure = min(0.25, assigned_high_open / max(1, assigned_high))
        ownership_bias += ownership_pressure

    if assigned_completion_rate < 50 and assigned_total >= 4:
        ownership_bias += 0.10

    if user_views < 15:
        blocker_bias += 0.06

    profile = {
        'computed_at': now.isoformat(),
        'horizon_days': horizon_days,
        'totals': {
            'authored_conversations': authored_conversations.count(),
            'decisions_made': user_decision_total,
            'assigned_tasks': assigned_total,
            'view_events_30d': user_views,
        },
        'quality': {
            'decision_success_rate': user_success_rate,
            'assigned_task_completion_rate': assigned_completion_rate,
        },
        'focus_keywords': [{'keyword': k, 'count': v} for k, v in user_keywords.most_common(6)],
        'action_bias': {
            'decision_resolution': round(max(0.8, min(1.6, decision_bias)), 3),
            'blocker_escalation': round(max(0.8, min(1.6, blocker_bias)), 3),
            'task_ownership': round(max(0.8, min(1.6, ownership_bias)), 3),
        },
    }

    cache.set(cache_key, profile, timeout=600)
    return profile


def _merge_learning_profiles(org_profile, user_profile, user_weight=0.45):
    """
    Blend org- and user-level learning. User profile has less weight by default
    to avoid overfitting to sparse personal activity.
    """
    org_profile = org_profile or {}
    user_profile = user_profile or {}

    org_bias = (org_profile.get('action_bias') or {})
    user_bias = (user_profile.get('action_bias') or {})

    def blend(kind):
        org_val = float(org_bias.get(kind, 1.0))
        user_val = float(user_bias.get(kind, 1.0))
        merged = (org_val * (1.0 - user_weight)) + (user_val * user_weight)
        return round(max(0.75, min(1.75, merged)), 3)

    return {
        'computed_at': timezone.now().isoformat(),
        'horizon_days': max(
            int(org_profile.get('horizon_days') or 0),
            int(user_profile.get('horizon_days') or 0),
            120,
        ),
        'scope': 'org_plus_user',
        'weights': {'org': round(1.0 - user_weight, 2), 'user': round(user_weight, 2)},
        'top_keywords': (org_profile.get('top_keywords') or [])[:4],
        'top_blocker_types': (org_profile.get('top_blocker_types') or [])[:3],
        'focus_keywords': (user_profile.get('focus_keywords') or [])[:4],
        'quality': {
            'org_decision_success_rate': (org_profile.get('quality') or {}).get('decision_success_rate'),
            'org_task_completion_rate': (org_profile.get('quality') or {}).get('task_completion_rate'),
            'user_decision_success_rate': (user_profile.get('quality') or {}).get('decision_success_rate'),
            'user_assigned_task_completion_rate': (user_profile.get('quality') or {}).get('assigned_task_completion_rate'),
        },
        'action_bias': {
            'decision_resolution': blend('decision_resolution'),
            'blocker_escalation': blend('blocker_escalation'),
            'task_ownership': blend('task_ownership'),
        },
        'org_totals': org_profile.get('totals', {}),
        'user_totals': user_profile.get('totals', {}),
    }


def _apply_learning_to_interventions(interventions, profile):
    biases = (profile or {}).get('action_bias', {})
    top_blocker_types = (profile or {}).get('top_blocker_types', [])
    dominant_blocker_type = top_blocker_types[0]['type'] if top_blocker_types else None

    adjusted = []
    for item in interventions:
        updated = dict(item)
        bias = float(biases.get(item.get('kind'), 1.0))
        base_confidence = float(item.get('confidence', 70))
        updated['confidence'] = int(max(40, min(98, round(base_confidence * bias))))

        reasons = []
        if bias > 1.08:
            reasons.append('Elevated by organizational learning model')
        if item.get('kind') == 'blocker_escalation' and dominant_blocker_type:
            reasons.append(f'Dominant blocker pattern: {dominant_blocker_type}')
        if reasons:
            updated['learning_reason'] = ' | '.join(reasons)
        adjusted.append(updated)

    return adjusted

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ai_recommendations(request):
    """Generate AI-powered recommendations for user"""
    org = request.user.organization
    user = request.user

    now = timezone.now()

    # Get user's recent view activity (newest first)
    recent_views = list(UnifiedActivity.objects.filter(
        organization=org,
        user=user,
        activity_type='viewed',
        created_at__gte=now - timedelta(days=14)
    ).select_related('content_type').order_by('-created_at')[:30])

    viewed_keys = {
        (view.content_type_id, view.object_id)
        for view in recent_views
    }
    view_weights = {}
    viewed_type_weight = {}
    for view in recent_views:
        days_old = (now - view.created_at).total_seconds() / 86400.0
        decay = _time_decay(days_old, half_life_days=3.0)
        view_weights[(view.content_type_id, view.object_id)] = decay
        viewed_type_weight[view.content_type.model] = viewed_type_weight.get(view.content_type.model, 0.0) + decay

    recommendations = {}

    def add_recommendation(item_type, item_id, title, reason, score, source_key=None):
        key = (item_type, item_id)
        if key not in recommendations:
            recommendations[key] = {
                'type': item_type,
                'id': item_id,
                'title': title,
                'score': 0.0,
                'reasons': [],
                'source_breakdown': {},
            }
        recommendations[key]['score'] += max(0.0, score)
        if reason and reason not in recommendations[key]['reasons']:
            recommendations[key]['reasons'].append(reason)
        if source_key:
            recommendations[key]['source_breakdown'][source_key] = (
                recommendations[key]['source_breakdown'].get(source_key, 0.0) + max(0.0, score)
            )

    # 1. Trending conversations (recency-weighted)
    trending = Conversation.objects.filter(
        organization=org,
        created_at__gte=now - timedelta(days=3)
    ).annotate(
        activity_count=Count('id')
    ).order_by('-activity_count')[:3]

    conv_ct_id = ContentType.objects.get_for_model(Conversation).id
    for conv in trending:
        days_old = (now - conv.created_at).total_seconds() / 86400.0
        score = 0.45 + (0.30 * _time_decay(days_old, half_life_days=2.0))
        if (conv_ct_id, conv.id) in viewed_keys:
            score *= 0.55
        add_recommendation(
            'conversation',
            conv.id,
            conv.title,
            'Trending in your organization',
            score,
            source_key='trending',
        )

    # 2. Pending decisions (recency-weighted)
    pending = Decision.objects.filter(
        organization=org,
        status='proposed'
    ).order_by('-created_at')[:3]
    dec_ct_id = ContentType.objects.get_for_model(Decision).id
    for dec in pending:
        days_old = (now - dec.created_at).total_seconds() / 86400.0
        score = 0.50 + (0.25 * _time_decay(days_old, half_life_days=5.0))
        if (dec_ct_id, dec.id) in viewed_keys:
            score *= 0.60
        add_recommendation(
            'decision',
            dec.id,
            dec.title,
            'Needs your input',
            score,
            source_key='pending_decisions',
        )

    # 3. Related content based on viewed items + link strength + recency decay
    if recent_views:
        for view in recent_views[:15]:
            source_key = (view.content_type_id, view.object_id)
            source_weight = view_weights.get(source_key, 0.0)
            links = ContentLink.objects.filter(
                organization=org
            ).filter(
                Q(source_content_type=view.content_type, source_object_id=view.object_id) |
                Q(target_content_type=view.content_type, target_object_id=view.object_id)
            ).select_related('source_content_type', 'target_content_type')[:4]

            for link in links:
                if link.source_object_id == view.object_id and link.source_content_type_id == view.content_type_id:
                    target_ct = link.target_content_type
                    target_obj = link.target_object
                    target_id = link.target_object_id
                else:
                    target_ct = link.source_content_type
                    target_obj = link.source_object
                    target_id = link.source_object_id

                target_title = getattr(target_obj, 'title', str(target_obj)) if target_obj else f'Related {target_ct.model}'
                link_score = (0.20 + 0.50 * float(link.strength)) * source_weight

                if (target_ct.id, target_id) in viewed_keys:
                    link_score *= 0.50

                add_recommendation(
                    target_ct.model,
                    target_id,
                    target_title,
                    'Connected to your recent activity',
                    link_score,
                    source_key='linked_from_views',
                )

    # 3b. Explicit viewed-context affinity by content type, with decay.
    for item in recommendations.values():
        affinity = viewed_type_weight.get(item['type'], 0.0)
        if affinity <= 0:
            continue
        boost = min(0.28, affinity * 0.08)
        item['score'] += boost
        if 'Aligned with your recent viewed topics' not in item['reasons']:
            item['reasons'].append('Aligned with your recent viewed topics')
        item['source_breakdown']['viewed_affinity'] = item['source_breakdown'].get('viewed_affinity', 0.0) + boost

    # 4. Outcome-linked calibration for decision recommendations
    decision_ids = [item['id'] for item in recommendations.values() if item['type'] == 'decision']
    if decision_ids:
        decision_map = {
            d.id: d
            for d in Decision.objects.filter(organization=org, id__in=decision_ids)
        }
        for item in recommendations.values():
            if item['type'] != 'decision':
                continue
            decision_obj = decision_map.get(item['id'])
            if not decision_obj:
                continue
            if decision_obj.was_successful is True:
                bonus = 0.12
                item['score'] += bonus
                item['reasons'].append('Positive validated outcome')
                item['source_breakdown']['outcome_history'] = item['source_breakdown'].get('outcome_history', 0.0) + bonus
            elif decision_obj.was_successful is False:
                penalty = 0.12
                item['score'] = max(0.0, item['score'] - penalty)
                item['reasons'].append('Past outcome indicates risk')
                item['source_breakdown']['outcome_history'] = item['source_breakdown'].get('outcome_history', 0.0) - penalty

    # Normalize output and sort
    ranked = sorted(
        recommendations.values(),
        key=lambda item: item['score'],
        reverse=True
    )

    output = []
    for item in ranked[:8]:
        source_breakdown = sorted(
            (
                {'source': source, 'score': round(score, 4)}
                for source, score in item['source_breakdown'].items()
            ),
            key=lambda s: s['score'],
            reverse=True
        )
        output.append({
            'type': item['type'],
            'id': item['id'],
            'title': item['title'],
            'reason': ' | '.join(item['reasons'][:2]),
            'score': round(item['score'], 4),
            'source_breakdown': source_breakdown,
        })

    return Response({
        'recommendations': output,
        'generated_at': now.isoformat()
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ai_summarize(request):
    """Generate AI summary of content"""
    content = request.data.get('content', '')
    content_type = request.data.get('type', 'text')
    
    # Simple extractive summary (first 3 sentences)
    sentences = content.split('. ')
    summary = '. '.join(sentences[:3]) + '.'
    
    # Extract key points (sentences with keywords)
    keywords = ['important', 'critical', 'key', 'must', 'should', 'decision', 'action']
    key_points = [s for s in sentences if any(k in s.lower() for k in keywords)][:3]
    
    return Response({
        'summary': summary,
        'key_points': key_points,
        'word_count': len(content.split()),
        'reading_time': len(content.split()) // 200  # avg reading speed
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ai_extract_action_items(request):
    """Extract action items from content"""
    content = request.data.get('content', '')
    
    # Simple pattern matching for action items
    action_patterns = ['TODO:', 'Action:', '- [ ]', 'Need to', 'Must', 'Should']
    sentences = content.split('\n')
    
    actions = []
    for sentence in sentences:
        if any(pattern.lower() in sentence.lower() for pattern in action_patterns):
            actions.append({
                'text': sentence.strip(),
                'priority': 'high' if 'urgent' in sentence.lower() or 'asap' in sentence.lower() else 'medium'
            })
    
    return Response({
        'action_items': actions[:10],
        'count': len(actions)
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def mission_control_briefing(request):
    """
    State-of-the-art style "Mission Control" briefing:
    - critical path health
    - autonomous actions with confidence
    - 24h simulation
    - explainable evidence citations
    """
    try:
        org = request.user.organization
    except Exception:
        return Response({
            'generated_at': timezone.now().isoformat(),
            'north_star': {
                'critical_path_score': 50.0,
                'status': 'watch',
                'summary': 'Mission Control requires a valid user organization.',
            },
            'autonomous_actions': [],
            'simulation_24h': {
                'projected_critical_path_score': 50.0,
                'probability_on_track_pct': 50.0,
                'assumptions': [],
            },
            'evidence': [],
            'degraded': True,
            'error': 'organization_not_configured',
        }, status=200)

    now = timezone.now()

    try:
        try:
            unresolved_decisions = _safe_unresolved_decisions_qs(org).order_by('-impact_level', '-created_at')[:30]
        except Exception:
            unresolved_decisions = _safe_unresolved_decisions_qs(org).order_by('-created_at')[:30]
    except Exception:
        unresolved_decisions = []

    try:
        active_blockers = Blocker.objects.filter(
            organization=org,
            status='active'
        ).select_related('sprint').order_by('-created_at')[:30]
    except Exception:
        active_blockers = []

    try:
        open_tasks_qs = Task.objects.filter(
            organization=org,
            status__in=['todo', 'in_progress']
        ).order_by('-created_at')
        open_tasks = open_tasks_qs[:80]
    except Exception:
        open_tasks_qs = None
        open_tasks = []

    try:
        current_sprint = Sprint.objects.filter(
            organization=org,
            start_date__lte=now.date(),
            end_date__gte=now.date()
        ).order_by('-start_date').first()
    except Exception:
        current_sprint = None

    unresolved_count = unresolved_decisions.count() if hasattr(unresolved_decisions, 'count') else len(unresolved_decisions)
    blockers_count = active_blockers.count() if hasattr(active_blockers, 'count') else len(active_blockers)
    high_priority_count = (
        open_tasks_qs.filter(priority='high').count()
        if open_tasks_qs is not None
        else len([t for t in open_tasks if getattr(t, 'priority', '') == 'high'])
    )

    critical_path_score = 100.0
    critical_path_score -= min(35.0, unresolved_count * 3.2)
    critical_path_score -= min(30.0, blockers_count * 6.0)
    critical_path_score -= min(15.0, high_priority_count * 1.6)
    if current_sprint and getattr(current_sprint, 'end_date', None) and current_sprint.end_date <= (now.date() + timedelta(days=3)):
        critical_path_score -= 8.0
    critical_path_score = max(2.0, min(100.0, critical_path_score))

    status = 'stable' if critical_path_score >= 75 else 'watch' if critical_path_score >= 50 else 'critical'

    actions = []
    citations = []

    for dec in list(unresolved_decisions)[:3]:
        impact_level = _decision_impact_level(dec)
        confidence = max(55, min(94, 88 - (10 if impact_level in ['high', 'critical'] else 0)))
        decision_id = getattr(dec, 'id', '?')
        decision_title = getattr(dec, 'title', f'Decision #{decision_id}')
        actions.append({
            'type': 'decision_resolution',
            'title': f"Resolve decision: {decision_title}",
            'impact_estimate': 'high' if impact_level in ['high', 'critical'] else 'medium',
            'time_to_value_hours': 6 if impact_level in ['high', 'critical'] else 12,
            'confidence': confidence,
            'auto_run_supported': False,
            'suggested_path': f"Gather final stakeholder input and move decision #{decision_id} to implemented or rejected.",
            'url': f"/decisions/{decision_id}",
        })
        citations.append({'kind': 'decision', 'id': decision_id if decision_id != '?' else None, 'title': decision_title, 'url': f"/decisions/{decision_id}"})

    for blocker in list(active_blockers)[:2]:
        confidence = 79
        title = blocker.title if hasattr(blocker, 'title') else f"Blocker #{getattr(blocker, 'id', '?')}"
        actions.append({
            'type': 'blocker_resolution',
            'title': f"Escalate blocker: {title}",
            'impact_estimate': 'high',
            'time_to_value_hours': 4,
            'confidence': confidence,
            'auto_run_supported': False,
            'suggested_path': "Assign owner + decision deadline + mitigation task.",
            'url': "/blockers",
        })
        citations.append({'kind': 'blocker', 'id': getattr(blocker, 'id', None), 'title': title, 'url': "/blockers"})

    high_priority_tasks = (
        list(open_tasks_qs.filter(priority='high')[:2])
        if open_tasks_qs is not None
        else [t for t in list(open_tasks)[:20] if getattr(t, 'priority', '') == 'high'][:2]
    )
    for task in high_priority_tasks:
        confidence = 74
        task_id = getattr(task, 'id', '?')
        task_title = getattr(task, 'title', f'Task #{task_id}')
        actions.append({
            'type': 'task_acceleration',
            'title': f"Accelerate task: {task_title}",
            'impact_estimate': 'medium',
            'time_to_value_hours': 8,
            'confidence': confidence,
            'auto_run_supported': False,
            'suggested_path': "Reassign to most relevant owner and set 48h checkpoint.",
            'url': "/business/tasks",
        })
        citations.append({'kind': 'task', 'id': task_id if task_id != '?' else None, 'title': task_title, 'url': "/business/tasks"})

    projected_risk_reduction = min(42.0, len(actions) * 6.5)
    projected_score_24h = min(99.0, critical_path_score + projected_risk_reduction * 0.55)
    probability_on_track_24h = max(10.0, min(98.0, projected_score_24h - 3.0))

    return Response({
        'generated_at': now.isoformat(),
        'north_star': {
            'critical_path_score': round(critical_path_score, 1),
            'status': status,
            'summary': (
                "Execution is healthy and compounding institutional memory."
                if status == 'stable'
                else "Execution risk is rising; focused intervention recommended."
                if status == 'watch'
                else "Critical execution risk detected; immediate coordination required."
            ),
        },
        'autonomous_actions': actions[:8],
        'simulation_24h': {
            'projected_critical_path_score': round(projected_score_24h, 1),
            'probability_on_track_pct': round(probability_on_track_24h, 1),
            'assumptions': [
                "Top recommended actions are executed within 24h",
                "No net-new critical blockers are introduced",
                "Decision turnaround remains within current median response time",
            ],
        },
        'evidence': citations[:12],
        'degraded': False,
    })


def _build_chief_of_staff_plan(org, now, user=None):
    interventions = []
    org_learning_profile = _build_org_learning_profile(org, now)
    user_learning_profile = _build_user_learning_profile(user, now) if user else {}
    learning_profile = _merge_learning_profiles(org_learning_profile, user_learning_profile)

    unresolved_decisions = list(
        _safe_unresolved_decisions_qs(org)
        .select_related('decision_maker')
        .order_by('-created_at')[:20]
    )

    active_blockers = list(
        Blocker.objects.filter(organization=org, status='active')
        .select_related('assigned_to', 'blocked_by')
        .order_by('-created_at')[:20]
    )

    high_priority_tasks = list(
        Task.objects.filter(organization=org, priority='high', status__in=['todo', 'in_progress'])
        .select_related('assigned_to')
        .order_by('-created_at')[:20]
    )

    # 1) Decision resolution interventions.
    for dec in unresolved_decisions[:4]:
        impact_level = _decision_impact_level(dec)
        interventions.append({
            'id': f"decision:{dec.id}",
            'kind': 'decision_resolution',
            'title': f"Resolve decision: {dec.title}",
            'reason': 'Unresolved decision is impacting execution flow',
            'impact': 'high' if impact_level in ['high', 'critical'] else 'medium',
            'confidence': 86 if impact_level in ['high', 'critical'] else 78,
            'url': f"/decisions/{dec.id}",
            'meta': {'decision_id': dec.id},
        })

    # 2) Blocker escalation interventions.
    for blocker in active_blockers[:3]:
        interventions.append({
            'id': f"blocker:{blocker.id}",
            'kind': 'blocker_escalation',
            'title': f"Escalate blocker: {blocker.title}",
            'reason': 'Active blocker remains unresolved and may impact sprint outcomes',
            'impact': 'high',
            'confidence': 80,
            'url': '/blockers',
            'meta': {'blocker_id': blocker.id},
        })

    # 3) Task ownership interventions.
    for task in high_priority_tasks[:3]:
        if task.assigned_to_id:
            continue
        interventions.append({
            'id': f"task:{task.id}",
            'kind': 'task_ownership',
            'title': f"Assign owner: {task.title}",
            'reason': 'High-priority task is unassigned',
            'impact': 'medium',
            'confidence': 74,
            'url': '/business/tasks',
            'meta': {'task_id': task.id},
        })

    interventions = _apply_learning_to_interventions(interventions, learning_profile)
    interventions = _rank_interventions(interventions)

    readiness_score = 100.0
    readiness_score -= min(40.0, len(unresolved_decisions) * 3.5)
    readiness_score -= min(35.0, len(active_blockers) * 7.0)
    readiness_score -= min(15.0, len([t for t in high_priority_tasks if not t.assigned_to_id]) * 3.0)
    readiness_score = max(5.0, min(100.0, readiness_score))

    return {
        'generated_at': now.isoformat(),
        'readiness_score': round(readiness_score, 1),
        'status': 'stable' if readiness_score >= 75 else 'watch' if readiness_score >= 50 else 'critical',
        'interventions': interventions[:10],
        'learning_model': {
            'scope': learning_profile.get('scope', 'org_plus_user'),
            'horizon_days': learning_profile.get('horizon_days'),
            'top_keywords': learning_profile.get('top_keywords', []),
            'top_blocker_types': learning_profile.get('top_blocker_types', []),
            'focus_keywords': learning_profile.get('focus_keywords', []),
            'action_bias': learning_profile.get('action_bias', {}),
            'quality': learning_profile.get('quality', {}),
            'weights': learning_profile.get('weights', {}),
            'org_totals': learning_profile.get('org_totals', {}),
            'user_totals': learning_profile.get('user_totals', {}),
        },
        'counts': {
            'unresolved_decisions': len(unresolved_decisions),
            'active_blockers': len(active_blockers),
            'high_priority_unassigned_tasks': len([t for t in high_priority_tasks if not t.assigned_to_id]),
        },
    }


def _execute_interventions(org, user, request, intervention_ids, dry_run=False, plan=None, now=None):
    """Execute selected interventions from a generated plan."""
    if not isinstance(intervention_ids, list):
        return {'error': 'intervention_ids must be an array'}, 400

    now = now or timezone.now()
    plan = plan or _build_chief_of_staff_plan(org, now, user=user)
    plan_map = {item['id']: item for item in plan['interventions']}
    selected = [plan_map[item_id] for item_id in intervention_ids if item_id in plan_map]

    executed = []
    skipped = []
    audit_records = []

    for item in selected:
        kind = item['kind']
        meta = item.get('meta', {})

        if dry_run:
            executed.append({'id': item['id'], 'kind': kind, 'status': 'dry_run'})
            continue

        if kind == 'decision_resolution':
            decision_id = meta.get('decision_id')
            try:
                decision = Decision.objects.get(id=decision_id, organization=org)
            except Decision.DoesNotExist:
                skipped.append({'id': item['id'], 'reason': 'decision_not_found'})
                continue

            task_title = f"Chief of Staff: resolve decision #{decision.id}"
            if Task.objects.filter(organization=org, decision=decision, title=task_title).exists():
                skipped.append({'id': item['id'], 'reason': 'task_already_exists'})
                continue

            task = Task.objects.create(
                organization=org,
                title=task_title,
                description=f"Auto-generated intervention for decision '{decision.title}'.",
                status='todo',
                priority='high' if _decision_impact_level(decision) in ['high', 'critical'] else 'medium',
                assigned_to=decision.decision_maker,
                decision=decision,
                due_date=(now + timedelta(days=3)).date(),
            )
            if decision.decision_maker and decision.decision_maker != user:
                create_notification(
                    user=decision.decision_maker,
                    notification_type='automation',
                    title='AI Chief of Staff action',
                    message=f"New follow-up task for decision '{decision.title}'",
                    link='/business/tasks',
                )
            executed.append({'id': item['id'], 'kind': kind, 'status': 'executed', 'task_id': task.id})

            audit = AuditLog.log(
                organization=org,
                user=user,
                action='update',
                resource_type='chief_of_staff_intervention',
                resource_id=decision.id,
                details={'intervention': item, 'result': {'task_id': task.id}},
                request=request,
            )
            audit_records.append(audit.id)

        elif kind == 'blocker_escalation':
            blocker_id = meta.get('blocker_id')
            try:
                blocker = Blocker.objects.get(id=blocker_id, organization=org)
            except Blocker.DoesNotExist:
                skipped.append({'id': item['id'], 'reason': 'blocker_not_found'})
                continue

            owner = blocker.assigned_to or blocker.blocked_by
            if owner:
                create_notification(
                    user=owner,
                    notification_type='automation',
                    title='AI escalation: blocker needs action',
                    message=f"Blocker '{blocker.title}' has been escalated by Chief of Staff agent.",
                    link='/blockers',
                )
            executed.append({'id': item['id'], 'kind': kind, 'status': 'executed'})

            audit = AuditLog.log(
                organization=org,
                user=user,
                action='update',
                resource_type='chief_of_staff_intervention',
                resource_id=blocker.id,
                details={'intervention': item, 'result': {'owner_notified': bool(owner)}},
                request=request,
            )
            audit_records.append(audit.id)

        elif kind == 'task_ownership':
            task_id = meta.get('task_id')
            try:
                task = Task.objects.get(id=task_id, organization=org)
            except Task.DoesNotExist:
                skipped.append({'id': item['id'], 'reason': 'task_not_found'})
                continue

            if task.assigned_to_id:
                skipped.append({'id': item['id'], 'reason': 'already_assigned'})
                continue

            assignee = org.users.filter(role__in=['manager', 'admin'], is_active=True).order_by('id').first()
            if not assignee:
                assignee = org.users.filter(is_active=True).order_by('id').first()
            if not assignee:
                skipped.append({'id': item['id'], 'reason': 'no_active_user'})
                continue

            task.assigned_to = assignee
            task.save(update_fields=['assigned_to', 'updated_at'])
            if assignee != user:
                create_notification(
                    user=assignee,
                    notification_type='automation',
                    title='AI assignment: high-priority task',
                    message=f"You were assigned '{task.title}' by Chief of Staff agent.",
                    link='/business/tasks',
                )
            executed.append({'id': item['id'], 'kind': kind, 'status': 'executed', 'assigned_to': assignee.get_full_name()})

            audit = AuditLog.log(
                organization=org,
                user=user,
                action='update',
                resource_type='chief_of_staff_intervention',
                resource_id=task.id,
                details={'intervention': item, 'result': {'assigned_to_id': assignee.id}},
                request=request,
            )
            audit_records.append(audit.id)
        else:
            skipped.append({'id': item['id'], 'reason': 'unsupported_kind'})

    return {
        'dry_run': dry_run,
        'selected': len(selected),
        'executed_count': len(executed),
        'skipped_count': len(skipped),
        'executed': executed,
        'skipped': skipped,
        'audit_log_ids': audit_records,
    }, 200


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def chief_of_staff_plan(request):
    """Generate autonomous intervention plan that requires explicit approval."""
    plan = _build_chief_of_staff_plan(request.user.organization, timezone.now(), user=request.user)
    plan['requires_approval'] = True
    return Response(plan)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def chief_of_staff_execute(request):
    """Execute approved interventions and produce audit trail."""
    if not check_rate_limit(f"chief_execute:{request.user.id}", limit=30, window=3600):
        return Response({'error': 'Too many execution requests'}, status=429)

    org = request.user.organization
    user = request.user
    now = timezone.now()

    intervention_ids = request.data.get('intervention_ids') or []
    if not isinstance(intervention_ids, list):
        return Response({'error': 'intervention_ids must be an array'}, status=400)
    if len(intervention_ids) > 10:
        return Response({'error': 'Too many interventions selected'}, status=400)

    dry_run = bool(request.data.get('dry_run', False))
    if not dry_run:
        if getattr(user, 'role', None) not in ['admin', 'manager']:
            return Response({'error': 'Only admins/managers can execute interventions'}, status=403)
        if request.data.get('confirm_execute') is not True:
            return Response({'error': 'confirm_execute=true required for execution'}, status=400)

    payload, status_code = _execute_interventions(
        org=org,
        user=user,
        request=request,
        intervention_ids=intervention_ids,
        dry_run=dry_run,
        now=now,
    )
    return Response(payload, status=status_code)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def agi_copilot(request):
    """
    Organization copilot endpoint:
    - diagnoses current operating risk
    - proposes prioritized interventions
    - can execute safe interventions when requested
    """
    try:
        org = request.user.organization
    except Exception:
        return Response({'error': 'User organization is not configured'}, status=400)

    user = request.user
    now = timezone.now()
    if not check_rate_limit(f"agi_copilot:{user.id}", limit=180, window=3600):
        return Response({'error': 'Too many requests'}, status=429)

    query = (request.data.get('query') or '').strip()
    if not query:
        return Response({'error': 'query is required'}, status=400)
    if len(query) > 400:
        return Response({'error': 'query too long'}, status=400)

    try:
        execute = bool(request.data.get('execute', False))
        query_mode = _detect_copilot_query_mode(query)
        if execute:
            if query_mode != 'diagnosis':
                return Response({'error': 'Execution is only available for operational diagnosis requests'}, status=400)
            if getattr(user, 'role', None) not in ['admin', 'manager']:
                return Response({'error': 'Only admins/managers can execute interventions'}, status=403)
            if request.data.get('confirm_execute') is not True:
                return Response({'error': 'confirm_execute=true required for execution'}, status=400)

        try:
            max_actions = int(request.data.get('max_actions', 3) or 3)
        except (TypeError, ValueError):
            max_actions = 3
        max_actions = max(1, min(max_actions, 5))

        thread_context = _sanitize_thread_context(request.data.get('thread_context'))
        disable_navigation = bool(request.data.get('disable_navigation', False))
        query_lower = query.lower()
        explicit_navigation = any(
            phrase in query_lower
            for phrase in [
                'open ',
                'go to ',
                'navigate',
                'take me to',
                'where can i',
                'which page',
            ]
        )
        navigation_intent = None if (disable_navigation or not explicit_navigation) else _detect_navigation_intent(query)
        if navigation_intent:
            plan = _build_chief_of_staff_plan(org, now, user=user)
            tool_links = _build_navigation_links(query)
            if not tool_links:
                navigation_intent = None
            else:
                confidence = 82 if tool_links else 64
                response_payload = {
                    'analysis_id': str(uuid4()),
                    'query': query,
                    'answer': 'I interpreted this as a navigation request. Use these links to open the right workspace directly.',
                    'answer_engine': 'rules',
                    'confidence': confidence,
                    'confidence_band': _confidence_band(confidence),
                    'response_mode': 'navigation',
                    'evidence_count': 0,
                    'source_types': [],
                    'freshness_days': None,
                    'coverage_score': 0,
                    'missing_evidence': [],
                    'evidence_breakdown': [],
                    'citations': [],
                    'credibility_summary': 'Navigation requests do not use workspace evidence.',
                    'answer_foundation': ['This request was treated as navigation, so Ask Recall did not retrieve workspace evidence.'],
                    'follow_up_questions': [],
                    'tool_links': tool_links,
                    'risk_status': plan.get('status'),
                    'readiness_score': plan.get('readiness_score'),
                    'learning_model': plan.get('learning_model', {}),
                    'counts': plan.get('counts', {}),
                    'sources': _copilot_sources_payload({}),
                    'recommended_interventions': [],
                    'requires_approval_for_execution': False,
                    'execution': {
                        'performed': False,
                        'dry_run': True,
                        'result': None,
                    },
                    'generated_at': now.isoformat(),
                }
                _log_copilot_query(request, org, user, query, response_payload)
                return Response(response_payload)

        if _detect_conversational_opener(query):
            plan = _build_chief_of_staff_plan(org, now, user=user)
            response_payload = {
                'analysis_id': str(uuid4()),
                'query': query,
                'answer': _build_conversational_answer(query),
                'answer_engine': 'rules',
                'confidence': 86,
                'confidence_band': _confidence_band(86),
                'response_mode': 'conversation',
                'evidence_count': 0,
                'source_types': [],
                'freshness_days': None,
                'coverage_score': 0,
                'missing_evidence': [],
                'evidence_breakdown': [],
                'citations': [],
                'credibility_summary': 'This was treated as a conversational opener, so Ask Recall is waiting for a workspace-specific follow-up.',
                'answer_foundation': ['This message did not reference a workspace record yet, so Ask Recall responded as a conversational opener.'],
                'follow_up_questions': [
                    'Which active projects need attention most right now?',
                    'What decisions are blocking delivery?',
                    'Summarize the latest updates in [project or document name].',
                    'What is active in [sprint name] right now?',
                ],
                'tool_links': [],
                'risk_status': plan.get('status'),
                'readiness_score': plan.get('readiness_score'),
                'learning_model': plan.get('learning_model', {}),
                'counts': plan.get('counts', {}),
                'sources': _copilot_sources_payload({}),
                'recommended_interventions': [],
                'requires_approval_for_execution': False,
                'execution': {
                    'performed': False,
                    'dry_run': True,
                    'result': None,
                },
                'generated_at': now.isoformat(),
            }
            _log_copilot_query(request, org, user, query, response_payload)
            return Response(response_payload)

        search_engine = get_search_engine()
        search_data = search_engine.search(query, org.id, filters={}, limit=6)
        search_data, thread_resolution = _apply_thread_context_search(
            query=query,
            search_data=search_data,
            thread_context=thread_context,
            search_engine=search_engine,
            org_id=org.id,
        )
        search_data, answer_override, grounded_lookup = _apply_workspace_lookup_fallback(org, query, search_data)

        plan = _build_chief_of_staff_plan(org, now, user=user)
        interventions = plan.get('interventions', [])
        recommended = interventions[:max_actions]
        recommended = _rank_interventions(recommended)
        evidence_items = _build_evidence_items(search_data)
        recommended = _attach_intervention_evidence(recommended, evidence_items)
        recommended_for_response = recommended if query_mode == 'diagnosis' else []
        intervention_ids = [item['id'] for item in recommended_for_response]

        confidence = 32
        confidence += min(36, int(search_data.get('total', 0)) * 6)
        confidence += min(18, len(recommended_for_response) * 5)
        if plan.get('status') == 'critical':
            confidence += 8
        if grounded_lookup:
            confidence = max(confidence, 58)
        if thread_resolution:
            confidence = max(confidence, 54)
        confidence = max(18, min(96, confidence))
        evidence_contract = _build_evidence_contract(search_data, now)
        citations = _rank_source_citations(search_data, query)
        credibility_summary = _build_credibility_summary(evidence_contract, citations)
        evidence_breakdown = _build_evidence_breakdown(search_data)
        answer_foundation = _build_answer_foundation(
            query_mode=query_mode,
            evidence_contract=evidence_contract,
            citations=citations,
            evidence_breakdown=evidence_breakdown,
            recommended_interventions=recommended_for_response,
            plan=plan,
        )
        answer_foundation = _apply_thread_resolution_to_foundation(answer_foundation, thread_resolution)
        follow_up_questions = _build_follow_up_questions(
            query=query,
            query_mode=query_mode,
            search_data=search_data,
            citations=citations,
            evidence_contract=evidence_contract,
            plan=plan,
            recommended_interventions=recommended_for_response,
        )
        llm_answer = _generate_llm_copilot_answer(
            query=query,
            query_mode=query_mode,
            search_data=search_data,
            plan=plan,
            evidence_contract=evidence_contract,
            recommended_interventions=recommended_for_response,
        )
        answer_engine = 'claude' if llm_answer else 'rules'

        if llm_answer:
            answer_text = llm_answer
        elif answer_override:
            answer_text = answer_override
        elif query_mode == 'answer':
            answer_text = _build_answer_text(query, search_data, plan, evidence_contract)
        else:
            answer_text = _build_diagnosis_answer_text(
                query=query,
                search_data=search_data,
                plan=plan,
                evidence_contract=evidence_contract,
                recommended_interventions=recommended_for_response,
            )

        low_evidence_mode = (
            evidence_contract.get('evidence_count', 0) == 0
            or float(evidence_contract.get('coverage_score', 0.0) or 0.0) < 45.0
        )
        if grounded_lookup:
            low_evidence_mode = False
        if thread_resolution and evidence_contract.get('evidence_count', 0) > 0:
            low_evidence_mode = False
        if low_evidence_mode:
            confidence = min(confidence, 64)

        confidence_band = _confidence_band(confidence)
        response_mode = 'needs_evidence' if low_evidence_mode else query_mode

        response_payload = {
            'analysis_id': str(uuid4()),
            'query': query,
            'answer': answer_text,
            'answer_engine': answer_engine,
            'confidence': confidence,
            'confidence_band': confidence_band,
            'response_mode': response_mode,
            'evidence_count': evidence_contract.get('evidence_count', 0),
            'source_types': evidence_contract.get('source_types', []),
            'freshness_days': evidence_contract.get('freshness_days'),
            'coverage_score': evidence_contract.get('coverage_score', 0),
            'missing_evidence': evidence_contract.get('missing_evidence', []),
            'evidence_breakdown': evidence_breakdown,
            'citations': citations,
            'credibility_summary': credibility_summary,
            'answer_foundation': answer_foundation,
            'follow_up_questions': follow_up_questions,
            'tool_links': [],
            'context_anchor': (thread_resolution or {}).get('anchor'),
            'risk_status': plan.get('status'),
            'readiness_score': plan.get('readiness_score'),
            'learning_model': plan.get('learning_model', {}),
            'counts': plan.get('counts', {}),
            'sources': _copilot_sources_payload(search_data),
            'recommended_interventions': recommended_for_response,
            'requires_approval_for_execution': bool(recommended_for_response),
            'execution': {
                'performed': False,
                'dry_run': True,
                'result': None,
            },
            'generated_at': now.isoformat(),
        }

        if execute:
            execution_result, status_code = _execute_interventions(
                org=org,
                user=user,
                request=request,
                intervention_ids=intervention_ids,
                dry_run=False,
                plan=plan,
                now=now,
            )
            if status_code != 200:
                return Response(execution_result, status=status_code)
            response_payload['execution'] = {
                'performed': True,
                'dry_run': False,
                'selected_ids': intervention_ids,
                'result': execution_result,
            }

        _log_copilot_query(request, org, user, query, response_payload)
        return Response(response_payload)
    except Exception as exc:
        return Response({'error': 'agi_copilot_failed', 'detail': str(exc)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def agi_copilot_feedback(request):
    try:
        org = request.user.organization
    except Exception:
        return Response({'error': 'User organization is not configured'}, status=400)

    user = request.user
    if not check_rate_limit(f"agi_copilot_feedback:{user.id}", limit=400, window=3600):
        return Response({'error': 'Too many requests'}, status=429)

    feedback = str(request.data.get('feedback') or '').strip().lower()
    if feedback not in ['up', 'down']:
        return Response({'error': 'feedback must be "up" or "down"'}, status=400)

    outcome = str(request.data.get('outcome') or '').strip().lower()
    if outcome and outcome not in ['improved', 'neutral', 'worse']:
        return Response({'error': 'outcome must be improved, neutral, or worse'}, status=400)

    details = {
        'analysis_id': str(request.data.get('analysis_id') or '').strip(),
        'query': str(request.data.get('query') or '').strip()[:500],
        'feedback': feedback,
        'outcome': outcome or None,
        'response_mode': str(request.data.get('response_mode') or '').strip()[:50],
        'confidence_band': str(request.data.get('confidence_band') or '').strip()[:20],
        'evidence_count': _safe_int(request.data.get('evidence_count'), default=0),
        'coverage_score': _safe_float(request.data.get('coverage_score'), default=0.0),
        'has_actions': bool(request.data.get('has_actions', False)),
    }

    AuditLog.log(
        organization=org,
        user=user,
        action='update',
        resource_type='agi_copilot_feedback',
        details=details,
        request=request,
    )
    return Response({'message': 'Feedback recorded'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def agi_copilot_feedback_summary(request):
    try:
        org = request.user.organization
    except Exception:
        return Response({'error': 'User organization is not configured'}, status=400)

    now = timezone.now()
    since = now - timedelta(days=30)
    rows = AuditLog.objects.filter(
        organization=org,
        resource_type='agi_copilot_feedback',
        created_at__gte=since,
    ).only('details')

    up = 0
    down = 0
    outcomes = {'improved': 0, 'neutral': 0, 'worse': 0}
    for row in rows:
        details = row.details or {}
        fb = str(details.get('feedback') or '').lower()
        if fb == 'up':
            up += 1
        elif fb == 'down':
            down += 1
        outcome = str(details.get('outcome') or '').lower()
        if outcome in outcomes:
            outcomes[outcome] += 1

    total = up + down
    positive_rate = round((up / total) * 100, 1) if total else None
    return Response({
        'window_days': 30,
        'total_feedback': total,
        'upvotes': up,
        'downvotes': down,
        'positive_rate': positive_rate,
        'outcomes': outcomes,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def agi_copilot_feedback_trend(request):
    try:
        org = request.user.organization
    except Exception:
        return Response({'error': 'User organization is not configured'}, status=400)

    raw_days = request.query_params.get('days', 14)
    days = _safe_int(raw_days, default=14)
    days = max(3, min(days, 90))

    now = timezone.now()
    since = now - timedelta(days=days - 1)
    rows = AuditLog.objects.filter(
        organization=org,
        resource_type='agi_copilot_feedback',
        created_at__gte=since,
    ).only('details', 'created_at')

    buckets = {}
    for i in range(days):
        day = (since + timedelta(days=i)).date().isoformat()
        buckets[day] = {'upvotes': 0, 'downvotes': 0}

    for row in rows:
        day = row.created_at.date().isoformat()
        if day not in buckets:
            continue
        fb = str((row.details or {}).get('feedback') or '').lower()
        if fb == 'up':
            buckets[day]['upvotes'] += 1
        elif fb == 'down':
            buckets[day]['downvotes'] += 1

    points = []
    up_total = 0
    down_total = 0
    for day in sorted(buckets.keys()):
        up = buckets[day]['upvotes']
        down = buckets[day]['downvotes']
        total = up + down
        up_total += up
        down_total += down
        points.append({
            'date': day,
            'upvotes': up,
            'downvotes': down,
            'total': total,
            'positive_rate': round((up / total) * 100, 1) if total else None,
        })

    total_feedback = up_total + down_total
    return Response({
        'window_days': days,
        'points': points,
        'totals': {
            'total_feedback': total_feedback,
            'upvotes': up_total,
            'downvotes': down_total,
            'positive_rate': round((up_total / total_feedback) * 100, 1) if total_feedback else None,
        },
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def agi_copilot_what_if(request):
    try:
        org = request.user.organization
    except Exception:
        return Response({'error': 'User organization is not configured'}, status=400)

    user = request.user
    if not check_rate_limit(f"agi_copilot_what_if:{user.id}", limit=240, window=3600):
        return Response({'error': 'Too many requests'}, status=429)

    action_type = str(request.data.get('action_type') or '').strip()
    if action_type not in ['resolve_decisions', 'clear_blockers', 'assign_high_priority_tasks']:
        return Response({'error': 'action_type is required and must be one of resolve_decisions, clear_blockers, assign_high_priority_tasks'}, status=400)

    units = _safe_int(request.data.get('units'), default=1)
    units = max(1, min(units, 10))
    horizon_days = _safe_int(request.data.get('horizon_days'), default=14)
    horizon_days = max(1, min(horizon_days, 120))

    plan = _build_chief_of_staff_plan(org, timezone.now(), user=user)
    simulation = _simulate_counterfactual(plan, action_type, units, horizon_days)
    simulation['generated_at'] = timezone.now().isoformat()
    return Response(simulation)
