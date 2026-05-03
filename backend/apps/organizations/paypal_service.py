import requests
from django.conf import settings


PAYPAL_READY_STATUSES = {"APPROVED", "ACTIVE"}


class PayPalConfigurationError(Exception):
    pass


class PayPalApiError(Exception):
    pass


def _configured(value):
    return bool(str(value or "").strip())


def get_paypal_plan_ids():
    return {
        "starter": getattr(settings, "PAYPAL_STARTER_PLAN_ID", "").strip(),
        "professional": getattr(settings, "PAYPAL_PROFESSIONAL_PLAN_ID", "").strip(),
        "enterprise": getattr(settings, "PAYPAL_ENTERPRISE_PLAN_ID", "").strip(),
    }


def get_checkout_support_by_plan():
    client_id = getattr(settings, "PAYPAL_CLIENT_ID", "").strip()
    plan_ids = get_paypal_plan_ids()
    return {plan_name: bool(client_id and plan_id) for plan_name, plan_id in plan_ids.items()}


def get_plan_id_for_name(plan_name):
    return get_paypal_plan_ids().get(plan_name, "")


def _get_api_base():
    return (getattr(settings, "PAYPAL_API_BASE", "") or "https://api-m.sandbox.paypal.com").rstrip("/")


def _extract_error_message(response):
    try:
        payload = response.json()
    except ValueError:
        return response.text or "Unknown PayPal API error"

    details = payload.get("details") or []
    if details and isinstance(details[0], dict) and details[0].get("description"):
        return details[0]["description"]
    return payload.get("message") or payload.get("error_description") or "Unknown PayPal API error"


def _get_access_token():
    client_id = getattr(settings, "PAYPAL_CLIENT_ID", "").strip()
    client_secret = getattr(settings, "PAYPAL_CLIENT_SECRET", "").strip()
    if not client_id or not client_secret:
        raise PayPalConfigurationError("PayPal API credentials are not configured.")

    response = requests.post(
        f"{_get_api_base()}/v1/oauth2/token",
        auth=(client_id, client_secret),
        data={"grant_type": "client_credentials"},
        headers={
            "Accept": "application/json",
            "Accept-Language": "en_US",
        },
        timeout=10,
    )
    if not response.ok:
        raise PayPalApiError(_extract_error_message(response))

    access_token = response.json().get("access_token")
    if not access_token:
        raise PayPalApiError("PayPal did not return an access token.")
    return access_token


def get_subscription_details(paypal_subscription_id):
    if not paypal_subscription_id:
        raise PayPalConfigurationError("A PayPal subscription ID is required.")

    access_token = _get_access_token()
    response = requests.get(
        f"{_get_api_base()}/v1/billing/subscriptions/{paypal_subscription_id}",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        },
        timeout=10,
    )
    if not response.ok:
        raise PayPalApiError(_extract_error_message(response))
    return response.json()
