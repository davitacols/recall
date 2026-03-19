from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.contrib.contenttypes.models import ContentType
from django.core.cache import cache
from django.core.paginator import Paginator
from django.db.models import Q
from apps.users.auth_utils import check_rate_limit
from apps.knowledge.context_engine import ContextEngine
from apps.knowledge.unified_models import ContentLink, UnifiedActivity

def _context_cache_key(content_type_name, object_id, organization_id):
    return f'context_{content_type_name}_{object_id}_{organization_id}'


def _invalidate_context_cache(organization_id, content_type_name, object_id):
    cache.delete(_context_cache_key(content_type_name, object_id, organization_id))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_context_panel(request, content_type_name, object_id):
    """Get unified context for any content object with caching"""
    # Check cache first
    cache_key = _context_cache_key(content_type_name, object_id, request.user.organization.id)
    cached_data = cache.get(cache_key)
    if cached_data:
        return Response(cached_data)
    
    try:
        # Get content type
        app_label, model = content_type_name.split('.')
        content_type = ContentType.objects.get(app_label=app_label, model=model)
        model_class = content_type.model_class()
        
        # Get object
        content_object = model_class.objects.get(
            id=object_id,
            organization=request.user.organization
        )
        
        # Get context
        context = ContextEngine.get_context(content_object, request.user.organization)
        
        similar_items = context.similar_past_items or []
        reviewed = [item for item in similar_items if item.get('was_successful') is not None]
        successful = [item for item in reviewed if item.get('was_successful') is True]
        failed = [item for item in reviewed if item.get('was_successful') is False]
        failure_rate = (len(failed) / len(reviewed) * 100) if reviewed else None

        result = {
            'related_conversations': context.related_conversations,
            'related_decisions': context.related_decisions,
            'related_tasks': context.related_tasks,
            'related_documents': context.related_documents,
            'expert_users': context.expert_users,
            'similar_past_items': similar_items,
            'success_rate': context.success_rate,
            'risk_indicators': context.risk_indicators,
            'outcome_patterns': {
                'reviewed_count': len(reviewed),
                'successful_count': len(successful),
                'failed_count': len(failed),
                'failure_rate': round(failure_rate, 1) if failure_rate is not None else None,
            },
        }
        
        # Cache for 1 hour
        cache.set(cache_key, result, 3600)
        
        return Response(result)
    except Exception as e:
        return Response({'error': str(e)}, status=400)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_link(request):
    """Create a link between two content objects"""
    try:
        source_type = request.data.get('source_type')  # e.g., 'conversations.conversation'
        source_id = request.data.get('source_id')
        target_type = request.data.get('target_type')
        target_id = request.data.get('target_id')
        link_type = request.data.get('link_type', 'relates_to')
        if not source_type or not source_id or not target_type or not target_id:
            return Response({'error': 'source_type, source_id, target_type, and target_id are required'}, status=400)
        if source_type == target_type and str(source_id) == str(target_id):
            return Response({'error': 'A record cannot be linked to itself.'}, status=400)
        
        # Get source object
        app_label, model = source_type.split('.')
        source_ct = ContentType.objects.get(app_label=app_label, model=model)
        source_class = source_ct.model_class()
        source_obj = source_class.objects.get(id=source_id, organization=request.user.organization)
        
        # Get target object
        app_label, model = target_type.split('.')
        target_ct = ContentType.objects.get(app_label=app_label, model=model)
        target_class = target_ct.model_class()
        target_obj = target_class.objects.get(id=target_id, organization=request.user.organization)
        
        # Create link
        link, created = ContentLink.objects.get_or_create(
            organization=request.user.organization,
            source_content_type=source_ct,
            source_object_id=source_obj.id,
            target_content_type=target_ct,
            target_object_id=target_obj.id,
            defaults={
                'link_type': link_type,
                'created_by': request.user,
                'is_auto_generated': False,
            }
        )

        if not created:
            updated_fields = []
            if link.link_type != link_type:
                link.link_type = link_type
                updated_fields.append('link_type')
            if link.created_by_id is None:
                link.created_by = request.user
                updated_fields.append('created_by')
            if link.is_auto_generated:
                link.is_auto_generated = False
                updated_fields.append('is_auto_generated')
            if updated_fields:
                link.save(update_fields=updated_fields)

        _invalidate_context_cache(request.user.organization.id, source_type, source_obj.id)
        _invalidate_context_cache(request.user.organization.id, target_type, target_obj.id)
        ContextEngine.compute_context(source_obj, request.user.organization)
        ContextEngine.compute_context(target_obj, request.user.organization)
        
        return Response({
            'id': link.id,
            'link_type': link.link_type,
            'created_at': link.created_at,
            'created': created,
            'message': 'Link created' if created else 'Link updated',
        })
    except Exception as e:
        return Response({'error': str(e)}, status=400)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_unified_timeline(request):
    """Get unified activity timeline with pagination"""
    if not check_rate_limit(f"timeline:{request.user.id}", limit=240, window=3600):
        return Response({'error': 'Too many requests'}, status=429)

    try:
        days = int(request.GET.get('days', 7))
    except (TypeError, ValueError):
        days = 7
    days = max(1, min(days, 90))
    try:
        page = int(request.GET.get('page', 1))
    except (TypeError, ValueError):
        page = 1
    page = max(1, page)
    try:
        per_page = int(request.GET.get('per_page', 20))
    except (TypeError, ValueError):
        per_page = 20
    per_page = max(1, min(per_page, 100))
    user_id = request.GET.get('user_id')
    
    user = None
    if user_id:
        from apps.organizations.models import User
        user = User.objects.get(id=user_id, organization=request.user.organization)
    
    activities = ContextEngine.get_unified_timeline(
        request.user.organization,
        user=user,
        days=days
    )
    
    # Paginate
    paginator = Paginator(activities, per_page)
    page_obj = paginator.get_page(page)
    
    return Response({
        'results': [{
            'id': activity.id,
            'type': activity.activity_type,
            'user': {
                'id': activity.user.id,
                'name': activity.user.get_full_name(),
            },
            'title': activity.title,
            'description': activity.description,
            'content_type': f"{activity.content_type.app_label}.{activity.content_type.model}",
            'object_id': activity.object_id,
            'created_at': activity.created_at,
            'metadata': activity.metadata,
        } for activity in page_obj],
        'pagination': {
            'page': page,
            'per_page': per_page,
            'total': paginator.count,
            'pages': paginator.num_pages,
            'has_next': page_obj.has_next(),
            'has_previous': page_obj.has_previous(),
        }
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_everything(request):
    """Universal search across all modules"""
    if not check_rate_limit(f"search_all:{request.user.id}", limit=240, window=3600):
        return Response({'error': 'Too many requests'}, status=429)

    query = (request.GET.get('q', '') or '').strip()
    if not query:
        return Response({'results': []})
    if len(query) > 200:
        return Response({'error': 'Query too long'}, status=400)
    q_lower = query.lower()
    query_is_numeric = query.isdigit()
    query_id = int(query) if query_is_numeric else None
    
    from apps.conversations.models import Conversation
    from apps.decisions.models import Decision
    from apps.business.models import Task, Meeting
    from apps.business.document_models import Document
    
    results = []
    
    # Search conversations
    conversation_filter = Q(title__icontains=query) | Q(content__icontains=query) | Q(ai_summary__icontains=query)
    if query_is_numeric:
        conversation_filter |= Q(id=query_id)
    conversations = Conversation.objects.filter(
        organization=request.user.organization,
    ).filter(conversation_filter)[:5]
    for conv in conversations:
        results.append({
            'type': 'conversation',
            'id': conv.id,
            'title': conv.title,
            'excerpt': conv.content[:200],
            'url': f'/conversations/{conv.id}',
            'created_at': conv.created_at,
        })
    
    # Search decisions
    decision_qs = Decision.objects.filter(organization=request.user.organization)
    failed_outcome_mode = any(token in q_lower for token in ['failed', 'failure', 'unsuccessful']) and 'decision' in q_lower
    if failed_outcome_mode:
        decision_qs = decision_qs.filter(was_successful=False)
        keyword_tokens = [t for t in q_lower.replace('decisions', 'decision').split() if t not in {'find', 'search', 'failed', 'failure', 'unsuccessful', 'decision', 'decisions', 'outcomes', 'outcome', 'in', 'about', 'with', 'on'}]
        for token in keyword_tokens[:3]:
            decision_qs = decision_qs.filter(Q(title__icontains=token) | Q(description__icontains=token))
    else:
        decision_filter = Q(title__icontains=query) | Q(description__icontains=query)
        if query_is_numeric:
            decision_filter |= Q(id=query_id)
        decision_qs = decision_qs.filter(decision_filter)

    decisions = decision_qs[:5]
    for decision in decisions:
        results.append({
            'type': 'decision',
            'id': decision.id,
            'title': decision.title,
            'excerpt': (decision.description[:170] + '...') if len(decision.description) > 170 else decision.description,
            'url': f'/decisions/{decision.id}',
            'created_at': decision.created_at,
        })
    
    # Search tasks
    try:
        task_filter = Q(title__icontains=query) | Q(description__icontains=query)
        if query_is_numeric:
            task_filter |= Q(id=query_id)
        tasks = Task.objects.filter(
            organization=request.user.organization,
        ).filter(task_filter)[:5]
        for task in tasks:
            results.append({
                'type': 'task',
                'id': task.id,
                'title': task.title,
                'excerpt': task.description[:200] if hasattr(task, 'description') else '',
                'url': '/business/tasks',
                'created_at': task.created_at,
            })
    except:
        pass

    # Search meetings
    try:
        meeting_filter = Q(title__icontains=query) | Q(description__icontains=query)
        if query_is_numeric:
            meeting_filter |= Q(id=query_id)
        meetings = Meeting.objects.filter(
            organization=request.user.organization,
        ).filter(meeting_filter)[:5]
        for meeting in meetings:
            results.append({
                'type': 'meeting',
                'id': meeting.id,
                'title': meeting.title,
                'excerpt': meeting.description[:200] if hasattr(meeting, 'description') else '',
                'url': f'/business/meetings/{meeting.id}',
                'created_at': meeting.created_at,
            })
    except:
        pass

    # Search documents
    try:
        document_filter = Q(title__icontains=query) | Q(description__icontains=query) | Q(content__icontains=query)
        if query_is_numeric:
            document_filter |= Q(id=query_id)
        documents = Document.objects.filter(
            organization=request.user.organization,
        ).filter(document_filter)[:5]
        for document in documents:
            results.append({
                'type': 'document',
                'id': document.id,
                'title': document.title,
                'excerpt': document.description[:200] if hasattr(document, 'description') else '',
                'url': f'/business/documents/{document.id}',
                'created_at': document.created_at,
            })
    except:
        pass
    
    # Sort by relevance (created_at for now)
    results.sort(key=lambda x: x['created_at'], reverse=True)
    
    return Response({'results': results[:20]})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_knowledge_graph(request):
    """Get knowledge graph data for visualization."""
    organization = request.user.organization
    supported_types = {'conversation', 'decision', 'goal', 'meeting', 'task', 'document', 'other'}
    requested_types = {
        item.strip().lower()
        for item in (request.GET.get('types') or '').split(',')
        if item.strip()
    }
    requested_types = requested_types & supported_types
    allowed_types = requested_types or supported_types
    query = (request.GET.get('q') or '').strip().lower()
    focus_type = (request.GET.get('focus_type') or '').strip().lower()
    focus_id = str(request.GET.get('focus_id') or '').strip()
    focus_key = f'{focus_type}_{focus_id}' if focus_type and focus_id else None
    include_isolated = str(request.GET.get('include_isolated', 'true')).lower() != 'false'

    try:
        limit = int(request.GET.get('limit', 140))
    except (TypeError, ValueError):
        limit = 140
    limit = max(20, min(limit, 240))

    nodes = {}
    edges = []
    edge_seen = set()
    route_map = {
        'conversation': lambda obj_id: f'/conversations/{obj_id}',
        'decision': lambda obj_id: f'/decisions/{obj_id}',
        'goal': lambda obj_id: f'/business/goals/{obj_id}',
        'meeting': lambda obj_id: f'/business/meetings/{obj_id}',
        'task': lambda obj_id: '/business/tasks',
        'document': lambda obj_id: f'/business/documents/{obj_id}',
        'other': lambda obj_id: '/knowledge',
    }

    def normalize_type(model_name):
        return model_name if model_name in supported_types else 'other'

    def clip(text, limit=180):
        text = str(text or '').strip()
        if len(text) <= limit:
            return text
        return f'{text[:limit].rstrip()}...'

    def iso(value):
        return value.isoformat() if value else None

    def infer_label(obj, fallback):
        for attr in ['title', 'name', 'question']:
            value = getattr(obj, attr, None)
            if value:
                return str(value)
        return fallback

    def infer_preview(obj):
        parts = []
        for attr in ['description', 'content', 'notes', 'rationale', 'plain_language_summary']:
            value = getattr(obj, attr, None)
            if value:
                parts.append(str(value))
        return clip(' '.join(parts))

    def ensure_node(key, node_type, object_id, label, preview='', created_at=None, updated_at=None):
        normalized_type = normalize_type(node_type)
        if normalized_type not in allowed_types:
            return
        existing = nodes.get(key)
        payload = {
            'id': key,
            'object_id': object_id,
            'type': normalized_type,
            'label': clip(label or 'Untitled', 60),
            'preview': preview or '',
            'route': route_map.get(normalized_type, route_map['other'])(object_id),
            'created_at': iso(created_at),
            'updated_at': iso(updated_at),
        }
        if existing:
            existing.update({k: v for k, v in payload.items() if v not in [None, '']})
            return
        nodes[key] = payload

    def ensure_edge(source, target, edge_type='relates_to', strength=1.0, inferred=True):
        if source == target or source not in nodes or target not in nodes:
            return
        key = (source, target, edge_type)
        if key in edge_seen:
            return
        edge_seen.add(key)
        edges.append({
            'source': source,
            'target': target,
            'type': edge_type,
            'strength': strength,
            'inferred': inferred,
        })

    from apps.conversations.models import Conversation
    from apps.decisions.models import Decision

    try:
        from apps.business.models import Goal, Meeting, Task
        from apps.business.document_models import Document
    except Exception:  # pragma: no cover - optional in some test environments
        Goal = None
        Meeting = None
        Task = None
        Document = None

    relationship_limit = max(limit, 80)
    conversations = list(
        Conversation.objects.filter(organization=organization)
        .select_related('author')
        .order_by('-created_at')[:relationship_limit]
    )
    decisions = list(
        Decision.objects.filter(organization=organization)
        .select_related('conversation', 'decision_maker')
        .order_by('-created_at')[:relationship_limit]
    )
    goals = list(
        Goal.objects.filter(organization=organization)
        .select_related('conversation', 'decision', 'owner')
        .order_by('-created_at')[:relationship_limit]
    ) if Goal is not None else []
    meetings = list(
        Meeting.objects.filter(organization=organization)
        .select_related('goal', 'conversation', 'decision', 'created_by')
        .order_by('-created_at')[:relationship_limit]
    ) if Meeting is not None else []
    tasks = list(
        Task.objects.filter(organization=organization)
        .select_related('goal', 'meeting', 'conversation', 'decision', 'assigned_to')
        .order_by('-created_at')[:relationship_limit]
    ) if Task is not None else []
    documents = list(
        Document.objects.filter(organization=organization)
        .select_related('created_by', 'updated_by')
        .order_by('-updated_at')[:relationship_limit]
    ) if Document is not None else []

    goal_map = {goal.id: goal for goal in goals}
    meeting_map = {meeting.id: meeting for meeting in meetings}
    task_map = {task.id: task for task in tasks}
    conversation_map = {conversation.id: conversation for conversation in conversations}
    decision_map = {decision.id: decision for decision in decisions}

    for conversation in conversations:
        ensure_node(
            f'conversation_{conversation.id}',
            'conversation',
            conversation.id,
            conversation.title,
            preview=clip(conversation.content),
            created_at=conversation.created_at,
            updated_at=getattr(conversation, 'updated_at', None),
        )

    for decision in decisions:
        decision_key = f'decision_{decision.id}'
        ensure_node(
            decision_key,
            'decision',
            decision.id,
            decision.title,
            preview=clip(' '.join(filter(None, [decision.description, decision.rationale]))),
            created_at=decision.created_at,
            updated_at=getattr(decision, 'implemented_at', None) or getattr(decision, 'decided_at', None),
        )
        if decision.conversation_id:
            conversation = conversation_map.get(decision.conversation_id) or decision.conversation
            ensure_node(
                f'conversation_{decision.conversation_id}',
                'conversation',
                decision.conversation_id,
                infer_label(conversation, f'Conversation #{decision.conversation_id}'),
                preview=infer_preview(conversation),
                created_at=getattr(conversation, 'created_at', None),
                updated_at=getattr(conversation, 'updated_at', None),
            )
            ensure_edge(f'conversation_{decision.conversation_id}', decision_key, 'decision_context', 0.92)

    for goal in goals:
        goal_key = f'goal_{goal.id}'
        ensure_node(
            goal_key,
            'goal',
            goal.id,
            goal.title,
            preview=clip(goal.description),
            created_at=goal.created_at,
            updated_at=goal.updated_at,
        )
        if goal.conversation_id:
            ensure_node(
                f'conversation_{goal.conversation_id}',
                'conversation',
                goal.conversation_id,
                infer_label(conversation_map.get(goal.conversation_id), f'Conversation #{goal.conversation_id}'),
                preview=infer_preview(conversation_map.get(goal.conversation_id)),
                created_at=getattr(conversation_map.get(goal.conversation_id), 'created_at', None),
                updated_at=getattr(conversation_map.get(goal.conversation_id), 'updated_at', None),
            )
            ensure_edge(f'conversation_{goal.conversation_id}', goal_key, 'goal_context', 0.78)
        if goal.decision_id:
            ensure_node(
                f'decision_{goal.decision_id}',
                'decision',
                goal.decision_id,
                infer_label(decision_map.get(goal.decision_id), f'Decision #{goal.decision_id}'),
                preview=infer_preview(decision_map.get(goal.decision_id)),
                created_at=getattr(decision_map.get(goal.decision_id), 'created_at', None),
                updated_at=getattr(decision_map.get(goal.decision_id), 'implemented_at', None),
            )
            ensure_edge(f'decision_{goal.decision_id}', goal_key, 'supports_goal', 0.86)

    for meeting in meetings:
        meeting_key = f'meeting_{meeting.id}'
        ensure_node(
            meeting_key,
            'meeting',
            meeting.id,
            meeting.title,
            preview=clip(' '.join(filter(None, [meeting.description, meeting.notes]))),
            created_at=meeting.created_at,
            updated_at=meeting.updated_at,
        )
        if meeting.goal_id:
            ensure_node(
                f'goal_{meeting.goal_id}',
                'goal',
                meeting.goal_id,
                infer_label(goal_map.get(meeting.goal_id), f'Goal #{meeting.goal_id}'),
                preview=infer_preview(goal_map.get(meeting.goal_id)),
                created_at=getattr(goal_map.get(meeting.goal_id), 'created_at', None),
                updated_at=getattr(goal_map.get(meeting.goal_id), 'updated_at', None),
            )
            ensure_edge(f'goal_{meeting.goal_id}', meeting_key, 'goal_session', 0.74)
        if meeting.conversation_id:
            ensure_node(
                f'conversation_{meeting.conversation_id}',
                'conversation',
                meeting.conversation_id,
                infer_label(conversation_map.get(meeting.conversation_id), f'Conversation #{meeting.conversation_id}'),
                preview=infer_preview(conversation_map.get(meeting.conversation_id)),
                created_at=getattr(conversation_map.get(meeting.conversation_id), 'created_at', None),
                updated_at=getattr(conversation_map.get(meeting.conversation_id), 'updated_at', None),
            )
            ensure_edge(f'conversation_{meeting.conversation_id}', meeting_key, 'meeting_context', 0.72)
        if meeting.decision_id:
            ensure_node(
                f'decision_{meeting.decision_id}',
                'decision',
                meeting.decision_id,
                infer_label(decision_map.get(meeting.decision_id), f'Decision #{meeting.decision_id}'),
                preview=infer_preview(decision_map.get(meeting.decision_id)),
                created_at=getattr(decision_map.get(meeting.decision_id), 'created_at', None),
                updated_at=getattr(decision_map.get(meeting.decision_id), 'implemented_at', None),
            )
            ensure_edge(f'decision_{meeting.decision_id}', meeting_key, 'reviews_decision', 0.8)

    for task in tasks:
        task_key = f'task_{task.id}'
        ensure_node(
            task_key,
            'task',
            task.id,
            task.title,
            preview=clip(task.description),
            created_at=task.created_at,
            updated_at=task.updated_at,
        )
        if task.goal_id:
            ensure_node(
                f'goal_{task.goal_id}',
                'goal',
                task.goal_id,
                infer_label(goal_map.get(task.goal_id), f'Goal #{task.goal_id}'),
                preview=infer_preview(goal_map.get(task.goal_id)),
                created_at=getattr(goal_map.get(task.goal_id), 'created_at', None),
                updated_at=getattr(goal_map.get(task.goal_id), 'updated_at', None),
            )
            ensure_edge(f'goal_{task.goal_id}', task_key, 'goal_work', 0.78)
        if task.meeting_id:
            ensure_node(
                f'meeting_{task.meeting_id}',
                'meeting',
                task.meeting_id,
                infer_label(meeting_map.get(task.meeting_id), f'Meeting #{task.meeting_id}'),
                preview=infer_preview(meeting_map.get(task.meeting_id)),
                created_at=getattr(meeting_map.get(task.meeting_id), 'created_at', None),
                updated_at=getattr(meeting_map.get(task.meeting_id), 'updated_at', None),
            )
            ensure_edge(f'meeting_{task.meeting_id}', task_key, 'action_item', 0.84)
        if task.conversation_id:
            ensure_node(
                f'conversation_{task.conversation_id}',
                'conversation',
                task.conversation_id,
                infer_label(conversation_map.get(task.conversation_id), f'Conversation #{task.conversation_id}'),
                preview=infer_preview(conversation_map.get(task.conversation_id)),
                created_at=getattr(conversation_map.get(task.conversation_id), 'created_at', None),
                updated_at=getattr(conversation_map.get(task.conversation_id), 'updated_at', None),
            )
            ensure_edge(f'conversation_{task.conversation_id}', task_key, 'execution_context', 0.76)
        if task.decision_id:
            ensure_node(
                f'decision_{task.decision_id}',
                'decision',
                task.decision_id,
                infer_label(decision_map.get(task.decision_id), f'Decision #{task.decision_id}'),
                preview=infer_preview(decision_map.get(task.decision_id)),
                created_at=getattr(decision_map.get(task.decision_id), 'created_at', None),
                updated_at=getattr(decision_map.get(task.decision_id), 'implemented_at', None),
            )
            ensure_edge(f'decision_{task.decision_id}', task_key, 'implements', 0.94)

    for document in documents:
        document_key = f'document_{document.id}'
        ensure_node(
            document_key,
            'document',
            document.id,
            document.title,
            preview=clip(document.description or document.content),
            created_at=document.created_at,
            updated_at=document.updated_at,
        )
        if document.goal_id:
            ensure_node(
                f'goal_{document.goal_id}',
                'goal',
                document.goal_id,
                infer_label(goal_map.get(document.goal_id), f'Goal #{document.goal_id}'),
                preview=infer_preview(goal_map.get(document.goal_id)),
                created_at=getattr(goal_map.get(document.goal_id), 'created_at', None),
                updated_at=getattr(goal_map.get(document.goal_id), 'updated_at', None),
            )
            ensure_edge(f'goal_{document.goal_id}', document_key, 'goal_reference', 0.66)
        if document.meeting_id:
            ensure_node(
                f'meeting_{document.meeting_id}',
                'meeting',
                document.meeting_id,
                infer_label(meeting_map.get(document.meeting_id), f'Meeting #{document.meeting_id}'),
                preview=infer_preview(meeting_map.get(document.meeting_id)),
                created_at=getattr(meeting_map.get(document.meeting_id), 'created_at', None),
                updated_at=getattr(meeting_map.get(document.meeting_id), 'updated_at', None),
            )
            ensure_edge(f'meeting_{document.meeting_id}', document_key, 'meeting_notes', 0.82)
        if document.task_id:
            ensure_node(
                f'task_{document.task_id}',
                'task',
                document.task_id,
                infer_label(task_map.get(document.task_id), f'Task #{document.task_id}'),
                preview=infer_preview(task_map.get(document.task_id)),
                created_at=getattr(task_map.get(document.task_id), 'created_at', None),
                updated_at=getattr(task_map.get(document.task_id), 'updated_at', None),
            )
            ensure_edge(f'task_{document.task_id}', document_key, 'task_documentation', 0.86)

    links = ContentLink.objects.filter(
        organization=organization
    ).select_related('source_content_type', 'target_content_type').order_by('-created_at')[: max(limit * 2, 180)]

    for link in links:
        source_obj = link.source_object
        target_obj = link.target_object
        source_type = normalize_type(link.source_content_type.model)
        target_type = normalize_type(link.target_content_type.model)
        source_key = f'{source_type}_{link.source_object_id}'
        target_key = f'{target_type}_{link.target_object_id}'
        ensure_node(
            source_key,
            source_type,
            link.source_object_id,
            infer_label(source_obj, f'{source_type.title()} #{link.source_object_id}'),
            preview=infer_preview(source_obj),
            created_at=getattr(source_obj, 'created_at', None),
            updated_at=getattr(source_obj, 'updated_at', None),
        )
        ensure_node(
            target_key,
            target_type,
            link.target_object_id,
            infer_label(target_obj, f'{target_type.title()} #{link.target_object_id}'),
            preview=infer_preview(target_obj),
            created_at=getattr(target_obj, 'created_at', None),
            updated_at=getattr(target_obj, 'updated_at', None),
        )
        ensure_edge(source_key, target_key, link.link_type, link.strength or 1.0, inferred=link.is_auto_generated)

    working_node_ids = set(nodes.keys())
    if requested_types:
        working_node_ids = {node_id for node_id in working_node_ids if nodes[node_id]['type'] in allowed_types}

    adjacency = {}
    for edge in edges:
        adjacency.setdefault(edge['source'], set()).add(edge['target'])
        adjacency.setdefault(edge['target'], set()).add(edge['source'])

    matched_ids = set()
    if query:
        for node_id, node in nodes.items():
            haystack = ' '.join([
                str(node.get('label', '')),
                str(node.get('preview', '')),
                str(node.get('type', '')),
                str(node.get('object_id', '')),
            ]).lower()
            if query in haystack:
                matched_ids.add(node_id)
        if matched_ids:
            matched_with_neighbors = set(matched_ids)
            for node_id in list(matched_ids):
                matched_with_neighbors.update(adjacency.get(node_id, set()))
            working_node_ids &= matched_with_neighbors
        else:
            working_node_ids = set()

    if focus_key and focus_key in nodes:
        focus_with_neighbors = {focus_key}
        focus_with_neighbors.update(adjacency.get(focus_key, set()))
        working_node_ids = (working_node_ids & focus_with_neighbors) if query else focus_with_neighbors

    if not include_isolated:
        working_node_ids = {node_id for node_id in working_node_ids if adjacency.get(node_id)}

    if len(working_node_ids) > limit:
        def node_sort_key(node_id):
            node = nodes[node_id]
            return (
                1 if node_id == focus_key else 0,
                1 if node_id in matched_ids else 0,
                len(adjacency.get(node_id, set())),
                node.get('updated_at') or node.get('created_at') or '',
            )

        ordered = sorted(working_node_ids, key=node_sort_key, reverse=True)
        working_node_ids = set(ordered[:limit])

    filtered_edges = [
        edge for edge in edges
        if edge['source'] in working_node_ids and edge['target'] in working_node_ids
    ]
    connection_counts = {}
    for edge in filtered_edges:
        connection_counts[edge['source']] = connection_counts.get(edge['source'], 0) + 1
        connection_counts[edge['target']] = connection_counts.get(edge['target'], 0) + 1

    filtered_nodes = []
    for node_id in working_node_ids:
        node = dict(nodes[node_id])
        node['connection_count'] = connection_counts.get(node_id, 0)
        node['matched'] = node_id in matched_ids
        node['focused'] = node_id == focus_key
        filtered_nodes.append(node)

    filtered_nodes.sort(
        key=lambda node: (
            1 if node.get('focused') else 0,
            1 if node.get('matched') else 0,
            node.get('connection_count', 0),
            node.get('updated_at') or node.get('created_at') or '',
        ),
        reverse=True,
    )

    type_counts = {}
    isolated_nodes = 0
    for node in filtered_nodes:
        type_counts[node['type']] = type_counts.get(node['type'], 0) + 1
        if node['connection_count'] == 0:
            isolated_nodes += 1

    return Response({
        'nodes': filtered_nodes,
        'edges': filtered_edges,
        'summary': {
            'query': request.GET.get('q', '').strip(),
            'types': sorted(requested_types) if requested_types else [],
            'focus_node': focus_key if focus_key in working_node_ids else None,
            'total_nodes': len(filtered_nodes),
            'total_edges': len(filtered_edges),
            'matched_nodes': len([node for node in filtered_nodes if node.get('matched')]),
            'isolated_nodes': isolated_nodes,
            'type_counts': type_counts,
        },
    })
