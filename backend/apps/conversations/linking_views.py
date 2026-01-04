"""
Unified linking endpoints for Decisions, Conversations, and Blockers to Issues
"""
from rest_framework.decorators import api_view
from rest_framework.response import Response
from apps.agile.models import DecisionIssueLink, ConversationIssueLink, BlockerIssueLink, Issue, Blocker
from apps.decisions.models import Decision
from apps.conversations.models import Conversation

@api_view(['POST'])
def link_decision_to_issue(request, decision_id):
    """Link a decision to an issue"""
    try:
        decision = Decision.objects.get(id=decision_id, organization=request.user.organization)
        issue_id = request.data.get('issue_id')
        impact_type = request.data.get('impact_type', 'relates_to')
        
        if not issue_id:
            return Response({'error': 'issue_id required'}, status=400)
        
        issue = Issue.objects.get(id=issue_id, organization=request.user.organization)
        
        link, created = DecisionIssueLink.objects.get_or_create(
            decision=decision,
            issue=issue,
            defaults={'impact_type': impact_type}
        )
        
        return Response({
            'message': 'Decision linked to issue',
            'link_id': link.id,
            'created': created
        })
    except Decision.DoesNotExist:
        return Response({'error': 'Decision not found'}, status=404)
    except Issue.DoesNotExist:
        return Response({'error': 'Issue not found'}, status=404)

@api_view(['POST'])
def link_conversation_to_issue(request, conversation_id):
    """Link a conversation to an issue"""
    try:
        conversation = Conversation.objects.get(id=conversation_id, organization=request.user.organization)
        issue_id = request.data.get('issue_id')
        
        if not issue_id:
            return Response({'error': 'issue_id required'}, status=400)
        
        issue = Issue.objects.get(id=issue_id, organization=request.user.organization)
        
        link, created = ConversationIssueLink.objects.get_or_create(
            conversation=conversation,
            issue=issue
        )
        
        return Response({
            'message': 'Conversation linked to issue',
            'link_id': link.id,
            'created': created
        })
    except Conversation.DoesNotExist:
        return Response({'error': 'Conversation not found'}, status=404)
    except Issue.DoesNotExist:
        return Response({'error': 'Issue not found'}, status=404)

@api_view(['POST'])
def link_blocker_to_issue(request, blocker_id):
    """Link a blocker to an issue"""
    try:
        blocker = Blocker.objects.get(id=blocker_id, organization=request.user.organization)
        issue_id = request.data.get('issue_id')
        
        if not issue_id:
            return Response({'error': 'issue_id required'}, status=400)
        
        issue = Issue.objects.get(id=issue_id, organization=request.user.organization)
        
        link, created = BlockerIssueLink.objects.get_or_create(
            blocker=blocker,
            issue=issue
        )
        
        return Response({
            'message': 'Blocker linked to issue',
            'link_id': link.id,
            'created': created
        })
    except Blocker.DoesNotExist:
        return Response({'error': 'Blocker not found'}, status=404)
    except Issue.DoesNotExist:
        return Response({'error': 'Issue not found'}, status=404)


@api_view(['GET'])
def conversation_related_decisions(request, conversation_id):
    """Get decisions related to a conversation"""
    try:
        conversation = Conversation.objects.get(id=conversation_id, organization=request.user.organization)
        links = ConversationIssueLink.objects.filter(conversation=conversation).select_related('issue')
        
        # Get decisions linked to the same issues
        issue_ids = [link.issue.id for link in links]
        from apps.agile.models import DecisionIssueLink
        decision_links = DecisionIssueLink.objects.filter(issue_id__in=issue_ids).select_related('decision')
        
        decisions = [link.decision for link in decision_links]
        
        return Response({
            'conversation_id': conversation_id,
            'related_decisions': [
                {
                    'id': d.id,
                    'title': d.title,
                    'status': d.status,
                    'impact_level': d.impact_level
                } for d in decisions
            ]
        })
    except Conversation.DoesNotExist:
        return Response({'error': 'Conversation not found'}, status=404)
