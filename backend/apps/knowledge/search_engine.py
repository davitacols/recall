from datetime import datetime

from django.db.models import Q

from apps.conversations.models import Conversation
from apps.decisions.models import Decision

try:
    from apps.business.models import Goal, Meeting, Task
    from apps.business.document_models import Document
    from apps.agile.models import Issue, Project, Sprint
except Exception:  # pragma: no cover - optional in some test environments
    Goal = None
    Meeting = None
    Task = None
    Document = None
    Issue = None
    Project = None
    Sprint = None


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
}


def _iso(value):
    return value.isoformat() if value else None


def _truncate(text, limit=220):
    text = (text or '').strip()
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


class EnhancedSearchEngine:
    def search(self, query, organization_id, filters=None, limit=10):
        filters = filters or {}
        date_from = _parse_iso(filters.get('date_from'))
        date_to = _parse_iso(filters.get('date_to'))
        requested_types = _requested_types(filters)
        allowed_types = requested_types or {
            item_type for item_type, config in TYPE_CONFIG.items() if config['model'] is not None
        }

        results = {
            'conversations': [],
            'decisions': [],
            'goals': [],
            'tasks': [],
            'meetings': [],
            'documents': [],
            'projects': [],
            'sprints': [],
            'issues': [],
        }

        for item_type, config in TYPE_CONFIG.items():
            model = config['model']
            if model is None or item_type not in allowed_types:
                continue

            filters_q = Q(**{config['org_filter']: organization_id})
            if query:
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

            if filters.get('status'):
                status_query = str(filters['status']).strip()
                if item_type == 'conversation':
                    filters_q &= Q(status_label=status_query)
                elif item_type in {'decision', 'goal', 'task'}:
                    filters_q &= Q(status=status_query)

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

        for item_type in ['decision', 'goal', 'task', 'meeting', 'document', 'project', 'sprint', 'issue']:
            config = TYPE_CONFIG.get(item_type)
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
