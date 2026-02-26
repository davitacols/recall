from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.db.models import Q
from django.utils import timezone
from datetime import timedelta
from django.contrib.contenttypes.models import ContentType
from django.views.decorators.csrf import csrf_exempt
from .models import Decision
from apps.organizations.activity import log_activity
from apps.knowledge.unified_models import UnifiedActivity


def _clamp(value, minimum, maximum):
    return max(minimum, min(maximum, value))


def compute_outcome_reliability(decision, now=None):
    """Compute reliability of an outcome review based on evidence quality."""
    if now is None:
        now = timezone.now()

    metrics = decision.success_metrics or {}
    review_meta = metrics.get('_review_meta') if isinstance(metrics, dict) else {}
    review_confidence = review_meta.get('review_confidence') if isinstance(review_meta, dict) else None
    try:
        review_confidence = int(review_confidence) if review_confidence is not None else None
    except (TypeError, ValueError):
        review_confidence = None

    score = 25.0
    factors = []

    if review_confidence is not None:
        confidence_points = _clamp(review_confidence, 1, 5) * 8.0
        score += confidence_points
        factors.append({'name': 'review_confidence', 'score': round(confidence_points, 2)})

    evidence_points = 0.0
    if isinstance(metrics, dict):
        metric_keys = ['kpi_delta', 'adoption_rate', 'roi', 'incident_count']
        present_count = sum(1 for key in metric_keys if key in metrics and metrics.get(key) not in (None, ''))
        evidence_points += present_count * 5.0
    if decision.outcome_notes and len(decision.outcome_notes.strip()) >= 25:
        evidence_points += 5.0
    if decision.impact_review_notes and len(decision.impact_review_notes.strip()) >= 25:
        evidence_points += 5.0
    if decision.lessons_learned and len(decision.lessons_learned.strip()) >= 25:
        evidence_points += 5.0
    score += evidence_points
    factors.append({'name': 'evidence_coverage', 'score': round(evidence_points, 2)})

    recency_penalty = 0.0
    if decision.review_completed_at:
        age_days = max(0.0, (now - decision.review_completed_at).total_seconds() / 86400.0)
        # Up to -15 points after ~4 months.
        recency_penalty = min(15.0, max(0.0, age_days - 14.0) * 0.12)
    score -= recency_penalty
    if recency_penalty > 0:
        factors.append({'name': 'recency_decay', 'score': round(-recency_penalty, 2)})

    final_score = round(_clamp(score, 0.0, 100.0), 1)
    band = 'high' if final_score >= 75 else 'medium' if final_score >= 50 else 'low'
    return {
        'score': final_score,
        'band': band,
        'factors': factors,
    }


def _tokenize_text(value):
    if not value:
        return set()
    tokens = []
    for raw in str(value).lower().replace('\n', ' ').split():
        token = ''.join(ch for ch in raw if ch.isalnum())
        if len(token) >= 4:
            tokens.append(token)
    return set(tokens)


def _decision_similarity(source_tokens, candidate):
    candidate_tokens = _tokenize_text(
        f"{candidate.title or ''} {candidate.description or ''} {candidate.rationale or ''} {candidate.lessons_learned or ''}"
    )
    if not source_tokens or not candidate_tokens:
        return 0.0
    overlap = len(source_tokens & candidate_tokens)
    union = len(source_tokens | candidate_tokens)
    return (overlap / union) if union else 0.0


def _track_view_activity(request, obj, title, description=""):
    try:
        content_type = ContentType.objects.get_for_model(obj)
        cutoff = timezone.now() - timedelta(minutes=30)
        exists = UnifiedActivity.objects.filter(
            organization=request.user.organization,
            user=request.user,
            activity_type='viewed',
            content_type=content_type,
            object_id=obj.id,
            created_at__gte=cutoff,
        ).exists()
        if not exists:
            UnifiedActivity.objects.create(
                organization=request.user.organization,
                user=request.user,
                activity_type='viewed',
                content_type=content_type,
                object_id=obj.id,
                title=title,
                description=description[:200] if description else '',
            )
    except Exception:
        pass


def _review_due_at(decision):
    if decision.review_scheduled_at:
        return decision.review_scheduled_at
    if decision.implemented_at:
        return decision.implemented_at + timedelta(days=14)
    if decision.decided_at:
        return decision.decided_at + timedelta(days=14)
    return decision.created_at + timedelta(days=14)

@csrf_exempt
@api_view(['GET', 'POST'])
def decisions(request):
    if request.method == 'GET':
        # Get decisions for the user's organization only
        queryset = Decision.objects.filter(organization=request.user.organization)
        
        # Filter by status
        decision_status = request.GET.get('status')
        if decision_status:
            queryset = queryset.filter(status=decision_status)

        outcome_filter = request.GET.get('outcome')
        if outcome_filter == 'pending':
            queryset = queryset.filter(
                status='implemented',
                review_completed_at__isnull=True
            )
        elif outcome_filter == 'reviewed':
            queryset = queryset.filter(review_completed_at__isnull=False)
        elif outcome_filter == 'failed':
            queryset = queryset.filter(was_successful=False)
        elif outcome_filter == 'successful':
            queryset = queryset.filter(was_successful=True)
        
        # Search
        search = request.GET.get('search')
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) | Q(description__icontains=search)
            )
        
        decisions_data = []
        for decision in queryset[:20]:  # Limit to 20
            confidence = calculate_confidence(decision)
            decisions_data.append({
                'id': decision.id,
                'title': decision.title,
                'description': decision.description[:200] + '...' if len(decision.description) > 200 else decision.description,
                'status': decision.status,
                'impact_level': decision.impact_level,
                'decision_maker': decision.decision_maker.get_full_name() if decision.decision_maker else None,
                'decision_maker_name': decision.decision_maker.get_full_name() if decision.decision_maker else None,
                'created_at': decision.created_at,
                'decided_at': decision.decided_at,
                'confidence': confidence,
                'review_completed_at': decision.review_completed_at,
                'was_successful': decision.was_successful,
            })
        
        return Response(decisions_data)
    
    elif request.method == 'POST':
        data = request.data
        
        # Get conversation if provided
        conversation = None
        if data.get('conversation_id'):
            from apps.conversations.models import Conversation
            try:
                conversation = Conversation.objects.get(
                    id=data['conversation_id'],
                    organization=request.user.organization
                )
            except Conversation.DoesNotExist:
                pass
        
        decision = Decision.objects.create(
            organization=request.user.organization,
            conversation=conversation,
            title=data['title'],
            description=data['description'],
            rationale=data.get('rationale', ''),
            impact_level=data.get('impact_level', 'medium'),
            decision_maker=request.user,
            sprint_id=data.get('sprint_id')  # Link to sprint if provided
        )
        
        # Log activity
        log_activity(
            organization=request.user.organization,
            actor=request.user,
            action_type='decision_created',
            content_object=decision,
            title=decision.title
        )
        
        # Notify Slack only
        from apps.integrations.utils import notify_decision_created
        notify_decision_created(decision)
        
        # Update onboarding progress
        if not request.user.first_decision_made:
            request.user.first_decision_made = True
            request.user.save(update_fields=['first_decision_made'])
        
        return Response({
            'id': decision.id,
            'title': decision.title,
            'status': decision.status,
            'created_at': decision.created_at
        }, status=status.HTTP_201_CREATED)

