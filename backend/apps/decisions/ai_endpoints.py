from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q
from apps.decisions.models import Decision
from apps.conversations.models import Conversation

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def suggest_similar_decisions(request):
    """Suggest similar past decisions"""
    title = request.data.get('title', '')
    description = request.data.get('description', '')
    
    if not title:
        return Response({'error': 'title required'}, status=400)
    
    # Find similar decisions
    keywords = set(title.lower().split())
    
    similar_decisions = Decision.objects.filter(
        organization=request.user.organization
    ).exclude(status='cancelled')
    
    suggestions = []
    for decision in similar_decisions:
        decision_keywords = set(decision.title.lower().split())
        
        if len(keywords | decision_keywords) > 0:
            similarity = len(keywords & decision_keywords) / len(keywords | decision_keywords)
            
            if similarity >= 0.2:  # 20% similarity threshold
                suggestions.append({
                    'id': decision.id,
                    'title': decision.title,
                    'description': decision.description[:200],
                    'status': decision.status,
                    'similarity': round(similarity, 2),
                    'created_at': decision.created_at.isoformat(),
                    'decided_at': decision.decided_at.isoformat() if decision.decided_at else None
                })
    
    # Sort by similarity
    suggestions.sort(key=lambda x: x['similarity'], reverse=True)
    
    return Response({
        'query': title,
        'similar_decisions': suggestions[:5]
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def check_decision_conflicts(request, decision_id):
    """Check for conflicts with existing decisions"""
    try:
        decision = Decision.objects.get(id=decision_id, organization=request.user.organization)
    except Decision.DoesNotExist:
        return Response({'error': 'Decision not found'}, status=404)
    
    keywords = set(decision.title.lower().split())
    
    # Find potentially conflicting decisions
    other_decisions = Decision.objects.filter(
        organization=request.user.organization,
        status__in=['approved', 'implemented']
    ).exclude(id=decision_id)
    
    conflicts = []
    for other in other_decisions:
        other_keywords = set(other.title.lower().split())
        
        if len(keywords | other_keywords) > 0:
            similarity = len(keywords & other_keywords) / len(keywords | other_keywords)
            
            if similarity >= 0.3:  # 30% similarity threshold
                conflicts.append({
                    'id': other.id,
                    'title': other.title,
                    'status': other.status,
                    'similarity': round(similarity, 2),
                    'decided_at': other.decided_at.isoformat() if other.decided_at else None,
                    'rationale': other.rationale[:200] if other.rationale else ''
                })
    
    return Response({
        'decision_id': decision.id,
        'potential_conflicts': conflicts,
        'conflict_count': len(conflicts)
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def identify_missing_stakeholders(request, decision_id):
    """Identify potentially missing stakeholders"""
    try:
        decision = Decision.objects.get(id=decision_id, organization=request.user.organization)
    except Decision.DoesNotExist:
        return Response({'error': 'Decision not found'}, status=404)
    
    from apps.organizations.models import User
    
    # Get stakeholders from similar decisions
    keywords = set(decision.title.lower().split())
    similar_decisions = Decision.objects.filter(
        organization=request.user.organization
    ).exclude(id=decision_id)
    
    stakeholder_scores = {}
    
    for similar in similar_decisions:
        similar_keywords = set(similar.title.lower().split())
        
        if len(keywords | similar_keywords) > 0:
            similarity = len(keywords & similar_keywords) / len(keywords | similar_keywords)
            
            if similarity >= 0.2:
                # Get stakeholders from similar decision
                if similar.stakeholders:
                    for stakeholder_id in similar.stakeholders:
                        stakeholder_scores[stakeholder_id] = stakeholder_scores.get(stakeholder_id, 0) + similarity
    
    # Get current stakeholders
    current_stakeholders = set(decision.stakeholders or [])
    
    # Find missing stakeholders
    missing = []
    for stakeholder_id, score in sorted(stakeholder_scores.items(), key=lambda x: x[1], reverse=True):
        if stakeholder_id not in current_stakeholders:
            try:
                user = User.objects.get(id=stakeholder_id, organization=request.user.organization)
                missing.append({
                    'user_id': user.id,
                    'name': user.get_full_name(),
                    'relevance_score': round(score, 2)
                })
            except User.DoesNotExist:
                pass
    
    return Response({
        'decision_id': decision.id,
        'missing_stakeholders': missing[:5]
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def draft_decision_rationale(request):
    """AI-assisted draft of decision rationale"""
    title = request.data.get('title', '')
    problem = request.data.get('problem', '')
    options = request.data.get('options', [])
    chosen = request.data.get('chosen', '')
    
    if not title or not problem:
        return Response({'error': 'title and problem required'}, status=400)
    
    # Find similar decisions for reference
    keywords = set(title.lower().split())
    similar_decisions = Decision.objects.filter(
        organization=request.user.organization,
        status__in=['approved', 'implemented']
    )
    
    reference_rationales = []
    for decision in similar_decisions[:3]:
        decision_keywords = set(decision.title.lower().split())
        
        if len(keywords | decision_keywords) > 0:
            similarity = len(keywords & decision_keywords) / len(keywords | decision_keywords)
            
            if similarity >= 0.2:
                reference_rationales.append(decision.rationale)
    
    # Generate draft rationale
    draft = f"""
Decision: {title}

Problem Statement:
{problem}

Options Considered:
"""
    
    for i, option in enumerate(options, 1):
        draft += f"\n{i}. {option}"
    
    draft += f"""

Chosen Option:
{chosen}

Rationale:
Based on similar decisions in the organization, this option was chosen because:
- It addresses the core problem effectively
- It aligns with organizational strategy
- It has been validated through similar past decisions

Expected Impact:
- Improved efficiency and consistency
- Better alignment with organizational goals
- Reduced risk through proven approach
"""
    
    return Response({
        'draft_rationale': draft,
        'reference_decisions': len(reference_rationales)
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def analyze_decision_context(request, decision_id):
    """Analyze context and related conversations for decision"""
    try:
        decision = Decision.objects.get(id=decision_id, organization=request.user.organization)
    except Decision.DoesNotExist:
        return Response({'error': 'Decision not found'}, status=404)
    
    # Find related conversations
    keywords = set(decision.title.lower().split())
    
    related_conversations = Conversation.objects.filter(
        organization=request.user.organization,
        is_archived=False
    )
    
    context = []
    for conv in related_conversations:
        conv_keywords = set(conv.title.lower().split())
        
        if len(keywords | conv_keywords) > 0:
            similarity = len(keywords & conv_keywords) / len(keywords | conv_keywords)
            
            if similarity >= 0.2:
                context.append({
                    'id': conv.id,
                    'title': conv.title,
                    'type': conv.post_type,
                    'relevance': round(similarity, 2),
                    'created_at': conv.created_at.isoformat(),
                    'view_count': conv.view_count,
                    'reply_count': conv.reply_count
                })
    
    # Sort by relevance
    context.sort(key=lambda x: x['relevance'], reverse=True)
    
    return Response({
        'decision_id': decision.id,
        'related_context': context[:10],
        'context_count': len(context)
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def decision_recommendations(request):
    """Get AI recommendations for decision-making"""
    from django.db.models import Count
    
    # Get decisions with high impact
    high_impact_decisions = Decision.objects.filter(
        organization=request.user.organization,
        status='implemented'
    ).annotate(
        metric_count=Count('metrics')
    ).filter(metric_count__gt=0).order_by('-metric_count')[:5]
    
    # Get decisions with strong consensus
    from apps.decisions.vote_models import DecisionVote
    consensus_decisions = Decision.objects.filter(
        organization=request.user.organization
    ).annotate(
        vote_count=Count('votes')
    ).filter(vote_count__gt=0).order_by('-vote_count')[:5]
    
    recommendations = {
        'high_impact_decisions': [{
            'id': d.id,
            'title': d.title,
            'metrics_tracked': d.metrics.count(),
            'status': d.status
        } for d in high_impact_decisions],
        'strong_consensus_decisions': [{
            'id': d.id,
            'title': d.title,
            'votes': d.votes.count(),
            'status': d.status
        } for d in consensus_decisions],
        'recommendation': 'Focus on decisions with tracked metrics and strong team consensus for best outcomes'
    }
    
    return Response(recommendations)
