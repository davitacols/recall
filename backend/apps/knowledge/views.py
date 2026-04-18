from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q, Count
from django.utils import timezone
from datetime import timedelta
from pathlib import Path
import json
from .models import KnowledgeEntry
from .deep_learning import DeepKnowledgeTrainer
from .search_engine import get_search_engine
from apps.conversations.models import Bookmark, Conversation, ConversationReply
from apps.decisions.models import Decision
from apps.organizations.auditlog_models import AuditLog
from apps.organizations.models import SearchAnalytics
from apps.users.auth_utils import check_rate_limit

try:
    from apps.business.models import Goal, Meeting, Task
    from apps.business.document_models import Document
except Exception:  # pragma: no cover - optional in some test environments
    Goal = None
    Meeting = None
    Task = None
    Document = None

try:
    from apps.agile.models import Issue
except Exception:  # pragma: no cover - optional in some test environments
    Issue = None


def _humanize_token(value):
    if not value:
        return 'Unspecified'
    return str(value).replace('_', ' ').replace('-', ' ').title()


def _display_user_name(user):
    if not user:
        return 'Team member'
    return user.get_full_name() or getattr(user, 'full_name', '') or getattr(user, 'username', '') or 'Team member'


def _truncate_text(value, limit=180):
    text = (value or '').strip()
    if not text:
        return ''
    if len(text) <= limit:
        return text
    return f"{text[: limit - 1].rstrip()}…"


def _briefing_priority_rank(value):
    order = {
        'critical': 0,
        'urgent': 1,
        'highest': 1,
        'high': 2,
        'medium': 3,
        'low': 4,
        'lowest': 5,
    }
    return order.get(str(value or '').lower(), 5)


def _briefing_sort_key(item):
    timestamp = item.get('_sort_timestamp') or timezone.now()
    return (
        _briefing_priority_rank(item.get('priority')),
        -timestamp.timestamp(),
    )


def _build_briefing_item(
    *,
    key,
    kind,
    title,
    summary,
    why_it_matters,
    source_type,
    source_id,
    source_url,
    timestamp,
    priority='medium',
    suggested_action=None,
    suggested_action_url=None,
    citations=None,
):
    return {
        'id': key,
        'kind': kind,
        'title': title,
        'summary': _truncate_text(summary, 180),
        'why_it_matters': _truncate_text(why_it_matters, 170),
        'source_type': source_type,
        'source_id': source_id,
        'source_url': source_url,
        'timestamp': timestamp,
        'priority': priority,
        'priority_label': _humanize_token(priority),
        'suggested_action': suggested_action or 'Open record',
        'suggested_action_url': suggested_action_url or source_url,
        'citations': citations or [],
        '_sort_timestamp': timestamp,
    }


def _compute_memory_gaps(org):
    recent_conversations = Conversation.objects.filter(
        organization=org,
        ai_processed=True,
        created_at__gte=timezone.now() - timedelta(days=90)
    )
    keyword_counts = {}
    for conv in recent_conversations:
        for keyword in conv.ai_keywords:
            keyword_counts[keyword] = keyword_counts.get(keyword, 0) + 1

    decisions = Decision.objects.filter(organization=org, status='approved')
    decision_keywords = set()
    for dec in decisions:
        decision_keywords.add(dec.title.lower())
        for word in dec.title.lower().split():
            if len(word) > 4:
                decision_keywords.add(word)

    gaps = []
    for keyword, count in keyword_counts.items():
        if count < 3 or keyword.lower() in decision_keywords:
            continue
        has_decision = Decision.objects.filter(
            organization=org,
            status='approved',
            title__icontains=keyword
        ).exists()
        if not has_decision:
            gaps.append({
                'topic': keyword,
                'discussion_count': count,
                'message': f'No clear decision recorded for "{keyword}"'
            })
    gaps.sort(key=lambda x: x['discussion_count'], reverse=True)
    return gaps[:10]


def _compute_forgotten_knowledge(org):
    ninety_days_ago = timezone.now() - timedelta(days=90)
    old_decisions = Decision.objects.filter(
        organization=org,
        status__in=['approved', 'implemented'],
        decided_at__lt=ninety_days_ago
    )
    forgotten = []
    for decision in old_decisions:
        recent_mentions = Conversation.objects.filter(
            organization=org,
            created_at__gte=ninety_days_ago,
            content__icontains=decision.title[:30]
        ).count()
        if recent_mentions == 0:
            days_old = (timezone.now() - decision.decided_at).days
            forgotten.append({
                'id': decision.id,
                'title': decision.title,
                'decided_at': decision.decided_at,
                'days_old': days_old,
                'impact_level': decision.impact_level,
                'message': f'Not referenced in {days_old} days'
            })
    forgotten.sort(key=lambda x: x['days_old'], reverse=True)
    return forgotten[:10]


