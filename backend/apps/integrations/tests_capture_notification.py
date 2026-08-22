"""Capture must announce itself.

It is the product's one genuinely automatic act - a discussion recorded
without anyone typing - and it happened in complete silence: a conversation
row, a log line, nothing else. A team could have Knoledgr reading their pull
requests for a fortnight and never know, because the only way to find out was
to open the conversations list on a hunch.

Notified narrowly on purpose. GitHub participants are usually not Knoledgr
users and cannot be matched to accounts, and telling a whole workspace about
every capture is the noise this product refuses to make everywhere else.
"""

from unittest.mock import patch

from django.test import TestCase

from apps.conversations.models import Conversation
from apps.integrations.github_app_models import GitHubAppInstallation, GitHubRepo
from apps.integrations.github_pr_capture import maybe_capture_pr_discussion
from apps.notifications.models import Notification
from apps.organizations.models import Organization, User

COMMENTS = "apps.integrations.github_pr_capture._collect_comments"


def _comment(login, body):
    return {"user": {"login": login, "type": "User"}, "body": body}


SUBSTANTIVE = [
    _comment(
        "alice",
        "I think the retry loop needs jitter, otherwise every client wakes at "
        "once and we get a thundering herd on the database the moment it comes "
        "back up. We saw exactly that during the outage in March.",
    ),
    _comment(
        "bob",
        "Agreed. Full jitter is simpler than decorrelated backoff here, and the "
        "difference between them does not matter at our request volume, so the "
        "simpler one wins on the code we have to maintain.",
    ),
]


class CaptureNotificationTests(TestCase):
    def setUp(self):
        self.org = Organization.objects.create(name="Cap Org", slug="cap-org")
        self.user = User.objects.create_user(
            username="cap_user", email="cap@example.com", password="pass1234",
            organization=self.org, role="admin",
        )
        self.installation = GitHubAppInstallation.objects.create(
            organization=self.org, installation_id=44001, account_id=8,
            account_login="acme", account_type="Organization",
            installed_by=self.user,
        )
        self.repo = GitHubRepo.objects.create(
            organization=self.org, installation=self.installation, repo_id=4001,
            full_name="acme/dynamo", owner_login="acme", name="dynamo",
        )

    @staticmethod
    def _pr(number=7):
        return {
            "number": number,
            "title": "Add jitter to retries",
            "merged_at": "2026-08-01T00:00:00Z",
            "html_url": "https://github.com/acme/dynamo/pull/7",
        }

    @patch(COMMENTS, return_value=SUBSTANTIVE)
    def test_a_capture_notifies_the_custodian(self, _c):
        conversation = maybe_capture_pr_discussion(
            self.installation, self.repo, self._pr()
        )

        self.assertIsNotNone(conversation)
        note = Notification.objects.get(user=self.user, notification_type="capture")
        self.assertIn("acme/dynamo#7", note.title)
        self.assertEqual(note.link, f"/conversations/{conversation.id}")

    @patch(COMMENTS, return_value=SUBSTANTIVE)
    def test_it_does_not_notify_the_whole_workspace(self, _c):
        User.objects.create_user(
            username="cap_other", email="capother@example.com", password="pass1234",
            organization=self.org, role="member",
        )

        maybe_capture_pr_discussion(self.installation, self.repo, self._pr())

        self.assertEqual(
            Notification.objects.filter(notification_type="capture").count(), 1
        )

    @patch(COMMENTS, return_value=[_comment("alice", "LGTM")])
    def test_nothing_is_announced_when_nothing_is_captured(self, _c):
        conversation = maybe_capture_pr_discussion(
            self.installation, self.repo, self._pr()
        )

        self.assertIsNone(conversation)
        self.assertFalse(
            Notification.objects.filter(notification_type="capture").exists()
        )

    @patch(COMMENTS, return_value=SUBSTANTIVE)
    def test_a_failing_notification_does_not_lose_the_capture(self, _c):
        """The conversation is the valuable part and is already saved."""
        with patch(
            "apps.notifications.helpers.notify_conversation_captured",
            side_effect=RuntimeError("boom"),
        ):
            conversation = maybe_capture_pr_discussion(
                self.installation, self.repo, self._pr()
            )

        self.assertIsNotNone(conversation)
        self.assertTrue(Conversation.objects.filter(id=conversation.id).exists())

    @patch(COMMENTS, return_value=SUBSTANTIVE)
    def test_recapturing_the_same_pr_does_not_notify_twice(self, _c):
        maybe_capture_pr_discussion(self.installation, self.repo, self._pr())
        maybe_capture_pr_discussion(self.installation, self.repo, self._pr())

        self.assertEqual(
            Notification.objects.filter(notification_type="capture").count(), 1
        )
