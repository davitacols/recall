from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.db.models import Q
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from .models import Decision
from apps.organizations.activity import log_activity

@csrf_exempt
@api_view(['GET', 'POST'])
def decisions(request):
    if request.method == 'GET':
        queryset = Decision.objects.filter(
            organization=request.user.organization
        )
        
        # Filter by status
        decision_status = request.GET.get('status')
        if decision_status:
            queryset = queryset.filter(status=decision_status)
        
        # Search
        search = request.GET.get('search')
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) | Q(description__icontains=search)
            )
        
        decisions_data = []
        for decision in queryset[:20]:  # Limit to 20
            confidence = calculate_confidence(decision)
            decisions_data.append({
                'id': decision.id,
                'title': decision.title,
                'description': decision.description[:200] + '...' if len(decision.description) > 200 else decision.description,
                'status': decision.status,
                'impact_level': decision.impact_level,
                'decision_maker': decision.decision_maker.get_full_name() if decision.decision_maker else None,
                'decision_maker_name': decision.decision_maker.get_full_name() if decision.decision_maker else None,
                'created_at': decision.created_at,
                'decided_at': decision.decided_at,
                'confidence': confidence
            })
        
        return Response(decisions_data)
    
    elif request.method == 'POST':
        data = request.data
        
        # Get conversation if provided
        conversation = None
        if data.get('conversation_id'):
            from apps.conversations.models import Conversation
            try:
                conversation = Conversation.objects.get(
                    id=data['conversation_id'],
                    organization=request.user.organization
                )
            except Conversation.DoesNotExist:
                pass
        
        decision = Decision.objects.create(
            organization=request.user.organization,
            conversation=conversation,
            title=data['title'],
            description=data['description'],
            rationale=data.get('rationale', ''),
            impact_level=data.get('impact_level', 'medium'),
            decision_maker=request.user,
            sprint_id=data.get('sprint_id')  # Link to sprint if provided
        )
        
        # Log activity
        log_activity(
            organization=request.user.organization,
            actor=request.user,
            action_type='decision_created',
            content_object=decision,
            title=decision.title
        )
        
        # Notify Slack only
        from apps.integrations.utils import notify_decision_created
        notify_decision_created(decision)
        
        # Update onboarding progress
        if not request.user.first_decision_made:
            request.user.first_decision_made = True
            request.user.save(update_fields=['first_decision_made'])
        
        return Response({
            'id': decision.id,
            'title': decision.title,
            'status': decision.status,
            'created_at': decision.created_at
        }, status=status.HTTP_201_CREATED)

