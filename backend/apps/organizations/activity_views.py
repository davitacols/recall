from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.contrib.contenttypes.models import ContentType
from .activity import Activity
from apps.conversations.models import Conversation, ConversationReply
from apps.decisions.models import Decision

class ActivityPagination(PageNumberPagination):
    page_size = 20

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def activity_feed(request):
    """Get recent activities for the organization"""
    activities = Activity.objects.filter(
        organization=request.user.organization
    ).select_related('actor', 'content_type')[:50]
    
    feed_items = []
    for activity in activities:
        item = {
            'id': activity.id,
            'actor': {
                'id': activity.actor.id,
                'name': activity.actor.get_full_name(),
                'username': activity.actor.username,
                'role': activity.actor.role,
            },
            'action_type': activity.action_type,
            'action_display': activity.get_action_type_display(),
            'created_at': activity.created_at.isoformat(),
            'metadata': activity.metadata,
        }
        
        # Add content object details
        if activity.content_object:
            if isinstance(activity.content_object, Conversation):
                item['content'] = {
                    'type': 'conversation',
                    'id': activity.content_object.id,
                    'title': activity.content_object.title,
                    'post_type': activity.content_object.post_type,
                }
            elif isinstance(activity.content_object, Decision):
                item['content'] = {
                    'type': 'decision',
                    'id': activity.content_object.id,
                    'title': activity.content_object.title,
                    'status': activity.content_object.status,
                }
        
        feed_items.append(item)
    
    return Response({'activities': feed_items})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def activity_stats(request):
    """Get activity statistics for the organization"""
    org = request.user.organization
    
    from django.utils import timezone
    from datetime import timedelta
    
    today = timezone.now().date()
    week_ago = today - timedelta(days=7)
    
    stats = {
        'today': Activity.objects.filter(
            organization=org,
            created_at__date=today
        ).count(),
        'this_week': Activity.objects.filter(
            organization=org,
            created_at__date__gte=week_ago
        ).count(),
        'total': Activity.objects.filter(organization=org).count(),
    }
    
    return Response(stats)