def _compute_faq(org):
    questions = Conversation.objects.filter(
        organization=org,
        post_type='question',
        status_label__in=['resolved', 'good_example'],
        reply_count__gte=1
    ).order_by('-reply_count', '-created_at')[:20]

    faq_items = []
    for q in questions:
        replies = q.replies.all().order_by('created_at')
        answer = replies.first().content if replies.exists() else None
        if answer:
            faq_items.append({
                'id': q.id,
                'question': q.title,
                'answer': answer[:300],
                'full_answer': answer,
                'reply_count': q.reply_count,
                'view_count': q.view_count,
                'created_at': q.created_at,
                'keywords': q.ai_keywords
            })
    return faq_items

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def search_knowledge(request):
    """Search knowledge base"""
    if not check_rate_limit(f"knowledge_search:{request.user.id}", limit=180, window=3600):
        return Response({'error': 'Too many requests'}, status=status.HTTP_429_TOO_MANY_REQUESTS)

    query = request.data.get('query', '').strip()
    filters = request.data.get('filters', {})
    
    if not query:
        return Response({'error': 'Query required'}, 
                       status=status.HTTP_400_BAD_REQUEST)
    if len(query) > 200:
        return Response({'error': 'Query too long'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Use search engine
    search_engine = get_search_engine()
    results = search_engine.search(query, request.user.organization_id, filters, limit=20)

    result_total = results.get('total', 0)
    counts = {
        bucket: len(items)
        for bucket, items in results.items()
        if isinstance(items, list)
    }
    try:
        SearchAnalytics.objects.create(
            user=request.user,
            organization=request.user.organization,
            query=query[:255],
            results_count=result_total,
        )
    except Exception:
        pass

    return Response({
        'query': query,
        'filters': filters,
        'results': results,
        'total': result_total,
        'counts': counts,
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def enhanced_search(request):
    if not check_rate_limit(f"enhanced_search:{request.user.id}", limit=180, window=3600):
        return Response({'error': 'Too many requests'}, status=status.HTTP_429_TOO_MANY_REQUESTS)

    query = request.data.get('query', '').strip()
    filters = request.data.get('filters', {})
    
    if not query:
        return Response({'error': 'Query required'}, 
                       status=status.HTTP_400_BAD_REQUEST)
    if len(query) > 200:
        return Response({'error': 'Query too long'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Use enhanced search engine
    search_engine = get_search_engine()
    results = search_engine.search(query, request.user.organization_id, filters, limit=20)
    
    return Response({
        'query': query,
        'filters': filters,
        'results': results,
        'total': results.get('total', 0)
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_suggestions(request):
    query = request.GET.get('q', '').strip()
    
    if not query or len(query) < 2:
        return Response({'suggestions': []})
    
    search_engine = get_search_engine()
    suggestions = search_engine.get_suggestions(query, request.user.organization_id)
    
    return Response({'suggestions': suggestions})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def recent_decisions(request):
    decisions = Decision.objects.filter(
        organization=request.user.organization,
        status='approved'
    ).order_by('-decided_at')[:10]
    
    decisions_data = []
    for decision in decisions:
        decisions_data.append({
            'id': decision.id,
            'title': decision.title,
            'impact_level': decision.impact_level,
            'decided_at': decision.decided_at,
            'decision_maker': decision.decision_maker.get_full_name() if decision.decision_maker else None
        })
    
    return Response(decisions_data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def personal_briefing(request):
    org = request.user.organization
    user = request.user

    assigned_tasks = []
    if Task:
        task_queryset = (
            Task.objects.filter(organization=org, assigned_to=user)
            .select_related('goal', 'decision', 'conversation')
            .order_by('due_date', '-created_at')[:6]
        )
        assigned_tasks = [
            {
                'id': task.id,
                'title': task.title,
                'status': task.status,
                'priority': task.priority,
                'due_date': task.due_date,
                'goal_title': task.goal.title if task.goal else None,
                'decision_title': task.decision.title if task.decision else None,
                'conversation_title': task.conversation.title if task.conversation else None,
            }
            for task in task_queryset
        ]

    bookmarks = (
        Bookmark.objects.filter(user=user)
        .select_related('conversation')
        .order_by('-created_at')[:5]
    )
    bookmarked_conversations = [
        {
            'id': bookmark.id,
            'note': bookmark.note,
            'created_at': bookmark.created_at,
            'conversation_id': bookmark.conversation_id,
            'conversation_title': bookmark.conversation.title if bookmark.conversation else None,
            'conversation_type': bookmark.conversation.post_type if bookmark.conversation else None,
            'conversation_status': bookmark.conversation.status_label if bookmark.conversation else None,
        }
        for bookmark in bookmarks
    ]

    relevant_decisions = [
        {
            'id': decision.id,
            'title': decision.title,
            'status': decision.status,
            'impact_level': decision.impact_level,
            'conversation_title': decision.conversation.title if decision.conversation else None,
            'decision_maker_name': decision.decision_maker.get_full_name() if decision.decision_maker else None,
            'created_at': decision.created_at,
        }
        for decision in Decision.objects.filter(organization=org)
        .filter(
            Q(decision_maker=user)
            | Q(stakeholders=user)
            | Q(conversation__author=user)
            | Q(conversation__replies__author=user)
        )
        .select_related('conversation', 'decision_maker')
        .distinct()
        .order_by('-created_at')[:5]
    ]

    watched_issues = []
    if Issue:
        watched_queryset = (
            Issue.objects.filter(organization=org, watchers=user)
            .select_related('project', 'assignee', 'sprint')
            .order_by('-updated_at', '-created_at')[:5]
        )
        watched_issues = [
            {
                'id': issue.id,
                'key': issue.key,
                'title': issue.title,
                'status': issue.status,
                'priority': issue.priority,
                'project_name': issue.project.name if issue.project else None,
                'sprint_name': issue.sprint.name if issue.sprint else None,
                'assignee_name': issue.assignee.get_full_name() if issue.assignee else None,
                'updated_at': issue.updated_at,
            }
            for issue in watched_queryset
        ]

    recent_conversations_queryset = (
        Conversation.objects.filter(organization=org)
        .filter(Q(author=user) | Q(replies__author=user) | Q(mentioned_users=user))
        .distinct()
        .order_by('-updated_at', '-created_at')[:5]
    )
    recent_conversations = [
        {
            'id': conversation.id,
            'title': conversation.title,
            'post_type': conversation.post_type,
            'status_label': conversation.status_label,
            'created_at': conversation.created_at,
        }
        for conversation in recent_conversations_queryset
    ]

    recent_ask_recall_queries = [
        {
            'id': log.id,
            'query': str((log.details or {}).get('query') or '').strip(),
            'answer_preview': str((log.details or {}).get('answer_preview') or '').strip(),
            'response_mode': str((log.details or {}).get('response_mode') or '').strip(),
            'confidence_band': str((log.details or {}).get('confidence_band') or '').strip(),
            'evidence_count': int((log.details or {}).get('evidence_count') or 0),
            'coverage_score': float((log.details or {}).get('coverage_score') or 0),
            'created_at': log.created_at,
        }
        for log in AuditLog.objects.filter(
            organization=org,
            user=user,
            resource_type='agi_copilot_query',
        ).order_by('-created_at')[:5]
        if str((log.details or {}).get('query') or '').strip()
    ]

    assigned_open = len([task for task in assigned_tasks if task.get('status') != 'done'])

    return Response({
        'assigned_tasks': assigned_tasks,
        'bookmarked_conversations': bookmarked_conversations,
        'relevant_decisions': relevant_decisions,
        'watched_issues': watched_issues,
        'recent_conversations': recent_conversations,
        'recent_ask_recall_queries': recent_ask_recall_queries,
        'counts': {
            'assigned_tasks': len(assigned_tasks),
            'assigned_open_tasks': assigned_open,
            'bookmarked_conversations': len(bookmarked_conversations),
            'relevant_decisions': len(relevant_decisions),
            'watched_issues': len(watched_issues),
            'recent_conversations': len(recent_conversations),
            'recent_ask_recall_queries': len(recent_ask_recall_queries),
        },
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def workspace_briefing(request):
    org = request.user.organization
    user = request.user
    role = user.role or 'contributor'
    now = timezone.now()

    conversations = list(
        Conversation.objects.filter(organization=org)
        .select_related('author')
        .order_by('-updated_at')[:4]
    )
    decisions = list(
        Decision.objects.filter(organization=org)
        .select_related('conversation', 'decision_maker')
        .order_by('-created_at')[:4]
    )
    documents = []
    if Document:
        documents = list(
            Document.objects.filter(organization=org)
            .select_related('created_by', 'updated_by')
            .order_by('-updated_at')[:3]
        )
    contributor_tasks = []
    if Task:
        contributor_tasks = list(
            Task.objects.filter(organization=org, assigned_to=user)
            .exclude(status='done')
            .select_related('assigned_to', 'goal', 'decision', 'conversation')
            .order_by('due_date', '-updated_at')[:4]
        )
    tasks = contributor_tasks
    if Task and not tasks:
        tasks = list(
            Task.objects.filter(organization=org)
            .exclude(status='done')
            .select_related('assigned_to', 'goal', 'decision', 'conversation')
            .order_by('due_date', '-updated_at')[:4]
        )
    contributor_issues = []
    if Issue:
        contributor_issues = list(
            Issue.objects.filter(organization=org)
            .filter(Q(assignee=user) | Q(watchers=user))
            .exclude(status__in=['done', 'cancelled'])
            .select_related('project', 'assignee', 'reporter')
            .distinct()
            .order_by('-updated_at')[:4]
        )
    issues = contributor_issues
    if Issue and not issues:
        issues = list(
            Issue.objects.filter(organization=org)
            .exclude(status__in=['done', 'cancelled'])
            .select_related('project', 'assignee', 'reporter')
            .order_by('-updated_at')[:4]
        )

    contributor_decision_ids = set()
    if role == 'contributor':
        contributor_decision_ids.update(
            task.decision_id for task in contributor_tasks if task.decision_id
        )
        contributor_decision_ids.update(
            decision.id for decision in decisions if decision.decision_maker_id == user.id
        )
        contributor_decision_ids.update(
            decision.id
            for decision in decisions
            if decision.conversation and decision.conversation.author_id == user.id
        )

    what_changed = []
    for conversation in conversations:
        what_changed.append(
            _build_briefing_item(
                key=f'conversation-{conversation.id}',
                kind='conversation',
                title=conversation.title,
                summary=conversation.ai_summary or conversation.content,
                why_it_matters=(
                    f'{conversation.reply_count} replies and a {conversation.get_post_type_display().lower()} thread '
                    f'from {_display_user_name(conversation.author)} can reshape execution quickly.'
                ),
                source_type='conversation',
                source_id=conversation.id,
                source_url=f'/conversations/{conversation.id}',
                timestamp=conversation.updated_at,
                priority=conversation.priority,
                suggested_action='Open thread',
                citations=[
                    {
                        'kind': 'conversation',
                        'id': conversation.id,
                        'title': conversation.title,
                        'url': f'/conversations/{conversation.id}',
                    }
                ],
            )
        )

    for decision in decisions:
        citations = []
        if decision.conversation:
            citations.append(
                {
                    'kind': 'conversation',
                    'id': decision.conversation.id,
                    'title': decision.conversation.title,
                    'url': f'/conversations/{decision.conversation.id}',
                }
            )
        what_changed.append(
            _build_briefing_item(
                key=f'decision-{decision.id}',
                kind='decision',
                title=decision.title,
                summary=decision.plain_language_summary or decision.description or decision.rationale,
                why_it_matters=(
                    f'{_humanize_token(decision.status)} with {_humanize_token(decision.impact_level).lower()} '
                    f'impact under {_display_user_name(decision.decision_maker)}.'
                ),
                source_type='decision',
                source_id=decision.id,
                source_url=f'/decisions/{decision.id}',
                timestamp=decision.created_at,
                priority=decision.impact_level,
                suggested_action='Open decision',
                citations=citations,
            )
        )

    for document in documents:
        what_changed.append(
            _build_briefing_item(
                key=f'document-{document.id}',
                kind='document',
                title=document.title,
                summary=document.description or document.content,
                why_it_matters=(
                    f'Updated by {_display_user_name(document.updated_by or document.created_by)} and ready '
                    'to be folded back into active execution.'
                ),
                source_type='document',
                source_id=document.id,
                source_url=f'/business/documents/{document.id}',
                timestamp=document.updated_at,
                priority='medium',
                suggested_action='Review document',
                citations=[
                    {
                        'kind': 'document',
                        'id': document.id,
                        'title': document.title,
                        'url': f'/business/documents/{document.id}',
                    }
                ],
            )
        )

    for issue in issues:
        what_changed.append(
            _build_briefing_item(
                key=f'issue-{issue.id}',
                kind='issue',
                title=issue.title,
                summary=issue.description or f'{issue.key} moved in {issue.project.name}.',
                why_it_matters=(
                    f'{issue.key} is {_humanize_token(issue.status).lower()} in {issue.project.name} and still '
                    'sits in the delivery lane.'
                ),
                source_type='issue',
                source_id=issue.id,
                source_url=f'/issues/{issue.id}',
                timestamp=issue.updated_at,
                priority=issue.priority,
                suggested_action='Inspect issue',
                citations=[
                    {
                        'kind': 'issue',
                        'id': issue.id,
                        'title': issue.title,
                        'url': f'/issues/{issue.id}',
                    }
                ],
            )
        )

    what_changed.sort(key=lambda item: item.get('_sort_timestamp') or timezone.now(), reverse=True)
    what_changed = what_changed[:6]

    needs_attention = []
    unresolved_decisions = [decision for decision in decisions if decision.status in ['proposed', 'under_review']]
    if role == 'contributor' and contributor_decision_ids:
        contributor_unresolved_decisions = [
            decision for decision in unresolved_decisions if decision.id in contributor_decision_ids
        ]
        if contributor_unresolved_decisions:
            unresolved_decisions = contributor_unresolved_decisions
    for decision in unresolved_decisions:
        attention_reason = (
            'This decision is still unresolved and can leave execution guessing.'
            if role in ['admin', 'manager']
            else 'This decision is still unresolved and may change the work in your lane.'
        )
        needs_attention.append(
            _build_briefing_item(
                key=f'attention-decision-{decision.id}',
                kind='decision',
                title=decision.title,
                summary=decision.description or decision.rationale,
                why_it_matters=attention_reason,
                source_type='decision',
                source_id=decision.id,
                source_url=f'/decisions/{decision.id}',
                timestamp=decision.created_at,
                priority=decision.impact_level,
                suggested_action='Resolve decision path',
                citations=[
                    {
                        'kind': 'decision',
                        'id': decision.id,
                        'title': decision.title,
                        'url': f'/decisions/{decision.id}',
                    }
                ],
            )
        )

    for task in tasks:
        due_context = ''
        if task.due_date:
            due_context = f' Due {task.due_date.isoformat()}.'
        needs_attention.append(
            _build_briefing_item(
                key=f'attention-task-{task.id}',
                kind='task',
                title=task.title,
                summary=task.description or 'Task is still open on the board.',
                why_it_matters=(
                    f'{_humanize_token(task.priority)} priority work is still {_humanize_token(task.status).lower()}'
                    f' for {_display_user_name(task.assigned_to)}.{due_context}'
                ),
                source_type='task',
                source_id=task.id,
                source_url='/business/tasks',
                timestamp=task.updated_at,
                priority=task.priority,
                suggested_action='Move task forward',
                suggested_action_url='/business/tasks',
                citations=[
                    citation
                    for citation in [
                        {
                            'kind': 'decision',
                            'id': task.decision.id,
                            'title': task.decision.title,
                            'url': f'/decisions/{task.decision.id}',
                        } if task.decision else None,
                        {
                            'kind': 'conversation',
                            'id': task.conversation.id,
                            'title': task.conversation.title,
                            'url': f'/conversations/{task.conversation.id}',
                        } if task.conversation else None,
                    ]
                    if citation
                ],
            )
        )

    for issue in issues:
        if issue.priority not in ['high', 'highest'] and issue.status not in ['blocked', 'in_progress']:
            continue
        needs_attention.append(
            _build_briefing_item(
                key=f'attention-issue-{issue.id}',
                kind='issue',
                title=issue.title,
                summary=issue.description or f'{issue.key} still needs movement.',
                why_it_matters=(
                    f'{issue.key} is {_humanize_token(issue.status).lower()} with '
                    f'{_humanize_token(issue.priority).lower()} priority in {issue.project.name}.'
                ),
                source_type='issue',
                source_id=issue.id,
                source_url=f'/issues/{issue.id}',
                timestamp=issue.updated_at,
                priority=issue.priority,
                suggested_action='Unblock issue',
                citations=[
                    {
                        'kind': 'issue',
                        'id': issue.id,
                        'title': issue.title,
                        'url': f'/issues/{issue.id}',
                    }
                ],
            )
        )

    stale_cutoff = now - timedelta(days=3)
    stale_conversations = [
        conversation
        for conversation in conversations
        if conversation.updated_at <= stale_cutoff and conversation.status_label in ['open', 'needs_followup', 'in_progress']
    ]
    for conversation in stale_conversations:
        needs_attention.append(
            _build_briefing_item(
                key=f'attention-stale-conversation-{conversation.id}',
                kind='conversation',
                title=conversation.title,
                summary=conversation.ai_summary or conversation.content,
                why_it_matters='This thread has gone quiet long enough that context may be stalling instead of moving.',
                source_type='conversation',
                source_id=conversation.id,
                source_url=f'/conversations/{conversation.id}',
                timestamp=conversation.updated_at,
                priority=conversation.priority,
                suggested_action='Re-open thread',
            )
        )

    unlinked_documents = [
        document
        for document in documents
        if not any([document.goal_id, document.meeting_id, document.task_id])
    ]
    for document in unlinked_documents:
        needs_attention.append(
            _build_briefing_item(
                key=f'attention-unlinked-document-{document.id}',
                kind='document',
                title=document.title,
                summary=document.description or document.content,
                why_it_matters='This document is recent but not linked to an active goal, meeting, or task yet.',
                source_type='document',
                source_id=document.id,
                source_url=f'/business/documents/{document.id}',
                timestamp=document.updated_at,
                priority='medium',
                suggested_action='Link document to work',
            )
        )

    followup_conversations = [
        conversation
        for conversation in conversations
        if conversation.status_label == 'needs_followup' or conversation.priority in ['high', 'urgent']
    ]
    for conversation in followup_conversations:
        needs_attention.append(
            _build_briefing_item(
                key=f'attention-conversation-{conversation.id}',
                kind='conversation',
                title=conversation.title,
                summary=conversation.ai_summary or conversation.content,
                why_it_matters='This thread still needs a follow-up response before it quietly stalls.',
                source_type='conversation',
                source_id=conversation.id,
                source_url=f'/conversations/{conversation.id}',
                timestamp=conversation.updated_at,
                priority=conversation.priority,
                suggested_action='Reply or route thread',
                citations=[
                    {
                        'kind': 'conversation',
                        'id': conversation.id,
                        'title': conversation.title,
                        'url': f'/conversations/{conversation.id}',
                    }
                ],
            )
        )

    needs_attention.sort(key=_briefing_sort_key)
    needs_attention = needs_attention[:6]

    suggested_next_moves = []
    seen_actions = set()

    def add_action(item):
        key = (item.get('kind'), item.get('source_id'))
        if key in seen_actions:
            return
        seen_actions.add(key)
        suggested_next_moves.append(item)

    if unresolved_decisions:
        decision = unresolved_decisions[0]
        add_action(
            _build_briefing_item(
                key=f'action-decision-{decision.id}',
                kind='decision',
                title=decision.title,
                summary=decision.description or decision.rationale,
                why_it_matters='Locking this decision reduces ambiguity for the team immediately.',
                source_type='decision',
                source_id=decision.id,
                source_url=f'/decisions/{decision.id}',
                timestamp=decision.created_at,
                priority=decision.impact_level if role in ['admin', 'manager'] else 'medium',
                suggested_action='Review and resolve decision',
                citations=[
                    {
                        'kind': 'decision',
                        'id': decision.id,
                        'title': decision.title,
                        'url': f'/decisions/{decision.id}',
                    }
                ],
            )
        )

    if tasks:
        task = tasks[0]
        add_action(
            _build_briefing_item(
                key=f'action-task-{task.id}',
                kind='task',
                title=task.title,
                summary=task.description or 'Open task still waiting on movement.',
                why_it_matters='Advancing this task is the fastest route to visible execution movement.',
                source_type='task',
                source_id=task.id,
                source_url='/business/tasks',
                timestamp=task.updated_at,
                priority='critical' if role == 'contributor' else task.priority,
                suggested_action='Open task board',
                suggested_action_url='/business/tasks',
            )
        )

    if issues:
        issue = issues[0]
        add_action(
            _build_briefing_item(
                key=f'action-issue-{issue.id}',
                kind='issue',
                title=issue.title,
                summary=issue.description or f'{issue.key} is still moving through delivery.',
                why_it_matters='This issue is the cleanest operational door back into the current delivery lane.',
                source_type='issue',
                source_id=issue.id,
                source_url=f'/issues/{issue.id}',
                timestamp=issue.updated_at,
                priority='high' if role == 'contributor' else issue.priority,
                suggested_action='Open issue detail',
            )
        )

    if conversations:
        conversation = conversations[0]
        add_action(
            _build_briefing_item(
                key=f'action-conversation-{conversation.id}',
                kind='conversation',
                title=conversation.title,
                summary=conversation.ai_summary or conversation.content,
                why_it_matters='The freshest thread usually carries the newest context before it reaches every other surface.',
                source_type='conversation',
                source_id=conversation.id,
                source_url=f'/conversations/{conversation.id}',
                timestamp=conversation.updated_at,
                priority=conversation.priority,
                suggested_action='Open thread',
            )
        )

    if documents:
        document = documents[0]
        add_action(
            _build_briefing_item(
                key=f'action-document-{document.id}',
                kind='document',
                title=document.title,
                summary=document.description or document.content,
                why_it_matters='Fresh documentation usually means scope, context, or policy has shifted.',
                source_type='document',
                source_id=document.id,
                source_url=f'/business/documents/{document.id}',
                timestamp=document.updated_at,
                priority='medium',
                suggested_action='Read latest document',
            )
        )

    suggested_next_moves.sort(key=_briefing_sort_key)
    suggested_next_moves = suggested_next_moves[:4]

    if role in ['admin', 'manager']:
        headline = (
            f'{len(what_changed)} fresh signals are live across {org.name}, with '
            f'{len(needs_attention)} items asking for owner attention.'
        )
        scan_note = 'Use this briefing to scan change, pressure, and the shortest next move before dropping into the boards.'
    else:
        headline = (
            f'{len(what_changed)} fresh workspace signals are live, with '
            f'{len(needs_attention)} items most likely to affect your lane.'
        )
        scan_note = 'Start with the pressure points, then take the next move that keeps work grounded instead of scattered.'

    if not any([what_changed, needs_attention, suggested_next_moves]):
        headline = 'The workspace is quiet right now, so there is no fresh briefing to surface.'
        scan_note = 'Come back after new work, updates, or decisions land in the workspace.'

    payload = {
        'generated_at': timezone.now(),
        'scope': 'workspace',
        'role': role,
        'summary': {
            'headline': headline,
            'scan_note': scan_note,
            'changed_count': len(what_changed),
            'attention_count': len(needs_attention),
            'action_count': len(suggested_next_moves),
        },
        'what_changed': what_changed,
        'needs_attention': needs_attention,
        'suggested_next_moves': suggested_next_moves,
    }

    for lane in ['what_changed', 'needs_attention', 'suggested_next_moves']:
        for item in payload[lane]:
            item.pop('_sort_timestamp', None)

    return Response(payload)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def trending_topics(request):
    org = request.user.organization
    
    # Get most discussed keywords from recent conversations
    recent_conversations = Conversation.objects.filter(
        organization=org,
        ai_processed=True,
        created_at__gte=timezone.now() - timedelta(days=30)
    )
    
    keyword_counts = {}
    for conv in recent_conversations:
        for keyword in conv.ai_keywords:
            keyword_counts[keyword] = keyword_counts.get(keyword, 0) + 1
    
    # Sort by frequency and return top 10
    trending = sorted(keyword_counts.items(), key=lambda x: x[1], reverse=True)[:10]
    
    return Response([
        {'topic': topic, 'count': count} 
        for topic, count in trending
    ])

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def knowledge_stats(request):
    org = request.user.organization
    
    week_ago = timezone.now() - timedelta(days=7)
    type_counts = {
        'conversations': Conversation.objects.filter(organization=org).count(),
        'decisions': Decision.objects.filter(organization=org).count(),
        'goals': Goal.objects.filter(organization=org).count() if Goal is not None else 0,
        'tasks': Task.objects.filter(organization=org).count() if Task is not None else 0,
        'meetings': Meeting.objects.filter(organization=org).count() if Meeting is not None else 0,
        'documents': Document.objects.filter(organization=org).count() if Document is not None else 0,
    }
    week_counts = {
        'conversations': Conversation.objects.filter(organization=org, created_at__gte=week_ago).count(),
        'decisions': Decision.objects.filter(organization=org, created_at__gte=week_ago).count(),
        'goals': Goal.objects.filter(organization=org, created_at__gte=week_ago).count() if Goal is not None else 0,
        'tasks': Task.objects.filter(organization=org, created_at__gte=week_ago).count() if Task is not None else 0,
        'meetings': Meeting.objects.filter(organization=org, created_at__gte=week_ago).count() if Meeting is not None else 0,
        'documents': Document.objects.filter(organization=org, created_at__gte=week_ago).count() if Document is not None else 0,
    }

    stats = {
        'total_items': sum(type_counts.values()),
        'this_week': sum(week_counts.values()),
        'total_searches': SearchAnalytics.objects.filter(organization=org).count(),
        'type_counts': type_counts,
        'this_week_by_type': week_counts,
    }
    
    return Response(stats)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def memory_score(request):
    """Calculate organization memory score"""
    org = request.user.organization
    
    # Calculate metrics
    total_conversations = Conversation.objects.filter(organization=org).count()
    ai_processed = Conversation.objects.filter(organization=org, ai_processed=True).count()
    total_decisions = Decision.objects.filter(organization=org).count()
    approved_decisions = Decision.objects.filter(organization=org, status='approved').count()
    implemented_decisions = Decision.objects.filter(organization=org, status='implemented').count()
    
    week_ago = timezone.now() - timedelta(days=7)
    recent_activity = Conversation.objects.filter(organization=org, created_at__gte=week_ago).count()
    
    # Calculate scores (0-100)
    decision_clarity = (approved_decisions / total_decisions * 100) if total_decisions > 0 else 0
    ai_coverage = (ai_processed / total_conversations * 100) if total_conversations > 0 else 0
    implementation_rate = (implemented_decisions / approved_decisions * 100) if approved_decisions > 0 else 0
    activity_score = min(recent_activity * 10, 100)  # 10 items per week = 100%
    
    # Overall score (weighted average)
    overall_score = (
        decision_clarity * 0.3 +
        ai_coverage * 0.25 +
        implementation_rate * 0.25 +
        activity_score * 0.2
    )
    
    # Determine grade
    if overall_score >= 90:
        grade = 'Excellent'
        color = 'green'
    elif overall_score >= 75:
        grade = 'Good'
        color = 'blue'
    elif overall_score >= 60:
        grade = 'Fair'
        color = 'yellow'
    else:
        grade = 'Needs Improvement'
        color = 'red'
    
    # Risk assessment
    if total_conversations < 10:
        risk = 'High'
    elif ai_processed < total_conversations * 0.5:
        risk = 'Medium'
    else:
        risk = 'Low'
    
    return Response({
        'score': round(overall_score, 1),
        'grade': grade,
        'color': color,
        'metrics': {
            'decision_clarity': round(decision_clarity, 1),
            'ai_coverage': round(ai_coverage, 1),
            'implementation_rate': round(implementation_rate, 1),
            'activity_score': round(activity_score, 1)
        },
        'counts': {
            'total_conversations': total_conversations,
            'ai_processed': ai_processed,
            'total_decisions': total_decisions,
            'approved_decisions': approved_decisions,
            'implemented_decisions': implemented_decisions,
            'recent_activity': recent_activity
        },
        'risk': risk
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def onboarding_package(request):
    """Generate onboarding package for new employees"""
    org = request.user.organization
    
    # Get key decisions
    key_decisions = Decision.objects.filter(
        organization=org,
        status__in=['approved', 'implemented'],
        impact_level__in=['high', 'critical']
    ).order_by('-decided_at')[:10]
    
    # Get good examples
    good_examples = Conversation.objects.filter(
        organization=org,
        status_label='good_example'
    ).order_by('-created_at')[:5]
    
    # Get recent important updates
    recent_updates = Conversation.objects.filter(
        organization=org,
        post_type='update',
        priority__in=['high', 'urgent']
    ).order_by('-created_at')[:5]
    
    # Get trending topics
    recent_conversations = Conversation.objects.filter(
        organization=org,
        ai_processed=True,
        created_at__gte=timezone.now() - timedelta(days=90)
    )
    
    keyword_counts = {}
    for conv in recent_conversations:
        for keyword in conv.ai_keywords:
            keyword_counts[keyword] = keyword_counts.get(keyword, 0) + 1
    
    trending = sorted(keyword_counts.items(), key=lambda x: x[1], reverse=True)[:10]
    
    return Response({
        'key_decisions': [{
            'id': d.id,
            'title': d.title,
            'description': d.description[:200],
            'impact_level': d.impact_level,
            'decided_at': d.decided_at
        } for d in key_decisions],
        'good_examples': [{
            'id': c.id,
            'title': c.title,
            'post_type': c.post_type,
            'summary': c.ai_summary,
            'created_at': c.created_at
        } for c in good_examples],
        'recent_updates': [{
            'id': c.id,
            'title': c.title,
            'content': c.content[:200],
            'created_at': c.created_at
        } for c in recent_updates],
        'trending_topics': [{'topic': t[0], 'count': t[1]} for t in trending],
        'organization_name': org.name
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def before_you_ask(request):
    """Suggest related content before posting a question"""
    query = request.data.get('query', '').strip()
    if not query or len(query) < 10:
        return Response({'suggestions': []})
    
    org = request.user.organization
    
    # Search for similar questions
    similar_questions = Conversation.objects.filter(
        organization=org,
        post_type='question',
        title__icontains=query[:50]
    )[:3]
    
    # Search for related decisions
    related_decisions = Decision.objects.filter(
        organization=org,
        status='approved',
        title__icontains=query[:50]
    )[:3]
    
    # Search in AI summaries
    related_conversations = Conversation.objects.filter(
        organization=org,
        ai_summary__icontains=query[:50]
    ).exclude(post_type='question')[:3]
    
    suggestions = []
    
    for q in similar_questions:
        suggestions.append({
            'id': q.id,
            'type': 'question',
            'title': q.title,
            'summary': q.ai_summary or q.content[:150],
            'reply_count': q.reply_count
        })
    
    for d in related_decisions:
        suggestions.append({
            'id': d.id,
            'type': 'decision',
            'title': d.title,
            'summary': d.description[:150],
            'impact': d.impact_level
        })
    
    for c in related_conversations:
        suggestions.append({
            'id': c.id,
            'type': c.post_type,
            'title': c.title,
            'summary': c.ai_summary or c.content[:150]
        })
    
    return Response({
        'suggestions': suggestions,
        'has_suggestions': len(suggestions) > 0
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def memory_gaps(request):
    """Detect topics with no clear decisions"""
    org = request.user.organization
    
    return Response({'gaps': _compute_memory_gaps(org)})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def faq(request):
    """Generate FAQ from repeated questions"""
    org = request.user.organization
    
    return Response({'faq_items': _compute_faq(org)})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def forgotten_knowledge(request):
    """Detect decisions not referenced in months"""
    org = request.user.organization
    
    return Response({'forgotten': _compute_forgotten_knowledge(org)})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def insights_overview(request):
    """Aggregate advanced knowledge signals for dashboard widgets."""
    org = request.user.organization
    gaps = _compute_memory_gaps(org)
    forgotten = _compute_forgotten_knowledge(org)
    faq_items = _compute_faq(org)
    return Response({
        'summary': {
            'memory_gaps_count': len(gaps),
            'forgotten_count': len(forgotten),
            'faq_count': len(faq_items),
        },
        'memory_gaps': gaps[:5],
        'forgotten': forgotten[:5],
        'faq': faq_items[:5],
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def train_deep_model(request):
    """Train a deep organization-wide model for context and user experience."""
    if request.user.role not in ['admin', 'manager']:
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    epochs = int(request.data.get('epochs', 3))
    max_samples = int(request.data.get('max_samples', 600))
    epochs = min(max(1, epochs), 10)
    max_samples = min(max(100, max_samples), 5000)

    trainer = DeepKnowledgeTrainer(request.user.organization)
    try:
        payload = trainer.train(epochs=epochs, max_samples=max_samples)
    except Exception as exc:
        return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    return Response({
        'message': 'Organization-wide deep learning knowledge model training completed.',
        'training': payload,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def org_context_profile(request):
    """Return latest organization context profile produced by training."""
    profile_path = Path("backend/model_artifacts/knowledge") / f"org_context_profile_org_{request.user.organization.id}.json"
    if not profile_path.exists():
        return Response(
            {'error': 'Organization context profile not found. Run deep model training first.'},
            status=status.HTTP_404_NOT_FOUND
        )
    try:
        payload = json.loads(profile_path.read_text(encoding='utf-8'))
    except Exception:
        return Response({'error': 'Failed to load organization context profile.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    return Response(payload)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def personalized_suggestions(request):
    """Personalized reading suggestions based on role and activity"""
    if not request.user or not request.user.is_authenticated:
        return Response({'suggestions': []})
    
    org = request.user.organization
    user_role = request.user.role
    
    suggestions = []
    
    # Get unread high-priority conversations
    recent_important = Conversation.objects.filter(
        organization=org,
        priority__in=['high', 'urgent'],
        created_at__gte=timezone.now() - timedelta(days=7)
    ).exclude(author=request.user).order_by('-created_at')[:5]
    
    for conv in recent_important:
        suggestions.append({
            'id': conv.id,
            'type': 'conversation',
            'title': conv.title,
            'reason': f'High priority {conv.post_type}',
            'priority': conv.priority,
            'created_at': conv.created_at
        })
    
    # Get recent decisions for managers/admins
    if user_role in ['admin', 'manager']:
        recent_decisions = Decision.objects.filter(
            organization=org,
            status='approved',
            decided_at__gte=timezone.now() - timedelta(days=7)
        ).order_by('-decided_at')[:3]
        
        for dec in recent_decisions:
            suggestions.append({
                'id': dec.id,
                'type': 'decision',
                'title': dec.title,
                'reason': 'Recent decision',
                'impact': dec.impact_level,
                'decided_at': dec.decided_at
            })
    
    # Get conversations in user's topics of interest (based on past activity)
    user_conversations = Conversation.objects.filter(
        organization=org,
        author=request.user,
        ai_processed=True
    ).order_by('-created_at')[:10]
    
    user_keywords = set()
    for conv in user_conversations:
        user_keywords.update(conv.ai_keywords[:3])
    
    if user_keywords:
        related = Conversation.objects.filter(
            organization=org,
            ai_processed=True,
            created_at__gte=timezone.now() - timedelta(days=14)
        ).exclude(author=request.user)
        
        for conv in related[:10]:
            if any(kw in conv.ai_keywords for kw in user_keywords):
                suggestions.append({
                    'id': conv.id,
                    'type': 'conversation',
                    'title': conv.title,
                    'reason': 'Related to your interests',
                    'keywords': conv.ai_keywords[:3],
                    'created_at': conv.created_at
                })
                if len(suggestions) >= 15:
                    break
    
    # Sort by created_at/decided_at
    suggestions.sort(key=lambda x: x.get('created_at') or x.get('decided_at'), reverse=True)
    
    return Response({'suggestions': suggestions[:10]})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def time_comparison(request):
    """Compare what changed between two time periods"""
    if not request.user or not request.user.is_authenticated:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    org = request.user.organization
    period = request.data.get('period', 'quarter')  # quarter, year, month
    
    from apps.decisions.models import Decision
    
    # Calculate time ranges
    now = timezone.now()
    if period == 'quarter':
        days = 90
        label = 'last quarter'
    elif period == 'year':
        days = 365
        label = 'last year'
    else:  # month
        days = 30
        label = 'last month'
    
    period_start = now - timedelta(days=days)
    previous_start = period_start - timedelta(days=days)
    
    # Current period stats
    current_conversations = Conversation.objects.filter(
        organization=org,
        created_at__gte=period_start
    ).count()
    
    current_decisions = Decision.objects.filter(
        organization=org,
        decided_at__gte=period_start
    ).count()
    
    # Previous period stats
    previous_conversations = Conversation.objects.filter(
        organization=org,
        created_at__gte=previous_start,
        created_at__lt=period_start
    ).count()
    
    previous_decisions = Decision.objects.filter(
        organization=org,
        decided_at__gte=previous_start,
        decided_at__lt=period_start
    ).count()
    
    # Key changes
    new_decisions = Decision.objects.filter(
        organization=org,
        decided_at__gte=period_start,
        status__in=['approved', 'implemented']
    ).order_by('-decided_at')[:10]
    
    # Trending topics comparison
    current_convs = Conversation.objects.filter(
        organization=org,
        ai_processed=True,
        created_at__gte=period_start
    )
    
    current_keywords = {}
    for conv in current_convs:
        for kw in conv.ai_keywords:
            current_keywords[kw] = current_keywords.get(kw, 0) + 1
    
    top_current = sorted(current_keywords.items(), key=lambda x: x[1], reverse=True)[:5]
    
    return Response({
        'period': label,
        'comparison': {
            'conversations': {
                'current': current_conversations,
                'previous': previous_conversations,
                'change': current_conversations - previous_conversations
            },
            'decisions': {
                'current': current_decisions,
                'previous': previous_decisions,
                'change': current_decisions - previous_decisions
            }
        },
        'key_decisions': [{
            'id': d.id,
            'title': d.title,
            'decided_at': d.decided_at,
            'impact_level': d.impact_level
        } for d in new_decisions],
        'trending_topics': [{'topic': t[0], 'count': t[1]} for t in top_current]
    })

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def cultural_memory(request):
    """Manage cultural memories"""
    from apps.conversations.models import CulturalMemory
    
    if request.method == 'GET':
        org = request.user.organization
        
        memories = CulturalMemory.objects.filter(organization=org).order_by('-year')[:50]
        return Response({
            'memories': [{
                'id': m.id,
                'title': m.title,
                'story': m.story,
                'year': m.year,
                'category': m.category,
                'created_by': m.created_by.get_full_name(),
                'created_at': m.created_at
            } for m in memories]
        })
    
    elif request.method == 'POST':
        memory = CulturalMemory.objects.create(
            organization=request.user.organization,
            title=request.data['title'],
            story=request.data['story'],
            year=request.data['year'],
            category=request.data.get('category', 'general'),
            created_by=request.user
        )
        return Response({'id': memory.id, 'message': 'Memory created'}, status=status.HTTP_201_CREATED)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def legacy_content(request):
    """Get archived/historical content"""
    org = request.user.organization
    
    # Get old archived conversations
    old_conversations = Conversation.objects.filter(
        organization=org,
        is_archived=True
    ).order_by('-created_at')[:20]
    
    # Get old implemented decisions
    old_decisions = Decision.objects.filter(
        organization=org,
        status='implemented',
        implemented_at__lt=timezone.now() - timedelta(days=365)
    ).order_by('-implemented_at')[:20]
    
    legacy = []
    for conv in old_conversations:
        legacy.append({
            'id': conv.id,
            'type': 'conversation',
            'title': conv.title,
            'date': conv.created_at,
            'author': conv.author.get_full_name()
        })
    
    for dec in old_decisions:
        legacy.append({
            'id': dec.id,
            'type': 'decision',
            'title': dec.title,
            'date': dec.implemented_at,
            'author': dec.decision_maker.get_full_name() if dec.decision_maker else None
        })
    
    legacy.sort(key=lambda x: x['date'], reverse=True)
    return Response({'legacy': legacy[:30]})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def personal_reflection(request):
    """Get personal activity summary"""
    if not request.user or not request.user.is_authenticated:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    # User's contributions
    my_conversations = Conversation.objects.filter(
        author=request.user,
        created_at__gte=timezone.now() - timedelta(days=90)
    ).count()
    
    my_replies = ConversationReply.objects.filter(
        author=request.user,
        created_at__gte=timezone.now() - timedelta(days=90)
    ).count()
    
    my_decisions = Decision.objects.filter(
        decision_maker=request.user,
        created_at__gte=timezone.now() - timedelta(days=90)
    ).count()
    
    # Most discussed topics
    my_convs = Conversation.objects.filter(
        author=request.user,
        ai_processed=True
    ).order_by('-created_at')[:20]
    
    my_topics = {}
    for conv in my_convs:
        for kw in conv.ai_keywords:
            my_topics[kw] = my_topics.get(kw, 0) + 1
    
    top_topics = sorted(my_topics.items(), key=lambda x: x[1], reverse=True)[:5]
    
    return Response({
        'period': 'Last 90 days',
        'contributions': {
            'conversations': my_conversations,
            'replies': my_replies,
            'decisions': my_decisions,
            'total': my_conversations + my_replies + my_decisions
        },
        'top_topics': [{'topic': t[0], 'count': t[1]} for t in top_topics],
        'message': f'You\'ve been active in {my_conversations + my_replies} discussions'
    })
