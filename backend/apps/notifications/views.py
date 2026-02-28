from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from .models import Notification
from .email_service import send_email
from .utils import create_notification

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


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_test_email(request):
    """
    Send a test email through Resend to the current authenticated user.
    Restricted to admins to avoid abuse.
    """
    if request.user.role != 'admin':
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

    app_name = 'Knoledgr'
    subject = f'{app_name} email test'
    html = f"""
    <h2>{app_name} email configuration test</h2>
    <p>This confirms your Resend integration is working.</p>
    <p>From: {settings.DEFAULT_FROM_EMAIL}</p>
    <p>To: {request.user.email}</p>
    <p><a href="{settings.FRONTEND_URL}/notifications">Open notifications</a></p>
    """

    sent = send_email(request.user.email, subject, html)
    if not sent:
        return Response(
            {'error': 'Failed to send test email. Check Resend domain/sender and logs.'},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    return Response(
        {
            'message': 'Test email sent successfully',
            'to': request.user.email,
            'from': settings.DEFAULT_FROM_EMAIL,
        },
        status=status.HTTP_200_OK,
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_test_notification(request):
    """Create a deterministic in-app notification for the current user."""
    notification = create_notification(
        user=request.user,
        notification_type='system',
        title='Notification test',
        message='This is a test notification generated from settings.',
        link='/notifications',
    )
    return Response(
        {
            'message': 'Test notification created',
            'notification_id': notification.id,
        },
        status=status.HTTP_201_CREATED,
    )
