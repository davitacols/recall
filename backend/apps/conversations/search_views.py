from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q, Count, Avg
from django.db.models.functions import TruncDate
from django.utils import timezone
from datetime import timedelta

from apps.conversations.models import Conversation, Tag
from apps.decisions.models import Decision
from apps.organizations.models import SavedSearch, SearchAnalytics

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def advanced_search(request):
    query = (request.data.get('query') or request.data.get('q') or '').strip()
    filters = request.data.get('filters') or {}
    types = set(filters.get('types') or [])
    limit = request.data.get('limit', 20)
    try:
        limit = int(limit)
    except (TypeError, ValueError):
        limit = 20
    limit = max(1, min(limit, 100))

    if not query:
        return Response({'error': 'query is required'}, status=400)

    org = request.user.organization
    results = []

    def include(item_type):
        return not types or item_type in types

    # Conversations
    if include('conversation'):
        conv_qs = Conversation.objects.filter(
            organization=org
        ).filter(
            Q(title__icontains=query) |
            Q(content__icontains=query) |
            Q(ai_summary__icontains=query)
        ).order_by('-created_at')[:limit]
        for conv in conv_qs:
            results.append({
                'type': 'conversation',
                'id': conv.id,
                'title': conv.title,
                'excerpt': (conv.ai_summary or conv.content or '')[:180],
                'url': f'/conversations/{conv.id}',
                'created_at': conv.created_at,
            })

    # Decisions
    if include('decision'):
        dec_qs = Decision.objects.filter(
            organization=org
        ).filter(
            Q(title__icontains=query) |
            Q(description__icontains=query) |
            Q(rationale__icontains=query)
        ).order_by('-created_at')[:limit]
        for dec in dec_qs:
            results.append({
                'type': 'decision',
                'id': dec.id,
                'title': dec.title,
                'excerpt': (dec.description or '')[:180],
                'url': f'/decisions/{dec.id}',
                'created_at': dec.created_at,
            })

    # Business models are optional in some deployments.
    try:
        from apps.business.models import Task, Meeting
        from apps.business.document_models import Document

        if include('task'):
            task_qs = Task.objects.filter(
                organization=org
            ).filter(
                Q(title__icontains=query) |
                Q(description__icontains=query)
            ).order_by('-created_at')[:limit]
            for task in task_qs:
                results.append({
                    'type': 'task',
                    'id': task.id,
                    'title': task.title,
                    'excerpt': (getattr(task, 'description', '') or '')[:180],
                    'url': '/business/tasks',
                    'created_at': task.created_at,
                })

        if include('meeting'):
            meet_qs = Meeting.objects.filter(
                organization=org
            ).filter(
                Q(title__icontains=query) |
                Q(description__icontains=query)
            ).order_by('-created_at')[:limit]
            for meeting in meet_qs:
                results.append({
                    'type': 'meeting',
                    'id': meeting.id,
                    'title': meeting.title,
                    'excerpt': (getattr(meeting, 'description', '') or '')[:180],
                    'url': f'/business/meetings/{meeting.id}',
                    'created_at': meeting.created_at,
                })

        if include('document'):
            doc_qs = Document.objects.filter(
                organization=org
            ).filter(
                Q(title__icontains=query) |
                Q(description__icontains=query)
            ).order_by('-created_at')[:limit]
            for doc in doc_qs:
                results.append({
                    'type': 'document',
                    'id': doc.id,
                    'title': doc.title,
                    'excerpt': (getattr(doc, 'description', '') or '')[:180],
                    'url': f'/business/documents/{doc.id}',
                    'created_at': doc.created_at,
                })
    except Exception:
        pass

    results.sort(key=lambda item: item.get('created_at') or timezone.now(), reverse=True)
    trimmed = results[:limit]

    SearchAnalytics.objects.create(
        user=request.user,
        organization=org,
        query=query,
        results_count=len(trimmed),
    )

    return Response({
        'query': query,
        'filters': filters,
        'results': trimmed,
        'total': len(trimmed),
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_suggestions(request):
    query = (request.GET.get('q') or '').strip()
    if len(query) < 2:
        return Response({'suggestions': []})

    org = request.user.organization
    seen = set()
    suggestions = []

    def add_suggestion(item):
        key = (item.get('type'), item.get('text') or item.get('value'))
        if key in seen:
            return
        seen.add(key)
        suggestions.append(item)

    for title in Conversation.objects.filter(
        organization=org,
        title__icontains=query
    ).values_list('title', flat=True)[:5]:
        add_suggestion({'type': 'query', 'text': title})

    for title in Decision.objects.filter(
        organization=org,
        title__icontains=query
    ).values_list('title', flat=True)[:5]:
        add_suggestion({'type': 'query', 'text': title})

    for tag_name in Tag.objects.filter(
        organization=org,
        name__icontains=query
    ).values_list('name', flat=True)[:5]:
        add_suggestion({'type': 'tag', 'value': tag_name})

    return Response({'suggestions': suggestions[:10]})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def save_search(request):
    query = (request.data.get('query') or '').strip()
    filters = request.data.get('filters') or {}
    if not query:
        return Response({'error': 'query is required'}, status=400)

    saved = SavedSearch.objects.create(
        user=request.user,
        organization=request.user.organization,
        query=query,
        filters=filters,
    )
    return Response({
        'id': saved.id,
        'query': saved.query,
        'filters': saved.filters,
        'created_at': saved.created_at,
    }, status=201)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def saved_searches(request):
    items = SavedSearch.objects.filter(
        user=request.user,
        organization=request.user.organization
    ).order_by('-created_at')[:100]

    return Response([{
        'id': item.id,
        'query': item.query,
        'filters': item.filters,
        'created_at': item.created_at,
    } for item in items])

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_saved_search(request, search_id):
    deleted, _ = SavedSearch.objects.filter(
        id=search_id,
        user=request.user,
        organization=request.user.organization
    ).delete()
    if not deleted:
        return Response({'error': 'saved search not found'}, status=404)
    return Response({'message': 'Deleted'})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_analytics(request):
    try:
        days = int(request.GET.get('days', 30))
    except (TypeError, ValueError):
        days = 30
    days = max(1, min(days, 365))
    since = timezone.now() - timedelta(days=days)

    qs = SearchAnalytics.objects.filter(
        user=request.user,
        organization=request.user.organization,
        searched_at__gte=since,
    )

    top_queries = list(
        qs.values('query')
        .annotate(count=Count('id'))
        .order_by('-count')[:10]
    )

    trend = list(
        qs.annotate(day=TruncDate('searched_at'))
        .values('day')
        .annotate(count=Count('id'))
        .order_by('day')
    )

    return Response({
        'days': days,
        'total_searches': qs.count(),
        'unique_queries': qs.values('query').distinct().count(),
        'avg_results_count': round(qs.aggregate(avg=Avg('results_count'))['avg'] or 0, 2),
        'top_queries': top_queries,
        'trend': trend,
    })
