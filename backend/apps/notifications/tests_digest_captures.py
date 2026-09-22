"""Captures lead the digest.

They already reached it - the preference filter allows any type it does not
recognise - but as one bullet among reminders, indistinguishable from a nudge
the reader has seen ten times.

A capture is the only thing in this product that happens without anyone doing
anything. In a mail full of chores it is the single item that is evidence the
thing works, and it was buried.
"""

from unittest.mock import patch

from django.test import TestCase

from apps.notifications.models import Notification
from apps.notifications.tasks import send_notification_digest
from apps.organizations.models import Organization, User

SEND = "apps.notifications.tasks.send_email"


class DigestCaptureTests(TestCase):
    def setUp(self):
        self.org = Organization.objects.create(name="Digest Org", slug="digest-org")
        self.user = User.objects.create_user(
            username="digest_user", email="digest@example.com", password="pass1234",
            organization=self.org, role="admin",
        )
        # The default is realtime, which means individual emails rather than a
        # digest. Batching is opt-in, so a digest test has to opt in.
        User.objects.filter(pk=self.user.pk).update(digest_frequency="daily")
        self.user.refresh_from_db()

    def _note(self, kind, title, message="A discussion", link="/conversations/1"):
        return Notification.objects.create(
            user=self.user, notification_type=kind,
            title=title, message=message, link=link,
        )

    def _send(self):
        with patch(SEND) as send:
            send_notification_digest(self.user.id, frequency="daily")
        return send

    def test_a_capture_only_digest_says_so_in_the_subject(self):
        self._note("capture", "Captured from acme/dynamo#7")

        send = self._send()

        send.assert_called_once()
        subject = send.call_args[0][1]
        self.assertIn("captured 1 discussion", subject)

    def test_the_subject_pluralises(self):
        self._note("capture", "Captured from acme/dynamo#7")
        self._note("capture", "Captured from acme/dynamo#8")

        subject = self._send().call_args[0][1]

        self.assertIn("captured 2 discussions", subject)

    def test_captures_appear_above_the_rest(self):
        self._note("capture", "Captured from acme/dynamo#7", message="Retry jitter")
        self._note("reminder", "A decision needs an outcome check")

        html = self._send().call_args[0][2]

        self.assertLess(
            html.index("Retry jitter"),
            html.index("outcome check"),
            "a capture must not sit below a reminder",
        )

    def test_a_capture_says_what_to_do_with_it(self):
        self._note("capture", "Captured from acme/dynamo#7")

        html = self._send().call_args[0][2]

        self.assertIn("convert it to a decision", html.lower())

    def test_a_mixed_digest_keeps_the_ordinary_subject(self):
        self._note("capture", "Captured from acme/dynamo#7")
        self._note("reminder", "A decision needs an outcome check")

        subject = self._send().call_args[0][1]

        self.assertIn("digest", subject.lower())

    def test_a_digest_with_no_captures_is_unchanged(self):
        self._note("reminder", "A decision needs an outcome check")

        call = self._send().call_args
        subject, html = call[0][1], call[0][2]

        self.assertIn("digest", subject.lower())
        self.assertIn("new updates", html)

    def test_nothing_is_sent_when_there_is_nothing(self):
        send = self._send()

        send.assert_not_called()

    def test_the_plain_text_part_carries_the_captures_too(self):
        self._note("capture", "Captured from acme/dynamo#7", message="Retry jitter")

        text = self._send().call_args[1]["text_content"]

        self.assertIn("Retry jitter", text)
        self.assertIn("captured for you", text)
