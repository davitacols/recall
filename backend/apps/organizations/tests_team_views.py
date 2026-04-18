from django.test import TestCase
from rest_framework.test import APIClient

from apps.conversations.models import Conversation, ConversationReply
from apps.decisions.models import Decision
from apps.organizations.models import Organization, User


class TeamViewsTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.org = Organization.objects.create(name="Team Org", slug="team-org")
        self.other_org = Organization.objects.create(name="Other Org", slug="other-org")

        self.viewer = User.objects.create_user(
            username="viewer",
            email="viewer@team.test",
            password="pass1234",
            organization=self.org,
            role="contributor",
            full_name="Viewing Member",
        )
        self.teammate = User.objects.create_user(
            username="teammate",
            email="teammate@team.test",
            password="pass1234",
            organization=self.org,
            role="manager",
            full_name="Teammate Person",
            bio="Owns workflow shaping across the workspace.",
            timezone="Europe/London",
        )
        self.outsider = User.objects.create_user(
            username="outsider",
            email="outsider@other.test",
            password="pass1234",
            organization=self.other_org,
            role="contributor",
            full_name="Outside Member",
        )

        self.client.force_authenticate(user=self.viewer)

        self.conversation = Conversation.objects.create(
            organization=self.org,
            author=self.teammate,
            post_type="update",
            title="Sprint integration check-in",
            content="The frontend integration work is moving, but profile access still needs a same-org route.",
            priority="medium",
        )
        self.reply = ConversationReply.objects.create(
            conversation=self.conversation,
            author=self.teammate,
            content="Following up with the route and permission details now.",
        )
        self.decision = Decision.objects.create(
            organization=self.org,
            conversation=self.conversation,
            title="Ship teammate profile viewing",
            description="Allow contributors to open same-workspace teammate profiles in a safe read-only mode.",
            decision_maker=self.teammate,
            rationale="Members need visibility into who owns context without relying on admin-only screens.",
            status="approved",
        )

    def test_same_org_member_can_view_teammate_profile(self):
        response = self.client.get(f"/api/organizations/team/members/{self.teammate.id}/profile/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["id"], self.teammate.id)
        self.assertEqual(response.data["email"], self.teammate.email)
        self.assertEqual(response.data["full_name"], self.teammate.full_name)
        self.assertEqual(response.data["role"], self.teammate.role)
        self.assertEqual(response.data["timezone"], "Europe/London")
        self.assertEqual(response.data["stats"]["conversations"], 1)
        self.assertEqual(response.data["stats"]["replies"], 1)
        self.assertEqual(response.data["stats"]["decisions"], 1)

    def test_teammate_profile_is_scoped_to_same_organization(self):
        response = self.client.get(f"/api/organizations/team/members/{self.outsider.id}/profile/")

        self.assertEqual(response.status_code, 404)

    def test_team_member_activity_returns_recent_items(self):
        response = self.client.get(f"/api/organizations/team/activity/{self.teammate.id}/")

        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(len(response.data), 3)
        activity_types = {item["type"] for item in response.data}
        self.assertIn("conversation", activity_types)
        self.assertIn("reply", activity_types)
        self.assertIn("decision", activity_types)
        self.assertTrue(any(item["href"] == f"/conversations/{self.conversation.id}" for item in response.data))
        self.assertTrue(any(item["href"] == f"/decisions/{self.decision.id}" for item in response.data))
