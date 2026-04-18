from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.conversations.models import Conversation, ConversationReply
from apps.decisions.models import Decision

from .models import User


def _avatar_url_for(request, member):
    if getattr(member, "avatar", None):
        try:
            avatar_url = member.avatar.url
            if avatar_url.startswith("http://") or avatar_url.startswith("https://"):
                return avatar_url
            return request.build_absolute_uri(avatar_url)
        except Exception:
            pass
    return getattr(member, "avatar_url", "") or None


def _serialize_team_member_profile(request, member):
    return {
        "id": member.id,
        "username": member.username,
        "email": member.email,
        "full_name": member.get_full_name(),
        "bio": member.bio or "",
        "role": member.role,
        "timezone": member.timezone or "UTC",
        "avatar": _avatar_url_for(request, member),
        "organization_name": member.organization.name,
        "organization_slug": member.organization.slug,
        "date_joined": member.date_joined,
        "last_active": member.last_active or member.last_login,
        "is_self": member.id == request.user.id,
    }


def _build_recent_activity(member):
    org = member.organization

    conversations = [
        {
            "id": conversation.id,
            "type": "conversation",
            "title": conversation.title,
            "subtitle": conversation.get_post_type_display(),
            "href": f"/conversations/{conversation.id}",
            "timestamp": conversation.updated_at or conversation.created_at,
        }
        for conversation in Conversation.objects.filter(
            organization=org,
            author=member,
        )
        .order_by("-updated_at", "-created_at")[:4]
    ]

    replies = [
        {
            "id": reply.id,
            "type": "reply",
            "title": reply.conversation.title,
            "subtitle": "Reply added",
            "href": f"/conversations/{reply.conversation_id}",
            "timestamp": reply.created_at,
        }
        for reply in ConversationReply.objects.filter(
            conversation__organization=org,
            author=member,
        )
        .select_related("conversation")
        .order_by("-created_at")[:4]
    ]

    decisions = [
        {
            "id": decision.id,
            "type": "decision",
            "title": decision.title,
            "subtitle": decision.get_status_display(),
            "href": f"/decisions/{decision.id}",
            "timestamp": decision.decided_at or decision.created_at,
        }
        for decision in Decision.objects.filter(
            organization=org,
            decision_maker=member,
        )
        .order_by("-decided_at", "-created_at")[:4]
    ]

    items = conversations + replies + decisions
    items.sort(key=lambda item: item["timestamp"], reverse=True)

    return [
        {
            **item,
            "timestamp": item["timestamp"].isoformat() if item.get("timestamp") else None,
        }
        for item in items[:6]
    ]


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_team_members(request):
    """Get all team members in the user's organization"""
    if not hasattr(request.user, 'organization') or not request.user.organization:
        return Response({'error': 'User does not have an organization'}, status=400)
    
    members = User.objects.filter(
        organization=request.user.organization,
        is_active=True
    ).values(
        'id', 'username', 'email', 'full_name', 'is_active', 'role', 'date_joined'
    )
    
    return Response(list(members))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_team_member_profile(request, user_id):
    if not hasattr(request.user, 'organization') or not request.user.organization:
        return Response({'error': 'User does not have an organization'}, status=400)

    try:
        member = User.objects.select_related('organization').get(
            id=user_id,
            organization=request.user.organization,
            is_active=True,
        )
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=404)

    profile_data = _serialize_team_member_profile(request, member)
    profile_data['stats'] = {
        'conversations': Conversation.objects.filter(
            organization=request.user.organization,
            author=member,
        ).count(),
        'replies': ConversationReply.objects.filter(
            conversation__organization=request.user.organization,
            author=member,
        ).count(),
        'decisions': Decision.objects.filter(
            organization=request.user.organization,
            decision_maker=member,
        ).count(),
    }
    return Response(profile_data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_role_info(request, user_id):
    try:
        member = User.objects.get(id=user_id, organization=request.user.organization, is_active=True)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=404)
    role = 'contributor' if member.role == 'member' else member.role
    return Response({'role': role, 'permissions': []})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_user_role(request, user_id):
    if request.user.role != 'admin':
        return Response({'error': 'Admin access required'}, status=403)

    if request.user.id == user_id:
        return Response({'error': 'Cannot change your own role here'}, status=400)

    new_role = request.data.get('role')
    if new_role == 'member':
        new_role = 'contributor'
    if new_role not in ['admin', 'manager', 'contributor']:
        return Response({'error': 'Invalid role'}, status=400)

    try:
        member = User.objects.get(id=user_id, organization=request.user.organization, is_active=True)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=404)

    member.role = new_role
    member.save(update_fields=['role'])
    return Response({'message': 'Role updated', 'role': new_role})

@api_view(['DELETE', 'POST'])
@permission_classes([IsAuthenticated])
def remove_user(request, user_id):
    if request.user.role != 'admin':
        return Response({'error': 'Admin access required'}, status=403)

    if request.user.id == user_id:
        return Response({'error': 'Cannot remove yourself'}, status=400)

    try:
        member = User.objects.get(id=user_id, organization=request.user.organization, is_active=True)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=404)

    member.is_active = False
    member.save(update_fields=['is_active'])
    return Response({'message': 'User removed'})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_audit_logs(request):
    return Response([])

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_activity(request, user_id):
    if not hasattr(request.user, 'organization') or not request.user.organization:
        return Response({'error': 'User does not have an organization'}, status=400)

    try:
        member = User.objects.select_related('organization').get(
            id=user_id,
            organization=request.user.organization,
            is_active=True,
        )
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=404)

    return Response(_build_recent_activity(member))

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_team_workflow(request):
    return Response({'message': 'Workflow created'})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def activate_workflow(request, workflow_id):
    return Response({'message': 'Workflow activated'})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_team_workflows(request):
    return Response([])

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_workflow_instances(request, workflow_id):
    return Response([])

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def approve_workflow_step(request, instance_id):
    return Response({'message': 'Step approved'})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reject_workflow_step(request, instance_id):
    return Response({'message': 'Step rejected'})


def log_action(organization, user, action, details=None):
    """Helper function to log user actions"""
    pass
