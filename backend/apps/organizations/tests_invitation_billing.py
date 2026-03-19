from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.organizations.models import Invitation, Organization, User
from apps.organizations.subscription_entitlements import ensure_default_plans, get_or_create_subscription
from apps.organizations.subscription_models import Plan


@override_settings(TURNSTILE_ENABLED=False)
class InvitationBillingTests(TestCase):
    def setUp(self):
        ensure_default_plans()
        self.client = APIClient()
        self.admin_client = APIClient()

        self.org = Organization.objects.create(name="Seat Org", slug="seat-org")
        self.admin = User.objects.create_user(
            username="seat_admin",
            email="admin@seat.test",
            password="pass1234",
            organization=self.org,
            role="admin",
        )
        self.admin_client.force_authenticate(user=self.admin)

        subscription = get_or_create_subscription(self.org)
        subscription.plan = Plan.objects.get(name="free")
        subscription.status = "active"
        subscription.save(update_fields=["plan", "status", "updated_at"])

    def test_invitation_send_blocks_when_reserved_seats_are_full(self):
        User.objects.create_user(
            username="seat_member",
            email="member@seat.test",
            password="pass1234",
            organization=self.org,
            role="contributor",
        )
        Invitation.objects.create(
            organization=self.org,
            email="pending@seat.test",
            role="contributor",
            invited_by=self.admin,
        )

        response = self.admin_client.post(
            "/api/organizations/invitations/send/",
            {"email": "new@seat.test", "role": "contributor"},
            format="json",
        )

        self.assertEqual(response.status_code, 402)
        self.assertEqual(response.data["current_plan"], "free")
        self.assertEqual(response.data["required_plan"], "starter")
        self.assertEqual(response.data["seat_summary"]["reserved_seats"], 3)

    def test_settings_invite_blocks_when_active_seats_are_full(self):
        User.objects.create_user(
            username="seat_member_two",
            email="member-two@seat.test",
            password="pass1234",
            organization=self.org,
            role="contributor",
        )
        User.objects.create_user(
            username="seat_member_three",
            email="member-three@seat.test",
            password="pass1234",
            organization=self.org,
            role="contributor",
        )

        response = self.admin_client.post(
            "/api/organizations/settings/members/invite/",
            {"email": "overflow@seat.test", "role": "contributor"},
            format="json",
        )

        self.assertEqual(response.status_code, 402)
        self.assertEqual(response.data["required_plan"], "starter")

    def test_accept_invitation_blocks_when_active_seats_are_full(self):
        User.objects.create_user(
            username="seat_member_four",
            email="member-four@seat.test",
            password="pass1234",
            organization=self.org,
            role="contributor",
        )
        User.objects.create_user(
            username="seat_member_five",
            email="member-five@seat.test",
            password="pass1234",
            organization=self.org,
            role="contributor",
        )
        invitation = Invitation.objects.create(
            organization=self.org,
            email="accept@seat.test",
            role="contributor",
            invited_by=self.admin,
        )

        response = self.client.post(
            f"/api/organizations/invitations/{invitation.token}/accept/",
            {
                "username": "accepted-user",
                "password": "Password1",
                "full_name": "Accepted User",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 402)
        self.assertFalse(
            User.objects.filter(
                email="accept@seat.test",
                organization=self.org,
                is_active=True,
            ).exists()
        )
