from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q, Count
from datetime import datetime, timedelta
from apps.decisions.models import Decision
from apps.conversations.models import Conversation
from apps.knowledge.unified_models import ContentLink

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def check_similar_failures(request):
    """Check if similar content has failed in the past"""
    content_type = request.data.get('type')  # 'decision', 'conversation', 'project'
    title = request.data.get('title', '')
    description = request.data.get('description', '')
    keywords = request.data.get('keywords', [])
    
    warnings = []
    similar_items = []
    
    # Extract keywords from title/description if not provided
    if not keywords:
        text = f"{title} {description}".lower()
        keywords = [w for w in text.split() if len(w) > 4][:10]
    
    if content_type == 'decision':
        # Find similar decisions that were rejected or failed
        failed_decisions = Decision.objects.filter(
            organization=request.user.organization,
            status__in=['rejected', 'cancelled']
        ).order_by('-created_at')[:50]
        
        for decision in failed_decisions:
            decision_text = f"{decision.title} {decision.description}".lower()
            matches = sum(1 for kw in keywords if kw in decision_text)
            
            if matches >= 2:  # At least 2 keyword matches
                similarity = matches / len(keywords) if keywords else 0
                similar_items.append({
                    'id': decision.id,
                    'title': decision.title,
                    'status': decision.status,
                    'similarity': round(similarity * 100),
                    'date': decision.created_at.strftime('%Y-%m-%d'),
                    'reason': decision.context_reason or 'No reason provided'
                })
        
        if similar_items:
            warnings.append({
                'type': 'similar_failure',
                'severity': 'high',
                'message': f'Found {len(similar_items)} similar decisions that were rejected or cancelled',
                'items': similar_items[:3]
            })
    
    # Check for rapid iteration (multiple similar items in short time)
    recent_similar = Decision.objects.filter(
        organization=request.user.organization,
        created_at__gte=datetime.now() - timedelta(days=30)
    )
    
    rapid_count = 0
    for decision in recent_similar:
        decision_text = f"{decision.title} {decision.description}".lower()
        matches = sum(1 for kw in keywords if kw in decision_text)
        if matches >= 2:
            rapid_count += 1
    
    if rapid_count >= 3:
        warnings.append({
            'type': 'rapid_iteration',
            'severity': 'medium',
            'message': f'{rapid_count} similar items created in the last 30 days - consider consolidating',
            'items': []
        })
    
    # Calculate success rate for similar topics
    all_similar = Decision.objects.filter(
        organization=request.user.organization
    )
    
    topic_decisions = []
    for decision in all_similar:
        decision_text = f"{decision.title} {decision.description}".lower()
        matches = sum(1 for kw in keywords if kw in decision_text)
        if matches >= 2:
            topic_decisions.append(decision)
    
    if len(topic_decisions) >= 3:
        success_count = sum(1 for d in topic_decisions if d.status in ['approved', 'implemented'])
        success_rate = (success_count / len(topic_decisions)) * 100
        
        if success_rate < 50:
            warnings.append({
                'type': 'low_success_rate',
                'severity': 'high',
                'message': f'Similar decisions have only {int(success_rate)}% success rate ({success_count}/{len(topic_decisions)})',
                'success_rate': int(success_rate),
                'total': len(topic_decisions)
            })
    
    return Response({
        'warnings': warnings,
        'similar_count': len(similar_items),
        'success_rate': int(success_rate) if len(topic_decisions) >= 3 else None
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_success_rates(request):
    """Get success rates for different content types"""
    org = request.user.organization
    
    # Decision success rates
    decisions = Decision.objects.filter(organization=org)
    total_decisions = decisions.count()
    successful_decisions = decisions.filter(status__in=['approved', 'implemented']).count()
    decision_rate = (successful_decisions / total_decisions * 100) if total_decisions > 0 else 0
    
    # By impact level
    by_impact = {}
    for impact in ['low', 'medium', 'high', 'critical']:
        impact_decisions = decisions.filter(impact_level=impact)
        impact_total = impact_decisions.count()
        impact_success = impact_decisions.filter(status__in=['approved', 'implemented']).count()
        by_impact[impact] = {
            'total': impact_total,
            'successful': impact_success,
            'rate': (impact_success / impact_total * 100) if impact_total > 0 else 0
        }
    
    return Response({
        'overall': {
            'decisions': {
                'total': total_decisions,
                'successful': successful_decisions,
                'rate': round(decision_rate, 1)
            }
        },
        'by_impact': by_impact
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def detect_bottlenecks(request):
    """Detect bottlenecks in projects and sprints"""
    from apps.agile.models import Issue, Sprint
    org = request.user.organization
    bottlenecks = []
    
    # Find blocked issues
    blocked_issues = Issue.objects.filter(
        project__organization=org,
        status='blocked'
    ).select_related('project', 'assignee')
    
    if blocked_issues.count() > 0:
        bottlenecks.append({
            'type': 'blocked_issues',
            'severity': 'high',
            'count': blocked_issues.count(),
            'message': f'{blocked_issues.count()} issues are currently blocked',
            'items': [{'id': i.id, 'title': i.title, 'project': i.project.name} for i in blocked_issues[:5]]
        })
    
    # Find overdue issues
    overdue_issues = Issue.objects.filter(
        project__organization=org,
        due_date__lt=datetime.now(),
        status__in=['todo', 'in_progress']
    ).select_related('project')
    
    if overdue_issues.count() > 3:
        bottlenecks.append({
            'type': 'overdue_issues',
            'severity': 'medium',
            'count': overdue_issues.count(),
            'message': f'{overdue_issues.count()} issues are overdue',
            'items': [{'id': i.id, 'title': i.title, 'due_date': i.due_date.strftime('%Y-%m-%d')} for i in overdue_issues[:5]]
        })
    
    # Find stalled sprints
    active_sprints = Sprint.objects.filter(
        project__organization=org,
        status='active'
    )
    
    for sprint in active_sprints:
        issues = Issue.objects.filter(sprint=sprint)
        total = issues.count()
        done = issues.filter(status='done').count()
        progress = (done / total * 100) if total > 0 else 0
        
        days_left = (sprint.end_date - datetime.now().date()).days if sprint.end_date else 0
        
        if days_left <= 3 and progress < 50:
            bottlenecks.append({
                'type': 'stalled_sprint',
                'severity': 'high',
                'message': f'Sprint "{sprint.name}" is {int(progress)}% complete with {days_left} days left',
                'sprint_id': sprint.id,
                'progress': int(progress),
                'days_left': days_left
            })
    
    return Response({'bottlenecks': bottlenecks})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def detect_knowledge_gaps(request):
    """Detect missing documentation and knowledge gaps"""
    from apps.agile.models import Project, Issue
    org = request.user.organization
    gaps = []
    
    # Projects without description
    projects_no_desc = Project.objects.filter(
        organization=org,
        description=''
    ).count()
    
    if projects_no_desc > 0:
        gaps.append({
            'type': 'missing_project_docs',
            'severity': 'medium',
            'count': projects_no_desc,
            'message': f'{projects_no_desc} projects have no description'
        })
    
    # Decisions without rationale
    decisions_no_rationale = Decision.objects.filter(
        organization=org,
        rationale=''
    ).count()
    
    if decisions_no_rationale > 0:
        gaps.append({
            'type': 'missing_rationale',
            'severity': 'high',
            'count': decisions_no_rationale,
            'message': f'{decisions_no_rationale} decisions lack rationale documentation'
        })
    
    # Conversations without tags
    all_conversations = Conversation.objects.filter(organization=org).prefetch_related('tags')
    conversations_no_tags = sum(1 for c in all_conversations if c.tags.count() == 0)
    
    if conversations_no_tags > 5:
        gaps.append({
            'type': 'untagged_content',
            'severity': 'low',
            'count': conversations_no_tags,
            'message': f'{conversations_no_tags} conversations are untagged'
        })
    
    # Orphaned content (no links)
    total_decisions = Decision.objects.filter(organization=org).count()
    linked_decisions = ContentLink.objects.filter(
        organization=org
    ).values('source_object_id').distinct().count()
    
    orphaned = total_decisions - linked_decisions
    if orphaned > 0 and total_decisions > 0:
        orphan_rate = (orphaned / total_decisions * 100)
        if orphan_rate > 30:
            gaps.append({
                'type': 'orphaned_content',
                'severity': 'medium',
                'count': orphaned,
                'message': f'{orphaned} decisions ({int(orphan_rate)}%) have no connections to other content'
            })
    
    return Response({'gaps': gaps})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def detect_patterns(request):
    """Detect patterns in decisions and projects"""
    pattern_type = request.data.get('type', 'decision')  # decision, project, conversation
    org = request.user.organization
    patterns = []
    
    if pattern_type == 'decision':
        # Pattern: Decisions by same maker
        from django.db.models import Count
        decision_makers = Decision.objects.filter(
            organization=org
        ).values('decision_maker__full_name').annotate(
            count=Count('id'),
            approved=Count('id', filter=Q(status__in=['approved', 'implemented']))
        ).order_by('-count')[:5]
        
        for maker in decision_makers:
            if maker['count'] >= 3:
                success_rate = (maker['approved'] / maker['count'] * 100) if maker['count'] > 0 else 0
                patterns.append({
                    'type': 'decision_maker_pattern',
                    'maker': maker['decision_maker__full_name'],
                    'total': maker['count'],
                    'approved': maker['approved'],
                    'success_rate': int(success_rate),
                    'message': f"{maker['decision_maker__full_name']} has {int(success_rate)}% approval rate ({maker['approved']}/{maker['count']})"
                })
        
        # Pattern: Recurring rejection reasons
        rejected = Decision.objects.filter(
            organization=org,
            status='rejected'
        ).exclude(context_reason='')
        
        reason_keywords = {}
        for decision in rejected:
            words = decision.context_reason.lower().split()
            for word in words:
                if len(word) > 5:
                    reason_keywords[word] = reason_keywords.get(word, 0) + 1
        
        common_reasons = sorted(reason_keywords.items(), key=lambda x: x[1], reverse=True)[:3]
        if common_reasons and common_reasons[0][1] >= 3:
            patterns.append({
                'type': 'rejection_pattern',
                'keywords': [r[0] for r in common_reasons],
                'message': f'Common rejection reasons: {", ".join([r[0] for r in common_reasons])}'
            })
    
    return Response({'patterns': patterns})
