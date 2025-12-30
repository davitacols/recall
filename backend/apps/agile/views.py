from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Count, Q
from datetime import timedelta
from apps.agile.models import Sprint, Blocker, Retrospective, SprintUpdate
from apps.agile.ai_service import generate_sprint_update_summary, detect_action_items
from apps.conversations.models import Conversation
from apps.decisions.models import Decision

@api_view(['GET'])
def current_sprint_summary(request):
    """Get auto-generated summary of current sprint"""
    today = timezone.now().date()
    
    try:
        # Get most recent sprint (active or just ended)
        sprint = Sprint.objects.filter(
            organization=request.user.organization,
            start_date__lte=today + timedelta(days=365)  # Include future sprints
        ).order_by('-start_date').first()
        
        if not sprint:
            return Response({'message': 'No active sprint'})
        
        # Get sprint data
        conversations = Conversation.objects.filter(
            organization=request.user.organization,
            created_at__gte=sprint.start_date,
            created_at__lte=timezone.now()
        )
        
        decisions = Decision.objects.filter(
            organization=request.user.organization,
            created_at__gte=sprint.start_date,
            created_at__lte=timezone.now()
        )
        
        blockers = Blocker.objects.filter(
            organization=request.user.organization,
            sprint=sprint,
            status='active'
        )
        
        # Generate summary
        summary = {
            'name': sprint.name,
            'start_date': sprint.start_date,
            'end_date': sprint.end_date,
            'sprint_name': sprint.name,
            'days_remaining': (sprint.end_date - today).days,
            'completed': conversations.filter(is_closed=True).count(),
            'in_progress': conversations.filter(is_closed=False).count(),
            'blocked': blockers.count(),
            'decisions_made': decisions.count(),
            'blockers': [{
                'id': b.id,
                'title': b.title,
                'type': b.blocker_type,
                'days_open': (timezone.now().date() - b.created_at.date()).days
            } for b in blockers[:5]],
            'key_decisions': [{
                'id': d.id,
                'title': d.title,
                'impact': d.impact_level
            } for d in decisions.order_by('-created_at')[:3]]
        }
        
        return Response(summary)
    except Exception as e:
        return Response({'error': str(e)}, status=500)

@api_view(['GET', 'POST'])
def blockers(request):
    """List or create blockers"""
    if request.method == 'GET':
        blockers = Blocker.objects.filter(
            organization=request.user.organization,
            status='active'
        )
        
        data = [{
            'id': b.id,
            'title': b.title,
            'description': b.description,
            'type': b.blocker_type,
            'status': b.status,
            'blocked_by': b.blocked_by.get_full_name(),
            'assigned_to': b.assigned_to.get_full_name() if b.assigned_to else None,
            'days_open': (timezone.now().date() - b.created_at.date()).days,
            'ticket_url': b.ticket_url,
            'created_at': b.created_at
        } for b in blockers]
        
        return Response(data)
    
    elif request.method == 'POST':
        conversation = Conversation.objects.get(
            id=request.data['conversation_id'],
            organization=request.user.organization
        )
        
        # Get most recent sprint
        sprint = Sprint.objects.filter(
            organization=request.user.organization
        ).order_by('-start_date').first()
        
        blocker = Blocker.objects.create(
            organization=request.user.organization,
            conversation=conversation,
            sprint=sprint,
            title=request.data['title'],
            description=request.data.get('description', ''),
            blocker_type=request.data.get('type', 'technical'),
            blocked_by=request.user,
            ticket_url=request.data.get('ticket_url', '')
        )
        
        # Notify Slack only
        from apps.integrations.utils import notify_blocker_created
        notify_blocker_created(blocker)
        
        return Response({'id': blocker.id, 'title': blocker.title})

@api_view(['POST'])
def resolve_blocker(request, blocker_id):
    """Mark blocker as resolved"""
    blocker = Blocker.objects.get(
        id=blocker_id,
        organization=request.user.organization
    )
    
    blocker.status = 'resolved'
    blocker.resolved_at = timezone.now()
    blocker.save()
    
    return Response({'message': 'Blocker resolved'})

