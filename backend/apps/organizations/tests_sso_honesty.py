"""SSO settings must never report themselves as working.

SSOConfig is written by an endpoint, stored, admin-registered and tested for
storage. No authentication path reads it: apps/users and config contain zero
references, there is no assertion consumer endpoint, and require_sso is read by
nothing.

So an administrator could fill in their identity provider, toggle enabled,
receive "SSO configuration saved" and reasonably conclude their workspace was
protected by it. That is worse than a marketing claim, because the product
itself affirms it.

The settings are kept - nothing is lost when the sign-on is built - but the
response always says it is not active.
"""

from django.test import TestCase
from rest_framework.test import APIClient

from apps.organizations.models import Organization, User


class SSOHonestyTests(TestCase):
    URL = "/api/organizations/enterprise/sso/"

    def setUp(self):
        self.org = Organization.objects.create(name="SSO Org", slug="sso-org")
        self.admin = User.objects.create_user(
            username="sso_admin", email="sso@example.com", password="pass1234",
            organization=self.org, role="admin",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.admin)

    def test_unconfigured_reports_not_active(self):
        response = self.client.get(self.URL)

        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data["active"])
        self.assertIn("not available yet", response.data["reason"])

    def test_saving_does_not_claim_it_works(self):
        response = self.client.post(
            self.URL,
            {"provider": "okta", "enabled": True, "sso_url": "https://idp.test/sso"},
            format="json",
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertFalse(response.data["active"])
        self.assertIn("not available yet", response.data["message"].lower())

    def test_enabled_true_still_reports_not_active(self):
        """enabled is stored. It is not a switch that turns anything on."""
        self.client.post(
            self.URL, {"provider": "okta", "enabled": True}, format="json"
        )

        response = self.client.get(self.URL)

        self.assertTrue(response.data["enabled"])
        self.assertFalse(response.data["active"])

    def test_the_settings_are_still_persisted(self):
        """Kept so nothing is lost when the sign-on is actually built."""
        self.client.post(
            self.URL,
            {"provider": "okta", "entity_id": "urn:test", "sso_url": "https://idp.test/sso"},
            format="json",
        )

        response = self.client.get(self.URL)

        self.assertEqual(response.data["provider"], "okta")
        self.assertEqual(response.data["entity_id"], "urn:test")

    def test_non_admin_cannot_configure(self):
        member = User.objects.create_user(
            username="sso_member", email="member@example.com", password="pass1234",
            organization=self.org, role="member",
        )
        client = APIClient()
        client.force_authenticate(user=member)

        response = client.post(self.URL, {"provider": "okta"}, format="json")

        self.assertEqual(response.status_code, 403)
