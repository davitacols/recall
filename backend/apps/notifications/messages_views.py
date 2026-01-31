from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q
from apps.notifications.messages import PrivateMessage
from apps.notifications.models import Notification
from apps.organizations.models import User

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def messages_list(request):
    """List conversations or send message"""
    if request.method == 'GET':
        # Get all unique conversations
        conversations = PrivateMessage.objects.filter(
            Q(sender=request.user) | Q(recipient=request.user)
        ).values('sender_id', 'recipient_id').distinct()
        
        conv_list = []
        for conv in conversations:
            other_user_id = conv['recipient_id'] if conv['sender_id'] == request.user.id else conv['sender_id']
            other_user = User.objects.get(id=other_user_id)
            
            last_msg = PrivateMessage.objects.filter(
                Q(sender=request.user, recipient_id=other_user_id) |
                Q(sender_id=other_user_id, recipient=request.user)
            ).order_by('-created_at').first()
            
            unread = PrivateMessage.objects.filter(
                sender_id=other_user_id,
                recipient=request.user,
                is_read=False
            ).count()
            
            conv_list.append({
                'user_id': other_user.id,
                'user_name': other_user.get_full_name(),
                'last_message': last_msg.content[:50] if last_msg else '',
                'last_message_time': last_msg.created_at.isoformat() if last_msg else None,
                'unread_count': unread
            })
        
        return Response(conv_list)
    
    # POST - Send message
    recipient_id = request.data.get('recipient_id')
    content = request.data.get('content', '').strip()
    
    if not recipient_id or not content:
        return Response({'error': 'recipient_id and content required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        recipient = User.objects.get(id=recipient_id, organization=request.user.organization)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    
    message = PrivateMessage.objects.create(
        sender=request.user,
        recipient=recipient,
        content=content
    )
    
    # Create notification for recipient
    Notification.objects.create(
        user=recipient,
        notification_type='message',
        title=f'New message from {request.user.get_full_name()}',
        message=content[:100],
        link=f'/messages/{request.user.id}'
    )
    
    return Response({
        'id': message.id,
        'sender': request.user.get_full_name(),
        'recipient': recipient.get_full_name(),
        'content': message.content,
        'created_at': message.created_at.isoformat()
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def message_thread(request, user_id):
    """Get message thread with specific user"""
    try:
        other_user = User.objects.get(id=user_id, organization=request.user.organization)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    
    messages = PrivateMessage.objects.filter(
        Q(sender=request.user, recipient=other_user) |
        Q(sender=other_user, recipient=request.user)
    ).order_by('created_at')
    
    # Mark as read
    PrivateMessage.objects.filter(
        sender=other_user,
        recipient=request.user,
        is_read=False
    ).update(is_read=True)
    
    return Response({
        'user_id': other_user.id,
        'user_name': other_user.get_full_name(),
        'messages': [{
            'id': m.id,
            'sender_id': m.sender_id,
            'sender': m.sender.get_full_name(),
            'content': m.content,
            'is_read': m.is_read,
            'created_at': m.created_at.isoformat()
        } for m in messages]
    })

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_message(request, message_id):
    """Delete a message"""
    try:
        message = PrivateMessage.objects.get(id=message_id, sender=request.user)
        message.delete()
        return Response({'message': 'Deleted'})
    except PrivateMessage.DoesNotExist:
        return Response({'error': 'Message not found'}, status=status.HTTP_404_NOT_FOUND)