@api_view(['POST'])
def approve_decision(request, decision_id):
    if not request.user.can_approve_decisions:
        return Response({'error': 'Permission denied'}, 
                       status=status.HTTP_403_FORBIDDEN)
    
    try:
        decision = Decision.objects.get(
            id=decision_id,
            organization=request.user.organization
        )
        
        decision.approve()
        
        # Notify decision maker
        from apps.notifications.utils import create_notification
        if decision.decision_maker != request.user:
            create_notification(
                user=decision.decision_maker,
                notification_type='decision',
                title='Decision Approved',
                message=f'Your decision "{decision.title}" was approved',
                link=f'/decisions/{decision.id}'
            )
        
        # Log activity
        log_activity(
            organization=request.user.organization,
            actor=request.user,
            action_type='decision_approved',
            content_object=decision,
            title=decision.title
        )
        
        return Response({'status': 'approved'})
    except Decision.DoesNotExist:
        return Response({'error': 'Decision not found'}, 
                       status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
def decisions_timeline(request):
    decisions = Decision.objects.filter(
        organization=request.user.organization,
        status__in=['approved', 'implemented']
    ).order_by('-decided_at')[:50]
    
    timeline_data = []
    for decision in decisions:
        timeline_data.append({
            'id': decision.id,
            'title': decision.title,
            'impact_level': decision.impact_level,
            'decided_at': decision.decided_at,
            'decision_maker': decision.decision_maker.get_full_name() if decision.decision_maker else None,
        })
    
    return Response(timeline_data)

@api_view(['GET'])
def decision_detail(request, decision_id):
    try:
        decision = Decision.objects.get(
            id=decision_id,
            organization=request.user.organization
        )
        
        confidence = calculate_confidence(decision)
        
        return Response({
            'id': decision.id,
            'title': decision.title,
            'description': decision.description,
            'rationale': decision.rationale,
            'impact_assessment': decision.impact_assessment,
            'status': decision.status,
            'impact_level': decision.impact_level,
            'decision_maker_name': decision.decision_maker.get_full_name() if decision.decision_maker else None,
            'created_at': decision.created_at,
            'decided_at': decision.decided_at,
            'implemented_at': decision.implemented_at,
            'conversation': decision.conversation_id,
            'confidence': confidence,
            'context_reason': decision.context_reason or '',
            'if_this_fails': decision.if_this_fails or '',
            'confidence_level': decision.confidence_level,
            'confidence_votes': decision.confidence_votes or [],
            'code_links': decision.code_links or [],
            'alternatives_considered': decision.alternatives_considered or []
        })
    except Decision.DoesNotExist:
        return Response({'error': 'Decision not found'}, status=status.HTTP_404_NOT_FOUND)

def calculate_confidence(decision):
    """Calculate decision confidence based on reactions and discussion"""
    from apps.conversations.models import Reaction
    
    if not decision.conversation:
        return {'score': 50, 'level': 'Medium', 'factors': [], 'agree_count': 0, 'unsure_count': 0, 'concern_count': 0}
    
    conv = decision.conversation
    
    reactions = Reaction.objects.filter(conversation=conv)
    agree_count = reactions.filter(reaction_type='agree').count()
    unsure_count = reactions.filter(reaction_type='unsure').count()
    concern_count = reactions.filter(reaction_type='concern').count()
    total_reactions = agree_count + unsure_count + concern_count
    
    reaction_score = 0
    if total_reactions > 0:
        reaction_score = (agree_count / total_reactions) * 40
    
    discussion_score = min(conv.reply_count * 5, 30)
    participation_score = min(total_reactions * 10, 30)
    
    total_score = reaction_score + discussion_score + participation_score
    
    if total_score >= 75:
        level = 'High'
    elif total_score >= 50:
        level = 'Medium'
    else:
        level = 'Low'
    
    factors = [
        f'{agree_count} agree, {unsure_count} unsure, {concern_count} concern',
        f'{conv.reply_count} replies',
        f'{total_reactions} total reactions'
    ]
    
    return {
        'score': round(total_score),
        'level': level,
        'factors': factors,
        'agree_count': agree_count,
        'unsure_count': unsure_count,
        'concern_count': concern_count
    }

@api_view(['POST'])
def implement_decision(request, decision_id):
    try:
        decision = Decision.objects.get(
            id=decision_id,
            organization=request.user.organization
        )
        
        decision.status = 'implemented'
        decision.implemented_at = timezone.now()
        decision.save()
        
        log_activity(
            organization=request.user.organization,
            actor=request.user,
            action_type='decision_implemented',
            content_object=decision,
            title=decision.title
        )
        
        return Response({'status': 'implemented'})
    except Decision.DoesNotExist:
        return Response({'error': 'Decision not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
def convert_to_decision(request, conversation_id):
    from apps.conversations.models import Conversation
    
    try:
        conversation = Conversation.objects.get(
            id=conversation_id,
            organization=request.user.organization
        )
        
        # Check if decision already exists
        if Decision.objects.filter(conversation=conversation).exists():
            return Response({'error': 'Decision already exists for this conversation'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        # Generate AI summary from conversation
        from apps.agile.ai_service import generate_sprint_update_summary
        ai_summary = generate_sprint_update_summary(
            conversation.title,
            conversation.content
        )
        
        # Create decision from conversation
        decision = Decision.objects.create(
            organization=request.user.organization,
            conversation=conversation,
            title=conversation.title,
            description=conversation.content,
            rationale=ai_summary,
            impact_level=request.data.get('impact_level', 'medium'),
            decision_maker=request.user,
            status='proposed'
        )
        
        log_activity(
            organization=request.user.organization,
            actor=request.user,
            action_type='decision_created',
            content_object=decision,
            title=decision.title
        )
        
        # Notify Slack
        from apps.integrations.utils import notify_decision_created
        notify_decision_created(decision)
        
        return Response({
            'id': decision.id,
            'title': decision.title,
            'status': decision.status,
            'ai_summary': ai_summary
        }, status=status.HTTP_201_CREATED)
        
    except Conversation.DoesNotExist:
        return Response({'error': 'Conversation not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
def decisions_needing_reminders(request):
    """Get decisions that need reminders"""
    decisions = Decision.objects.filter(
        organization=request.user.organization,
        status__in=['approved', 'under_review'],
        reminder_enabled=True
    )
    
    reminders = []
    for decision in decisions:
        if decision.needs_reminder:
            days_since = (timezone.now() - decision.decided_at).days if decision.decided_at else 0
            reminders.append({
                'id': decision.id,
                'title': decision.title,
                'status': decision.status,
                'impact_level': decision.impact_level,
                'decided_at': decision.decided_at,
                'days_since_approval': days_since,
                'is_critical': decision.impact_level == 'critical',
                'is_overdue': decision.is_overdue
            })
    
    return Response(reminders)

@api_view(['POST'])
def mark_reminded(request, decision_id):
    """Mark decision as reminded"""
    try:
        decision = Decision.objects.get(
            id=decision_id,
            organization=request.user.organization
        )
        decision.last_reminded_at = timezone.now()
        decision.save()
        return Response({'message': 'Marked as reminded'})
    except Decision.DoesNotExist:
        return Response({'error': 'Decision not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['GET', 'POST'])
def proposals(request):
    """List or create proposals"""
    from .models import Proposal
    
    if request.method == 'GET':
        proposals = Proposal.objects.filter(organization=request.user.organization)
        data = [{
            'id': p.id,
            'title': p.title,
            'description': p.description[:200],
            'status': p.status,
            'proposed_by': p.proposed_by.get_full_name(),
            'created_at': p.created_at,
            'accepted_at': p.accepted_at
        } for p in proposals]
        return Response(data)
    
    elif request.method == 'POST':
        proposal = Proposal.objects.create(
            organization=request.user.organization,
            title=request.data['title'],
            description=request.data['description'],
            rationale=request.data.get('rationale', ''),
            alternatives_considered=request.data.get('alternatives_considered', ''),
            risks=request.data.get('risks', ''),
            proposed_by=request.user,
            status='open'
        )
        return Response({'id': proposal.id, 'title': proposal.title}, status=status.HTTP_201_CREATED)

@api_view(['POST'])
def accept_proposal(request, proposal_id):
    """Accept proposal and convert to decision"""
    from .models import Proposal
    
    try:
        proposal = Proposal.objects.get(
            id=proposal_id,
            organization=request.user.organization
        )
        
        if proposal.status != 'open':
            return Response({'error': 'Proposal is not open'}, status=400)
        
        # Create decision from proposal
        decision = Decision.objects.create(
            organization=request.user.organization,
            title=proposal.title,
            description=proposal.description,
            rationale=proposal.rationale,
            impact_level=request.data.get('impact_level', 'medium'),
            decision_maker=request.user,
            status='approved',
            alternatives_considered=proposal.alternatives_considered,
            context_reason=proposal.risks
        )
        
        # Link proposal to decision
        proposal.decision = decision
        proposal.status = 'accepted'
        proposal.accepted_by = request.user
        proposal.accepted_at = timezone.now()
        proposal.save()
        
        log_activity(
            organization=request.user.organization,
            actor=request.user,
            action_type='decision_created',
            content_object=decision,
            title=decision.title
        )
        
        # Notify Slack
        from apps.integrations.utils import notify_decision_created
        notify_decision_created(decision)
        
        return Response({
            'id': decision.id,
            'title': decision.title,
            'status': decision.status
        })
    except Proposal.DoesNotExist:
        return Response({'error': 'Proposal not found'}, status=404)

@api_view(['POST'])
def reject_proposal(request, proposal_id):
    """Reject proposal"""
    from .models import Proposal
    
    try:
        proposal = Proposal.objects.get(
            id=proposal_id,
            organization=request.user.organization
        )
        proposal.status = 'rejected'
        proposal.accepted_by = request.user
        proposal.accepted_at = timezone.now()
        proposal.save()
        return Response({'message': 'Proposal rejected'})
    except Proposal.DoesNotExist:
        return Response({'error': 'Proposal not found'}, status=404)

@api_view(['POST'])
def link_pr(request, decision_id):
    try:
        decision = Decision.objects.get(
            id=decision_id,
            organization=request.user.organization
        )
        
        pr_url = request.data.get('pr_url')
        if not pr_url:
            return Response({'error': 'PR URL required'}, status=status.HTTP_400_BAD_REQUEST)
        
        if not decision.code_links:
            decision.code_links = []
        
        import re
        match = re.search(r'github\.com/([^/]+)/([^/]+)/pull/(\d+)', pr_url)
        if match:
            owner, repo, pr_number = match.groups()
            decision.code_links.append({
                'type': 'github_pr',
                'url': pr_url,
                'title': f'{owner}/{repo}#{pr_number}',
                'number': int(pr_number)
            })
        else:
            decision.code_links.append({
                'type': 'link',
                'url': pr_url,
                'title': pr_url
            })
        
        decision.save()
        return Response({'message': 'PR linked successfully'}, status=status.HTTP_201_CREATED)
    except Decision.DoesNotExist:
        return Response({'error': 'Decision not found'}, status=status.HTTP_404_NOT_FOUND)