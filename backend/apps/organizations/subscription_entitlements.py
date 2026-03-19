from datetime import timedelta
from decimal import Decimal

from django.utils import timezone

from .subscription_models import Plan, Subscription


PLAN_ORDER = {
    'free': 0,
    'starter': 1,
    'professional': 2,
    'enterprise': 3,
}

DEFAULT_PLAN_DEFINITIONS = [
    {
        'name': 'free',
        'price_per_user': Decimal('0.00'),
        'max_users': 3,
        'storage_gb': 1,
        'features': {
            'projects': True,
            'issues': True,
            'comments': True,
            'attachments': True,
            'basic_sprints': True,
            'advanced_analytics': False,
            'decision_twin': False,
            'decision_debt_ledger': False,
            'api_access': False,
            'priority_support': False,
            'sso_saml': False,
            'custom_integrations': False,
        },
    },
    {
        'name': 'starter',
        'price_per_user': Decimal('9.00'),
        'max_users': 15,
        'storage_gb': 25,
        'features': {
            'projects': True,
            'issues': True,
            'comments': True,
            'attachments': True,
            'basic_sprints': True,
            'advanced_analytics': False,
            'decision_twin': False,
            'decision_debt_ledger': False,
            'api_access': False,
            'priority_support': False,
            'sso_saml': False,
            'custom_integrations': False,
        },
    },
    {
        'name': 'professional',
        'price_per_user': Decimal('29.00'),
        'max_users': None,
        'storage_gb': 250,
        'features': {
            'projects': True,
            'issues': True,
            'comments': True,
            'attachments': True,
            'basic_sprints': True,
            'advanced_analytics': True,
            'decision_twin': True,
            'decision_debt_ledger': True,
            'api_access': True,
            'priority_support': True,
            'sso_saml': False,
            'custom_integrations': False,
        },
    },
    {
        'name': 'enterprise',
        'price_per_user': Decimal('79.00'),
        'max_users': None,
        'storage_gb': 1024,
        'features': {
            'projects': True,
            'issues': True,
            'comments': True,
            'attachments': True,
            'basic_sprints': True,
            'advanced_analytics': True,
            'decision_twin': True,
            'decision_debt_ledger': True,
            'api_access': True,
            'priority_support': True,
            'sso_saml': True,
            'custom_integrations': True,
        },
    },
]

FEATURE_MIN_PLAN = {
    'decision_twin': 'professional',
    'decision_debt_ledger': 'professional',
    'enterprise_marketplace': 'enterprise',
    'sso_saml': 'enterprise',
}


def ensure_default_plans():
    for spec in DEFAULT_PLAN_DEFINITIONS:
        Plan.objects.update_or_create(
            name=spec['name'],
            defaults={
                'price_per_user': spec['price_per_user'],
                'max_users': spec['max_users'],
                'storage_gb': spec['storage_gb'],
                'features': spec['features'],
                'is_active': True,
            },
        )


def _free_plan():
    ensure_default_plans()
    return Plan.objects.get(name='free')


def get_or_create_subscription(organization):
    ensure_default_plans()
    free_plan = Plan.objects.get(name='free')
    trial_plan = Plan.objects.get(name='professional')
    now = timezone.now()
    subscription, _ = Subscription.objects.get_or_create(
        organization=organization,
        defaults={
            'plan': trial_plan,
            'status': 'trial',
            'trial_start': now,
            'trial_end': now + timedelta(days=14),
        },
    )
    if subscription.status == 'trial' and subscription.trial_end and subscription.trial_end < now:
        subscription.plan = free_plan
        subscription.status = 'active'
        subscription.save(update_fields=['plan', 'status', 'updated_at'])
    return subscription


def _active_plans_in_order():
    ensure_default_plans()
    plans = list(Plan.objects.filter(is_active=True))
    plans.sort(key=lambda plan: PLAN_ORDER.get(plan.name, 999))
    return plans


def recommended_plan_for_member_count(member_count):
    for plan in _active_plans_in_order():
        if plan.max_users is None or plan.max_users >= member_count:
            return plan
    plans = _active_plans_in_order()
    return plans[-1] if plans else None


def get_subscription_seat_summary(subscription, pending_invite_email_to_ignore=None):
    from .models import Invitation

    active_users = subscription.organization.users.filter(is_active=True).count()
    pending_qs = Invitation.objects.filter(
        organization=subscription.organization,
        is_accepted=False,
        expires_at__gt=timezone.now(),
    )
    if pending_invite_email_to_ignore:
        pending_qs = pending_qs.exclude(email__iexact=pending_invite_email_to_ignore)

    pending_invitations = pending_qs.count()
    seat_limit = subscription.plan.max_users
    reserved_seats = active_users + pending_invitations
    remaining_seats = None if seat_limit is None else max(seat_limit - reserved_seats, 0)
    occupancy_percentage = None
    if seat_limit:
        occupancy_percentage = round((reserved_seats / seat_limit) * 100, 2)

    return {
        'seat_limit': seat_limit,
        'active_users': active_users,
        'pending_invitations': pending_invitations,
        'reserved_seats': reserved_seats,
        'remaining_seats': remaining_seats,
        'occupancy_percentage': occupancy_percentage,
        'can_add_user': seat_limit is None or reserved_seats < seat_limit,
    }


def build_seat_limit_payload(subscription, seat_summary=None, requested_seats=None):
    seat_summary = seat_summary or get_subscription_seat_summary(subscription)
    requested_seats = requested_seats or max(
        (seat_summary.get('reserved_seats') or 0) + 1,
        (seat_summary.get('active_users') or 0) + 1,
    )
    required_plan = recommended_plan_for_member_count(requested_seats)
    required_plan_name = required_plan.name if required_plan else subscription.plan.name
    required_plan_label = required_plan.get_name_display() if required_plan else subscription.plan.get_name_display()

    return {
        'error': (
            f"Seat limit reached on the {subscription.plan.get_name_display()} plan. "
            f"Upgrade to {required_plan_label} to add more teammates."
        ),
        'current_plan': subscription.plan.name,
        'required_plan': required_plan_name,
        'required_seats': requested_seats,
        'seat_summary': seat_summary,
    }


def plan_supports_feature(plan, feature_key):
    required = FEATURE_MIN_PLAN.get(feature_key)
    if required:
        return PLAN_ORDER.get(plan.name, -1) >= PLAN_ORDER.get(required, 99)
    return bool((plan.features or {}).get(feature_key, False))


def subscription_supports_feature(subscription, feature_key):
    now = timezone.now()
    if subscription.status == 'trial' and subscription.trial_end and subscription.trial_end >= now:
        # Trial unlocks professional-level capabilities to drive conversion.
        trial_min_plan = FEATURE_MIN_PLAN.get(feature_key)
        if trial_min_plan in (None, 'free', 'starter', 'professional'):
            return True
    return plan_supports_feature(subscription.plan, feature_key)
