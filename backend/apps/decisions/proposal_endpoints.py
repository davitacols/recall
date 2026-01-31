from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from apps.decisions.proposal_models import DecisionProposal, ProposalApproval
from apps.decisions.models import Decision
from apps.organizations.models import User

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def proposals_list(request):
    """List proposals or create new proposal"""
    if request.method == 'GET':
        status_filter = request.GET.get('status')
        proposals = DecisionProposal.objects.filter(organization=request.user.organization)
        
        if status_filter:
            proposals = proposals.filter(status=status_filter)
        
        return Response([{
            'id': p.id,
            'title': p.title,
            'description': p.description[:200],
            'proposer': p.proposer.get_full_name(),
            'status': p.status,
            'approvals_count': len(p.approvals),
            'required_approvers': p.required_approvers.count(),
            'created_at': p.created_at.isoformat(),
            'submitted_at': p.submitted_at.isoformat() if p.submitted_at else None
        } for p in proposals])
    
    # POST - Create proposal
    proposal = DecisionProposal.objects.create(
        organization=request.user.organization,
        title=request.data['title'],
        description=request.data['description'],
        rationale=request.data.get('rationale', ''),
        proposer=request.user,
        status='draft'
    )
    
    # Add required approvers
    approver_ids = request.data.get('approver_ids', [])
    if approver_ids:
        approvers = User.objects.filter(id__in=approver_ids, organization=request.user.organization)
        proposal.required_approvers.set(approvers)
    
    return Response({'id': proposal.id, 'status': 'draft'})

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def proposal_detail(request, proposal_id):
    """Get, update, or delete proposal"""
    try:
        proposal = DecisionProposal.objects.get(id=proposal_id, organization=request.user.organization)
    except DecisionProposal.DoesNotExist:
        return Response({'error': 'Proposal not found'}, status=404)
    
    if request.method == 'GET':
        return Response({
            'id': proposal.id,
            'title': proposal.title,
            'description': proposal.description,
            'rationale': proposal.rationale,
            'proposer': proposal.proposer.get_full_name(),
            'status': proposal.status,
            'required_approvers': [u.get_full_name() for u in proposal.required_approvers.all()],
            'approvals': proposal.approvals,
            'created_at': proposal.created_at.isoformat(),
            'submitted_at': proposal.submitted_at.isoformat() if proposal.submitted_at else None
        })
    
    if request.method == 'PUT':
        if proposal.status != 'draft':
            return Response({'error': 'Can only edit draft proposals'}, status=400)
        
        proposal.title = request.data.get('title', proposal.title)
        proposal.description = request.data.get('description', proposal.description)
        proposal.rationale = request.data.get('rationale', proposal.rationale)
        proposal.save()
        
        return Response({'message': 'Proposal updated'})
    
    if request.method == 'DELETE':
        if proposal.status != 'draft':
            return Response({'error': 'Can only delete draft proposals'}, status=400)
        proposal.delete()
        return Response({'message': 'Proposal deleted'})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_proposal(request, proposal_id):
    """Submit proposal for review"""
    try:
        proposal = DecisionProposal.objects.get(id=proposal_id, organization=request.user.organization)
    except DecisionProposal.DoesNotExist:
        return Response({'error': 'Proposal not found'}, status=404)
    
    if proposal.status != 'draft':
        return Response({'error': 'Only draft proposals can be submitted'}, status=400)
    
    if not proposal.required_approvers.exists():
        return Response({'error': 'Add approvers before submitting'}, status=400)
    
    proposal.status = 'submitted'
    proposal.submitted_at = timezone.now()
    proposal.save()
    
    return Response({'message': 'Proposal submitted for review', 'status': 'submitted'})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def approve_proposal(request, proposal_id):
    """Approve or reject proposal"""
    try:
        proposal = DecisionProposal.objects.get(id=proposal_id, organization=request.user.organization)
    except DecisionProposal.DoesNotExist:
        return Response({'error': 'Proposal not found'}, status=404)
    
    if proposal.status not in ['submitted', 'under_review']:
        return Response({'error': 'Proposal not under review'}, status=400)
    
    if request.user not in proposal.required_approvers.all():
        return Response({'error': 'You are not an approver'}, status=403)
    
    approved = request.data.get('approved')
    comment = request.data.get('comment', '')
    
    if approved is None:
        return Response({'error': 'approved field required'}, status=400)
    
    # Record approval
    approval, created = ProposalApproval.objects.get_or_create(
        proposal=proposal,
        approver=request.user,
        defaults={'approved': approved, 'comment': comment}
    )
    
    if not created:
        approval.approved = approved
        approval.comment = comment
        approval.save()
    
    # Update proposal approvals dict
    proposal.approvals[str(request.user.id)] = {
        'approved': approved,
        'comment': comment,
        'at': timezone.now().isoformat()
    }
    
    # Check if all approvers have voted
    all_approvals = ProposalApproval.objects.filter(proposal=proposal)
    if all_approvals.count() == proposal.required_approvers.count():
        all_approved = all(a.approved for a in all_approvals)
        if all_approved:
            proposal.status = 'approved'
            proposal.decided_at = timezone.now()
        else:
            proposal.status = 'rejected'
            proposal.decided_at = timezone.now()
    else:
        proposal.status = 'under_review'
    
    proposal.save()
    
    return Response({
        'message': 'Approval recorded',
        'status': proposal.status,
        'approvals_count': all_approvals.count(),
        'required_count': proposal.required_approvers.count()
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def convert_to_decision(request, proposal_id):
    """Convert approved proposal to decision"""
    try:
        proposal = DecisionProposal.objects.get(id=proposal_id, organization=request.user.organization)
    except DecisionProposal.DoesNotExist:
        return Response({'error': 'Proposal not found'}, status=404)
    
    if proposal.status != 'approved':
        return Response({'error': 'Only approved proposals can be converted'}, status=400)
    
    if proposal.decision:
        return Response({'error': 'Proposal already converted to decision'}, status=400)
    
    decision = Decision.objects.create(
        organization=request.user.organization,
        title=proposal.title,
        description=proposal.description,
        decision_maker=proposal.proposer,
        status='approved',
        rationale=proposal.rationale
    )
    
    proposal.decision = decision
    proposal.status = 'implemented'
    proposal.save()
    
    return Response({
        'message': 'Proposal converted to decision',
        'decision_id': decision.id
    })
