from django.test import TestCase
from rest_framework.test import APIClient

from apps.agile.models import Blocker, Project, Sprint
from apps.conversations.models import Conversation
from apps.organizations.models import Organization, User


class BlockerIsolationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.org = Organization.objects.create(name="Agile Org", slug="agile-org")
        self.other_org = Organization.objects.create(name="Other Agile Org", slug="other-agile-org")
        self.user = User.objects.create_user(
            username="agile_owner",
            email="agile_owner@example.com",
            password="pass1234",
            organization=self.org,
            role="admin",
        )
        self.member = User.objects.create_user(
            username="agile_member",
            email="agile_member@example.com",
            password="pass1234",
            organization=self.org,
            role="contributor",
        )
        self.other_member = User.objects.create_user(
            username="other_agile_member",
            email="other_agile_member@example.com",
            password="pass1234",
            organization=self.other_org,
            role="contributor",
        )
        self.project = Project.objects.create(
            organization=self.org,
            name="Agile Project",
            key="AG",
            description="Agile project",
            lead=self.user,
        )
        self.sprint = Sprint.objects.create(
            organization=self.org,
            project=self.project,
            name="Sprint 1",
            goal="Ship core fixes",
            start_date="2026-03-10",
            end_date="2026-03-20",
            status="active",
        )
        self.conversation = Conversation.objects.create(
            organization=self.org,
            author=self.user,
            post_type="blocker",
            title="Blocker conversation",
            content="Blocker context",
            ai_processed=True,
        )
        self.blocker = Blocker.objects.create(
            organization=self.org,
            conversation=self.conversation,
            sprint=self.sprint,
            title="Open blocker",
            description="Needs assignment",
            blocker_type="technical",
            status="active",
            blocked_by=self.user,
            assigned_to=self.member,
        )
        self.client.force_authenticate(user=self.user)

    def test_blocker_detail_rejects_cross_org_assignee(self):
        response = self.client.put(
            f"/api/agile/blockers/{self.blocker.id}/",
            {
                "assigned_to_id": self.other_member.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"], "Assignee must belong to your organization")

    def test_blocker_detail_allows_clearing_assignee(self):
        response = self.client.put(
            f"/api/agile/blockers/{self.blocker.id}/",
            {
                "assigned_to_id": "",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.blocker.refresh_from_db()
        self.assertIsNone(self.blocker.assigned_to)
