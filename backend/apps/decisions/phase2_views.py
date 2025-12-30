from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from django.db.models import Q, Count
from apps.decisions.models import Decision
from apps.decisions.locking import DecisionLock, SimilarDecision
from apps.conversations.models import Conversation
from apps.organizations.activity import log_activity

@api_view(['POST'])
def lock_decision(request, decision_id):
    """Lock a decision to prevent changes"""
    try:
        decision = Decision.objects.get(
            id=decision_id,
            organization=request.user.organization
        )
        
        if decision.is_locked:
            return Response({'error': 'Decision already locked'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        decision.is_locked = True
        decision.locked_at = timezone.now()
        decision.locked_by = request.user
        decision.lock_reason = request.data.get('reason', '')
        decision.save()
        
        log_activity(
            organization=request.user.organization,
            actor=request.user,
            action_type='decision_locked',
            content_object=decision,
            title=decision.title
        )
        
        return Response({'message': 'Decision locked'})
    except Decision.DoesNotExist:
        return Response({'error': 'Decision not found'}, 
                       status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
def override_lock(request, decision_id):
    """Override a locked decision with justification"""
    try:
        decision = Decision.objects.get(
            id=decision_id,
            organization=request.user.organization
        )
        
        if not decision.is_locked:
            return Response({'error': 'Decision not locked'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        override_reason = request.data.get('reason')
        if not override_reason:
            return Response({'error': 'Override reason required'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        # Log the override
        DecisionLock.objects.create(
            decision=decision,
            overridden_by=request.user,
            override_reason=override_reason,
            previous_value={'status': decision.status},
            new_value=request.data.get('changes', {})
        )
        
        # Unlock temporarily for edit
        decision.is_locked = False
        decision.save()
        
        log_activity(
            organization=request.user.organization,
            actor=request.user,
            action_type='decision_lock_overridden',
            content_object=decision,
            title=decision.title
        )
        
        return Response({'message': 'Lock overridden'})
    except Decision.DoesNotExist:
        return Response({'error': 'Decision not found'}, 
                       status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
def decision_suggestions(request, decision_id):
    """Get AI suggestions for similar/conflicting decisions"""
    try:
        decision = Decision.objects.get(
            id=decision_id,
            organization=request.user.organization
        )
        
        # Find similar decisions
        similar = find_similar_decisions(decision)
        conflicts = find_conflicting_decisions(decision)
        
        return Response({
            'similar': similar,
            'conflicts': conflicts
        })
    except Decision.DoesNotExist:
        return Response({'error': 'Decision not found'}, 
                       status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
def conversation_decision_suggestions(request, conversation_id):
    """Get decision suggestions for a conversation"""
    try:
        conversation = Conversation.objects.get(
            id=conversation_id,
            organization=request.user.organization
        )
        
        # Find similar past decisions
        similar = find_similar_decisions_for_conversation(conversation)
        
        return Response({
            'similar': similar,
            'conflicts': []
        })
    except Conversation.DoesNotExist:
        return Response({'error': 'Conversation not found'}, 
                       status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
def submit_impact_review(request, decision_id):
    """Submit impact review for a decision"""
    try:
        decision = Decision.objects.get(
            id=decision_id,
            organization=request.user.organization
        )
        
        decision.review_completed_at = timezone.now()
        decision.was_successful = request.data.get('was_successful')
        decision.impact_review_notes = request.data.get('impact_review_notes', '')
        decision.lessons_learned = request.data.get('lessons_learned', '')
        decision.save()
        
        log_activity(
            organization=request.user.organization,
            actor=request.user,
            action_type='decision_reviewed',
            content_object=decision,
            title=decision.title
        )
        
        return Response({'message': 'Review submitted'})
    except Decision.DoesNotExist:
        return Response({'error': 'Decision not found'}, 
                       status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
def decisions_needing_review(request):
    """Get decisions that need impact review"""
    # Decisions implemented 30+ days ago without review
    cutoff_date = timezone.now() - timezone.timedelta(days=30)
    
    decisions = Decision.objects.filter(
        organization=request.user.organization,
        status='implemented',
        implemented_at__lte=cutoff_date,
        review_completed_at__isnull=True
    ).order_by('implemented_at')[:20]
    
    results = []
    for decision in decisions:
        days_since = (timezone.now() - decision.implemented_at).days
        results.append({
            'id': decision.id,
            'title': decision.title,
            'impact_level': decision.impact_level,
            'implemented_at': decision.implemented_at,
            'days_since_implementation': days_since,
            'decision_maker': decision.decision_maker.get_full_name()
        })
    
    return Response(results)

@api_view(['GET'])
def knowledge_health(request):
    """Get knowledge health metrics"""
    org = request.user.organization
    
    # Get all decisions
    decisions = Decision.objects.filter(organization=org)
    total_decisions = decisions.count()
    
    if total_decisions == 0:
        return Response({
            'overall_score': 0,
            'total_decisions': 0,
            'decisions_without_owners': 0,
            'old_unresolved': 0,
            'repeated_topics': 0,
            'orphaned_conversations': 0,
            'decisions_with_context': 0,
            'decisions_with_alternatives': 0,
            'decisions_with_tradeoffs': 0,
            'decisions_reviewed': 0,
            'recommendations': []
        })
    
    # Calculate metrics
    without_owners = decisions.filter(decision_maker__isnull=True).count()
    
    # Old unresolved questions
    cutoff = timezone.now() - timezone.timedelta(days=30)
    old_questions = Conversation.objects.filter(
        organization=org,
        post_type='question',
        created_at__lte=cutoff,
        reply_count=0
    ).count()
    
    # Orphaned conversations
    orphaned = Conversation.objects.filter(
        organization=org,
        reply_count=0,
        created_at__lte=cutoff
    ).count()
    
    # Quality metrics
    with_context = decisions.exclude(context_reason='').count()
    with_alternatives = decisions.exclude(alternatives_considered=[]).exclude(alternatives_considered__isnull=True).count()
    with_tradeoffs = decisions.exclude(tradeoffs='').count()
    reviewed = decisions.filter(review_completed_at__isnull=False).count()
    
    # Calculate percentages
    context_pct = round((with_context / total_decisions) * 100) if total_decisions > 0 else 0
    alternatives_pct = round((with_alternatives / total_decisions) * 100) if total_decisions > 0 else 0
    tradeoffs_pct = round((with_tradeoffs / total_decisions) * 100) if total_decisions > 0 else 0
    reviewed_pct = round((reviewed / total_decisions) * 100) if total_decisions > 0 else 0
    
    # Calculate overall score
    overall_score = round((context_pct + alternatives_pct + tradeoffs_pct + reviewed_pct) / 4)
    
    # Generate recommendations
    recommendations = []
    if without_owners > 0:
        recommendations.append(f'Assign owners to {without_owners} decisions')
    if old_questions > 5:
        recommendations.append(f'Answer {old_questions} old questions')
    if context_pct < 50:
        recommendations.append('Add context to more decisions (why it matters)')
    if alternatives_pct < 50:
        recommendations.append('Document alternatives considered')
    if reviewed_pct < 30:
        recommendations.append('Review implemented decisions to track success')
    
    return Response({
        'overall_score': overall_score,
        'total_decisions': total_decisions,
        'decisions_without_owners': without_owners,
        'old_unresolved': old_questions,
        'repeated_topics': 0,  # TODO: Implement topic detection
        'orphaned_conversations': orphaned,
        'decisions_with_context': context_pct,
        'decisions_with_alternatives': alternatives_pct,
        'decisions_with_tradeoffs': tradeoffs_pct,
        'decisions_reviewed': reviewed_pct,
        'recommendations': recommendations
    })

def find_similar_decisions(decision):
    """Find similar decisions using simple keyword matching"""
    # Get keywords from title
    keywords = set(decision.title.lower().split())
    keywords = {w for w in keywords if len(w) > 3}  # Filter short words
    
    if not keywords:
        return []
    
    # Find decisions with similar keywords
    similar = Decision.objects.filter(
        organization=decision.organization
    ).exclude(id=decision.id)
    
    results = []
    for other in similar[:50]:  # Limit search
        other_keywords = set(other.title.lower().split())
        other_keywords = {w for w in other_keywords if len(w) > 3}
        
        # Calculate similarity
        if not other_keywords:
            continue
        
        intersection = keywords & other_keywords
        union = keywords | other_keywords
        similarity = len(intersection) / len(union) if union else 0
        
        if similarity > 0.3:  # 30% similarity threshold
            results.append({
                'id': other.id,
                'title': other.title,
                'status': other.status,
                'created_at': other.created_at,
                'similarity_score': similarity,
                'similarity_reason': f'Similar keywords: {", ".join(intersection)}'
            })
    
    # Sort by similarity
    results.sort(key=lambda x: x['similarity_score'], reverse=True)
    return results[:3]  # Top 3

def find_conflicting_decisions(decision):
    """Find potentially conflicting decisions"""
    # Simple implementation: look for opposite keywords
    conflicts = []
    
    # Check for decisions with opposite status on similar topics
    similar = find_similar_decisions(decision)
    for sim in similar:
        if sim['status'] == 'rejected' and decision.status == 'approved':
            conflicts.append({
                **sim,
                'conflict_reason': 'Similar decision was previously rejected'
            })
    
    return conflicts

def find_similar_decisions_for_conversation(conversation):
    """Find similar decisions for a conversation"""
    keywords = set(conversation.title.lower().split())
    keywords = {w for w in keywords if len(w) > 3}
    
    if not keywords:
        return []
    
    decisions = Decision.objects.filter(
        organization=conversation.organization
    )
    
    results = []
    for decision in decisions[:50]:
        decision_keywords = set(decision.title.lower().split())
        decision_keywords = {w for w in decision_keywords if len(w) > 3}
        
        if not decision_keywords:
            continue
        
        intersection = keywords & decision_keywords
        union = keywords | decision_keywords
        similarity = len(intersection) / len(union) if union else 0
        
        if similarity > 0.3:
            results.append({
                'id': decision.id,
                'title': decision.title,
                'status': decision.status,
                'created_at': decision.created_at,
                'similarity_score': similarity,
                'similarity_reason': f'Similar to: {decision.title}'
            })
    
    results.sort(key=lambda x: x['similarity_score'], reverse=True)
    return results[:3]
