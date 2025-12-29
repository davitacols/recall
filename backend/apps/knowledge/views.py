from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.db.models import Q, Count
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from datetime import timedelta
from .models import KnowledgeEntry
from .search_engine import get_search_engine
from apps.conversations.models import Conversation, ConversationReply
from apps.decisions.models import Decision
from apps.organizations.models import Organization

@csrf_exempt
@api_view(['POST'])
def search_knowledge(request):
    query = request.data.get('query', '').strip()
    if not query:
        return Response({'error': 'Query required'}, 
                       status=status.HTTP_400_BAD_REQUEST)
    
    # Get organization
    if request.user and request.user.is_authenticated:
        org_id = request.user.organization_id
    else:
        org = Organization.objects.first()
        org_id = org.id if org else None
    
    if not org_id:
        return Response({'query': query, 'results': [], 'total': 0})
    
    # Use text-based search (vector search disabled)
    results = []
    
    # Search conversations
    conversations = Conversation.objects.filter(
        organization_id=org_id,
        ai_processed=True
    )
    
    query_lower = query.lower()
    scored_results = []
    
    for conv in conversations:
        score = 0
        if query_lower in conv.title.lower():
            score += 10
        if query_lower in conv.content.lower():
            score += 5
        if conv.ai_summary and query_lower in conv.ai_summary.lower():
            score += 7
        for keyword in conv.ai_keywords:
            if query_lower in keyword.lower() or keyword.lower() in query_lower:
                score += 8
        
        if score > 0:
            scored_results.append({
                'id': f'conv_{conv.id}',
                'title': conv.title,
                'content_type': conv.post_type,
                'content_preview': conv.content[:200],
                'summary': conv.ai_summary or conv.content[:200],
                'relevance_score': min(score / 10, 1.0),
                'created_at': conv.created_at.isoformat(),
                'author': conv.author.get_full_name(),
                'score': score
            })
    
    # Search decisions
    decisions = Decision.objects.filter(organization_id=org_id)
    for dec in decisions:
        score = 0
        if query_lower in dec.title.lower():
            score += 10
        if query_lower in dec.description.lower():
            score += 5
        if query_lower in dec.rationale.lower():
            score += 7
        
        if score > 0:
            scored_results.append({
                'id': f'decision_{dec.id}',
                'title': dec.title,
                'content_type': 'decision',
                'content_preview': dec.description[:200],
                'summary': dec.rationale,
                'relevance_score': min(score / 10, 1.0),
                'created_at': dec.created_at.isoformat(),
                'author': dec.decision_maker.get_full_name() if dec.decision_maker else None,
                'score': score
            })
    
    # Sort by score and limit
    scored_results.sort(key=lambda x: x['score'], reverse=True)
    results = scored_results[:20]
    
    return Response({
        'query': query,
        'results': results,
        'total': len(results)
    })

@api_view(['GET'])
def recent_decisions(request):
    decisions = Decision.objects.filter(
        organization=request.user.organization,
        status='approved'
    ).order_by('-decided_at')[:10]
    
    decisions_data = []
    for decision in decisions:
        decisions_data.append({
            'id': decision.id,
            'title': decision.title,
            'impact_level': decision.impact_level,
            'decided_at': decision.decided_at,
            'decision_maker': decision.decision_maker.get_full_name() if decision.decision_maker else None
        })
    
    return Response(decisions_data)

@api_view(['GET'])
def trending_topics(request):
    # Get organization
    if request.user and request.user.is_authenticated:
        org = request.user.organization
    else:
        org = Organization.objects.first()
    
    if not org:
        return Response([])
    
    # Get most discussed keywords from recent conversations
    recent_conversations = Conversation.objects.filter(
        organization=org,
        ai_processed=True,
        created_at__gte=timezone.now() - timedelta(days=30)
    )
    
    keyword_counts = {}
    for conv in recent_conversations:
        for keyword in conv.ai_keywords:
            keyword_counts[keyword] = keyword_counts.get(keyword, 0) + 1
    
    # Sort by frequency and return top 10
    trending = sorted(keyword_counts.items(), key=lambda x: x[1], reverse=True)[:10]
    
    return Response([
        {'topic': topic, 'count': count} 
        for topic, count in trending
    ])

