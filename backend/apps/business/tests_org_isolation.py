from django.test import TestCase
from rest_framework.test import APIClient

from apps.business.advanced_models import Comment, Reminder
from apps.business.models import Goal, Meeting, Task
from apps.conversations.models import Conversation
from apps.decisions.models import Decision
from apps.organizations.models import Organization, User


class BusinessOrgIsolationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.org = Organization.objects.create(name="Primary Org", slug="primary-org")
        self.other_org = Organization.objects.create(name="Other Org", slug="other-org")
        self.user = User.objects.create_user(
            username="owner",
            email="owner@example.com",
            password="pass1234",
            organization=self.org,
            role="admin",
        )
        self.member = User.objects.create_user(
            username="member",
            email="member@example.com",
            password="pass1234",
            organization=self.org,
            role="contributor",
        )
        self.other_member = User.objects.create_user(
            username="othermember",
            email="othermember@example.com",
            password="pass1234",
            organization=self.other_org,
            role="contributor",
        )
        self.conversation = Conversation.objects.create(
            organization=self.org,
            author=self.user,
            post_type="update",
            title="Org conversation",
            content="Conversation in primary org",
            ai_processed=True,
        )
        self.other_conversation = Conversation.objects.create(
            organization=self.other_org,
            author=self.other_member,
            post_type="update",
            title="Other conversation",
            content="Conversation in other org",
            ai_processed=True,
        )
        self.decision = Decision.objects.create(
            organization=self.org,
            conversation=self.conversation,
            title="Org decision",
            description="Description for org decision",
            decision_maker=self.user,
            status="proposed",
            rationale="Rationale",
        )
        self.other_decision = Decision.objects.create(
            organization=self.other_org,
            conversation=self.other_conversation,
            title="Other decision",
            description="Description for other decision",
            decision_maker=self.other_member,
            status="proposed",
            rationale="Rationale",
        )
        self.goal = Goal.objects.create(
            organization=self.org,
            title="Primary goal",
            owner=self.user,
        )
        self.other_goal = Goal.objects.create(
            organization=self.other_org,
            title="Other goal",
            owner=self.other_member,
        )
        self.meeting = Meeting.objects.create(
            organization=self.org,
            title="Primary meeting",
            meeting_date="2026-03-13T09:00:00Z",
            created_by=self.user,
        )
        self.other_meeting = Meeting.objects.create(
            organization=self.other_org,
            title="Other meeting",
            meeting_date="2026-03-13T10:00:00Z",
            created_by=self.other_member,
        )
        self.task = Task.objects.create(
            organization=self.org,
            title="Primary task",
            assigned_to=self.user,
        )
        self.client.force_authenticate(user=self.user)

    def test_goal_create_rejects_cross_org_owner(self):
        response = self.client.post(
            "/api/business/goals/",
            {
                "title": "Cross-org goal",
                "owner_id": self.other_member.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"], "Owner must belong to your organization")

    def test_goal_update_rejects_cross_org_conversation(self):
        response = self.client.put(
            f"/api/business/goals/{self.goal.id}/",
            {
                "title": self.goal.title,
                "conversation_id": self.other_conversation.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"], "Conversation must belong to your organization")

    def test_meeting_create_rejects_cross_org_attendee(self):
        response = self.client.post(
            "/api/business/meetings/",
            {
                "title": "Cross-org meeting",
                "meeting_date": "2026-03-13T11:00:00Z",
                "attendee_ids": [self.member.id, self.other_member.id],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"], "All attendees must belong to your organization")

    def test_task_create_rejects_cross_org_goal(self):
        response = self.client.post(
            "/api/business/tasks/",
            {
                "title": "Cross-org task",
                "goal_id": self.other_goal.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"], "Goal must belong to your organization")

    def test_task_update_rejects_cross_org_meeting(self):
        response = self.client.put(
            f"/api/business/tasks/{self.task.id}/",
            {
                "title": self.task.title,
                "meeting_id": self.other_meeting.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"], "Meeting must belong to your organization")

    def test_document_create_rejects_cross_org_goal(self):
        response = self.client.post(
            "/api/business/documents/",
            {
                "title": "Cross-org document",
                "document_type": "guide",
                "content": "doc body",
                "goal_id": self.other_goal.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"], "Goal must belong to your organization")

    def test_comment_create_rejects_cross_org_task(self):
        other_task = Task.objects.create(
            organization=self.other_org,
            title="Other org task",
            assigned_to=self.other_member,
        )

        response = self.client.post(
            "/api/business/comments/",
            {
                "content": "Cross-org comment",
                "task_id": other_task.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"], "Task must belong to your organization")

    def test_reminder_create_rejects_cross_org_meeting(self):
        response = self.client.post(
            "/api/business/reminders/",
            {
                "title": "Cross-org reminder",
                "message": "Reminder body",
                "remind_at": "2026-03-14T09:00:00Z",
                "meeting_id": self.other_meeting.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"], "Meeting must belong to your organization")
