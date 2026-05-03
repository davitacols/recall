from unittest.mock import patch

from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.organizations.models import Organization, User
from apps.organizations.subscription_entitlements import ensure_default_plans, get_or_create_subscription
from apps.organizations.subscription_models import Plan


class SubscriptionViewsTests(TestCase):
    def setUp(self):
        ensure_default_plans()
        self.client = APIClient()
        self.admin_client = APIClient()
        self.contributor_client = APIClient()

        self.org = Organization.objects.create(name="Pricing Org", slug="pricing-org")
        self.admin = User.objects.create_user(
            username="pricing_admin",
            email="admin@pricing.test",
            password="pass1234",
            organization=self.org,
            role="admin",
        )
        self.contributor = User.objects.create_user(
            username="pricing_contributor",
            email="contrib@pricing.test",
            password="pass1234",
            organization=self.org,
            role="contributor",
        )

        self.admin_client.force_authenticate(user=self.admin)
        self.contributor_client.force_authenticate(user=self.contributor)

    def test_plans_list_returns_sorted_plans_with_checkout_flags(self):
        response = self.admin_client.get("/api/organizations/plans/")
        self.assertEqual(response.status_code, 200)

        names = [plan["name"] for plan in response.data]
        self.assertEqual(names, ["free", "starter", "professional", "enterprise"])
        self.assertTrue(all("checkout_supported" in plan for plan in response.data))
        self.assertTrue(all("checkout_providers" in plan for plan in response.data))
        self.assertEqual(response.data[0]["is_free"], True)

    def test_subscription_detail_returns_billing_metadata(self):
        response = self.admin_client.get("/api/organizations/subscription/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["plan"]["name"], "professional")
        self.assertEqual(response.data["status"], "trial")
        self.assertIn("billing", response.data)
        self.assertIn("checkout_supported", response.data["billing"])
        self.assertIn("portal_enabled", response.data["billing"])
        self.assertIn("providers", response.data["billing"])
        self.assertIn("seat_summary", response.data)
        self.assertEqual(response.data["seat_summary"]["active_users"], 2)

    def test_upgrade_plan_is_admin_only(self):
        starter = Plan.objects.get(name="starter")

        forbidden = self.contributor_client.post(
            "/api/organizations/subscription/upgrade/",
            {"plan_id": starter.id},
            format="json",
        )
        self.assertEqual(forbidden.status_code, 403)

        allowed = self.admin_client.post(
            "/api/organizations/subscription/upgrade/",
            {"plan_id": starter.id},
            format="json",
        )
        self.assertEqual(allowed.status_code, 200)

        subscription = get_or_create_subscription(self.org)
        self.assertEqual(subscription.plan.name, "starter")

    def test_stripe_checkout_and_portal_are_admin_only(self):
        checkout_response = self.contributor_client.post(
            "/api/organizations/stripe/checkout/",
            {"plan": "professional"},
            format="json",
        )
        self.assertEqual(checkout_response.status_code, 403)

        portal_response = self.contributor_client.post(
            "/api/organizations/stripe/portal/",
            {},
            format="json",
        )
        self.assertEqual(portal_response.status_code, 403)

    @override_settings(
        PAYPAL_CLIENT_ID="paypal-client-id",
        PAYPAL_STARTER_PLAN_ID="P-STARTER123",
        PAYPAL_PROFESSIONAL_PLAN_ID="P-PRO123",
        PAYPAL_ENTERPRISE_PLAN_ID="P-ENT123",
    )
    def test_paypal_config_is_admin_only_and_returns_supported_plans(self):
        forbidden = self.contributor_client.get("/api/organizations/paypal/config/")
        self.assertEqual(forbidden.status_code, 403)

        allowed = self.admin_client.get("/api/organizations/paypal/config/")
        self.assertEqual(allowed.status_code, 200)
        self.assertEqual(allowed.data["provider"], "paypal")
        self.assertEqual(allowed.data["available"], True)
        self.assertEqual(allowed.data["checkout_supported"]["professional"], True)
        self.assertEqual(allowed.data["plan_ids"]["professional"], "P-PRO123")

    @override_settings(
        PAYPAL_CLIENT_ID="paypal-client-id",
        PAYPAL_CLIENT_SECRET="paypal-client-secret",
        PAYPAL_PROFESSIONAL_PLAN_ID="P-PRO123",
    )
    @patch("apps.organizations.paypal_views.get_subscription_details")
    def test_paypal_activate_updates_subscription_and_provider(self, mock_get_subscription_details):
        mock_get_subscription_details.return_value = {
            "id": "I-SUBSCRIPTION123",
            "plan_id": "P-PRO123",
            "status": "ACTIVE",
            "billing_info": {
                "next_billing_time": "2030-01-01T00:00:00Z",
            },
        }

        response = self.admin_client.post(
            "/api/organizations/paypal/activate/",
            {
                "plan": "professional",
                "subscription_id": "I-SUBSCRIPTION123",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        subscription = get_or_create_subscription(self.org)
        self.assertEqual(subscription.plan.name, "professional")
        self.assertEqual(subscription.billing_provider, "paypal")
        self.assertEqual(subscription.paypal_subscription_id, "I-SUBSCRIPTION123")
        self.assertEqual(subscription.stripe_customer_id, "")
