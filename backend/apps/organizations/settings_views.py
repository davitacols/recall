from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.hashers import check_password, make_password
from django.db import transaction
from django.utils import timezone
from .models import Organization, User
from apps.conversations.models import UserPreferences, Badge
from apps.notifications.models import Notification

@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def user_profile(request):
    """Get or update user profile"""
    user = request.user
    
    if request.method == 'GET':
        return Response({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'full_name': user.full_name,
            'role': user.role,
            'bio': user.bio or '',
            'avatar_url': user.avatar.url if user.avatar else None,
            'joined_at': user.date_joined,
            'last_login': user.last_login,
            'is_active': user.is_active,
            'organization': {
                'id': user.organization.id,
                'name': user.organization.name,
                'slug': user.organization.slug
            }
        })
    
    elif request.method == 'PUT':
        # Update allowed fields
        if 'full_name' in request.data:
            user.full_name = request.data['full_name']
        if 'bio' in request.data:
            user.bio = request.data['bio']
        if 'email' in request.data:
            # Check if email is already taken
            if User.objects.filter(email=request.data['email']).exclude(id=user.id).exists():
                return Response({'error': 'Email already in use'}, status=status.HTTP_400_BAD_REQUEST)
            user.email = request.data['email']
        
        user.save()
        
        return Response({
            'message': 'Profile updated successfully',
            'user': {
                'full_name': user.full_name,
                'email': user.email,
                'bio': user.bio
            }
        })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    """Change user password"""
    user = request.user
    
    current_password = request.data.get('current_password')
    new_password = request.data.get('new_password')
    confirm_password = request.data.get('confirm_password')
    
    if not all([current_password, new_password, confirm_password]):
        return Response({'error': 'All fields are required'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Verify current password
    if not check_password(current_password, user.password):
        return Response({'error': 'Current password is incorrect'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Verify new passwords match
    if new_password != confirm_password:
        return Response({'error': 'New passwords do not match'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Validate password strength
    if len(new_password) < 8:
        return Response({'error': 'Password must be at least 8 characters'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Update password
    user.password = make_password(new_password)
    user.save()
    
    return Response({'message': 'Password changed successfully'})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_stats(request):
    """Get user activity statistics"""
    user = request.user
    
    from apps.conversations.models import Conversation, ConversationReply
    from apps.decisions.models import Decision
    from datetime import timedelta
    
    week_ago = timezone.now() - timedelta(days=7)
    month_ago = timezone.now() - timedelta(days=30)
    
    stats = {
        'total_conversations': Conversation.objects.filter(author=user).count(),
        'total_replies': ConversationReply.objects.filter(author=user).count(),
        'total_decisions': Decision.objects.filter(decision_maker=user).count(),
        'this_week': {
            'conversations': Conversation.objects.filter(author=user, created_at__gte=week_ago).count(),
            'replies': ConversationReply.objects.filter(author=user, created_at__gte=week_ago).count(),
        },
        'this_month': {
            'conversations': Conversation.objects.filter(author=user, created_at__gte=month_ago).count(),
            'replies': ConversationReply.objects.filter(author=user, created_at__gte=month_ago).count(),
        },
        'badges_earned': Badge.objects.filter(user=user).count()
    }
    
    return Response(stats)

@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def notification_settings(request):
    """Get or update notification settings"""
    user = request.user
    
    if request.method == 'GET':
        return Response({
            'email_notifications': getattr(user, 'email_notifications', True),
            'mention_notifications': getattr(user, 'mention_notifications', True),
            'reply_notifications': getattr(user, 'reply_notifications', True),
            'decision_notifications': getattr(user, 'decision_notifications', True),
            'digest_frequency': getattr(user, 'digest_frequency', 'daily')
        })
    
    elif request.method == 'PUT':
        if 'email_notifications' in request.data:
            user.email_notifications = request.data['email_notifications']
        if 'mention_notifications' in request.data:
            user.mention_notifications = request.data['mention_notifications']
        if 'reply_notifications' in request.data:
            user.reply_notifications = request.data['reply_notifications']
        if 'decision_notifications' in request.data:
            user.decision_notifications = request.data['decision_notifications']
        if 'digest_frequency' in request.data:
            user.digest_frequency = request.data['digest_frequency']
        
        user.save()
        
        return Response({'message': 'Notification settings updated'})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def organization_settings(request):
    """Get organization settings (admin only)"""
    user = request.user
    org = user.organization
    
    if user.role != 'admin':
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)
    
    return Response({
        'id': org.id,
        'name': org.name,
        'slug': org.slug,
        'created_at': org.created_at,
        'total_users': org.users.count(),
        'active_users': org.users.filter(is_active=True).count(),
        'total_conversations': org.conversation_set.count(),
        'total_decisions': org.decision_set.count(),
        'settings': {
            'allow_public_signup': getattr(org, 'allow_public_signup', False),
            'require_approval': getattr(org, 'require_approval', True),
            'max_users': getattr(org, 'max_users', 100)
        }
    })

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_organization(request):
    """Update organization settings (admin only)"""
    user = request.user
    org = user.organization
    
    if user.role != 'admin':
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)
    
    if 'name' in request.data:
        org.name = request.data['name']
    
    org.save()
    
    return Response({'message': 'Organization updated', 'name': org.name})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def organization_members(request):
    """Get organization members"""
    org = request.user.organization
    
    members = User.objects.filter(organization=org, is_active=True)
    
    members_data = []
    for member in members:
        members_data.append({
            'id': member.id,
            'username': member.username,
            'full_name': member.full_name,
            'email': member.email,
            'role': member.role,
            'joined_at': member.date_joined,
            'last_login': member.last_login,
            'is_active': member.is_active,
            'avatar_url': member.avatar.url if member.avatar else None
        })
    
    return Response(members_data)

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_member_role(request, user_id):
    """Update member role (admin only)"""
    if request.user.role != 'admin':
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        member = User.objects.get(id=user_id, organization=request.user.organization)
        
        new_role = request.data.get('role')
        if new_role not in ['admin', 'manager', 'contributor']:
            return Response({'error': 'Invalid role'}, status=status.HTTP_400_BAD_REQUEST)
        
        member.role = new_role
        member.save()
        
        return Response({'message': 'Role updated', 'role': new_role})
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def remove_member(request, user_id):
    """Remove member from organization (admin only)"""
    if request.user.role != 'admin':
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)
    
    if request.user.id == user_id:
        return Response({'error': 'Cannot remove yourself'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        member = User.objects.get(id=user_id, organization=request.user.organization)
        member.is_active = False
        member.save()
        
        return Response({'message': 'Member removed'})
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def invite_member(request):
    """Invite new member (admin only)"""
    if request.user.role != 'admin':
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)
    
    email = request.data.get('email')
    role = request.data.get('role', 'contributor')
    
    if not email:
        return Response({'error': 'Email required'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Check if user already exists
    if User.objects.filter(email=email).exists():
        return Response({'error': 'User with this email already exists'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Create invitation
    from apps.organizations.models import Invitation
    invitation = Invitation.objects.create(
        organization=request.user.organization,
        email=email,
        role=role,
        invited_by=request.user
    )
    
    # TODO: Send invitation email
    
    return Response({
        'message': 'Invitation sent',
        'invitation_id': invitation.id,
        'email': email
    }, status=status.HTTP_201_CREATED)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def api_keys(request):
    """Get user API keys"""
    # Placeholder for API key management
    return Response({
        'keys': [],
        'message': 'API key management coming soon'
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_api_key(request):
    """Generate new API key"""
    import secrets
    
    key = secrets.token_urlsafe(32)
    
    # TODO: Store API key in database
    
    return Response({
        'key': key,
        'created_at': timezone.now(),
        'message': 'Save this key securely. It will not be shown again.'
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_data(request):
    """Export user data"""
    user = request.user
    
    from apps.conversations.models import Conversation, ConversationReply
    from apps.decisions.models import Decision
    
    data = {
        'user': {
            'username': user.username,
            'email': user.email,
            'full_name': user.full_name,
            'joined_at': user.date_joined.isoformat()
        },
        'conversations': list(Conversation.objects.filter(author=user).values(
            'id', 'title', 'content', 'post_type', 'created_at'
        )),
        'replies': list(ConversationReply.objects.filter(author=user).values(
            'id', 'content', 'created_at'
        )),
        'decisions': list(Decision.objects.filter(decision_maker=user).values(
            'id', 'title', 'description', 'status', 'created_at'
        ))
    }
    
    return Response(data)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_account(request):
    """Delete user account"""
    user = request.user
    
    password = request.data.get('password')
    confirm = request.data.get('confirm')
    
    if not password or confirm != 'DELETE':
        return Response({'error': 'Password and confirmation required'}, status=status.HTTP_400_BAD_REQUEST)
    
    if not check_password(password, user.password):
        return Response({'error': 'Incorrect password'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Soft delete
    user.is_active = False
    user.email = f"deleted_{user.id}@deleted.com"
    user.save()
    
    return Response({'message': 'Account deleted'})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def activity_log(request):
    """Get user activity log"""
    from apps.organizations.models import ActivityLog
    
    logs = ActivityLog.objects.filter(
        actor=request.user
    ).order_by('-created_at')[:50]
    
    logs_data = []
    for log in logs:
        logs_data.append({
            'id': log.id,
            'action_type': log.action_type,
            'title': log.title,
            'created_at': log.created_at,
            'details': log.details
        })
    
    return Response(logs_data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def security_log(request):
    """Get security events"""
    # Placeholder for security logging
    return Response({
        'events': [
            {
                'type': 'login',
                'timestamp': request.user.last_login,
                'ip_address': request.META.get('REMOTE_ADDR'),
                'user_agent': request.META.get('HTTP_USER_AGENT')
            }
        ]
    })
