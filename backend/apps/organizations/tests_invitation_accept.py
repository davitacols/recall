"""Accepting an invitation with the payload the form actually sends.

The invite form shows the invited address in a disabled field labelled Email
and posts it back. Acceptance used to run that value through validate_username,
which rejects "@" and ".", so every real invitee was told their username could
only contain letters, numbers, underscores and hyphens - about a field they
never filled in and could not edit.

The existing seat-limit test never caught it because it posted "accepted-user",
a valid username that the form can never produce.
"""

from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.organizations.models import Invitation, Organization, User
from apps.organizations.subscription_entitlements import ensure_default_plans


@override_settings(TURNSTILE_ENABLED=False)
class AcceptInvitationTests(TestCase):
    def setUp(self):
        ensure_default_plans()
        self.client = APIClient()
        self.org = Organization.objects.create(name="Accept Org", slug="accept-org")
        self.admin = User.objects.create_user(
            username="accept_admin",
            email="admin@accept.test",
            password="pass1234",
            organization=self.org,
            role="admin",
        )

    def _invite(self, email="invitee@accept.test"):
        return Invitation.objects.create(
            organization=self.org,
            email=email,
            role="contributor",
            invited_by=self.admin,
        )

    def _accept(self, invitation, payload):
        return self.client.post(
            f"/api/organizations/invitations/{invitation.token}/accept/",
            payload,
            format="json",
        )

    def test_accepts_the_email_the_form_posts(self):
        invitation = self._invite()

        response = self._accept(invitation, {
            "email": "invitee@accept.test",
            "password": "Password1",
            "full_name": "Invited Person",
        })

        self.assertEqual(response.status_code, 200, response.data)
        user = User.objects.get(email="invitee@accept.test", organization=self.org)
        self.assertTrue(user.is_active)
        self.assertEqual(user.full_name, "Invited Person")

    def test_accepts_the_legacy_username_key(self):
        """A cached bundle still posts the address under "username"."""
        invitation = self._invite("legacy@accept.test")

        response = self._accept(invitation, {
            "username": "legacy@accept.test",
            "password": "Password1",
            "full_name": "Legacy Bundle",
        })

        self.assertEqual(response.status_code, 200, response.data)
        self.assertTrue(
            User.objects.filter(email="legacy@accept.test", organization=self.org).exists()
        )

    def test_generated_username_is_derived_from_the_invitation(self):
        """The submitted value is a seed, not the account's identity."""
        invitation = self._invite("someone@accept.test")

        self._accept(invitation, {
            "email": "attacker-supplied@elsewhere.test",
            "password": "Password1",
            "full_name": "Someone",
        })

        user = User.objects.get(email="someone@accept.test", organization=self.org)
        self.assertTrue(user.username.startswith("someone__accept-org"))

    def test_password_is_still_required(self):
        invitation = self._invite("nopass@accept.test")

        response = self._accept(invitation, {
            "email": "nopass@accept.test",
            "full_name": "No Password",
        })

        self.assertEqual(response.status_code, 400)
        self.assertIn("Password", response.data["error"])

    def test_weak_password_is_still_rejected(self):
        invitation = self._invite("weak@accept.test")

        response = self._accept(invitation, {
            "email": "weak@accept.test",
            "password": "abc",
            "full_name": "Weak Password",
        })

        self.assertEqual(response.status_code, 400)
        self.assertFalse(
            User.objects.filter(email="weak@accept.test", organization=self.org).exists()
        )

    def test_invitation_is_marked_accepted(self):
        invitation = self._invite("marks@accept.test")

        self._accept(invitation, {
            "email": "marks@accept.test",
            "password": "Password1",
            "full_name": "Marks Accepted",
        })

        invitation.refresh_from_db()
        self.assertTrue(invitation.is_accepted)
        self.assertIsNotNone(invitation.accepted_at)
