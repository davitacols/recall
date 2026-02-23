from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from django.http import HttpResponse
from apps.knowledge.unified_models import ContentLink, UnifiedActivity
from apps.conversations.models import Conversation
from apps.decisions.models import Decision
import json
from datetime import datetime

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_knowledge(request):
    """Export knowledge graph and activity as JSON"""
    org = request.user.organization
    
    # Get all content
    conversations = Conversation.objects.filter(organization=org).values(
        'id', 'title', 'content', 'created_at', 'author__full_name'
    )
    
    decisions = Decision.objects.filter(organization=org).values(
        'id', 'title', 'description', 'status', 'created_at', 'decision_maker__full_name'
    )
    
    # Get all links
    links = ContentLink.objects.filter(organization=org).values(
        'source_content_type__model', 'source_object_id',
        'target_content_type__model', 'target_object_id',
        'link_type', 'strength', 'created_at'
    )
    
    # Get activity
    activities = UnifiedActivity.objects.filter(organization=org).order_by('-created_at')[:100].values(
        'activity_type', 'title', 'created_at', 'user__full_name'
    )
    
    # Build export data
    export_data = {
        'organization': org.name,
        'exported_at': datetime.now().isoformat(),
        'summary': {
            'total_conversations': len(conversations),
            'total_decisions': len(decisions),
            'total_links': len(links),
            'total_activities': len(activities)
        },
        'conversations': list(conversations),
        'decisions': list(decisions),
        'links': list(links),
        'recent_activity': list(activities)
    }
    
    # Create response
    response = HttpResponse(
        json.dumps(export_data, indent=2, default=str),
        content_type='application/json'
    )
    response['Content-Disposition'] = f'attachment; filename="knowledge_export_{org.name}_{datetime.now().strftime("%Y%m%d")}.json"'
    
    return response
