from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import Notification

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def notifications_list(request):
    notifications = Notification.objects.filter(user_id=request.user.id).order_by('-created_at')
    unread_count = notifications.filter(is_read=False).count()
    
    return Response({
        'notifications': [{
            'id': n.id,
            'type': n.notification_type,
            'title': n.title,
            'message': n.message,
            'link': n.link,
            'is_read': n.is_read,
            'created_at': n.created_at
        } for n in notifications[:50]],
        'unread_count': unread_count
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_as_read(request, notification_id):
    try:
        notification = Notification.objects.get(id=notification_id, user_id=request.user.id)
        notification.is_read = True
        notification.save()
        return Response({'message': 'Marked as read'})
    except Notification.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_all_as_read(request):
    Notification.objects.filter(user_id=request.user.id, is_read=False).update(is_read=True)
    return Response({'message': 'All marked as read'})

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_notification(request, notification_id):
    try:
        notification = Notification.objects.get(id=notification_id, user_id=request.user.id)
        notification.delete()
        return Response({'message': 'Deleted'})
    except Notification.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
