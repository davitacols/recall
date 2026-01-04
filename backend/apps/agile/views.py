from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Count, Q
from datetime import timedelta
from apps.agile.models import Sprint, Blocker, Retrospective, SprintUpdate, Issue, Project
from apps.agile.ai_service import generate_sprint_update_summary, detect_action_items
from apps.conversations.models import Conversation
from apps.decisions.models import Decision

@api_view(['GET'])
def current_sprint_summary(request):
    """Get auto-generated summary of current sprint with issues"""
    today = timezone.now().date()
    
    try:
        # Get most recent active sprint
        sprint = Sprint.objects.filter(
            organization=request.user.organization,
            start_date__lte=today,
            end_date__gte=today
        ).order_by('-start_date').first()
        
        if not sprint:
            return Response({'message': 'No active sprint'})
        
        # Get sprint issues
        issues = sprint.issues.all()
        completed_issues = issues.filter(status='done').count()
        in_progress_issues = issues.filter(status='in_progress').count()
        todo_issues = issues.filter(status='todo').count()
        
        # Get blockers
        blockers = Blocker.objects.filter(
            organization=request.user.organization,
            sprint=sprint,
            status='active'
        )
        
        # Get decisions
        decisions = Decision.objects.filter(
            organization=request.user.organization,
            sprint=sprint
        )
        
        summary = {
            'id': sprint.id,
            'name': sprint.name,
            'project_id': sprint.project.id,
            'project_name': sprint.project.name,
            'start_date': sprint.start_date,
            'end_date': sprint.end_date,
            'goal': sprint.goal,
            'days_remaining': max(0, (sprint.end_date - today).days),
            'issue_stats': {
                'total': issues.count(),
                'completed': completed_issues,
                'in_progress': in_progress_issues,
                'todo': todo_issues,
                'completion_percentage': int((completed_issues / issues.count() * 100) if issues.count() > 0 else 0)
            },
            'blockers': [{
                'id': b.id,
                'title': b.title,
                'type': b.blocker_type,
                'days_open': (timezone.now().date() - b.created_at.date()).days
            } for b in blockers[:5]],
            'blocker_count': blockers.count(),
            'decisions_made': decisions.count()
        }
        
        return Response(summary)
    except Exception as e:
        return Response({'error': str(e)}, status=500)

@api_view(['GET', 'POST'])
def blockers(request):
    """List or create blockers linked to sprints"""
    if request.method == 'GET':
        sprint_id = request.GET.get('sprint_id')
        
        if sprint_id:
            blockers = Blocker.objects.filter(
                organization=request.user.organization,
                sprint_id=sprint_id
            )
        else:
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
            'sprint_id': b.sprint.id if b.sprint else None,
            'sprint_name': b.sprint.name if b.sprint else None,
            'blocked_by': b.blocked_by.get_full_name(),
            'assigned_to': b.assigned_to.get_full_name() if b.assigned_to else None,
            'days_open': (timezone.now().date() - b.created_at.date()).days,
            'ticket_url': b.ticket_url,
            'created_at': b.created_at
        } for b in blockers]
        
        return Response(data)
    
    elif request.method == 'POST':
        sprint_id = request.data.get('sprint_id')
        
        if not sprint_id:
            return Response({'error': 'sprint_id required'}, status=400)
        
        sprint = Sprint.objects.get(
            id=sprint_id,
            organization=request.user.organization
        )
        
        # Create or get conversation
        conversation, _ = Conversation.objects.get_or_create(
            organization=request.user.organization,
            title=request.data['title'],
            defaults={
                'author': request.user,
                'content': request.data.get('description', ''),
                'post_type': 'blocker'
            }
        )
        
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
        
        return Response({
            'id': blocker.id,
            'title': blocker.title,
            'sprint_id': sprint.id
        })

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
            'sprint_id': blocker.sprint.id if blocker.sprint else None,
            'sprint_name': blocker.sprint.name if blocker.sprint else None,
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
    """Create new sprint (deprecated - use kanban_views.sprints instead)"""
    project_id = request.data.get('project_id')
    
    if not project_id:
        return Response({'error': 'project_id required'}, status=400)
    
    project = Project.objects.get(
        id=project_id,
        organization=request.user.organization
    )
    
    sprint = Sprint.objects.create(
        organization=request.user.organization,
        project=project,
        name=request.data['name'],
        start_date=request.data['start_date'],
        end_date=request.data['end_date'],
        goal=request.data.get('goal', '')
    )
    
    return Response({
        'id': sprint.id,
        'name': sprint.name,
        'project_id': project.id,
        'start_date': sprint.start_date,
        'end_date': sprint.end_date
    })

