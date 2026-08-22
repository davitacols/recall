"""The conversation detail payload must say where a conversation came from.

A captured conversation was written by people who are usually not Knoledgr
users, so Conversation.author names a custodian rather than an author. Without
the source the page implies that custodian wrote the argument.

It must also say whether the conversation has already become a decision. Both
live captured conversations are in different states - one converted, one not -
and the page offered Convert to decision on both, which returns an error on
the one that already has one.
"""

from django.test import TestCase
from rest_framework.test import APIClient

from apps.conversations.models import Conversation
from apps.decisions.models import Decision
from apps.organizations.models import Organization, User


class ConversationDetailPayloadTests(TestCase):
    def setUp(self):
        self.org = Organization.objects.create(name="Conv Org", slug="conv-org")
        self.user = User.objects.create_user(
            username="conv_user", email="conv@example.com", password="pass1234",
            organization=self.org, role="admin",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def _conversation(self, **extra):
        return Conversation.objects.create(
            organization=self.org, author=self.user, post_type="discussion",
            title="We argued about retries", content="<p>The argument.</p>",
            ai_processed=True, **extra,
        )

    def _payload(self, conversation):
        response = self.client.get(f"/api/recall/conversations/{conversation.id}/")
        self.assertEqual(response.status_code, 200, response.data)
        return response.data

    def test_reports_where_a_captured_conversation_came_from(self):
        conversation = self._conversation(
            source=Conversation.SOURCE_GITHUB_PR,
            source_url="https://github.com/acme/dynamo/pull/5",
            external_id="1234:5",
        )

        body = self._payload(conversation)

        self.assertEqual(body["source"], "github_pr")
        self.assertIn("/pull/5", body["source_url"])

    def test_a_typed_conversation_has_no_source(self):
        conversation = self._conversation()

        body = self._payload(conversation)

        self.assertFalse(body["source"])
        self.assertFalse(body["source_url"])

    def test_reports_the_decision_it_became(self):
        conversation = self._conversation()
        decision = Decision.objects.create(
            organization=self.org, conversation=conversation, title="A decision",
            description="x", decision_maker=self.user, status="proposed",
            rationale="Because the retry loop had no jitter.",
        )

        body = self._payload(conversation)

        self.assertEqual(body["decision_id"], decision.id)

    def test_reports_none_when_it_has_not_been_converted(self):
        conversation = self._conversation()

        body = self._payload(conversation)

        self.assertIsNone(body["decision_id"])

    def test_another_workspaces_conversation_is_not_readable(self):
        other_org = Organization.objects.create(name="Theirs", slug="theirs-conv")
        other_user = User.objects.create_user(
            username="other_conv", email="otherconv@example.com", password="pass1234",
            organization=other_org, role="admin",
        )
        theirs = Conversation.objects.create(
            organization=other_org, author=other_user, post_type="discussion",
            title="Theirs", content="x", ai_processed=True,
        )

        response = self.client.get(f"/api/recall/conversations/{theirs.id}/")

        self.assertIn(response.status_code, (403, 404))
