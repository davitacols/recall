from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .paypal_service import (
    PAYPAL_READY_STATUSES,
    PayPalApiError,
    PayPalConfigurationError,
    get_checkout_support_by_plan,
    get_plan_id_for_name,
    get_subscription_details,
)
from .subscription_entitlements import get_or_create_subscription
from .subscription_models import Plan


def _require_admin(request):
    if request.user.role != "admin":
        return Response({"error": "Admin only"}, status=status.HTTP_403_FORBIDDEN)
    return None


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def paypal_checkout_config(request):
    admin_response = _require_admin(request)
    if admin_response:
        return admin_response

    checkout_support = get_checkout_support_by_plan()
    return Response(
        {
            "provider": "paypal",
            "available": any(checkout_support.values()),
            "checkout_supported": checkout_support,
            "plan_ids": {
                plan_name: get_plan_id_for_name(plan_name)
                for plan_name, supported in checkout_support.items()
                if supported
            },
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def activate_paypal_subscription(request):
    admin_response = _require_admin(request)
    if admin_response:
        return admin_response

    plan_name = request.data.get("plan")
    paypal_subscription_id = request.data.get("subscription_id")
    if not plan_name or not paypal_subscription_id:
        return Response(
            {"error": "Plan and PayPal subscription ID are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        plan = Plan.objects.get(name=plan_name)
    except Plan.DoesNotExist:
        return Response({"error": "Invalid plan."}, status=status.HTTP_400_BAD_REQUEST)

    expected_plan_id = get_plan_id_for_name(plan.name)
    if not expected_plan_id:
        return Response(
            {"error": f"PayPal is not configured for the {plan.get_name_display()} plan."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        details = get_subscription_details(paypal_subscription_id)
    except PayPalConfigurationError as exc:
        return Response({"error": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    except PayPalApiError as exc:
        return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    actual_plan_id = details.get("plan_id")
    actual_status = str(details.get("status") or "").upper()
    if actual_plan_id != expected_plan_id:
        return Response(
            {"error": "The approved PayPal subscription does not match the selected plan."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if actual_status not in PAYPAL_READY_STATUSES:
        return Response(
            {"error": f"PayPal subscription is not ready yet (status: {actual_status or 'unknown'})."},
            status=status.HTTP_409_CONFLICT,
        )

    subscription = get_or_create_subscription(request.user.organization)
    next_billing_time = details.get("billing_info", {}).get("next_billing_time")
    parsed_next_billing = parse_datetime(next_billing_time) if next_billing_time else None
    if parsed_next_billing and timezone.is_naive(parsed_next_billing):
        parsed_next_billing = timezone.make_aware(parsed_next_billing, timezone.get_current_timezone())

    subscription.plan = plan
    subscription.status = "active"
    subscription.billing_provider = "paypal"
    subscription.paypal_subscription_id = paypal_subscription_id
    subscription.stripe_customer_id = ""
    subscription.stripe_subscription_id = ""
    subscription.current_period_start = timezone.now()
    subscription.current_period_end = parsed_next_billing
    subscription.save()

    return Response(
        {
            "message": f"{plan.get_name_display()} is now active via PayPal.",
            "provider": "paypal",
            "plan": plan.name,
            "status": subscription.status,
            "paypal_subscription_id": subscription.paypal_subscription_id,
            "current_period_end": subscription.current_period_end,
        }
    )
