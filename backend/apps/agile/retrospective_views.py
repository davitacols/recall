from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from .models import Retrospective, RetrospectiveItem

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def retrospectives_list(request):
    if request.method == 'GET':
        retros = Retrospective.objects.filter(organization=request.user.organization).order_by('-created_at')
        data = [{
            'id': r.id,
            'title': r.title,
            'sprint': {'id': r.sprint.id, 'name': r.sprint.name} if r.sprint else None,
            'date': r.date,
            'created_at': r.created_at
        } for r in retros]
        return Response(data)
    
    elif request.method == 'POST':
        retro = Retrospective.objects.create(
            organization=request.user.organization,
            title=request.data['title'],
            sprint_id=request.data.get('sprint_id'),
            date=request.data.get('date'),
            created_by=request.user
        )
        return Response({'id': retro.id}, status=status.HTTP_201_CREATED)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def retrospective_detail(request, pk):
    retro = get_object_or_404(Retrospective, pk=pk, organization=request.user.organization)
    
    if request.method == 'GET':
        items = RetrospectiveItem.objects.filter(retrospective=retro)
        return Response({
            'id': retro.id,
            'title': retro.title,
            'sprint': {'id': retro.sprint.id, 'name': retro.sprint.name} if retro.sprint else None,
            'date': retro.date,
            'created_at': retro.created_at,
            'items': [{
                'id': i.id,
                'category': i.category,
                'content': i.content,
                'votes': i.votes,
                'action_item': i.action_item,
                'created_by': {'id': i.created_by.id, 'full_name': i.created_by.full_name} if i.created_by else None
            } for i in items]
        })
    
    elif request.method == 'PUT':
        retro.title = request.data.get('title', retro.title)
        retro.date = request.data.get('date', retro.date)
        retro.save()
        return Response({'message': 'Retrospective updated'})
    
    elif request.method == 'DELETE':
        retro.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def retrospective_add_item(request, pk):
    retro = get_object_or_404(Retrospective, pk=pk, organization=request.user.organization)
    item = RetrospectiveItem.objects.create(
        retrospective=retro,
        category=request.data['category'],
        content=request.data['content'],
        action_item=request.data.get('action_item', False),
        created_by=request.user
    )
    return Response({'id': item.id}, status=status.HTTP_201_CREATED)