@api_view(['POST'])
def approve_decision(request, decision_id):
    if not request.user.can_approve_decisions:
        return Response({'error': 'Permission denied'}, 
                       status=status.HTTP_403_FORBIDDEN)
    
    try:
        decision = Decision.objects.get(
            id=decision_id,
            organization=request.user.organization
        )
        
        decision.approve()
        
        # Notify decision maker
        from apps.notifications.utils import create_notification
        if decision.decision_maker != request.user:
            create_notification(
                user=decision.decision_maker,
                notification_type='decision',
                title='Decision Approved',
                message=f'Your decision "{decision.title}" was approved',
                link=f'/decisions/{decision.id}'
            )
        
        # Log activity
        log_activity(
            organization=request.user.organization,
            actor=request.user,
            action_type='decision_approved',
            content_object=decision,
            title=decision.title
        )
        
        return Response({'status': 'approved'})
    except Decision.DoesNotExist:
        return Response({'error': 'Decision not found'}, 
                       status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
def decisions_timeline(request):
    decisions = Decision.objects.filter(
        organization=request.user.organization,
        status__in=['approved', 'implemented']
    ).order_by('-decided_at')[:50]
    
    timeline_data = []
    for decision in decisions:
        timeline_data.append({
            'id': decision.id,
            'title': decision.title,
            'impact_level': decision.impact_level,
            'decided_at': decision.decided_at,
            'decision_maker': decision.decision_maker.get_full_name() if decision.decision_maker else None,
        })
    
    return Response(timeline_data)

@api_view(['GET'])
def decision_detail(request, decision_id):
    try:
        decision = Decision.objects.get(
            id=decision_id,
            organization=request.user.organization
        )
        _track_view_activity(
            request,
            decision,
            decision.title,
            decision.description,
        )
        
        confidence = calculate_confidence(decision)
        
        reliability = compute_outcome_reliability(decision)

        return Response({
            'id': decision.id,
            'title': decision.title,
            'description': decision.description,
            'rationale': decision.rationale,
            'impact_assessment': decision.impact_assessment,
            'status': decision.status,
            'impact_level': decision.impact_level,
            'decision_maker_name': decision.decision_maker.get_full_name() if decision.decision_maker else None,
            'created_at': decision.created_at,
            'decided_at': decision.decided_at,
            'implemented_at': decision.implemented_at,
            'conversation': decision.conversation_id,
            'confidence': confidence,
            'context_reason': decision.context_reason or '',
            'if_this_fails': decision.if_this_fails or '',
            'confidence_level': decision.confidence_level,
            'confidence_votes': decision.confidence_votes or [],
            'code_links': decision.code_links or [],
            'alternatives_considered': decision.alternatives_considered or [],
            'outcome_notes': decision.outcome_notes or '',
            'success_metrics': decision.success_metrics or {},
            'was_successful': decision.was_successful,
            'impact_review_notes': decision.impact_review_notes or '',
            'lessons_learned': decision.lessons_learned or '',
            'review_completed_at': decision.review_completed_at,
            'outcome_reliability': reliability,
        })
    except Decision.DoesNotExist:
        return Response({'error': 'Decision not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
def outcome_review(request, decision_id):
    try:
        decision = Decision.objects.get(
            id=decision_id,
            organization=request.user.organization
        )
    except Decision.DoesNotExist:
        return Response({'error': 'Decision not found'}, status=status.HTTP_404_NOT_FOUND)

    if decision.status != 'implemented':
        return Response({'error': 'Outcome review is available after implementation'}, status=status.HTTP_400_BAD_REQUEST)

    was_successful = request.data.get('was_successful')
    if was_successful is None:
        return Response({'error': 'was_successful is required'}, status=status.HTTP_400_BAD_REQUEST)

    if isinstance(was_successful, str):
        was_successful = was_successful.strip().lower() in ('1', 'true', 'yes', 'y')
    else:
        was_successful = bool(was_successful)

    review_confidence = request.data.get('review_confidence')
    try:
        review_confidence = int(review_confidence)
    except (TypeError, ValueError):
        return Response({'error': 'review_confidence must be an integer from 1 to 5'}, status=status.HTTP_400_BAD_REQUEST)
    if review_confidence < 1 or review_confidence > 5:
        return Response({'error': 'review_confidence must be between 1 and 5'}, status=status.HTTP_400_BAD_REQUEST)

    decision.was_successful = was_successful
    decision.outcome_notes = request.data.get('outcome_notes', decision.outcome_notes or '')
    decision.impact_review_notes = request.data.get('impact_review_notes', decision.impact_review_notes or '')
    decision.lessons_learned = request.data.get('lessons_learned', decision.lessons_learned or '')
    metrics = request.data.get('success_metrics')
    if metrics is None:
        metrics = decision.success_metrics or {}
    if not isinstance(metrics, dict):
        return Response({'error': 'success_metrics must be a JSON object'}, status=status.HTTP_400_BAD_REQUEST)

    # Data quality guardrails for known fields.
    for numeric_key in ['kpi_delta', 'adoption_rate', 'roi']:
        if numeric_key in metrics and not isinstance(metrics[numeric_key], (int, float)):
            return Response({'error': f'{numeric_key} must be numeric'}, status=status.HTTP_400_BAD_REQUEST)
    if 'adoption_rate' in metrics and (metrics['adoption_rate'] < 0 or metrics['adoption_rate'] > 100):
        return Response({'error': 'adoption_rate must be between 0 and 100'}, status=status.HTTP_400_BAD_REQUEST)
    if 'incident_count' in metrics:
        if not isinstance(metrics['incident_count'], int) or metrics['incident_count'] < 0:
            return Response({'error': 'incident_count must be a non-negative integer'}, status=status.HTTP_400_BAD_REQUEST)

    metrics['_review_meta'] = {
        'reviewed_by_id': request.user.id,
        'reviewed_by_name': request.user.get_full_name(),
        'review_confidence': review_confidence,
        'reviewed_at': timezone.now().isoformat(),
    }
    metrics['_reliability'] = compute_outcome_reliability(decision)
    decision.success_metrics = metrics
    decision.review_completed_at = timezone.now()
    decision.save()

    log_activity(
        organization=request.user.organization,
        actor=request.user,
        action_type='decision_outcome_reviewed',
        content_object=decision,
        title=decision.title
    )

    return Response({
        'id': decision.id,
        'was_successful': decision.was_successful,
        'review_completed_at': decision.review_completed_at,
        'review_confidence': review_confidence,
        'outcome_reliability': metrics['_reliability'],
        'message': 'Outcome review saved'
    })


@api_view(['GET'])
def outcome_stats(request):
    now = timezone.now()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    reviewed_qs = Decision.objects.filter(
        organization=request.user.organization,
        review_completed_at__gte=month_start,
        was_successful__isnull=False
    )

    reviewed_count = reviewed_qs.count()
    success_count = reviewed_qs.filter(was_successful=True).count()
    failure_count = reviewed_qs.filter(was_successful=False).count()
    success_rate = round((success_count / reviewed_count) * 100, 1) if reviewed_count else 0.0

    reliability_rows = []
    for decision in reviewed_qs[:200]:
        reliability_rows.append(compute_outcome_reliability(decision)['score'])
    avg_reliability = round(sum(reliability_rows) / len(reliability_rows), 1) if reliability_rows else 0.0

    return Response({
        'month_start': month_start.date().isoformat(),
        'reviewed_count': reviewed_count,
        'success_count': success_count,
        'failure_count': failure_count,
        'success_rate': success_rate,
        'avg_reliability': avg_reliability,
    })


@api_view(['POST'])
def run_followup_orchestrator(request):
    """Create follow-up tasks from recent failed outcome reviews."""
    from apps.business.models import Task
    from apps.knowledge.unified_models import ContentLink

    dry_run = bool(request.data.get('dry_run', False))
    limit = request.data.get('limit', 20)
    try:
        limit = _clamp(int(limit), 1, 100)
    except (TypeError, ValueError):
        return Response({'error': 'limit must be an integer from 1 to 100'}, status=status.HTTP_400_BAD_REQUEST)

    decision_id = request.data.get('decision_id')
    candidates = Decision.objects.filter(
        organization=request.user.organization,
        status='implemented',
        was_successful=False,
        review_completed_at__isnull=False,
    ).order_by('-review_completed_at')[:200]
    if decision_id is not None:
        try:
            decision_id = int(decision_id)
        except (TypeError, ValueError):
            return Response({'error': 'decision_id must be an integer'}, status=status.HTTP_400_BAD_REQUEST)
        candidates = [d for d in candidates if d.id == decision_id]

    decision_ct = ContentType.objects.get_for_model(Decision)
    task_ct = ContentType.objects.get_for_model(Task)

    created = []
    skipped = []
    for decision in candidates:
        if len(created) >= limit:
            break
        exists = Task.objects.filter(
            organization=request.user.organization,
            decision=decision,
            title__istartswith='Follow-up:'
        ).exists()
        if exists:
            skipped.append({'decision_id': decision.id, 'reason': 'follow_up_task_exists'})
            continue

        priority = 'high' if decision.impact_level in ['high', 'critical'] else 'medium'
        due_date = (timezone.now() + timedelta(days=7)).date()
        title = f"Follow-up: {decision.title[:180]}"
        description = (
            f"Auto-generated from failed outcome review for decision #{decision.id}.\n\n"
            f"Outcome notes:\n{decision.outcome_notes or 'N/A'}\n\n"
            f"Lessons learned:\n{decision.lessons_learned or 'N/A'}"
        )
        if dry_run:
            created.append({
                'decision_id': decision.id,
                'task_title': title,
                'priority': priority,
                'due_date': due_date.isoformat(),
                'dry_run': True,
            })
            continue

        task = Task.objects.create(
            organization=request.user.organization,
            title=title,
            description=description,
            status='todo',
            priority=priority,
            assigned_to=decision.decision_maker,
            decision=decision,
            due_date=due_date,
        )
        ContentLink.objects.get_or_create(
            organization=request.user.organization,
            source_content_type=decision_ct,
            source_object_id=decision.id,
            target_content_type=task_ct,
            target_object_id=task.id,
            defaults={
                'link_type': 'implements',
                'strength': 0.9,
                'created_by': request.user,
                'is_auto_generated': True,
            }
        )
        created.append({
            'decision_id': decision.id,
            'task_id': task.id,
            'task_title': task.title,
            'priority': task.priority,
            'due_date': task.due_date.isoformat() if task.due_date else None,
        })

    return Response({
        'dry_run': dry_run,
        'created_count': len(created),
        'skipped_count': len(skipped),
        'created': created,
        'skipped': skipped[:50],
    })


@api_view(['GET'])
def decision_drift_alerts(request):
    """Detect decisions that are drifting from expected outcomes."""
    now = timezone.now()
    queryset = Decision.objects.filter(
        organization=request.user.organization,
        status='implemented',
    ).order_by('-implemented_at', '-created_at')[:300]

    items = []
    for decision in queryset:
        signals = []
        score = 0
        confidence_score = (decision.confidence_level or 0)
        try:
            confidence_score = int(confidence_score)
        except (TypeError, ValueError):
            confidence_score = 0
        if confidence_score and confidence_score <= 10:
            confidence_score *= 10

        if decision.was_successful is False and confidence_score >= 70:
            score += 35
            signals.append('High initial confidence but failed outcome')

        if decision.review_completed_at is None:
            due_at = _review_due_at(decision)
            overdue_days = (now - due_at).days
            if overdue_days > 0:
                score += min(30, 8 + overdue_days)
                signals.append(f'Outcome review overdue by {overdue_days} days')

        metrics = decision.success_metrics or {}
        incident_count = metrics.get('incident_count') if isinstance(metrics, dict) else None
        if isinstance(incident_count, int) and incident_count > 0:
            score += min(25, 5 + incident_count * 3)
            signals.append(f'Incident count increased ({incident_count})')
        adoption_rate = metrics.get('adoption_rate') if isinstance(metrics, dict) else None
        if isinstance(adoption_rate, (int, float)) and adoption_rate < 45:
            score += 18
            signals.append(f'Low adoption rate ({adoption_rate}%)')

        reliability = compute_outcome_reliability(decision)['score']
        if reliability < 45:
            score += 20
            signals.append(f'Low outcome reliability ({reliability})')

        if score <= 0:
            continue
        severity = 'critical' if score >= 65 else 'high' if score >= 40 else 'medium'
        items.append({
            'decision_id': decision.id,
            'title': decision.title,
            'impact_level': decision.impact_level,
            'drift_score': int(min(100, score)),
            'severity': severity,
            'signals': signals,
            'implemented_at': decision.implemented_at,
            'review_completed_at': decision.review_completed_at,
        })

    items.sort(key=lambda item: item['drift_score'], reverse=True)
    return Response({
        'total': len(items),
        'critical': sum(1 for item in items if item['severity'] == 'critical'),
        'high': sum(1 for item in items if item['severity'] == 'high'),
        'medium': sum(1 for item in items if item['severity'] == 'medium'),
        'items': items[:50],
    })


@api_view(['GET'])
def team_calibration_analytics(request):
    """How reviewer confidence aligns with real outcomes."""
    from collections import defaultdict

    days = request.GET.get('days', 120)
    try:
        days = _clamp(int(days), 30, 365)
    except (TypeError, ValueError):
        return Response({'error': 'days must be an integer from 30 to 365'}, status=status.HTTP_400_BAD_REQUEST)

    cutoff = timezone.now() - timedelta(days=days)
    queryset = Decision.objects.filter(
        organization=request.user.organization,
        review_completed_at__gte=cutoff,
        was_successful__isnull=False,
    ).order_by('-review_completed_at')[:500]

    by_user = defaultdict(list)
    distribution = {str(i): {'total': 0, 'success': 0} for i in range(1, 6)}

    for decision in queryset:
        metrics = decision.success_metrics or {}
        review_meta = metrics.get('_review_meta') if isinstance(metrics, dict) else {}
        if not isinstance(review_meta, dict):
            continue
        reviewer_id = review_meta.get('reviewed_by_id')
        reviewer_name = review_meta.get('reviewed_by_name') or 'Unknown'
        review_confidence = review_meta.get('review_confidence')
        try:
            review_confidence = int(review_confidence)
        except (TypeError, ValueError):
            continue
        if review_confidence < 1 or review_confidence > 5:
            continue

        reliability = compute_outcome_reliability(decision)['score']
        row = {
            'decision_id': decision.id,
            'was_successful': bool(decision.was_successful),
            'review_confidence': review_confidence,
            'reliability': reliability,
            'review_completed_at': decision.review_completed_at,
        }
        by_user[(reviewer_id, reviewer_name)].append(row)
        distribution[str(review_confidence)]['total'] += 1
        if decision.was_successful:
            distribution[str(review_confidence)]['success'] += 1

    reviewers = []
    for (reviewer_id, reviewer_name), rows in by_user.items():
        total = len(rows)
        if total == 0:
            continue
        avg_conf = sum(r['review_confidence'] for r in rows) / total
        avg_conf_pct = (avg_conf / 5.0) * 100.0
        success_rate = (sum(1 for r in rows if r['was_successful']) / total) * 100.0
        calibration_gap = abs(avg_conf_pct - success_rate)
        avg_reliability = sum(r['reliability'] for r in rows) / total
        reviewers.append({
            'reviewer_id': reviewer_id,
            'reviewer_name': reviewer_name,
            'reviews': total,
            'avg_review_confidence': round(avg_conf, 2),
            'predicted_success_pct': round(avg_conf_pct, 1),
            'actual_success_pct': round(success_rate, 1),
            'calibration_gap': round(calibration_gap, 1),
            'avg_reliability': round(avg_reliability, 1),
            'quality_band': 'strong' if calibration_gap <= 15 else 'moderate' if calibration_gap <= 30 else 'weak',
        })

    reviewers.sort(key=lambda r: (r['calibration_gap'], -r['reviews']))
    confidence_buckets = []
    for confidence, stats in distribution.items():
        total = stats['total']
        success_rate = (stats['success'] / total * 100.0) if total else 0.0
        confidence_buckets.append({
            'confidence': int(confidence),
            'reviews': total,
            'actual_success_pct': round(success_rate, 1),
        })

    return Response({
        'window_days': days,
        'review_count': sum(len(rows) for rows in by_user.values()),
        'reviewers': reviewers[:30],
        'confidence_buckets': confidence_buckets,
    })


@api_view(['GET'])
def decision_impact_trail(request, decision_id):
    """Get impact trail graph from a decision through knowledge links and related work."""
    from apps.knowledge.unified_models import ContentLink
    from apps.business.models import Task, Goal, Meeting
    from apps.agile.models import DecisionImpact

    try:
        root = Decision.objects.get(id=decision_id, organization=request.user.organization)
    except Decision.DoesNotExist:
        return Response({'error': 'Decision not found'}, status=status.HTTP_404_NOT_FOUND)

    depth = request.GET.get('depth', 2)
    try:
        depth = _clamp(int(depth), 1, 3)
    except (TypeError, ValueError):
        return Response({'error': 'depth must be an integer from 1 to 3'}, status=status.HTTP_400_BAD_REQUEST)

    nodes = {}
    edges = []
    visited = set()

    def _node_key(ct, obj_id):
        return f'{ct.app_label}.{ct.model}:{obj_id}'

    def _add_node(ct, obj_id, obj=None):
        key = _node_key(ct, obj_id)
        if key in nodes:
            return key
        label = str(obj) if obj else f'{ct.model} #{obj_id}'
        if obj and hasattr(obj, 'title'):
            label = getattr(obj, 'title')
        nodes[key] = {
            'id': key,
            'type': f'{ct.app_label}.{ct.model}',
            'label': label[:80],
        }
        return key

    root_ct = ContentType.objects.get_for_model(Decision)
    root_key = _add_node(root_ct, root.id, root)

    # Add direct business/agile relationships for richer coverage.
    task_ct = ContentType.objects.get_for_model(Task)
    goal_ct = ContentType.objects.get_for_model(Goal)
    meeting_ct = ContentType.objects.get_for_model(Meeting)
    for task in Task.objects.filter(organization=request.user.organization, decision=root)[:30]:
        task_key = _add_node(task_ct, task.id, task)
        edges.append({'source': root_key, 'target': task_key, 'type': 'implements', 'strength': 0.95})
    for goal in Goal.objects.filter(organization=request.user.organization, decision=root)[:30]:
        goal_key = _add_node(goal_ct, goal.id, goal)
        edges.append({'source': root_key, 'target': goal_key, 'type': 'impacts_goal', 'strength': 0.9})
    for meeting in Meeting.objects.filter(organization=request.user.organization, decision=root)[:30]:
        meeting_key = _add_node(meeting_ct, meeting.id, meeting)
        edges.append({'source': root_key, 'target': meeting_key, 'type': 'discussed_in', 'strength': 0.85})
    for impact in DecisionImpact.objects.filter(organization=request.user.organization, decision=root).select_related('issue')[:50]:
        issue = impact.issue
        issue_ct = ContentType.objects.get_for_model(issue.__class__)
        issue_key = _add_node(issue_ct, issue.id, issue)
        edges.append({'source': root_key, 'target': issue_key, 'type': f'issue_{impact.impact_type}', 'strength': 0.9})

    frontier = [(root_ct, root.id, root_key, 0)]
    while frontier:
        current_ct, current_id, current_key, level = frontier.pop(0)
        if level >= depth:
            continue
        visit_key = (current_ct.id, current_id, level)
        if visit_key in visited:
            continue
        visited.add(visit_key)

        links = ContentLink.objects.filter(
            organization=request.user.organization
        ).filter(
            Q(source_content_type=current_ct, source_object_id=current_id) |
            Q(target_content_type=current_ct, target_object_id=current_id)
        ).select_related('source_content_type', 'target_content_type')[:80]

        for link in links:
            if link.source_content_type_id == current_ct.id and link.source_object_id == current_id:
                other_ct = link.target_content_type
                other_id = link.target_object_id
                other_obj = link.target_object
                edge_source = current_key
                direction = 1
            else:
                other_ct = link.source_content_type
                other_id = link.source_object_id
                other_obj = link.source_object
                edge_source = current_key
                direction = -1

            other_key = _add_node(other_ct, other_id, other_obj)
            edges.append({
                'source': edge_source,
                'target': other_key,
                'type': link.link_type if direction == 1 else f'reverse_{link.link_type}',
                'strength': float(link.strength),
            })

            if level + 1 < depth:
                frontier.append((other_ct, other_id, other_key, level + 1))

    return Response({
        'decision_id': root.id,
        'depth': depth,
        'nodes': list(nodes.values())[:250],
        'edges': edges[:400],
    })


@api_view(['POST'])
def decision_replay_simulator(request, decision_id):
    """Simulate a what-if alternative using historically similar reviewed decisions."""
    from apps.business.models import Task, Goal, Meeting
    from apps.agile.models import DecisionImpact

    try:
        decision = Decision.objects.get(id=decision_id, organization=request.user.organization)
    except Decision.DoesNotExist:
        return Response({'error': 'Decision not found'}, status=status.HTTP_404_NOT_FOUND)

    scenario_title = (request.data.get('alternative_title') or '').strip()
    scenario_summary = (request.data.get('alternative_summary') or '').strip()
    risk_tolerance = (request.data.get('risk_tolerance') or 'balanced').strip().lower()
    execution_speed = (request.data.get('execution_speed') or 'normal').strip().lower()
    scenario_impact_level = (request.data.get('impact_level') or decision.impact_level or 'medium').strip().lower()

    if risk_tolerance not in {'conservative', 'balanced', 'aggressive'}:
        return Response({'error': 'risk_tolerance must be conservative, balanced, or aggressive'}, status=status.HTTP_400_BAD_REQUEST)
    if execution_speed not in {'slow', 'normal', 'fast'}:
        return Response({'error': 'execution_speed must be slow, normal, or fast'}, status=status.HTTP_400_BAD_REQUEST)
    if scenario_impact_level not in {'low', 'medium', 'high', 'critical'}:
        scenario_impact_level = decision.impact_level or 'medium'

    reference_text = (
        f"{scenario_title or decision.title} {scenario_summary or decision.description} "
        f"{decision.rationale or ''} {decision.context_reason or ''}"
    )
    source_tokens = _tokenize_text(reference_text)

    candidates = list(Decision.objects.filter(
        organization=request.user.organization,
        was_successful__isnull=False
    ).exclude(id=decision.id).order_by('-review_completed_at', '-implemented_at', '-created_at')[:220])

    scored = []
    for candidate in candidates:
        sim = _decision_similarity(source_tokens, candidate)
        if candidate.impact_level == scenario_impact_level:
            sim += 0.12
        if candidate.status == 'implemented':
            sim += 0.05
        score = max(0.03, min(1.0, sim))
        scored.append((candidate, score))
    scored.sort(key=lambda row: row[1], reverse=True)
    top = scored[:12]
    if not top:
        return Response({
            'error': 'Not enough reviewed decisions to simulate yet',
            'sample_size': 0,
        }, status=status.HTTP_400_BAD_REQUEST)

    weighted_total = sum(weight for _, weight in top)
    weighted_fail = sum(weight for row, weight in top if row.was_successful is False)
    weighted_success = sum(weight for row, weight in top if row.was_successful is True)
    weighted_reliability = sum(compute_outcome_reliability(row)['score'] * weight for row, weight in top) / weighted_total
    base_failure_risk = (weighted_fail / weighted_total) * 100.0 if weighted_total else 50.0
    base_success_rate = (weighted_success / weighted_total) * 100.0 if weighted_total else 50.0

    risk_adjust = 0.0
    risk_adjust += -8.0 if risk_tolerance == 'conservative' else 8.0 if risk_tolerance == 'aggressive' else 0.0
    risk_adjust += -5.0 if execution_speed == 'slow' else 10.0 if execution_speed == 'fast' else 0.0
    risk_adjust += 0.0 if scenario_impact_level in {'low', 'medium'} else 6.0 if scenario_impact_level == 'high' else 11.0
    predicted_failure_risk = _clamp(base_failure_risk + risk_adjust, 3.0, 97.0)
    expected_impact_score = _clamp((base_success_rate * 0.65) + (weighted_reliability * 0.35) - (predicted_failure_risk * 0.22), 0.0, 100.0)

    confidence_pct = _clamp((weighted_reliability * 0.45) + (min(12, len(top)) / 12.0 * 35.0) + (min(1.0, weighted_total / 4.0) * 20.0), 15.0, 95.0)

    project_names = []
    for impact in DecisionImpact.objects.filter(organization=request.user.organization, decision=decision).select_related('issue__project')[:40]:
        if impact.issue and impact.issue.project:
            project_names.append(impact.issue.project.name)
    project_names = sorted(set(project_names))

    affected_scope = {
        'linked_projects': len(project_names),
        'linked_tasks': Task.objects.filter(organization=request.user.organization, decision=decision).count(),
        'linked_goals': Goal.objects.filter(organization=request.user.organization, decision=decision).count(),
        'linked_meetings': Meeting.objects.filter(organization=request.user.organization, decision=decision).count(),
    }

    teams_most_affected = []
    if project_names:
        teams_most_affected.extend(project_names[:4])
    if decision.decision_maker:
        teams_most_affected.append(f"Decision owner: {decision.decision_maker.get_full_name()}")
    if not teams_most_affected:
        teams_most_affected = ['Cross-functional team']

    safeguards = [
        'Add explicit rollback criteria and owner',
        'Define measurable success checkpoints at day 7 and day 30',
        'Schedule a midpoint review with stakeholders before full rollout',
    ]
    if predicted_failure_risk >= 55:
        safeguards.append('Run staged rollout with a limited pilot first')
    if execution_speed == 'fast':
        safeguards.append('Increase monitoring coverage during first 72 hours')
    if scenario_impact_level in {'high', 'critical'}:
        safeguards.append('Secure dependency alignment across impacted projects')

    compared = [{
        'id': row.id,
        'title': row.title,
        'impact_level': row.impact_level,
        'was_successful': row.was_successful,
        'similarity': round(weight, 3),
        'reliability': compute_outcome_reliability(row)['score'],
    } for row, weight in top[:6]]

    return Response({
        'scenario': {
            'alternative_title': scenario_title or f"Alternative for {decision.title}",
            'alternative_summary': scenario_summary,
            'risk_tolerance': risk_tolerance,
            'execution_speed': execution_speed,
            'impact_level': scenario_impact_level,
        },
        'side_by_side': {
            'original': {
                'decision_id': decision.id,
                'title': decision.title,
                'was_successful': decision.was_successful,
                'outcome_reliability': compute_outcome_reliability(decision)['score'],
            },
            'simulated': {
                'title': scenario_title or f"Alternative for {decision.title}",
                'predicted_failure_risk_pct': round(predicted_failure_risk, 1),
                'expected_impact_score': round(expected_impact_score, 1),
            }
        },
        'forecast': {
            'predicted_failure_risk_pct': round(predicted_failure_risk, 1),
            'expected_impact_score': round(expected_impact_score, 1),
            'confidence_pct': round(confidence_pct, 1),
            'rationale': [
                f"Based on {len(top)} similar reviewed decisions",
                f"Weighted historical success rate {round(base_success_rate, 1)}%",
                f"Historical evidence reliability {round(weighted_reliability, 1)}%",
            ],
        },
        'affected_scope': affected_scope,
        'teams_most_affected': teams_most_affected[:5],
        'recommended_safeguards': safeguards[:6],
        'based_on': {
            'sample_size': len(top),
            'compared_decisions': compared,
        },
    })


@api_view(['POST'])
def create_replay_followup_tasks(request, decision_id):
    """Create actionable tasks from replay simulator safeguards."""
    from apps.business.models import Task
    from apps.knowledge.unified_models import ContentLink

    try:
        decision = Decision.objects.get(id=decision_id, organization=request.user.organization)
    except Decision.DoesNotExist:
        return Response({'error': 'Decision not found'}, status=status.HTTP_404_NOT_FOUND)

    safeguards = request.data.get('safeguards') or []
    if not isinstance(safeguards, list):
        return Response({'error': 'safeguards must be a list of strings'}, status=status.HTTP_400_BAD_REQUEST)
    safeguards = [str(item).strip() for item in safeguards if str(item).strip()]
    if not safeguards:
        return Response({'error': 'No safeguards provided'}, status=status.HTTP_400_BAD_REQUEST)

    scenario_title = str(request.data.get('scenario_title') or '').strip() or f"Replay scenario for #{decision.id}"
    due_days = request.data.get('due_days', 7)
    try:
        due_days = _clamp(int(due_days), 1, 60)
    except (TypeError, ValueError):
        return Response({'error': 'due_days must be an integer from 1 to 60'}, status=status.HTTP_400_BAD_REQUEST)

    priority = 'high' if decision.impact_level in ['high', 'critical'] else 'medium'
    due_date = (timezone.now() + timedelta(days=due_days)).date()

    decision_ct = ContentType.objects.get_for_model(Decision)
    task_ct = ContentType.objects.get_for_model(Task)

    created = []
    for idx, safeguard in enumerate(safeguards[:12], start=1):
        title = f"Replay Follow-up {idx}: {safeguard[:180]}"

        # Skip exact duplicate follow-up tasks.
        if Task.objects.filter(
            organization=request.user.organization,
            decision=decision,
            title=title
        ).exists():
            continue

        task = Task.objects.create(
            organization=request.user.organization,
            title=title,
            description=(
                f"Auto-created from Decision Replay Simulator.\n\n"
                f"Decision: {decision.title}\n"
                f"Scenario: {scenario_title}\n\n"
                f"Safeguard:\n{safeguard}"
            ),
            status='todo',
            priority=priority,
            assigned_to=decision.decision_maker,
            decision=decision,
            due_date=due_date,
        )

        ContentLink.objects.get_or_create(
            organization=request.user.organization,
            source_content_type=decision_ct,
            source_object_id=decision.id,
            target_content_type=task_ct,
            target_object_id=task.id,
            defaults={
                'link_type': 'implements',
                'strength': 0.92,
                'created_by': request.user,
                'is_auto_generated': True,
            }
        )
        created.append({
            'task_id': task.id,
            'title': task.title,
            'due_date': task.due_date.isoformat() if task.due_date else None,
            'priority': task.priority,
        })

    return Response({
        'created_count': len(created),
        'tasks': created,
    })


@api_view(['GET'])
def pending_outcome_reviews(request):
    now = timezone.now()
    queryset = Decision.objects.filter(
        organization=request.user.organization,
        status='implemented',
        review_completed_at__isnull=True
    ).select_related('decision_maker').order_by('implemented_at', 'created_at')

    overdue_only = request.GET.get('overdue_only') == 'true'
    rows = []
    for decision in queryset:
        due_at = _review_due_at(decision)
        days_overdue = (now - due_at).days
        is_overdue = days_overdue > 0
        if overdue_only and not is_overdue:
            continue
        severity = 'critical' if days_overdue > 14 else 'high' if days_overdue > 7 else 'medium'
        rows.append({
            'id': decision.id,
            'title': decision.title,
            'impact_level': decision.impact_level,
            'decision_maker': decision.decision_maker.get_full_name() if decision.decision_maker else None,
            'implemented_at': decision.implemented_at,
            'review_due_at': due_at,
            'is_overdue': is_overdue,
            'days_overdue': max(0, days_overdue),
            'severity': severity,
        })

    return Response({
        'total': len(rows),
        'overdue': sum(1 for r in rows if r['is_overdue']),
        'items': rows[:50],
    })


@api_view(['POST'])
def notify_pending_outcome_reviews(request):
    now = timezone.now()
    overdue_only = request.data.get('overdue_only', True)
    dry_run = request.data.get('dry_run', False)
    queryset = Decision.objects.filter(
        organization=request.user.organization,
        status='implemented',
        review_completed_at__isnull=True
    ).select_related('decision_maker')

    sent = 0
    preview = []
    for decision in queryset:
        if not decision.decision_maker:
            continue
        due_at = _review_due_at(decision)
        days_overdue = (now - due_at).days
        is_overdue = days_overdue > 0
        if overdue_only and not is_overdue:
            continue

        severity = 'critical' if days_overdue > 14 else 'high' if days_overdue > 7 else 'medium'
        title = 'Outcome review overdue' if is_overdue else 'Outcome review reminder'
        message = (
            f'"{decision.title}" needs an outcome review'
            + (f' ({days_overdue} days overdue)' if is_overdue else '')
        )
        preview.append({
            'decision_id': decision.id,
            'user_id': decision.decision_maker_id,
            'severity': severity,
            'message': message,
        })
        if dry_run:
            continue
        from apps.notifications.utils import create_notification
        create_notification(
            user=decision.decision_maker,
            notification_type='reminder',
            title=title,
            message=message,
            link=f'/decisions/{decision.id}',
        )
        sent += 1

    return Response({
        'dry_run': bool(dry_run),
        'sent': sent,
        'candidates': len(preview),
        'preview': preview[:20],
    })

def calculate_confidence(decision):
    """Calculate decision confidence based on reactions and discussion"""
    from apps.conversations.models import Reaction
    
    if not decision.conversation:
        return {'score': 50, 'level': 'Medium', 'factors': [], 'agree_count': 0, 'unsure_count': 0, 'concern_count': 0}
    
    conv = decision.conversation
    
    reactions = Reaction.objects.filter(conversation=conv)
    agree_count = reactions.filter(reaction_type='agree').count()
    unsure_count = reactions.filter(reaction_type='unsure').count()
    concern_count = reactions.filter(reaction_type='concern').count()
    total_reactions = agree_count + unsure_count + concern_count
    
    reaction_score = 0
    if total_reactions > 0:
        reaction_score = (agree_count / total_reactions) * 40
    
    discussion_score = min(conv.reply_count * 5, 30)
    participation_score = min(total_reactions * 10, 30)
    
    total_score = reaction_score + discussion_score + participation_score
    
    if total_score >= 75:
        level = 'High'
    elif total_score >= 50:
        level = 'Medium'
    else:
        level = 'Low'
    
    factors = [
        f'{agree_count} agree, {unsure_count} unsure, {concern_count} concern',
        f'{conv.reply_count} replies',
        f'{total_reactions} total reactions'
    ]
    
    return {
        'score': round(total_score),
        'level': level,
        'factors': factors,
        'agree_count': agree_count,
        'unsure_count': unsure_count,
        'concern_count': concern_count
    }

@api_view(['POST'])
def implement_decision(request, decision_id):
    try:
        decision = Decision.objects.get(
            id=decision_id,
            organization=request.user.organization
        )
        
        decision.status = 'implemented'
        decision.implemented_at = timezone.now()
        decision.save()
        
        log_activity(
            organization=request.user.organization,
            actor=request.user,
            action_type='decision_implemented',
            content_object=decision,
            title=decision.title
        )
        
        return Response({'status': 'implemented'})
    except Decision.DoesNotExist:
        return Response({'error': 'Decision not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
def convert_to_decision(request, conversation_id):
    from apps.conversations.models import Conversation
    
    try:
        conversation = Conversation.objects.get(
            id=conversation_id,
            organization=request.user.organization
        )
        
        # Check if decision already exists
        if Decision.objects.filter(conversation=conversation).exists():
            return Response({'error': 'Decision already exists for this conversation'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        # Generate AI summary from conversation
        from apps.agile.ai_service import generate_sprint_update_summary
        ai_summary = generate_sprint_update_summary(
            conversation.title,
            conversation.content
        )
        
        # Create decision from conversation
        decision = Decision.objects.create(
            organization=request.user.organization,
            conversation=conversation,
            title=conversation.title,
            description=conversation.content,
            rationale=ai_summary,
            impact_level=request.data.get('impact_level', 'medium'),
            decision_maker=request.user,
            status='proposed'
        )
        
        log_activity(
            organization=request.user.organization,
            actor=request.user,
            action_type='decision_created',
            content_object=decision,
            title=decision.title
        )
        
        # Notify Slack
        from apps.integrations.utils import notify_decision_created
        notify_decision_created(decision)
        
        return Response({
            'id': decision.id,
            'title': decision.title,
            'status': decision.status,
            'ai_summary': ai_summary
        }, status=status.HTTP_201_CREATED)
        
    except Conversation.DoesNotExist:
        return Response({'error': 'Conversation not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
def decisions_needing_reminders(request):
    """Get decisions that need reminders"""
    decisions = Decision.objects.filter(
        organization=request.user.organization,
        status__in=['approved', 'under_review'],
        reminder_enabled=True
    )
    
    reminders = []
    for decision in decisions:
        if decision.needs_reminder:
            days_since = (timezone.now() - decision.decided_at).days if decision.decided_at else 0
            reminders.append({
                'id': decision.id,
                'title': decision.title,
                'status': decision.status,
                'impact_level': decision.impact_level,
                'decided_at': decision.decided_at,
                'days_since_approval': days_since,
                'is_critical': decision.impact_level == 'critical',
                'is_overdue': decision.is_overdue
            })
    
    return Response(reminders)

@api_view(['POST'])
def mark_reminded(request, decision_id):
    """Mark decision as reminded"""
    try:
        decision = Decision.objects.get(
            id=decision_id,
            organization=request.user.organization
        )
        decision.last_reminded_at = timezone.now()
        decision.save()
        return Response({'message': 'Marked as reminded'})
    except Decision.DoesNotExist:
        return Response({'error': 'Decision not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['GET', 'POST'])
def proposals(request):
    """List or create proposals"""
    from .models import Proposal
    
    if request.method == 'GET':
        proposals = Proposal.objects.filter(organization=request.user.organization)
        data = [{
            'id': p.id,
            'title': p.title,
            'description': p.description[:200],
            'status': p.status,
            'proposed_by': p.proposed_by.get_full_name(),
            'created_at': p.created_at,
            'accepted_at': p.accepted_at
        } for p in proposals]
        return Response(data)
    
    elif request.method == 'POST':
        proposal = Proposal.objects.create(
            organization=request.user.organization,
            title=request.data['title'],
            description=request.data['description'],
            rationale=request.data.get('rationale', ''),
            alternatives_considered=request.data.get('alternatives_considered', ''),
            risks=request.data.get('risks', ''),
            proposed_by=request.user,
            status='open'
        )
        return Response({'id': proposal.id, 'title': proposal.title}, status=status.HTTP_201_CREATED)

@api_view(['POST'])
def accept_proposal(request, proposal_id):
    """Accept proposal and convert to decision"""
    from .models import Proposal
    
    try:
        proposal = Proposal.objects.get(
            id=proposal_id,
            organization=request.user.organization
        )
        
        if proposal.status != 'open':
            return Response({'error': 'Proposal is not open'}, status=400)
        
        # Create decision from proposal
        decision = Decision.objects.create(
            organization=request.user.organization,
            title=proposal.title,
            description=proposal.description,
            rationale=proposal.rationale,
            impact_level=request.data.get('impact_level', 'medium'),
            decision_maker=request.user,
            status='approved',
            alternatives_considered=proposal.alternatives_considered,
            context_reason=proposal.risks
        )
        
        # Link proposal to decision
        proposal.decision = decision
        proposal.status = 'accepted'
        proposal.accepted_by = request.user
        proposal.accepted_at = timezone.now()
        proposal.save()
        
        log_activity(
            organization=request.user.organization,
            actor=request.user,
            action_type='decision_created',
            content_object=decision,
            title=decision.title
        )
        
        # Notify Slack
        from apps.integrations.utils import notify_decision_created
        notify_decision_created(decision)
        
        return Response({
            'id': decision.id,
            'title': decision.title,
            'status': decision.status
        })
    except Proposal.DoesNotExist:
        return Response({'error': 'Proposal not found'}, status=404)

@api_view(['POST'])
def reject_proposal(request, proposal_id):
    """Reject proposal"""
    from .models import Proposal
    
    try:
        proposal = Proposal.objects.get(
            id=proposal_id,
            organization=request.user.organization
        )
        proposal.status = 'rejected'
        proposal.accepted_by = request.user
        proposal.accepted_at = timezone.now()
        proposal.save()
        return Response({'message': 'Proposal rejected'})
    except Proposal.DoesNotExist:
        return Response({'error': 'Proposal not found'}, status=404)

@api_view(['POST'])
def link_pr(request, decision_id):
    try:
        decision = Decision.objects.get(
            id=decision_id,
            organization=request.user.organization
        )
        
        pr_url = request.data.get('pr_url')
        if not pr_url:
            return Response({'error': 'PR URL required'}, status=status.HTTP_400_BAD_REQUEST)
        
        if not decision.code_links:
            decision.code_links = []
        
        import re
        match = re.search(r'github\.com/([^/]+)/([^/]+)/pull/(\d+)', pr_url)
        if match:
            owner, repo, pr_number = match.groups()
            decision.code_links.append({
                'type': 'github_pr',
                'url': pr_url,
                'title': f'{owner}/{repo}#{pr_number}',
                'number': int(pr_number)
            })
        else:
            decision.code_links.append({
                'type': 'link',
                'url': pr_url,
                'title': pr_url
            })
        
        decision.save()
        return Response({'message': 'PR linked successfully'}, status=status.HTTP_201_CREATED)
    except Decision.DoesNotExist:
        return Response({'error': 'Decision not found'}, status=status.HTTP_404_NOT_FOUND)