@api_view(['GET'])
def blocker_detail(request, blocker_id):
    """Get blocker details"""
    try:
        blocker = Blocker.objects.get(
            id=blocker_id,
            organization=request.user.organization
        )
        
        return Response({
            'id': blocker.id,
            'title': blocker.title,
            'description': blocker.description,
            'type': blocker.blocker_type,
            'status': blocker.status,
            'blocked_by': blocker.blocked_by.get_full_name(),
            'assigned_to': blocker.assigned_to.get_full_name() if blocker.assigned_to else None,
            'days_open': (timezone.now().date() - blocker.created_at.date()).days,
            'ticket_url': blocker.ticket_url,
            'ticket_id': blocker.ticket_id,
            'created_at': blocker.created_at
        })
    except Blocker.DoesNotExist:
        return Response({'error': 'Blocker not found'}, status=404)

@api_view(['GET'])
def retrospective_insights(request):
    """Get AI-detected patterns from past retrospectives"""
    retros = Retrospective.objects.filter(
        organization=request.user.organization
    ).order_by('-created_at')[:10]
    
    # Detect recurring issues
    all_issues = []
    for retro in retros:
        all_issues.extend(retro.what_needs_improvement)
    
    # Simple keyword frequency
    issue_keywords = {}
    for issue in all_issues:
        words = issue.lower().split()
        for word in words:
            if len(word) > 4:
                issue_keywords[word] = issue_keywords.get(word, 0) + 1
    
    recurring = sorted(issue_keywords.items(), key=lambda x: x[1], reverse=True)[:5]
    
    return Response({
        'recurring_issues': [{'keyword': k, 'count': v} for k, v in recurring],
        'total_retrospectives': retros.count(),
        'recent_action_items': retros[0].action_items if retros else []
    })

@api_view(['POST'])
def create_sprint(request):
    """Create new sprint"""
    sprint = Sprint.objects.create(
        organization=request.user.organization,
        name=request.data['name'],
        start_date=request.data['start_date'],
        end_date=request.data['end_date'],
        goal=request.data.get('goal', '')
    )
    
    return Response({
        'id': sprint.id,
        'name': sprint.name,
        'start_date': sprint.start_date,
        'end_date': sprint.end_date
    })

@api_view(['GET'])
def sprint_detail(request, sprint_id):
    """Get sprint details"""
    try:
        sprint = Sprint.objects.get(
            id=sprint_id,
            organization=request.user.organization
        )
        
        return Response({
            'id': sprint.id,
            'name': sprint.name,
            'start_date': sprint.start_date,
            'end_date': sprint.end_date,
            'completed': sprint.completed_count if hasattr(sprint, 'completed_count') else 0,
            'blocked': sprint.blocked_count if hasattr(sprint, 'blocked_count') else 0,
            'decisions': sprint.decisions_made if hasattr(sprint, 'decisions_made') else 0,
            'ai_summary': 'Sprint completed successfully with key decisions made.'
        })
    except Sprint.DoesNotExist:
        return Response({'error': 'Sprint not found'}, status=404)

@api_view(['GET'])
def sprint_history(request):
    """Get past sprints with summaries"""
    sprints = Sprint.objects.filter(
        organization=request.user.organization
    )[:10]
    
    data = [{
        'id': s.id,
        'name': s.name,
        'start_date': s.start_date,
        'end_date': s.end_date,
        'completed': s.completed_count,
        'blocked': s.blocked_count,
        'decisions': s.decisions_made
    } for s in sprints]
    
    return Response(data)


