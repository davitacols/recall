"""
Notification helpers for creating notifications on events
"""
from .models import Notification


def notify_mentioned_users(conversation, mentioned_user_ids):
    """Create mention notifications"""
    for user_id in mentioned_user_ids:
        if user_id != conversation.author_id:
            Notification.objects.create(
                user_id=user_id,
                notification_type='mention',
                title=f"Mentioned by {conversation.author.get_full_name()}",
                message=conversation.title,
                link=f'/conversations/{conversation.id}',
            )


def notify_conversation_reply(reply, conversation):
    """Create reply notification for conversation author"""
    if reply.author_id != conversation.author_id:
        Notification.objects.create(
            user_id=conversation.author_id,
            notification_type='reply',
            title=f"New reply from {reply.author.get_full_name()}",
            message=reply.content[:100],
            link=f'/conversations/{conversation.id}',
        )


def notify_decision_created(decision):
    """Create notification for new decision"""
    from apps.organizations.models import User
    
    # Notify stakeholders
    for stakeholder_id in decision.stakeholders or []:
        if stakeholder_id != decision.decision_maker_id:
            Notification.objects.create(
                user_id=stakeholder_id,
                notification_type='decision',
                title=f"New decision: {decision.title}",
                message=decision.description[:100],
                link=f'/decisions/{decision.id}',
            )


def notify_decision_status_change(decision, old_status):
    """Create notification when decision status changes"""
    if old_status != decision.status:
        from apps.organizations.models import User
        
        # Notify stakeholders
        for stakeholder_id in decision.stakeholders or []:
            Notification.objects.create(
                user_id=stakeholder_id,
                notification_type='decision',
                title=f"Decision status: {decision.status}",
                message=f"{decision.title} is now {decision.status}",
                link=f'/decisions/{decision.id}',
            )


def notify_reaction(conversation, user, reaction_type):
    """Create notification for reactions"""
    if user.id != conversation.author_id:
        Notification.objects.create(
            user_id=conversation.author_id,
            notification_type='reaction',
            title=f"{user.get_full_name()} reacted {reaction_type}",
            message=conversation.title,
            link=f'/conversations/{conversation.id}',
        )


def notify_sprint_started(sprint):
    """Create notification when sprint starts"""
    from apps.organizations.models import User
    
    # Notify all team members
    team_members = User.objects.filter(organization_id=sprint.organization_id)
    for member in team_members:
        Notification.objects.create(
            user_id=member.id,
            notification_type='system',
            title=f"Sprint started: {sprint.name}",
            message=sprint.goal[:100],
            link=f'/sprint/{sprint.id}',
        )


def notify_blocker_created(blocker):
    """Create notification for new blocker"""
    if blocker.assigned_to_id:
        Notification.objects.create(
            user_id=blocker.assigned_to_id,
            notification_type='system',
            title=f"New blocker: {blocker.title}",
            message=blocker.description[:100],
            link=f'/blockers/{blocker.id}',
        )
