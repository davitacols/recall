"""
Linking views for Decisions to Sprints and Issues
"""
from rest_framework.decorators import api_view
from rest_framework.response import Response
from apps.decisions.models import Decision
from apps.agile.models import Sprint, DecisionIssueLink

@api_view(['GET'])
def decision_related_sprints(request, decision_id):
    """Get sprints related to a decision"""
    try:
        decision = Decision.objects.get(id=decision_id, organization=request.user.organization)
        
        # Get sprints where decision was created
        sprints = Sprint.objects.filter(
            organization=request.user.organization,
            start_date__lte=decision.created_at.date(),
            end_date__gte=decision.created_at.date()
        )
        
        # Get sprints from linked issues
        issue_links = DecisionIssueLink.objects.filter(decision=decision).select_related('issue')
        for link in issue_links:
            if link.issue.sprint:
                sprints = sprints | Sprint.objects.filter(id=link.issue.sprint.id)
        
        sprints = sprints.distinct()
        
        return Response({
            'decision_id': decision_id,
            'related_sprints': [
                {
                    'id': s.id,
                    'name': s.name,
                    'status': s.status,
                    'start_date': s.start_date,
                    'end_date': s.end_date
                } for s in sprints
            ]
        })
    except Decision.DoesNotExist:
        return Response({'error': 'Decision not found'}, status=404)