@api_view(['GET', 'POST'])
def sprint_updates(request):
    """List or create sprint updates"""
    if request.method == 'GET':
        sprint_id = request.GET.get('sprint_id')
        if sprint_id:
            updates = SprintUpdate.objects.filter(
                organization=request.user.organization,
                sprint_id=sprint_id
            )
        else:
            # Get most recent sprint
            sprint = Sprint.objects.filter(
                organization=request.user.organization
            ).order_by('-start_date').first()
            
            if not sprint:
                return Response([])
            
            updates = SprintUpdate.objects.filter(
                organization=request.user.organization,
                sprint=sprint
            ).order_by('-created_at')
        
        data = [{
            'id': u.id,
            'type': u.type,
            'title': u.title,
            'content': u.content,
            'author': u.author.get_full_name(),
            'timestamp': u.created_at.strftime('%b %d, %Y at %I:%M %p'),
            'ai_summary': u.ai_summary,
            'linked_decisions': []
        } for u in updates]
        
        return Response(data)
    
    elif request.method == 'POST':
        # Get most recent sprint
        sprint = Sprint.objects.filter(
            organization=request.user.organization
        ).order_by('-start_date').first()
        
        if not sprint:
            return Response({'error': 'No active sprint'}, status=400)
        
        # Generate AI summary using Claude
        content = request.data.get('content', '')
        ai_summary = generate_sprint_update_summary(request.data['title'], content)
        action_items = detect_action_items(content)
        
        update = SprintUpdate.objects.create(
            organization=request.user.organization,
            sprint=sprint,
            author=request.user,
            type=request.data.get('type', 'sprint_update'),
            title=request.data['title'],
            content=content,
            ai_summary=ai_summary
        )
        
        # If it's a blocker, create blocker entry
        if update.type == 'blocker':
            # Find or create a conversation for this blocker
            from apps.conversations.models import Conversation
            conversation = Conversation.objects.create(
                organization=request.user.organization,
                author=request.user,
                title=update.title,
                content=update.content,
                post_type='update'
            )
            
            Blocker.objects.create(
                organization=request.user.organization,
                conversation=conversation,
                sprint=sprint,
                title=update.title,
                description=update.content,
                blocker_type='technical',
                blocked_by=request.user
            )
        
        return Response({
            'id': update.id,
            'type': update.type,
            'title': update.title,
            'content': update.content,
            'author': update.author.get_full_name(),
            'timestamp': update.created_at.strftime('%b %d, %Y at %I:%M %p'),
            'ai_summary': update.ai_summary,
            'message': 'Update posted'
        })


@api_view(['POST'])
def end_sprint(request, sprint_id):
    """End a sprint and generate retrospective"""
    try:
        sprint = Sprint.objects.get(
            id=sprint_id,
            organization=request.user.organization
        )
        
        # Update sprint end date to today if needed
        sprint.end_date = timezone.now().date()
        sprint.save()
        
        # Generate AI retrospective summary
        from apps.agile.ai_service import generate_retrospective_summary
        
        updates = SprintUpdate.objects.filter(sprint=sprint)
        blockers = Blocker.objects.filter(sprint=sprint)
        
        what_went_well = [f"{updates.filter(type='sprint_update').count()} updates posted"]
        what_needs_improvement = [f"{blockers.filter(status='active').count()} unresolved blockers"]
        
        summary = generate_retrospective_summary(
            sprint.name,
            what_went_well,
            what_needs_improvement
        )
        
        sprint.summary = summary
        sprint.save()
        
        return Response({
            'message': 'Sprint ended',
            'summary': summary
        })
    except Sprint.DoesNotExist:
        return Response({'error': 'Sprint not found'}, status=404)

@api_view(['GET'])
def sprint_decisions(request, sprint_id):
    """Get decisions for a sprint"""
    try:
        sprint = Sprint.objects.get(
            id=sprint_id,
            organization=request.user.organization
        )
        
        decisions = Decision.objects.filter(
            organization=request.user.organization,
            sprint=sprint
        ).order_by('-created_at')
        
        data = [{
            'id': d.id,
            'title': d.title,
            'impact_level': d.impact_level,
            'status': d.status,
            'decision_maker': d.decision_maker.get_full_name(),
            'created_at': d.created_at
        } for d in decisions]
        
        return Response(data)
    except Sprint.DoesNotExist:
        return Response({'error': 'Sprint not found'}, status=404)
