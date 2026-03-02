from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from .models import Retrospective, Sprint

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def retrospectives_list(request):
    if request.method == 'GET':
        retros = Retrospective.objects.filter(
            organization=request.user.organization
        ).select_related('sprint').order_by('-created_at')
        data = [{
            'id': r.id,
            'sprint': {'id': r.sprint.id, 'name': r.sprint.name} if r.sprint else None,
            'created_at': r.created_at,
            'what_went_well_count': len(r.what_went_well or []),
            'what_needs_improvement_count': len(r.what_needs_improvement or []),
            'action_items_count': len(r.action_items or []),
        } for r in retros]
        return Response(data)
    
    elif request.method == 'POST':
        sprint_id = request.data.get('sprint_id')
        if not sprint_id:
            return Response({'error': 'sprint_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        sprint = get_object_or_404(Sprint, id=sprint_id, organization=request.user.organization)
        retro = Retrospective.objects.create(
            organization=request.user.organization,
            sprint=sprint,
            what_went_well=request.data.get('what_went_well', []),
            what_needs_improvement=request.data.get('what_needs_improvement', []),
            action_items=request.data.get('action_items', []),
            recurring_issues=request.data.get('recurring_issues', []),
            positive_trends=request.data.get('positive_trends', []),
            created_by=request.user
        )
        return Response({'id': retro.id}, status=status.HTTP_201_CREATED)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def retrospective_detail(request, pk):
    retro = get_object_or_404(Retrospective, pk=pk, organization=request.user.organization)
    
    if request.method == 'GET':
        return Response({
            'id': retro.id,
            'sprint': {'id': retro.sprint.id, 'name': retro.sprint.name} if retro.sprint else None,
            'created_at': retro.created_at,
            'what_went_well': retro.what_went_well,
            'what_needs_improvement': retro.what_needs_improvement,
            'action_items': retro.action_items,
            'recurring_issues': retro.recurring_issues,
            'positive_trends': retro.positive_trends,
        })
    
    elif request.method == 'PUT':
        if 'what_went_well' in request.data:
            retro.what_went_well = request.data.get('what_went_well') or []
        if 'what_needs_improvement' in request.data:
            retro.what_needs_improvement = request.data.get('what_needs_improvement') or []
        if 'action_items' in request.data:
            retro.action_items = request.data.get('action_items') or []
        if 'recurring_issues' in request.data:
            retro.recurring_issues = request.data.get('recurring_issues') or []
        if 'positive_trends' in request.data:
            retro.positive_trends = request.data.get('positive_trends') or []
        retro.save()
        return Response({'message': 'Retrospective updated'})
    
    elif request.method == 'DELETE':
        retro.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def retrospective_add_item(request, pk):
    retro = get_object_or_404(Retrospective, pk=pk, organization=request.user.organization)
    category = request.data.get('category')
    content = (request.data.get('content') or '').strip()
    if category not in {'went_well', 'needs_improvement', 'action_item'}:
        return Response({'error': 'category must be one of: went_well, needs_improvement, action_item'}, status=status.HTTP_400_BAD_REQUEST)
    if not content:
        return Response({'error': 'content is required'}, status=status.HTTP_400_BAD_REQUEST)

    if category == 'went_well':
        items = list(retro.what_went_well or [])
        items.append(content)
        retro.what_went_well = items
    elif category == 'needs_improvement':
        items = list(retro.what_needs_improvement or [])
        items.append(content)
        retro.what_needs_improvement = items
    else:
        items = list(retro.action_items or [])
        items.append(content)
        retro.action_items = items

    retro.save()
    return Response({'message': 'Item added'}, status=status.HTTP_201_CREATED)
