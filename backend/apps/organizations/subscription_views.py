from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from django.utils import timezone
from .subscription_models import Plan, Subscription, Invoice, UsageLog
from .paypal_service import get_checkout_support_by_plan as get_paypal_checkout_support_by_plan
from .subscription_entitlements import (
    FEATURE_MIN_PLAN,
    PLAN_ORDER,
    build_seat_limit_payload,
    ensure_default_plans,
    get_or_create_subscription,
    get_subscription_seat_summary,
    subscription_supports_feature,
)


def _stripe_checkout_support_by_plan():
    return {
        'starter': bool(getattr(settings, 'STRIPE_STARTER_PRICE_ID', '')),
        'professional': bool(getattr(settings, 'STRIPE_PROFESSIONAL_PRICE_ID', '')),
        'enterprise': bool(getattr(settings, 'STRIPE_ENTERPRISE_PRICE_ID', '')),
    }


def _combined_checkout_support_by_plan():
    stripe_support = _stripe_checkout_support_by_plan()
    paypal_support = get_paypal_checkout_support_by_plan()
    return {
        plan_name: bool(stripe_support.get(plan_name) or paypal_support.get(plan_name))
        for plan_name in set(stripe_support) | set(paypal_support)
    }


def _resolve_billing_provider(sub, stripe_support, paypal_support):
    if sub.billing_provider == 'stripe' and (sub.stripe_customer_id or any(stripe_support.values())):
        return 'stripe'
    if sub.billing_provider == 'paypal' and (sub.paypal_subscription_id or any(paypal_support.values())):
        return 'paypal'
    if sub.stripe_customer_id:
        return 'stripe'
    if sub.paypal_subscription_id:
        return 'paypal'
    if any(paypal_support.values()):
        return 'paypal'
    if any(stripe_support.values()):
        return 'stripe'
    return 'manual'

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def plans_list(request):
    ensure_default_plans()
    plans = list(Plan.objects.filter(is_active=True))
    plans.sort(key=lambda plan: PLAN_ORDER.get(plan.name, 999))
    stripe_support = _stripe_checkout_support_by_plan()
    paypal_support = get_paypal_checkout_support_by_plan()
    checkout_support = _combined_checkout_support_by_plan()
    data = [{
        'id': p.id,
        'name': p.name,
        'display_name': p.get_name_display(),
        'price_per_user': str(p.price_per_user),
        'max_users': p.max_users,
        'storage_gb': p.storage_gb,
        'features': p.features,
        'features_included': [k for k, enabled in (p.features or {}).items() if enabled],
        'is_free': p.name == 'free',
        'checkout_supported': checkout_support.get(p.name, False),
        'checkout_providers': {
            'stripe': stripe_support.get(p.name, False),
            'paypal': paypal_support.get(p.name, False),
        },
    } for p in plans]
    return Response(data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def subscription_detail(request):
    try:
        ensure_default_plans()
        sub = get_or_create_subscription(request.user.organization)
        seat_summary = get_subscription_seat_summary(sub)
        stripe_support = _stripe_checkout_support_by_plan()
        paypal_support = get_paypal_checkout_support_by_plan()
        provider = _resolve_billing_provider(sub, stripe_support, paypal_support)
        sub.user_count = seat_summary['active_users']
        sub.save(update_fields=['user_count', 'updated_at'])
        return Response({
            'id': sub.id,
            'plan': {
                'name': sub.plan.name,
                'display_name': sub.plan.get_name_display(),
                'price_per_user': str(sub.plan.price_per_user),
                'max_users': sub.plan.max_users,
                'storage_gb': sub.plan.storage_gb,
                'features': sub.plan.features or {},
            },
            'status': sub.status,
            'trial_days_left': max(0, (sub.trial_end - timezone.now()).days) if sub.trial_end and sub.status == 'trial' else 0,
            'user_count': sub.user_count,
            'storage_used_mb': sub.storage_used_mb,
            'storage_limit_mb': sub.storage_limit_mb,
            'storage_percentage': round((sub.storage_used_mb / sub.storage_limit_mb) * 100, 2),
            'is_trial': sub.is_trial,
            'trial_end': sub.trial_end,
            'current_period_end': sub.current_period_end,
            'can_add_user': seat_summary['can_add_user'],
            'can_upload': sub.can_upload,
            'seat_summary': seat_summary,
            'billing': {
                'provider': provider,
                'checkout_supported': _combined_checkout_support_by_plan(),
                'portal_enabled': provider == 'stripe' and bool(sub.stripe_customer_id),
                'has_payment_profile': bool(sub.stripe_customer_id or sub.paypal_subscription_id),
                'providers': {
                    'stripe': {
                        'checkout_supported': stripe_support,
                        'enabled': any(stripe_support.values()),
                        'portal_enabled': bool(sub.stripe_customer_id),
                        'has_payment_profile': bool(sub.stripe_customer_id),
                    },
                    'paypal': {
                        'checkout_supported': paypal_support,
                        'enabled': any(paypal_support.values()),
                        'portal_enabled': False,
                        'has_payment_profile': bool(sub.paypal_subscription_id),
                    },
                },
            },
        })
    except Subscription.DoesNotExist:
        return Response({'error': 'No subscription found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upgrade_plan(request):
    if request.user.role != 'admin':
        return Response({'error': 'Admin only'}, status=status.HTTP_403_FORBIDDEN)
    
    ensure_default_plans()
    plan_id = request.data.get('plan_id')
    plan_name = request.data.get('plan_name')
    try:
        if plan_name:
            plan = Plan.objects.get(name=plan_name)
        else:
            plan = Plan.objects.get(id=plan_id)
        sub = get_or_create_subscription(request.user.organization)
        current_rank = PLAN_ORDER.get(sub.plan.name, 0)
        target_rank = PLAN_ORDER.get(plan.name, 0)
        provider = sub.billing_provider
        if provider not in ['stripe', 'paypal']:
            if sub.stripe_customer_id:
                provider = 'stripe'
            elif sub.paypal_subscription_id:
                provider = 'paypal'
        if target_rank <= current_rank and (sub.stripe_customer_id or sub.paypal_subscription_id):
            if provider == 'stripe':
                return Response(
                    {'error': 'Use the billing portal to downgrade or cancel Stripe-managed plans.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if provider == 'paypal':
                return Response(
                    {'error': 'Manage PayPal subscription downgrades or cancellations in PayPal first, then refresh this workspace.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        sub.plan = plan
        if sub.status in ['expired', 'canceled', 'past_due']:
            sub.status = 'active'
        sub.save()
        action = 'downgraded' if plan.name == 'free' else 'upgraded'
        return Response({'message': f'Plan {action} successfully', 'plan': plan.name})
    except (Plan.DoesNotExist, Subscription.DoesNotExist):
        return Response({'error': 'Invalid request'}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancel_subscription(request):
    if request.user.role != 'admin':
        return Response({'error': 'Admin only'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        ensure_default_plans()
        sub = get_or_create_subscription(request.user.organization)
        free_plan = Plan.objects.get(name='free')
        sub.plan = free_plan
        sub.status = 'active'
        sub.save()
        return Response({'message': 'Moved to free plan'})
    except Subscription.DoesNotExist:
        return Response({'error': 'No subscription found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def invoices_list(request):
    try:
        sub = get_or_create_subscription(request.user.organization)
        invoices = sub.invoices.all()[:12]
        data = [{
            'id': inv.id,
            'amount': str(inv.amount),
            'status': inv.status,
            'period_start': inv.period_start,
            'period_end': inv.period_end,
            'due_date': inv.due_date,
            'paid_at': inv.paid_at,
            'invoice_pdf': inv.invoice_pdf
        } for inv in invoices]
        return Response(data)
    except Subscription.DoesNotExist:
        return Response([])

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def usage_stats(request):
    try:
        sub = get_or_create_subscription(request.user.organization)
        logs = sub.usage_logs.all()[:30]
        data = [{
            'user_count': log.user_count,
            'storage_used_mb': log.storage_used_mb,
            'logged_at': log.logged_at
        } for log in logs]
        return Response(data)
    except Subscription.DoesNotExist:
        return Response([])

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def check_limits(request):
    action = request.data.get('action')  # 'add_user' or 'upload_file'
    file_size_mb = request.data.get('file_size_mb', 0)
    
    try:
        sub = get_or_create_subscription(request.user.organization)
        
        if action == 'add_user':
            seat_summary = get_subscription_seat_summary(sub)
            if not seat_summary['can_add_user']:
                payload = build_seat_limit_payload(sub, seat_summary=seat_summary)
                return Response({
                    'allowed': False,
                    'message': payload['error'],
                    'current_plan': payload['current_plan'],
                    'required_plan': payload['required_plan'],
                    'seat_summary': payload['seat_summary'],
                })
        
        elif action == 'upload_file':
            if not sub.can_upload or (sub.storage_used_mb + file_size_mb) > sub.storage_limit_mb:
                return Response({
                    'allowed': False,
                    'message': f'Storage limit reached ({sub.plan.storage_gb}GB). Upgrade for more storage.'
                })
        
        return Response({'allowed': True})
    except Subscription.DoesNotExist:
        return Response({'allowed': False, 'message': 'No subscription found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def feature_access(request):
    ensure_default_plans()
    sub = get_or_create_subscription(request.user.organization)
    requested = request.GET.get('features', '')
    if requested:
        feature_keys = [item.strip() for item in requested.split(',') if item.strip()]
    else:
        feature_keys = sorted(FEATURE_MIN_PLAN.keys())

    checks = []
    for feature_key in feature_keys:
        allowed = subscription_supports_feature(sub, feature_key)
        checks.append({
            'feature': feature_key,
            'allowed': allowed,
            'required_plan': FEATURE_MIN_PLAN.get(feature_key, 'free'),
        })

    return Response({
        'plan': {
            'name': sub.plan.name,
            'display_name': sub.plan.get_name_display(),
        },
        'checks': checks,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def conversion_insights(request):
    ensure_default_plans()
    sub = get_or_create_subscription(request.user.organization)
    now = timezone.now()
    trial_days_left = max(0, (sub.trial_end - now).days) if sub.trial_end and sub.status == 'trial' else 0

    from apps.agile.models import Project, Issue, Sprint
    from apps.decisions.models import Decision

    org = request.user.organization
    project_count = Project.objects.filter(organization=org).count()
    issue_count = Issue.objects.filter(organization=org).count()
    sprint_count = Sprint.objects.filter(organization=org).count()
    decision_count = Decision.objects.filter(organization=org).count()
    member_count = org.users.filter(is_active=True).count()

    milestones = {
        'project_created': project_count > 0,
        'issue_created': issue_count > 0,
        'sprint_created': sprint_count > 0,
        'decision_logged': decision_count > 0,
        'teammate_invited': member_count > 1,
    }
    completed_milestones = sum(1 for completed in milestones.values() if completed)

    nudges = []
    if sub.status == 'trial':
        if trial_days_left <= 3:
            nudges.append("Your trial ends soon. Upgrade to keep Decision Twin and Decision Debt Ledger.")
        if not milestones['sprint_created']:
            nudges.append("Create a sprint to experience forecasting and conversion-ready workflow value.")
        if not milestones['decision_logged']:
            nudges.append("Log at least one decision to unlock better debt and risk signals.")
    elif sub.plan.name in ['free', 'starter']:
        nudges.append("Upgrade to Professional to unlock Decision Twin and Decision Debt Ledger.")
        if member_count >= 3:
            nudges.append("Your team is growing. Professional removes small-team limitations.")
    else:
        nudges.append("You are on a paid plan. Keep usage high with weekly sprint and decision reviews.")

    phase = 'paid'
    if sub.status == 'trial':
        phase = 'trial'
    elif sub.plan.name in ['free', 'starter']:
        phase = 'free_or_starter'

    return Response({
        'phase': phase,
        'plan': {
            'name': sub.plan.name,
            'display_name': sub.plan.get_name_display(),
        },
        'trial': {
            'is_trial': sub.status == 'trial',
            'days_left': trial_days_left,
            'ends_at': sub.trial_end.isoformat() if sub.trial_end else None,
        },
        'activation': {
            'completed_milestones': completed_milestones,
            'total_milestones': len(milestones),
            'milestones': milestones,
        },
        'usage': {
            'projects': project_count,
            'issues': issue_count,
            'sprints': sprint_count,
            'decisions': decision_count,
            'members': member_count,
        },
        'nudges': nudges[:4],
        'recommended_plan': 'professional' if phase != 'paid' else sub.plan.name,
    })
