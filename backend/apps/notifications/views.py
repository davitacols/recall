from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.views.decorators.csrf import csrf_exempt
from .models import Notification

@csrf_exempt
@api_view(['GET'])
def notifications_list(request):
    print(f"\n=== NOTIFICATION DEBUG ===")
    print(f"User: {request.user.username} (ID: {request.user.id})")
    
    from apps.notifications.models import Notification
    
    # Try both methods
    notifications_by_user = Notification.objects.filter(user=request.user)
    notifications_by_id = Notification.objects.filter(user_id=request.user.id)
    
    print(f"By user object: {notifications_by_user.count()}")
    print(f"By user_id: {notifications_by_id.count()}")
    
    # Use user_id method
    notifications = notifications_by_id.order_by('-created_at')
    unread_count = notifications.filter(is_read=False).count()
    
    print(f"Returning {notifications.count()} notifications")
    print(f"=== END DEBUG ===\n")
    
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

@csrf_exempt
@api_view(['POST'])
def mark_as_read(request, notification_id):
    try:
        notification = Notification.objects.get(id=notification_id, user=request.user)
        notification.is_read = True
        notification.save()
        return Response({'message': 'Marked as read'})
    except Notification.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

@csrf_exempt
@api_view(['POST'])
def mark_all_as_read(request):
    Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
    return Response({'message': 'All marked as read'})

@csrf_exempt
@api_view(['DELETE'])
def delete_notification(request, notification_id):
    try:
        notification = Notification.objects.get(id=notification_id, user=request.user)
        notification.delete()
        return Response({'message': 'Deleted'})
    except Notification.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