@api_view(['GET'])
def knowledge_stats(request):
    if request.user and request.user.is_authenticated:
        org = request.user.organization
    else:
        org = Organization.objects.first()
    
    if not org:
        return Response({
            'total_items': 0,
            'this_week': 0,
            'total_searches': 0
        })
    
    week_ago = timezone.now() - timedelta(days=7)
    
    stats = {
        'total_items': (
            Conversation.objects.filter(organization=org).count() +
            Decision.objects.filter(organization=org).count()
        ),
        'this_week': (
            Conversation.objects.filter(organization=org, created_at__gte=week_ago).count() +
            Decision.objects.filter(organization=org, created_at__gte=week_ago).count()
        ),
        'total_searches': 342  # Placeholder - would need search log table
    }
    
    return Response(stats)

@api_view(['GET'])
def memory_score(request):
    """Calculate organization memory score"""
    if request.user and request.user.is_authenticated:
        org = request.user.organization
    else:
        org = Organization.objects.first()
    
    if not org:
        return Response({'score': 0, 'grade': 'N/A', 'metrics': {}})
    
    # Calculate metrics
    total_conversations = Conversation.objects.filter(organization=org).count()
    ai_processed = Conversation.objects.filter(organization=org, ai_processed=True).count()
    total_decisions = Decision.objects.filter(organization=org).count()
    approved_decisions = Decision.objects.filter(organization=org, status='approved').count()
    implemented_decisions = Decision.objects.filter(organization=org, status='implemented').count()
    
    week_ago = timezone.now() - timedelta(days=7)
    recent_activity = Conversation.objects.filter(organization=org, created_at__gte=week_ago).count()
    
    # Calculate scores (0-100)
    decision_clarity = (approved_decisions / total_decisions * 100) if total_decisions > 0 else 0
    ai_coverage = (ai_processed / total_conversations * 100) if total_conversations > 0 else 0
    implementation_rate = (implemented_decisions / approved_decisions * 100) if approved_decisions > 0 else 0
    activity_score = min(recent_activity * 10, 100)  # 10 items per week = 100%
    
    # Overall score (weighted average)
    overall_score = (
        decision_clarity * 0.3 +
        ai_coverage * 0.25 +
        implementation_rate * 0.25 +
        activity_score * 0.2
    )
    
    # Determine grade
    if overall_score >= 90:
        grade = 'Excellent'
        color = 'green'
    elif overall_score >= 75:
        grade = 'Good'
        color = 'blue'
    elif overall_score >= 60:
        grade = 'Fair'
        color = 'yellow'
    else:
        grade = 'Needs Improvement'
        color = 'red'
    
    # Risk assessment
    if total_conversations < 10:
        risk = 'High'
    elif ai_processed < total_conversations * 0.5:
        risk = 'Medium'
    else:
        risk = 'Low'
    
    return Response({
        'score': round(overall_score, 1),
        'grade': grade,
        'color': color,
        'metrics': {
            'decision_clarity': round(decision_clarity, 1),
            'ai_coverage': round(ai_coverage, 1),
            'implementation_rate': round(implementation_rate, 1),
            'activity_score': round(activity_score, 1)
        },
        'counts': {
            'total_conversations': total_conversations,
            'ai_processed': ai_processed,
            'total_decisions': total_decisions,
            'approved_decisions': approved_decisions,
            'implemented_decisions': implemented_decisions,
            'recent_activity': recent_activity
        },
        'risk': risk
    })

