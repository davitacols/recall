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
    """Get knowledge graph data for visualization"""
    # Get all links for organization
    links = ContentLink.objects.filter(
        organization=request.user.organization
    ).select_related('source_content_type', 'target_content_type')[:100]
    
    nodes = {}
    edges = []
    edge_seen = set()

    def ensure_node(key, node_type, label):
        if key in nodes:
            return
        nodes[key] = {
            'id': key,
            'type': node_type,
            'label': (label or 'Untitled')[:50],
        }

    def ensure_edge(source, target, edge_type='relates_to', strength=1.0):
        key = (source, target, edge_type)
        if key in edge_seen:
            return
        edge_seen.add(key)
        edges.append({
            'source': source,
            'target': target,
            'type': edge_type,
            'strength': strength,
        })

    for link in links:
        # Add source node
        source_key = f"{link.source_content_type.model}_{link.source_object_id}"
        ensure_node(
            source_key,
            link.source_content_type.model,
            str(link.source_object) if link.source_object else 'Unknown'
        )

        # Add target node
        target_key = f"{link.target_content_type.model}_{link.target_object_id}"
        ensure_node(
            target_key,
            link.target_content_type.model,
            str(link.target_object) if link.target_object else 'Unknown'
        )

        # Add edge
        ensure_edge(source_key, target_key, link.link_type, link.strength)

    # Add recent items so graph is not empty even when explicit links are sparse.
    from apps.conversations.models import Conversation
    from apps.decisions.models import Decision

    conversations = Conversation.objects.filter(
        organization=request.user.organization
    ).order_by('-created_at')[:40]
    decisions = Decision.objects.filter(
        organization=request.user.organization
    ).select_related('conversation').order_by('-created_at')[:40]

    for conv in conversations:
        conv_key = f"conversation_{conv.id}"
        ensure_node(conv_key, 'conversation', conv.title)

    for decision in decisions:
        dec_key = f"decision_{decision.id}"
        ensure_node(dec_key, 'decision', decision.title)
        if decision.conversation_id:
            conv_key = f"conversation_{decision.conversation_id}"
            ensure_node(conv_key, 'conversation', getattr(decision.conversation, 'title', f'Conversation #{decision.conversation_id}'))
            ensure_edge(conv_key, dec_key, 'decision_context', 0.85)

    # Optional business nodes.
    try:
        from apps.business.models import Task, Meeting
        from apps.business.document_models import Document

        for task in Task.objects.filter(organization=request.user.organization).order_by('-created_at')[:30]:
            ensure_node(f"task_{task.id}", 'task', task.title)
        for meeting in Meeting.objects.filter(organization=request.user.organization).order_by('-created_at')[:30]:
            ensure_node(f"meeting_{meeting.id}", 'meeting', meeting.title)
        for document in Document.objects.filter(organization=request.user.organization).order_by('-created_at')[:30]:
            ensure_node(f"document_{document.id}", 'document', document.title)
    except Exception:
        pass

    return Response({
        'nodes': list(nodes.values()),
        'edges': edges,
    })
