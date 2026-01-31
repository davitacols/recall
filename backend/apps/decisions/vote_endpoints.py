from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from django.db import models
from apps.decisions.vote_models import DecisionVote, ConsensusSnapshot
from apps.decisions.models import Decision

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def decision_votes(request, decision_id):
    """Get votes or vote on decision"""
    try:
        decision = Decision.objects.get(id=decision_id, organization=request.user.organization)
    except Decision.DoesNotExist:
        return Response({'error': 'Decision not found'}, status=404)
    
    if request.method == 'GET':
        votes = decision.votes.all()
        
        approve = votes.filter(vote='approve').count()
        reject = votes.filter(vote='reject').count()
        abstain = votes.filter(vote='abstain').count()
        total = votes.count()
        
        avg_confidence = 0
        if votes.exists():
            avg_confidence = votes.aggregate(models.Avg('confidence'))['confidence__avg'] or 0
        
        approval_pct = (approve / total * 100) if total > 0 else 0
        
        return Response({
            'decision_id': decision.id,
            'total_votes': total,
            'approve': approve,
            'reject': reject,
            'abstain': abstain,
            'approval_percentage': round(approval_pct, 1),
            'avg_confidence': round(avg_confidence, 1),
            'votes': [{
                'voter': v.voter.get_full_name(),
                'vote': v.vote,
                'confidence': v.confidence,
                'comment': v.comment,
                'created_at': v.created_at.isoformat()
            } for v in votes]
        })
    
    # POST - Vote on decision
    vote_value = request.data.get('vote')
    if vote_value not in ['approve', 'reject', 'abstain']:
        return Response({'error': 'Invalid vote value'}, status=400)
    
    vote, created = DecisionVote.objects.update_or_create(
        decision=decision,
        voter=request.user,
        defaults={
            'organization': request.user.organization,
            'vote': vote_value,
            'confidence': request.data.get('confidence', 5),
            'comment': request.data.get('comment', '')
        }
    )
    
    # Create consensus snapshot
    votes = decision.votes.all()
    approve = votes.filter(vote='approve').count()
    reject = votes.filter(vote='reject').count()
    abstain = votes.filter(vote='abstain').count()
    total = votes.count()
    
    approval_pct = (approve / total * 100) if total > 0 else 0
    avg_confidence = votes.aggregate(models.Avg('confidence'))['confidence__avg'] or 0
    
    ConsensusSnapshot.objects.create(
        organization=request.user.organization,
        decision=decision,
        total_votes=total,
        approve_count=approve,
        reject_count=reject,
        abstain_count=abstain,
        approval_percentage=approval_pct,
        avg_confidence=avg_confidence
    )
    
    return Response({
        'message': 'Vote recorded',
        'vote': vote_value,
        'total_votes': total,
        'approval_percentage': round(approval_pct, 1)
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def consensus_report(request, decision_id):
    """Get consensus report for decision"""
    try:
        decision = Decision.objects.get(id=decision_id, organization=request.user.organization)
    except Decision.DoesNotExist:
        return Response({'error': 'Decision not found'}, status=404)
    
    votes = decision.votes.all()
    snapshots = decision.consensus_snapshots.all().order_by('-created_at')
    
    if not votes.exists():
        return Response({'error': 'No votes yet'}, status=404)
    
    approve = votes.filter(vote='approve').count()
    reject = votes.filter(vote='reject').count()
    abstain = votes.filter(vote='abstain').count()
    total = votes.count()
    
    approval_pct = (approve / total * 100) if total > 0 else 0
    avg_confidence = votes.aggregate(models.Avg('confidence'))['confidence__avg'] or 0
    
    # Consensus level
    if approval_pct >= 80:
        consensus_level = 'strong'
    elif approval_pct >= 60:
        consensus_level = 'moderate'
    elif approval_pct >= 40:
        consensus_level = 'weak'
    else:
        consensus_level = 'no_consensus'
    
    return Response({
        'decision_id': decision.id,
        'total_votes': total,
        'approve': approve,
        'reject': reject,
        'abstain': abstain,
        'approval_percentage': round(approval_pct, 1),
        'avg_confidence': round(avg_confidence, 1),
        'consensus_level': consensus_level,
        'history': [{
            'total_votes': s.total_votes,
            'approval_percentage': round(s.approval_percentage, 1),
            'avg_confidence': round(s.avg_confidence, 1),
            'created_at': s.created_at.isoformat()
        } for s in snapshots[:10]]
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def organization_consensus_metrics(request):
    """Get consensus metrics across all decisions"""
    from django.db.models import Avg, Count, Q
    
    decisions = Decision.objects.filter(organization=request.user.organization)
    
    decisions_with_votes = decisions.annotate(vote_count=Count('votes')).filter(vote_count__gt=0)
    
    if not decisions_with_votes.exists():
        return Response({'error': 'No voting data'}, status=404)
    
    total_decisions = decisions_with_votes.count()
    avg_approval = 0
    avg_confidence = 0
    
    for d in decisions_with_votes:
        votes = d.votes.all()
        approve = votes.filter(vote='approve').count()
        total = votes.count()
        if total > 0:
            avg_approval += (approve / total * 100)
        avg_confidence += votes.aggregate(Avg('confidence'))['confidence__avg'] or 0
    
    avg_approval = avg_approval / total_decisions if total_decisions > 0 else 0
    avg_confidence = avg_confidence / total_decisions if total_decisions > 0 else 0
    
    return Response({
        'total_decisions_with_votes': total_decisions,
        'avg_approval_percentage': round(avg_approval, 1),
        'avg_confidence': round(avg_confidence, 1)
    })
