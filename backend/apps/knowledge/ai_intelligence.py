from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta
from django.contrib.contenttypes.models import ContentType
from apps.conversations.models import Conversation
from apps.decisions.models import Decision
from apps.knowledge.unified_models import ContentLink, UnifiedActivity
from apps.business.models import Task
from apps.agile.models import Blocker, Sprint
from apps.organizations.auditlog_models import AuditLog
from apps.notifications.utils import create_notification


def _time_decay(days_old, half_life_days=3.0):
    return 0.5 ** (max(days_old, 0.0) / half_life_days)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ai_recommendations(request):
    """Generate AI-powered recommendations for user"""
    org = request.user.organization
    user = request.user

    now = timezone.now()

    # Get user's recent view activity (newest first)
    recent_views = list(UnifiedActivity.objects.filter(
        organization=org,
        user=user,
        activity_type='viewed',
        created_at__gte=now - timedelta(days=14)
    ).select_related('content_type').order_by('-created_at')[:30])

    viewed_keys = {
        (view.content_type_id, view.object_id)
        for view in recent_views
    }
    view_weights = {}
    viewed_type_weight = {}
    for view in recent_views:
        days_old = (now - view.created_at).total_seconds() / 86400.0
        decay = _time_decay(days_old, half_life_days=3.0)
        view_weights[(view.content_type_id, view.object_id)] = decay
        viewed_type_weight[view.content_type.model] = viewed_type_weight.get(view.content_type.model, 0.0) + decay

    recommendations = {}

    def add_recommendation(item_type, item_id, title, reason, score, source_key=None):
        key = (item_type, item_id)
        if key not in recommendations:
            recommendations[key] = {
                'type': item_type,
                'id': item_id,
                'title': title,
                'score': 0.0,
                'reasons': [],
                'source_breakdown': {},
            }
        recommendations[key]['score'] += max(0.0, score)
        if reason and reason not in recommendations[key]['reasons']:
            recommendations[key]['reasons'].append(reason)
        if source_key:
            recommendations[key]['source_breakdown'][source_key] = (
                recommendations[key]['source_breakdown'].get(source_key, 0.0) + max(0.0, score)
            )

    # 1. Trending conversations (recency-weighted)
    trending = Conversation.objects.filter(
        organization=org,
        created_at__gte=now - timedelta(days=3)
    ).annotate(
        activity_count=Count('id')
    ).order_by('-activity_count')[:3]

    conv_ct_id = ContentType.objects.get_for_model(Conversation).id
    for conv in trending:
        days_old = (now - conv.created_at).total_seconds() / 86400.0
        score = 0.45 + (0.30 * _time_decay(days_old, half_life_days=2.0))
        if (conv_ct_id, conv.id) in viewed_keys:
            score *= 0.55
        add_recommendation(
            'conversation',
            conv.id,
            conv.title,
            'Trending in your organization',
            score,
            source_key='trending',
        )

    # 2. Pending decisions (recency-weighted)
    pending = Decision.objects.filter(
        organization=org,
        status='proposed'
    ).order_by('-created_at')[:3]
    dec_ct_id = ContentType.objects.get_for_model(Decision).id
    for dec in pending:
        days_old = (now - dec.created_at).total_seconds() / 86400.0
        score = 0.50 + (0.25 * _time_decay(days_old, half_life_days=5.0))
        if (dec_ct_id, dec.id) in viewed_keys:
            score *= 0.60
        add_recommendation(
            'decision',
            dec.id,
            dec.title,
            'Needs your input',
            score,
            source_key='pending_decisions',
        )

    # 3. Related content based on viewed items + link strength + recency decay
    if recent_views:
        for view in recent_views[:15]:
            source_key = (view.content_type_id, view.object_id)
            source_weight = view_weights.get(source_key, 0.0)
            links = ContentLink.objects.filter(
                organization=org
            ).filter(
                Q(source_content_type=view.content_type, source_object_id=view.object_id) |
                Q(target_content_type=view.content_type, target_object_id=view.object_id)
            ).select_related('source_content_type', 'target_content_type')[:4]

            for link in links:
                if link.source_object_id == view.object_id and link.source_content_type_id == view.content_type_id:
                    target_ct = link.target_content_type
                    target_obj = link.target_object
                    target_id = link.target_object_id
                else:
                    target_ct = link.source_content_type
                    target_obj = link.source_object
                    target_id = link.source_object_id

                target_title = getattr(target_obj, 'title', str(target_obj)) if target_obj else f'Related {target_ct.model}'
                link_score = (0.20 + 0.50 * float(link.strength)) * source_weight

                if (target_ct.id, target_id) in viewed_keys:
                    link_score *= 0.50

                add_recommendation(
                    target_ct.model,
                    target_id,
                    target_title,
                    'Connected to your recent activity',
                    link_score,
                    source_key='linked_from_views',
                )

    # 3b. Explicit viewed-context affinity by content type, with decay.
    for item in recommendations.values():
        affinity = viewed_type_weight.get(item['type'], 0.0)
        if affinity <= 0:
            continue
        boost = min(0.28, affinity * 0.08)
        item['score'] += boost
        if 'Aligned with your recent viewed topics' not in item['reasons']:
            item['reasons'].append('Aligned with your recent viewed topics')
        item['source_breakdown']['viewed_affinity'] = item['source_breakdown'].get('viewed_affinity', 0.0) + boost

    # 4. Outcome-linked calibration for decision recommendations
    decision_ids = [item['id'] for item in recommendations.values() if item['type'] == 'decision']
    if decision_ids:
        decision_map = {
            d.id: d
            for d in Decision.objects.filter(organization=org, id__in=decision_ids)
        }
        for item in recommendations.values():
            if item['type'] != 'decision':
                continue
            decision_obj = decision_map.get(item['id'])
            if not decision_obj:
                continue
            if decision_obj.was_successful is True:
                bonus = 0.12
                item['score'] += bonus
                item['reasons'].append('Positive validated outcome')
                item['source_breakdown']['outcome_history'] = item['source_breakdown'].get('outcome_history', 0.0) + bonus
            elif decision_obj.was_successful is False:
                penalty = 0.12
                item['score'] = max(0.0, item['score'] - penalty)
                item['reasons'].append('Past outcome indicates risk')
                item['source_breakdown']['outcome_history'] = item['source_breakdown'].get('outcome_history', 0.0) - penalty

    # Normalize output and sort
    ranked = sorted(
        recommendations.values(),
        key=lambda item: item['score'],
        reverse=True
    )

    output = []
    for item in ranked[:8]:
        source_breakdown = sorted(
            (
                {'source': source, 'score': round(score, 4)}
                for source, score in item['source_breakdown'].items()
            ),
            key=lambda s: s['score'],
            reverse=True
        )
        output.append({
            'type': item['type'],
            'id': item['id'],
            'title': item['title'],
            'reason': ' | '.join(item['reasons'][:2]),
            'score': round(item['score'], 4),
            'source_breakdown': source_breakdown,
        })

    return Response({
        'recommendations': output,
        'generated_at': now.isoformat()
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ai_summarize(request):
    """Generate AI summary of content"""
    content = request.data.get('content', '')
    content_type = request.data.get('type', 'text')
    
    # Simple extractive summary (first 3 sentences)
    sentences = content.split('. ')
    summary = '. '.join(sentences[:3]) + '.'
    
    # Extract key points (sentences with keywords)
    keywords = ['important', 'critical', 'key', 'must', 'should', 'decision', 'action']
    key_points = [s for s in sentences if any(k in s.lower() for k in keywords)][:3]
    
    return Response({
        'summary': summary,
        'key_points': key_points,
        'word_count': len(content.split()),
        'reading_time': len(content.split()) // 200  # avg reading speed
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ai_extract_action_items(request):
    """Extract action items from content"""
    content = request.data.get('content', '')
    
    # Simple pattern matching for action items
    action_patterns = ['TODO:', 'Action:', '- [ ]', 'Need to', 'Must', 'Should']
    sentences = content.split('\n')
    
    actions = []
    for sentence in sentences:
        if any(pattern.lower() in sentence.lower() for pattern in action_patterns):
            actions.append({
                'text': sentence.strip(),
                'priority': 'high' if 'urgent' in sentence.lower() or 'asap' in sentence.lower() else 'medium'
            })
    
    return Response({
        'action_items': actions[:10],
        'count': len(actions)
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def mission_control_briefing(request):
    """
    State-of-the-art style "Mission Control" briefing:
    - critical path health
    - autonomous actions with confidence
    - 24h simulation
    - explainable evidence citations
    """
    org = request.user.organization
    now = timezone.now()

    unresolved_decisions = Decision.objects.filter(
        organization=org
    ).filter(
        Q(status__in=['proposed', 'under_review', 'approved']) |
        Q(status='implemented', review_completed_at__isnull=True)
    ).order_by('-impact_level', '-created_at')[:30]

    active_blockers = Blocker.objects.filter(
        organization=org,
        status='active'
    ).select_related('sprint').order_by('-created_at')[:30]

    open_tasks = Task.objects.filter(
        organization=org,
        status__in=['todo', 'in_progress']
    ).order_by('-created_at')[:80]

    current_sprint = Sprint.objects.filter(
        organization=org,
        start_date__lte=now.date(),
        end_date__gte=now.date()
    ).order_by('-start_date').first()

    critical_path_score = 100.0
    critical_path_score -= min(35.0, unresolved_decisions.count() * 3.2)
    critical_path_score -= min(30.0, active_blockers.count() * 6.0)
    critical_path_score -= min(15.0, open_tasks.filter(priority='high').count() * 1.6)
    if current_sprint and current_sprint.end_date <= (now.date() + timedelta(days=3)):
        critical_path_score -= 8.0
    critical_path_score = max(2.0, min(100.0, critical_path_score))

    status = 'stable' if critical_path_score >= 75 else 'watch' if critical_path_score >= 50 else 'critical'

    actions = []
    citations = []

    for dec in unresolved_decisions[:3]:
        confidence = max(55, min(94, 88 - (10 if dec.impact_level in ['high', 'critical'] else 0)))
        actions.append({
            'type': 'decision_resolution',
            'title': f"Resolve decision: {dec.title}",
            'impact_estimate': 'high' if dec.impact_level in ['high', 'critical'] else 'medium',
            'time_to_value_hours': 6 if dec.impact_level in ['high', 'critical'] else 12,
            'confidence': confidence,
            'auto_run_supported': False,
            'suggested_path': f"Gather final stakeholder input and move decision #{dec.id} to implemented or rejected.",
            'url': f"/decisions/{dec.id}",
        })
        citations.append({'kind': 'decision', 'id': dec.id, 'title': dec.title, 'url': f"/decisions/{dec.id}"})

    for blocker in active_blockers[:2]:
        confidence = 79
        title = blocker.title if hasattr(blocker, 'title') else f"Blocker #{blocker.id}"
        actions.append({
            'type': 'blocker_resolution',
            'title': f"Escalate blocker: {title}",
            'impact_estimate': 'high',
            'time_to_value_hours': 4,
            'confidence': confidence,
            'auto_run_supported': False,
            'suggested_path': "Assign owner + decision deadline + mitigation task.",
            'url': "/blockers",
        })
        citations.append({'kind': 'blocker', 'id': blocker.id, 'title': title, 'url': "/blockers"})

    high_priority_tasks = open_tasks.filter(priority='high')[:2]
    for task in high_priority_tasks:
        confidence = 74
        actions.append({
            'type': 'task_acceleration',
            'title': f"Accelerate task: {task.title}",
            'impact_estimate': 'medium',
            'time_to_value_hours': 8,
            'confidence': confidence,
            'auto_run_supported': False,
            'suggested_path': "Reassign to most relevant owner and set 48h checkpoint.",
            'url': "/business/tasks",
        })
        citations.append({'kind': 'task', 'id': task.id, 'title': task.title, 'url': "/business/tasks"})

    # 24h simulation based on action completion assumptions
    projected_risk_reduction = min(42.0, len(actions) * 6.5)
    projected_score_24h = min(99.0, critical_path_score + projected_risk_reduction * 0.55)
    probability_on_track_24h = max(10.0, min(98.0, projected_score_24h - 3.0))

    return Response({
        'generated_at': now.isoformat(),
        'north_star': {
            'critical_path_score': round(critical_path_score, 1),
            'status': status,
            'summary': (
                "Execution is healthy and compounding institutional memory."
                if status == 'stable'
                else "Execution risk is rising; focused intervention recommended."
                if status == 'watch'
                else "Critical execution risk detected; immediate coordination required."
            ),
        },
        'autonomous_actions': actions[:8],
        'simulation_24h': {
            'projected_critical_path_score': round(projected_score_24h, 1),
            'probability_on_track_pct': round(probability_on_track_24h, 1),
            'assumptions': [
                "Top recommended actions are executed within 24h",
                "No net-new critical blockers are introduced",
                "Decision turnaround remains within current median response time",
            ],
        },
        'evidence': citations[:12],
    })


def _build_chief_of_staff_plan(org, now):
    interventions = []

    unresolved_decisions = list(
        Decision.objects.filter(organization=org)
        .filter(Q(status__in=['proposed', 'under_review', 'approved']) | Q(status='implemented', review_completed_at__isnull=True))
        .select_related('decision_maker')
        .order_by('-created_at')[:20]
    )

    active_blockers = list(
        Blocker.objects.filter(organization=org, status='active')
        .select_related('assigned_to', 'blocked_by')
        .order_by('-created_at')[:20]
    )

    high_priority_tasks = list(
        Task.objects.filter(organization=org, priority='high', status__in=['todo', 'in_progress'])
        .select_related('assigned_to')
        .order_by('-created_at')[:20]
    )

    # 1) Decision resolution interventions.
    for dec in unresolved_decisions[:4]:
        interventions.append({
            'id': f"decision:{dec.id}",
            'kind': 'decision_resolution',
            'title': f"Resolve decision: {dec.title}",
            'reason': 'Unresolved decision is impacting execution flow',
            'impact': 'high' if dec.impact_level in ['high', 'critical'] else 'medium',
            'confidence': 86 if dec.impact_level in ['high', 'critical'] else 78,
            'url': f"/decisions/{dec.id}",
            'meta': {'decision_id': dec.id},
        })

    # 2) Blocker escalation interventions.
    for blocker in active_blockers[:3]:
        interventions.append({
            'id': f"blocker:{blocker.id}",
            'kind': 'blocker_escalation',
            'title': f"Escalate blocker: {blocker.title}",
            'reason': 'Active blocker remains unresolved and may impact sprint outcomes',
            'impact': 'high',
            'confidence': 80,
            'url': '/blockers',
            'meta': {'blocker_id': blocker.id},
        })

    # 3) Task ownership interventions.
    for task in high_priority_tasks[:3]:
        if task.assigned_to_id:
            continue
        interventions.append({
            'id': f"task:{task.id}",
            'kind': 'task_ownership',
            'title': f"Assign owner: {task.title}",
            'reason': 'High-priority task is unassigned',
            'impact': 'medium',
            'confidence': 74,
            'url': '/business/tasks',
            'meta': {'task_id': task.id},
        })

    interventions.sort(key=lambda x: (0 if x['impact'] == 'high' else 1, -x['confidence']))

    readiness_score = 100.0
    readiness_score -= min(40.0, len(unresolved_decisions) * 3.5)
    readiness_score -= min(35.0, len(active_blockers) * 7.0)
    readiness_score -= min(15.0, len([t for t in high_priority_tasks if not t.assigned_to_id]) * 3.0)
    readiness_score = max(5.0, min(100.0, readiness_score))

    return {
        'generated_at': now.isoformat(),
        'readiness_score': round(readiness_score, 1),
        'status': 'stable' if readiness_score >= 75 else 'watch' if readiness_score >= 50 else 'critical',
        'interventions': interventions[:10],
        'counts': {
            'unresolved_decisions': len(unresolved_decisions),
            'active_blockers': len(active_blockers),
            'high_priority_unassigned_tasks': len([t for t in high_priority_tasks if not t.assigned_to_id]),
        },
    }


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def chief_of_staff_plan(request):
    """Generate autonomous intervention plan that requires explicit approval."""
    plan = _build_chief_of_staff_plan(request.user.organization, timezone.now())
    plan['requires_approval'] = True
    return Response(plan)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def chief_of_staff_execute(request):
    """Execute approved interventions and produce audit trail."""
    org = request.user.organization
    user = request.user
    now = timezone.now()

    intervention_ids = request.data.get('intervention_ids') or []
    dry_run = bool(request.data.get('dry_run', False))
    if not isinstance(intervention_ids, list):
        return Response({'error': 'intervention_ids must be an array'}, status=400)

    plan = _build_chief_of_staff_plan(org, now)
    plan_map = {item['id']: item for item in plan['interventions']}
    selected = [plan_map[item_id] for item_id in intervention_ids if item_id in plan_map]

    executed = []
    skipped = []
    audit_records = []

    for item in selected:
        kind = item['kind']
        meta = item.get('meta', {})

        if dry_run:
            executed.append({'id': item['id'], 'kind': kind, 'status': 'dry_run'})
            continue

        if kind == 'decision_resolution':
            decision_id = meta.get('decision_id')
            try:
                decision = Decision.objects.get(id=decision_id, organization=org)
            except Decision.DoesNotExist:
                skipped.append({'id': item['id'], 'reason': 'decision_not_found'})
                continue

            task_title = f"Chief of Staff: resolve decision #{decision.id}"
            if Task.objects.filter(organization=org, decision=decision, title=task_title).exists():
                skipped.append({'id': item['id'], 'reason': 'task_already_exists'})
                continue

            task = Task.objects.create(
                organization=org,
                title=task_title,
                description=f"Auto-generated intervention for decision '{decision.title}'.",
                status='todo',
                priority='high' if decision.impact_level in ['high', 'critical'] else 'medium',
                assigned_to=decision.decision_maker,
                decision=decision,
                due_date=(now + timedelta(days=3)).date(),
            )
            if decision.decision_maker and decision.decision_maker != user:
                create_notification(
                    user=decision.decision_maker,
                    notification_type='automation',
                    title='AI Chief of Staff action',
                    message=f"New follow-up task for decision '{decision.title}'",
                    link='/business/tasks',
                )
            executed.append({'id': item['id'], 'kind': kind, 'status': 'executed', 'task_id': task.id})

            audit = AuditLog.log(
                organization=org,
                user=user,
                action='update',
                resource_type='chief_of_staff_intervention',
                resource_id=decision.id,
                details={'intervention': item, 'result': {'task_id': task.id}},
                request=request,
            )
            audit_records.append(audit.id)

        elif kind == 'blocker_escalation':
            blocker_id = meta.get('blocker_id')
            try:
                blocker = Blocker.objects.get(id=blocker_id, organization=org)
            except Blocker.DoesNotExist:
                skipped.append({'id': item['id'], 'reason': 'blocker_not_found'})
                continue

            owner = blocker.assigned_to or blocker.blocked_by
            if owner:
                create_notification(
                    user=owner,
                    notification_type='automation',
                    title='AI escalation: blocker needs action',
                    message=f"Blocker '{blocker.title}' has been escalated by Chief of Staff agent.",
                    link='/blockers',
                )
            executed.append({'id': item['id'], 'kind': kind, 'status': 'executed'})

            audit = AuditLog.log(
                organization=org,
                user=user,
                action='update',
                resource_type='chief_of_staff_intervention',
                resource_id=blocker.id,
                details={'intervention': item, 'result': {'owner_notified': bool(owner)}},
                request=request,
            )
            audit_records.append(audit.id)

        elif kind == 'task_ownership':
            task_id = meta.get('task_id')
            try:
                task = Task.objects.get(id=task_id, organization=org)
            except Task.DoesNotExist:
                skipped.append({'id': item['id'], 'reason': 'task_not_found'})
                continue

            if task.assigned_to_id:
                skipped.append({'id': item['id'], 'reason': 'already_assigned'})
                continue

            assignee = org.users.filter(role__in=['manager', 'admin'], is_active=True).order_by('id').first()
            if not assignee:
                assignee = org.users.filter(is_active=True).order_by('id').first()
            if not assignee:
                skipped.append({'id': item['id'], 'reason': 'no_active_user'})
                continue

            task.assigned_to = assignee
            task.save(update_fields=['assigned_to', 'updated_at'])
            if assignee != user:
                create_notification(
                    user=assignee,
                    notification_type='automation',
                    title='AI assignment: high-priority task',
                    message=f"You were assigned '{task.title}' by Chief of Staff agent.",
                    link='/business/tasks',
                )
            executed.append({'id': item['id'], 'kind': kind, 'status': 'executed', 'assigned_to': assignee.get_full_name()})

            audit = AuditLog.log(
                organization=org,
                user=user,
                action='update',
                resource_type='chief_of_staff_intervention',
                resource_id=task.id,
                details={'intervention': item, 'result': {'assigned_to_id': assignee.id}},
                request=request,
            )
            audit_records.append(audit.id)
        else:
            skipped.append({'id': item['id'], 'reason': 'unsupported_kind'})

    return Response({
        'dry_run': dry_run,
        'selected': len(selected),
        'executed_count': len(executed),
        'skipped_count': len(skipped),
        'executed': executed,
        'skipped': skipped,
        'audit_log_ids': audit_records,
    })