@api_view(['GET'])
def sprint_detail(request, sprint_id):
    """Get sprint details with issues"""
    try:
        sprint = Sprint.objects.get(
            id=sprint_id,
            organization=request.user.organization
        )
        
        issues = sprint.issues.all()
        completed_count = issues.filter(status='done').count()
        in_progress_count = issues.filter(status='in_progress').count()
        todo_count = issues.filter(status='todo').count()
        
        return Response({
            'id': sprint.id,
            'name': sprint.name,
            'project_id': sprint.project.id,
            'project_name': sprint.project.name,
            'start_date': sprint.start_date,
            'end_date': sprint.end_date,
            'goal': sprint.goal,
            'status': sprint.status,
            'issue_count': issues.count(),
            'completed': completed_count,
            'in_progress': in_progress_count,
            'todo': todo_count,
            'blocked': sprint.blocked_count,
            'decisions': sprint.decisions_made,
            'issues': [{
                'id': i.id,
                'key': i.key,
                'title': i.title,
                'status': i.status,
                'assignee': i.assignee.get_full_name() if i.assignee else None,
                'story_points': i.story_points
            } for i in issues]
        })
    except Sprint.DoesNotExist:
        return Response({'error': 'Sprint not found'}, status=404)

@api_view(['GET'])
def sprint_history(request):
    """Get past sprints with summaries"""
    project_id = request.GET.get('project_id')
    
    if project_id:
        sprints = Sprint.objects.filter(
            organization=request.user.organization,
            project_id=project_id,
            end_date__lt=timezone.now().date(),
            project__isnull=False
        ).order_by('-end_date')[:10]
    else:
        sprints = Sprint.objects.filter(
            organization=request.user.organization,
            end_date__lt=timezone.now().date(),
            project__isnull=False
        ).order_by('-end_date')[:10]
    
    data = [{
        'id': s.id,
        'name': s.name,
        'project_id': s.project.id,
        'project_name': s.project.name,
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
            sprint = Sprint.objects.filter(
                organization=request.user.organization,
                end_date__gte=timezone.now().date()
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
            'sprint_id': u.sprint.id,
            'timestamp': u.created_at.strftime('%b %d, %Y at %I:%M %p'),
            'ai_summary': u.ai_summary,
        } for u in updates]
        
        return Response(data)
    
    elif request.method == 'POST':
        sprint_id = request.data.get('sprint_id')
        
        if not sprint_id:
            return Response({'error': 'sprint_id required'}, status=400)
        
        sprint = Sprint.objects.get(
            id=sprint_id,
            organization=request.user.organization
        )
        
        content = request.data.get('content', '')
        ai_summary = generate_sprint_update_summary(request.data['title'], content)
        
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
            'sprint_id': sprint.id,
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
        
        sprint.end_date = timezone.now().date()
        sprint.save()
        
        # Create retrospective
        retrospective = Retrospective.objects.create(
            organization=request.user.organization,
            sprint=sprint,
            created_by=request.user,
            what_went_well=[],
            what_needs_improvement=[],
            action_items=[]
        )
        
        return Response({
            'message': 'Sprint ended',
            'retrospective_id': retrospective.id
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
            created_at__gte=sprint.start_date,
            created_at__lte=sprint.end_date
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


@api_view(['GET'])
def project_issues_unified(request, project_id):
    """Get issues with unified context (decisions, conversations, blockers)"""
    from apps.agile.models import DecisionIssueLink, ConversationIssueLink, BlockerIssueLink
    
    try:
        issues = Issue.objects.filter(
            project_id=project_id,
            organization=request.user.organization
        ).select_related('assignee', 'sprint')
        
        data = []
        for issue in issues:
            linked_decisions = DecisionIssueLink.objects.filter(issue=issue).values_list('decision_id', flat=True)
            linked_conversations = ConversationIssueLink.objects.filter(issue=issue).values_list('conversation_id', flat=True)
            linked_blockers = BlockerIssueLink.objects.filter(issue=issue).values_list('blocker_id', flat=True)
            
            data.append({
                'id': issue.id,
                'key': issue.key,
                'title': issue.title,
                'status': issue.status,
                'priority': issue.priority,
                'assignee': issue.assignee.get_full_name() if issue.assignee else None,
                'story_points': issue.story_points,
                'sprint': issue.sprint.id if issue.sprint else None,
                'pr_url': issue.pr_url,
                'code_review_status': issue.code_review_status,
                'ci_status': issue.ci_status,
                'ci_url': issue.ci_url,
                'test_coverage': issue.test_coverage,
                'linked_decisions': list(linked_decisions),
                'linked_conversations': list(linked_conversations),
                'blocking_blockers': list(linked_blockers),
            })
        
        return Response(data)
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
def project_roadmap(request, project_id):
    """Get project roadmap with sprints and milestones"""
    try:
        sprints = Sprint.objects.filter(
            project_id=project_id,
            organization=request.user.organization
        ).order_by('start_date')
        
        data = [
            {
                'id': s.id,
                'name': s.name,
                'start_date': s.start_date,
                'end_date': s.end_date,
                'status': s.status,
                'goal': s.goal,
                'issue_count': s.issues.count(),
                'completed': s.issues.filter(status='done').count(),
            } for s in sprints
        ]
        
        return Response(data)
    except Exception as e:
        return Response({'error': str(e)}, status=500)
