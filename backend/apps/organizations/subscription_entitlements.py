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
