from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from apps.conversations.models import Conversation
from apps.decisions.models import Decision
from apps.knowledge.models import KnowledgeEntry
from apps.agile.models import Project, Issue
from apps.business.models import Goal, Meeting, Task
from apps.business.document_models import Document

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def global_search(request):
    query = request.GET.get('q', '')
    if not query:
        return Response([])
    
    org = request.user.organization
    results = []
    
    # Search conversations
    conversations = Conversation.objects.filter(
        organization=org, title__icontains=query
    )[:5]
    results.extend([{
        'type': 'conversation',
        'id': c.id,
        'title': c.title,
        'url': f'/conversations/{c.id}',
        'created_at': c.created_at
    } for c in conversations])
    
    # Search decisions
    decisions = Decision.objects.filter(
        organization=org, title__icontains=query
    )[:5]
    results.extend([{
        'type': 'decision',
        'id': d.id,
        'title': d.title,
        'url': f'/decisions/{d.id}',
        'created_at': d.created_at
    } for d in decisions])
    
    # Search knowledge
    knowledge = KnowledgeEntry.objects.filter(
        organization=org, title__icontains=query
    )[:5]
    results.extend([{
        'type': 'knowledge',
        'id': k.id,
        'title': k.title,
        'url': f'/knowledge',
        'created_at': k.created_at
    } for k in knowledge])
    
    # Search projects
    projects = Project.objects.filter(
        organization=org, name__icontains=query
    )[:5]
    results.extend([{
        'type': 'project',
        'id': p.id,
        'title': p.name,
        'url': f'/projects/{p.id}',
        'created_at': p.created_at
    } for p in projects])
    
    # Search goals
    goals = Goal.objects.filter(
        organization=org, title__icontains=query
    )[:5]
    results.extend([{
        'type': 'goal',
        'id': g.id,
        'title': g.title,
        'url': f'/business/goals/{g.id}',
        'created_at': g.created_at
    } for g in goals])
    
    # Search documents
    documents = Document.objects.filter(
        organization=org, title__icontains=query
    )[:5]
    results.extend([{
        'type': 'document',
        'id': d.id,
        'title': d.title,
        'url': f'/business/documents/{d.id}',
        'created_at': d.created_at
    } for d in documents])
    
    return Response(results[:20])
