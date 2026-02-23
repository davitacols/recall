from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.contrib.contenttypes.models import ContentType
from django.core.cache import cache
from django.core.paginator import Paginator
from apps.knowledge.context_engine import ContextEngine
from apps.knowledge.unified_models import ContentLink, UnifiedActivity

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_context_panel(request, content_type_name, object_id):
    """Get unified context for any content object with caching"""
    # Check cache first
    cache_key = f'context_{content_type_name}_{object_id}_{request.user.organization.id}'
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
        
        result = {
            'related_conversations': context.related_conversations,
            'related_decisions': context.related_decisions,
            'related_tasks': context.related_tasks,
            'related_documents': context.related_documents,
            'expert_users': context.expert_users,
            'similar_past_items': context.similar_past_items,
            'success_rate': context.success_rate,
            'risk_indicators': context.risk_indicators,
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
        link = ContentLink.objects.create(
            organization=request.user.organization,
            source_content_type=source_ct,
            source_object_id=source_obj.id,
            target_content_type=target_ct,
            target_object_id=target_obj.id,
            link_type=link_type,
            created_by=request.user,
            is_auto_generated=False
        )
        
        return Response({
            'id': link.id,
            'link_type': link.link_type,
            'created_at': link.created_at
        })
    except Exception as e:
        return Response({'error': str(e)}, status=400)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_unified_timeline(request):
    """Get unified activity timeline with pagination"""
    days = int(request.GET.get('days', 7))
    page = int(request.GET.get('page', 1))
    per_page = int(request.GET.get('per_page', 20))
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
    query = request.GET.get('q', '')
    if not query:
        return Response({'results': []})
    
    from apps.conversations.models import Conversation
    from apps.decisions.models import Decision
    from apps.business.models import Task, Meeting, Document
    
    results = []
    
    # Search conversations
    conversations = Conversation.objects.filter(
        organization=request.user.organization,
        title__icontains=query
    )[:5]
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
    decisions = Decision.objects.filter(
        organization=request.user.organization,
        title__icontains=query
    )[:5]
    for decision in decisions:
        results.append({
            'type': 'decision',
            'id': decision.id,
            'title': decision.title,
            'excerpt': decision.description[:200],
            'url': f'/decisions/{decision.id}',
            'created_at': decision.created_at,
        })
    
    # Search tasks
    try:
        tasks = Task.objects.filter(
            organization=request.user.organization,
            title__icontains=query
        )[:5]
        for task in tasks:
            results.append({
                'type': 'task',
                'id': task.id,
                'title': task.title,
                'excerpt': task.description[:200] if hasattr(task, 'description') else '',
                'url': f'/tasks/{task.id}',
                'created_at': task.created_at,
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
    
    for link in links:
        # Add source node
        source_key = f"{link.source_content_type.model}_{link.source_object_id}"
        if source_key not in nodes:
            nodes[source_key] = {
                'id': source_key,
                'type': link.source_content_type.model,
                'label': str(link.source_object)[:50] if link.source_object else 'Unknown',
            }
        
        # Add target node
        target_key = f"{link.target_content_type.model}_{link.target_object_id}"
        if target_key not in nodes:
            nodes[target_key] = {
                'id': target_key,
                'type': link.target_content_type.model,
                'label': str(link.target_object)[:50] if link.target_object else 'Unknown',
            }
        
        # Add edge
        edges.append({
            'source': source_key,
            'target': target_key,
            'type': link.link_type,
            'strength': link.strength,
        })
    
    return Response({
        'nodes': list(nodes.values()),
        'edges': edges,
    })