@api_view(['GET'])
def onboarding_package(request):
    """Generate onboarding package for new employees"""
    if request.user and request.user.is_authenticated:
        org = request.user.organization
    else:
        org = Organization.objects.first()
    
    if not org:
        return Response({'error': 'Organization not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Get key decisions
    key_decisions = Decision.objects.filter(
        organization=org,
        status__in=['approved', 'implemented'],
        impact_level__in=['high', 'critical']
    ).order_by('-decided_at')[:10]
    
    # Get good examples
    good_examples = Conversation.objects.filter(
        organization=org,
        status_label='good_example'
    ).order_by('-created_at')[:5]
    
    # Get recent important updates
    recent_updates = Conversation.objects.filter(
        organization=org,
        post_type='update',
        priority__in=['high', 'urgent']
    ).order_by('-created_at')[:5]
    
    # Get trending topics
    recent_conversations = Conversation.objects.filter(
        organization=org,
        ai_processed=True,
        created_at__gte=timezone.now() - timedelta(days=90)
    )
    
    keyword_counts = {}
    for conv in recent_conversations:
        for keyword in conv.ai_keywords:
            keyword_counts[keyword] = keyword_counts.get(keyword, 0) + 1
    
    trending = sorted(keyword_counts.items(), key=lambda x: x[1], reverse=True)[:10]
    
    return Response({
        'key_decisions': [{
            'id': d.id,
            'title': d.title,
            'description': d.description[:200],
            'impact_level': d.impact_level,
            'decided_at': d.decided_at
        } for d in key_decisions],
        'good_examples': [{
            'id': c.id,
            'title': c.title,
            'post_type': c.post_type,
            'summary': c.ai_summary,
            'created_at': c.created_at
        } for c in good_examples],
        'recent_updates': [{
            'id': c.id,
            'title': c.title,
            'content': c.content[:200],
            'created_at': c.created_at
        } for c in recent_updates],
        'trending_topics': [{'topic': t[0], 'count': t[1]} for t in trending],
        'organization_name': org.name
    })

@csrf_exempt
@api_view(['POST'])
def before_you_ask(request):
    """Suggest related content before posting a question"""
    query = request.data.get('query', '').strip()
    if not query or len(query) < 10:
        return Response({'suggestions': []})
    
    if request.user and request.user.is_authenticated:
        org = request.user.organization
    else:
        org = Organization.objects.first()
    
    if not org:
        return Response({'suggestions': []})
    
    # Search for similar questions
    similar_questions = Conversation.objects.filter(
        organization=org,
        post_type='question',
        title__icontains=query[:50]
    )[:3]
    
    # Search for related decisions
    related_decisions = Decision.objects.filter(
        organization=org,
        status='approved',
        title__icontains=query[:50]
    )[:3]
    
    # Search in AI summaries
    related_conversations = Conversation.objects.filter(
        organization=org,
        ai_summary__icontains=query[:50]
    ).exclude(post_type='question')[:3]
    
    suggestions = []
    
    for q in similar_questions:
        suggestions.append({
            'id': q.id,
            'type': 'question',
            'title': q.title,
            'summary': q.ai_summary or q.content[:150],
            'reply_count': q.reply_count
        })
    
    for d in related_decisions:
        suggestions.append({
            'id': d.id,
            'type': 'decision',
            'title': d.title,
            'summary': d.description[:150],
            'impact': d.impact_level
        })
    
    for c in related_conversations:
        suggestions.append({
            'id': c.id,
            'type': c.post_type,
            'title': c.title,
            'summary': c.ai_summary or c.content[:150]
        })
    
    return Response({
        'suggestions': suggestions,
        'has_suggestions': len(suggestions) > 0
    })

@api_view(['GET'])
def memory_gaps(request):
    """Detect topics with no clear decisions"""
    if request.user and request.user.is_authenticated:
        org = request.user.organization
    else:
        org = Organization.objects.first()
    
    if not org:
        return Response({'gaps': []})
    
    # Get frequently discussed topics without decisions
    recent_conversations = Conversation.objects.filter(
        organization=org,
        ai_processed=True,
        created_at__gte=timezone.now() - timedelta(days=90)
    )
    
    # Count keywords
    keyword_counts = {}
    for conv in recent_conversations:
        for keyword in conv.ai_keywords:
            keyword_counts[keyword] = keyword_counts.get(keyword, 0) + 1
    
    # Get all decision keywords
    decisions = Decision.objects.filter(organization=org, status='approved')
    decision_keywords = set()
    for dec in decisions:
        decision_keywords.add(dec.title.lower())
        for word in dec.title.lower().split():
            if len(word) > 4:
                decision_keywords.add(word)
    
    # Find gaps: topics discussed 3+ times with no decision
    gaps = []
    for keyword, count in keyword_counts.items():
        if count >= 3 and keyword.lower() not in decision_keywords:
            # Check if there's a related decision
            has_decision = Decision.objects.filter(
                organization=org,
                status='approved',
                title__icontains=keyword
            ).exists()
            
            if not has_decision:
                gaps.append({
                    'topic': keyword,
                    'discussion_count': count,
                    'message': f'No clear decision recorded for "{keyword}"'
                })
    
    # Sort by discussion count
    gaps.sort(key=lambda x: x['discussion_count'], reverse=True)
    
    return Response({'gaps': gaps[:10]})

@api_view(['GET'])
def faq(request):
    """Generate FAQ from repeated questions"""
    if request.user and request.user.is_authenticated:
        org = request.user.organization
    else:
        org = Organization.objects.first()
    
    if not org:
        return Response({'faq_items': []})
    
    # Get resolved questions with replies
    questions = Conversation.objects.filter(
        organization=org,
        post_type='question',
        status_label__in=['resolved', 'good_example'],
        reply_count__gte=1
    ).order_by('-reply_count', '-created_at')[:20]
    
    faq_items = []
    for q in questions:
        # Get best answer (first reply or most recent)
        replies = q.replies.all().order_by('created_at')
        answer = replies.first().content if replies.exists() else None
        
        if answer:
            faq_items.append({
                'id': q.id,
                'question': q.title,
                'answer': answer[:300],
                'full_answer': answer,
                'reply_count': q.reply_count,
                'view_count': q.view_count,
                'created_at': q.created_at,
                'keywords': q.ai_keywords
            })
    
    return Response({'faq_items': faq_items})

@api_view(['GET'])
def forgotten_knowledge(request):
    """Detect decisions not referenced in months"""
    if request.user and request.user.is_authenticated:
        org = request.user.organization
    else:
        org = Organization.objects.first()
    
    if not org:
        return Response({'forgotten': []})
    
    # Get approved decisions older than 90 days
    ninety_days_ago = timezone.now() - timedelta(days=90)
    old_decisions = Decision.objects.filter(
        organization=org,
        status__in=['approved', 'implemented'],
        decided_at__lt=ninety_days_ago
    )
    
    forgotten = []
    for decision in old_decisions:
        # Check if decision was mentioned in recent conversations
        recent_mentions = Conversation.objects.filter(
            organization=org,
            created_at__gte=ninety_days_ago,
            content__icontains=decision.title[:30]
        ).count()
        
        if recent_mentions == 0:
            days_old = (timezone.now() - decision.decided_at).days
            forgotten.append({
                'id': decision.id,
                'title': decision.title,
                'decided_at': decision.decided_at,
                'days_old': days_old,
                'impact_level': decision.impact_level,
                'message': f'Not referenced in {days_old} days'
            })
    
    # Sort by days old
    forgotten.sort(key=lambda x: x['days_old'], reverse=True)
    
    return Response({'forgotten': forgotten[:10]})

@api_view(['GET'])
def personalized_suggestions(request):
    """Personalized reading suggestions based on role and activity"""
    if not request.user or not request.user.is_authenticated:
        return Response({'suggestions': []})
    
    org = request.user.organization
    user_role = request.user.role
    
    suggestions = []
    
    # Get unread high-priority conversations
    recent_important = Conversation.objects.filter(
        organization=org,
        priority__in=['high', 'urgent'],
        created_at__gte=timezone.now() - timedelta(days=7)
    ).exclude(author=request.user).order_by('-created_at')[:5]
    
    for conv in recent_important:
        suggestions.append({
            'id': conv.id,
            'type': 'conversation',
            'title': conv.title,
            'reason': f'High priority {conv.post_type}',
            'priority': conv.priority,
            'created_at': conv.created_at
        })
    
    # Get recent decisions for managers/admins
    if user_role in ['admin', 'manager']:
        recent_decisions = Decision.objects.filter(
            organization=org,
            status='approved',
            decided_at__gte=timezone.now() - timedelta(days=7)
        ).order_by('-decided_at')[:3]
        
        for dec in recent_decisions:
            suggestions.append({
                'id': dec.id,
                'type': 'decision',
                'title': dec.title,
                'reason': 'Recent decision',
                'impact': dec.impact_level,
                'decided_at': dec.decided_at
            })
    
    # Get conversations in user's topics of interest (based on past activity)
    user_conversations = Conversation.objects.filter(
        organization=org,
        author=request.user,
        ai_processed=True
    ).order_by('-created_at')[:10]
    
    user_keywords = set()
    for conv in user_conversations:
        user_keywords.update(conv.ai_keywords[:3])
    
    if user_keywords:
        related = Conversation.objects.filter(
            organization=org,
            ai_processed=True,
            created_at__gte=timezone.now() - timedelta(days=14)
        ).exclude(author=request.user)
        
        for conv in related[:10]:
            if any(kw in conv.ai_keywords for kw in user_keywords):
                suggestions.append({
                    'id': conv.id,
                    'type': 'conversation',
                    'title': conv.title,
                    'reason': 'Related to your interests',
                    'keywords': conv.ai_keywords[:3],
                    'created_at': conv.created_at
                })
                if len(suggestions) >= 15:
                    break
    
    # Sort by created_at/decided_at
    suggestions.sort(key=lambda x: x.get('created_at') or x.get('decided_at'), reverse=True)
    
    return Response({'suggestions': suggestions[:10]})

@api_view(['POST'])
def time_comparison(request):
    """Compare what changed between two time periods"""
    if not request.user or not request.user.is_authenticated:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    org = request.user.organization
    period = request.data.get('period', 'quarter')  # quarter, year, month
    
    from apps.decisions.models import Decision
    
    # Calculate time ranges
    now = timezone.now()
    if period == 'quarter':
        days = 90
        label = 'last quarter'
    elif period == 'year':
        days = 365
        label = 'last year'
    else:  # month
        days = 30
        label = 'last month'
    
    period_start = now - timedelta(days=days)
    previous_start = period_start - timedelta(days=days)
    
    # Current period stats
    current_conversations = Conversation.objects.filter(
        organization=org,
        created_at__gte=period_start
    ).count()
    
    current_decisions = Decision.objects.filter(
        organization=org,
        decided_at__gte=period_start
    ).count()
    
    # Previous period stats
    previous_conversations = Conversation.objects.filter(
        organization=org,
        created_at__gte=previous_start,
        created_at__lt=period_start
    ).count()
    
    previous_decisions = Decision.objects.filter(
        organization=org,
        decided_at__gte=previous_start,
        decided_at__lt=period_start
    ).count()
    
    # Key changes
    new_decisions = Decision.objects.filter(
        organization=org,
        decided_at__gte=period_start,
        status__in=['approved', 'implemented']
    ).order_by('-decided_at')[:10]
    
    # Trending topics comparison
    current_convs = Conversation.objects.filter(
        organization=org,
        ai_processed=True,
        created_at__gte=period_start
    )
    
    current_keywords = {}
    for conv in current_convs:
        for kw in conv.ai_keywords:
            current_keywords[kw] = current_keywords.get(kw, 0) + 1
    
    top_current = sorted(current_keywords.items(), key=lambda x: x[1], reverse=True)[:5]
    
    return Response({
        'period': label,
        'comparison': {
            'conversations': {
                'current': current_conversations,
                'previous': previous_conversations,
                'change': current_conversations - previous_conversations
            },
            'decisions': {
                'current': current_decisions,
                'previous': previous_decisions,
                'change': current_decisions - previous_decisions
            }
        },
        'key_decisions': [{
            'id': d.id,
            'title': d.title,
            'decided_at': d.decided_at,
            'impact_level': d.impact_level
        } for d in new_decisions],
        'trending_topics': [{'topic': t[0], 'count': t[1]} for t in top_current]
    })

@api_view(['GET', 'POST'])
def cultural_memory(request):
    """Manage cultural memories"""
    from apps.conversations.models import CulturalMemory
    
    if request.method == 'GET':
        org = request.user.organization if request.user.is_authenticated else Organization.objects.first()
        if not org:
            return Response({'memories': []})
        
        memories = CulturalMemory.objects.filter(organization=org).order_by('-year')[:50]
        return Response({
            'memories': [{
                'id': m.id,
                'title': m.title,
                'story': m.story,
                'year': m.year,
                'category': m.category,
                'created_by': m.created_by.get_full_name(),
                'created_at': m.created_at
            } for m in memories]
        })
    
    elif request.method == 'POST':
        memory = CulturalMemory.objects.create(
            organization=request.user.organization,
            title=request.data['title'],
            story=request.data['story'],
            year=request.data['year'],
            category=request.data.get('category', 'general'),
            created_by=request.user
        )
        return Response({'id': memory.id, 'message': 'Memory created'}, status=status.HTTP_201_CREATED)

@api_view(['GET'])
def legacy_content(request):
    """Get archived/historical content"""
    org = request.user.organization if request.user.is_authenticated else Organization.objects.first()
    if not org:
        return Response({'legacy': []})
    
    # Get old archived conversations
    old_conversations = Conversation.objects.filter(
        organization=org,
        is_archived=True
    ).order_by('-created_at')[:20]
    
    # Get old implemented decisions
    old_decisions = Decision.objects.filter(
        organization=org,
        status='implemented',
        implemented_at__lt=timezone.now() - timedelta(days=365)
    ).order_by('-implemented_at')[:20]
    
    legacy = []
    for conv in old_conversations:
        legacy.append({
            'id': conv.id,
            'type': 'conversation',
            'title': conv.title,
            'date': conv.created_at,
            'author': conv.author.get_full_name()
        })
    
    for dec in old_decisions:
        legacy.append({
            'id': dec.id,
            'type': 'decision',
            'title': dec.title,
            'date': dec.implemented_at,
            'author': dec.decision_maker.get_full_name() if dec.decision_maker else None
        })
    
    legacy.sort(key=lambda x: x['date'], reverse=True)
    return Response({'legacy': legacy[:30]})

@api_view(['GET'])
def personal_reflection(request):
    """Get personal activity summary"""
    if not request.user or not request.user.is_authenticated:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    # User's contributions
    my_conversations = Conversation.objects.filter(
        author=request.user,
        created_at__gte=timezone.now() - timedelta(days=90)
    ).count()
    
    my_replies = ConversationReply.objects.filter(
        author=request.user,
        created_at__gte=timezone.now() - timedelta(days=90)
    ).count()
    
    my_decisions = Decision.objects.filter(
        decision_maker=request.user,
        created_at__gte=timezone.now() - timedelta(days=90)
    ).count()
    
    # Most discussed topics
    my_convs = Conversation.objects.filter(
        author=request.user,
        ai_processed=True
    ).order_by('-created_at')[:20]
    
    my_topics = {}
    for conv in my_convs:
        for kw in conv.ai_keywords:
            my_topics[kw] = my_topics.get(kw, 0) + 1
    
    top_topics = sorted(my_topics.items(), key=lambda x: x[1], reverse=True)[:5]
    
    return Response({
        'period': 'Last 90 days',
        'contributions': {
            'conversations': my_conversations,
            'replies': my_replies,
            'decisions': my_decisions,
            'total': my_conversations + my_replies + my_decisions
        },
        'top_topics': [{'topic': t[0], 'count': t[1]} for t in top_topics],
        'message': f'You\'ve been active in {my_conversations + my_replies} discussions'
    })