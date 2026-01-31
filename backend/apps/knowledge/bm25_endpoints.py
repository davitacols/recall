"""
BM25 Search API Endpoints
Provides search endpoints with BM25 ranking and suggestions
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
import time

from .bm25_search import search_service


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def search(request):
    """
    Search conversations, decisions, and agile items
    """
    query = request.data.get('query', '').strip()
    limit = min(int(request.data.get('limit', 20)), 100)
    
    if not query or len(query) < 2:
        return Response({
            'error': 'Query must be at least 2 characters',
            'results': []
        }, status=status.HTTP_400_BAD_REQUEST)
    
    start_time = time.time()
    
    try:
        from apps.conversations.models import Conversation
        from apps.decisions.models import Decision
        from apps.agile.models import Sprint, Issue, Blocker
        from django.db.models import Q
        
        results = []
        
        # Search conversations
        convs = Conversation.objects.filter(
            Q(title__icontains=query) | Q(content__icontains=query),
            organization_id=request.user.organization_id,
            is_archived=False
        ).values('id', 'title', 'content', 'author_id', 'created_at')[:limit//4]
        
        for c in convs:
            results.append({
                'id': c['id'],
                'type': 'conversation',
                'title': c['title'],
                'content': c['content'][:200],
                'score': 1.0,
                'created_at': c['created_at']
            })
        
        # Search decisions
        decs = Decision.objects.filter(
            Q(title__icontains=query) | Q(description__icontains=query),
            organization_id=request.user.organization_id
        ).values('id', 'title', 'description', 'status', 'created_at')[:limit//4]
        
        for d in decs:
            results.append({
                'id': d['id'],
                'type': 'decision',
                'title': d['title'],
                'content': d['description'][:200],
                'score': 1.0,
                'status': d['status'],
                'created_at': d['created_at']
            })
        
        # Search sprints
        sprints = Sprint.objects.filter(
            Q(name__icontains=query) | Q(goal__icontains=query),
            organization_id=request.user.organization_id
        ).values('id', 'name', 'goal', 'status', 'created_at')[:limit//4]
        
        for s in sprints:
            results.append({
                'id': s['id'],
                'type': 'sprint',
                'title': s['name'],
                'content': s['goal'][:200],
                'score': 1.0,
                'status': s['status'],
                'created_at': s['created_at']
            })
        
        # Search issues
        issues = Issue.objects.filter(
            Q(title__icontains=query) | Q(description__icontains=query) | Q(key__icontains=query),
            organization_id=request.user.organization_id
        ).values('id', 'title', 'description', 'key', 'status', 'priority', 'created_at')[:limit//4]
        
        for i in issues:
            results.append({
                'id': i['id'],
                'type': 'issue',
                'title': f"{i['key']}: {i['title']}",
                'content': i['description'][:200],
                'score': 1.0,
                'status': i['status'],
                'priority': i['priority'],
                'created_at': i['created_at']
            })
        
        # Search blockers
        blockers = Blocker.objects.filter(
            Q(title__icontains=query) | Q(description__icontains=query),
            organization_id=request.user.organization_id
        ).values('id', 'title', 'description', 'status', 'created_at')[:limit//4]
        
        for b in blockers:
            results.append({
                'id': b['id'],
                'type': 'blocker',
                'title': b['title'],
                'content': b['description'][:200],
                'score': 1.0,
                'status': b['status'],
                'created_at': b['created_at']
            })
        
        response_time_ms = int((time.time() - start_time) * 1000)
        
        search_service.record_search(
            query=query,
            org_id=request.user.organization_id,
            user_id=request.user.id,
            results_count=len(results),
            response_time_ms=response_time_ms
        )
        
        return Response({
            'query': query,
            'results': results[:limit],
            'total': len(results),
            'response_time_ms': response_time_ms
        })
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response({
            'error': str(e),
            'results': []
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_suggestions(request):
    """
    Get search suggestions based on partial query
    
    Query params:
        q: Partial query string
        limit: Number of suggestions (default 10)
    
    Response:
        {
            "suggestions": [
                {
                    "type": "tag",
                    "text": "#authentication",
                    "value": "authentication"
                },
                {
                    "type": "conversation",
                    "text": "Authentication Strategy",
                    "value": 123
                }
            ]
        }
    """
    query = request.GET.get('q', '').strip()
    limit = min(int(request.GET.get('limit', 10)), 50)
    
    if not query or len(query) < 1:
        return Response({'suggestions': []})
    
    try:
        suggestions = search_service.get_suggestions(
            query=query,
            org_id=request.user.organization_id,
            limit=limit
        )
        
        return Response({'suggestions': suggestions})
    
    except Exception as e:
        return Response({
            'error': str(e),
            'suggestions': []
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_trending(request):
    """
    Get trending search queries
    
    Query params:
        days: Number of days to look back (default 7)
        limit: Number of results (default 10)
    
    Response:
        {
            "trending": [
                {
                    "query": "authentication",
                    "count": 45,
                    "results_avg": 12
                }
            ]
        }
    """
    from apps.knowledge.models import SearchQuery
    from django.db.models import Count, Avg
    
    days = int(request.GET.get('days', 7))
    limit = min(int(request.GET.get('limit', 10)), 50)
    
    cutoff_date = timezone.now() - timezone.timedelta(days=days)
    
    try:
        trending = SearchQuery.objects.filter(
            organization_id=request.user.organization_id,
            created_at__gte=cutoff_date
        ).values('query_text').annotate(
            count=Count('id'),
            results_avg=Avg('results_count')
        ).order_by('-count')[:limit]
        
        return Response({
            'trending': list(trending),
            'period_days': days
        })
    
    except Exception as e:
        return Response({
            'error': str(e),
            'trending': []
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_analytics(request):
    """
    Get search analytics
    
    Response:
        {
            "total_searches": 1234,
            "unique_queries": 456,
            "avg_response_time_ms": 145,
            "avg_results_per_query": 8.5,
            "top_queries": [...]
        }
    """
    from apps.knowledge.models import SearchQuery
    from django.db.models import Count, Avg
    
    try:
        searches = SearchQuery.objects.filter(
            organization_id=request.user.organization_id
        )
        
        total_searches = searches.count()
        unique_queries = searches.values('query_text').distinct().count()
        avg_response_time = searches.aggregate(Avg('response_time_ms'))['response_time_ms__avg'] or 0
        avg_results = searches.aggregate(Avg('results_count'))['results_count__avg'] or 0
        
        top_queries = searches.values('query_text').annotate(
            count=Count('id')
        ).order_by('-count')[:10]
        
        return Response({
            'total_searches': total_searches,
            'unique_queries': unique_queries,
            'avg_response_time_ms': round(avg_response_time, 2),
            'avg_results_per_query': round(avg_results, 2),
            'top_queries': list(top_queries)
        })
    
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def search_conversations_only(request):
    """
    Search only conversations with BM25
    
    Request:
        {
            "query": "authentication",
            "limit": 20
        }
    """
    query = request.data.get('query', '').strip()
    limit = min(int(request.data.get('limit', 20)), 100)
    
    if not query or len(query) < 2:
        return Response({
            'error': 'Query must be at least 2 characters',
            'results': []
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        results = search_service.hybrid.search_conversations(
            query=query,
            org_id=request.user.organization_id,
            limit=limit
        )
        
        return Response({
            'query': query,
            'results': results,
            'total': len(results)
        })
    
    except Exception as e:
        return Response({
            'error': str(e),
            'results': []
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def search_decisions_only(request):
    """
    Search only decisions with BM25
    
    Request:
        {
            "query": "authentication",
            "limit": 20
        }
    """
    query = request.data.get('query', '').strip()
    limit = min(int(request.data.get('limit', 20)), 100)
    
    if not query or len(query) < 2:
        return Response({
            'error': 'Query must be at least 2 characters',
            'results': []
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        results = search_service.hybrid.search_decisions(
            query=query,
            org_id=request.user.organization_id,
            limit=limit
        )
        
        return Response({
            'query': query,
            'results': results,
            'total': len(results)
        })
    
    except Exception as e:
        return Response({
            'error': str(e),
            'results': []
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_by_tag(request, tag_name):
    """
    Search conversations by tag
    
    Response:
        {
            "tag": "authentication",
            "results": [...]
        }
    """
    from apps.conversations.models import Conversation, Tag
    
    try:
        tag = Tag.objects.get(
            name=tag_name.lower(),
            organization_id=request.user.organization_id
        )
        
        conversations = tag.conversations.filter(
            is_archived=False
        ).values('id', 'title', 'content', 'created_at', 'author_id')[:20]
        
        results = [{
            'id': c['id'],
            'type': 'conversation',
            'title': c['title'],
            'content': c['content'][:200],
            'created_at': c['created_at']
        } for c in conversations]
        
        return Response({
            'tag': tag.name,
            'results': results,
            'total': len(results)
        })
    
    except Tag.DoesNotExist:
        return Response({
            'error': 'Tag not found',
            'results': []
        }, status=status.HTTP_404_NOT_FOUND)
    
    except Exception as e:
        return Response({
            'error': str(e),
            'results': []
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def search_filtered(request):
    """
    Search with filters
    
    Request:
        {
            "query": "authentication",
            "type": "decision",  # conversation, decision, sprint, issue, blocker
            "status": "approved",  # for decisions
            "date_from": "2024-01-01",
            "date_to": "2024-12-31",
            "priority": "high",  # for issues
            "limit": 20
        }
    """
    from apps.conversations.models import Conversation
    from apps.decisions.models import Decision
    from apps.agile.models import Sprint, Issue, Blocker
    from django.db.models import Q
    from datetime import datetime
    
    query = request.data.get('query', '').strip()
    search_type = request.data.get('type')
    status_filter = request.data.get('status')
    date_from = request.data.get('date_from')
    date_to = request.data.get('date_to')
    priority = request.data.get('priority')
    limit = min(int(request.data.get('limit', 20)), 100)
    
    if not query or len(query) < 2:
        return Response({'error': 'Query must be at least 2 characters', 'results': []}, status=400)
    
    results = []
    
    try:
        # Search conversations
        if not search_type or search_type == 'conversation':
            convs = Conversation.objects.filter(
                Q(title__icontains=query) | Q(content__icontains=query),
                organization_id=request.user.organization_id,
                is_archived=False
            )
            
            if date_from:
                convs = convs.filter(created_at__gte=datetime.fromisoformat(date_from))
            if date_to:
                convs = convs.filter(created_at__lte=datetime.fromisoformat(date_to))
            
            for c in convs[:limit]:
                results.append({
                    'id': c.id,
                    'type': 'conversation',
                    'title': c.title,
                    'content': c.content[:200],
                    'created_at': c.created_at.isoformat()
                })
        
        # Search decisions
        if not search_type or search_type == 'decision':
            decs = Decision.objects.filter(
                Q(title__icontains=query) | Q(description__icontains=query),
                organization_id=request.user.organization_id
            )
            
            if status_filter:
                decs = decs.filter(status=status_filter)
            if date_from:
                decs = decs.filter(created_at__gte=datetime.fromisoformat(date_from))
            if date_to:
                decs = decs.filter(created_at__lte=datetime.fromisoformat(date_to))
            
            for d in decs[:limit]:
                results.append({
                    'id': d.id,
                    'type': 'decision',
                    'title': d.title,
                    'content': d.description[:200],
                    'status': d.status,
                    'created_at': d.created_at.isoformat()
                })
        
        # Search issues
        if not search_type or search_type == 'issue':
            issues = Issue.objects.filter(
                Q(title__icontains=query) | Q(description__icontains=query) | Q(key__icontains=query),
                organization_id=request.user.organization_id
            )
            
            if status_filter:
                issues = issues.filter(status=status_filter)
            if priority:
                issues = issues.filter(priority=priority)
            if date_from:
                issues = issues.filter(created_at__gte=datetime.fromisoformat(date_from))
            if date_to:
                issues = issues.filter(created_at__lte=datetime.fromisoformat(date_to))
            
            for i in issues[:limit]:
                results.append({
                    'id': i.id,
                    'type': 'issue',
                    'title': f"{i.key}: {i.title}",
                    'content': i.description[:200],
                    'status': i.status,
                    'priority': i.priority,
                    'created_at': i.created_at.isoformat()
                })
        
        # Search sprints
        if not search_type or search_type == 'sprint':
            sprints = Sprint.objects.filter(
                Q(name__icontains=query) | Q(goal__icontains=query),
                organization_id=request.user.organization_id
            )
            
            if status_filter:
                sprints = sprints.filter(status=status_filter)
            if date_from:
                sprints = sprints.filter(start_date__gte=datetime.fromisoformat(date_from).date())
            if date_to:
                sprints = sprints.filter(end_date__lte=datetime.fromisoformat(date_to).date())
            
            for s in sprints[:limit]:
                results.append({
                    'id': s.id,
                    'type': 'sprint',
                    'title': s.name,
                    'content': s.goal[:200],
                    'status': s.status,
                    'created_at': s.created_at.isoformat()
                })
        
        return Response({
            'query': query,
            'filters': {
                'type': search_type,
                'status': status_filter,
                'date_from': date_from,
                'date_to': date_to,
                'priority': priority
            },
            'results': results[:limit],
            'total': len(results)
        })
    
    except Exception as e:
        return Response({'error': str(e), 'results': []}, status=500)
