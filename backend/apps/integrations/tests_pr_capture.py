"""Tests for capturing a merged PR's review discussion as a Conversation.

The filter is the feature. Capturing every merged PR would bury the handful
that contain real reasoning under a pile of "LGTM" on dependency bumps, and a
memory nobody trusts to be signal is one nobody searches. So most of these
tests are about what is *not* captured.
"""

from unittest.mock import patch

from django.test import TestCase

from apps.conversations.models import Conversation
from apps.integrations.github_app_models import GitHubAppInstallation, GitHubRepo
from apps.integrations.github_pr_capture import (
    MIN_SUBSTANTIVE_COMMENTS,
    _build_transcript,
    _is_bot,
    _is_substantive,
    maybe_capture_pr_discussion,
)
from apps.organizations.models import Organization, User


class _Resp:
    def __init__(self, payload):
        self._payload = payload
        self.ok = True
        self.status_code = 200

    def json(self):
        return self._payload


def _human(login, body, path="", when="2026-08-05T09:00:00Z"):
    return {"user": {"login": login, "type": "User"}, "body": body,
            "path": path, "created_at": when}


class CommentFilterTests(TestCase):
    def test_bots_are_recognised(self):
        self.assertTrue(_is_bot({"login": "dependabot[bot]", "type": "Bot"}))
        self.assertTrue(_is_bot({"login": "vercel[bot]", "type": "User"}))
        self.assertTrue(_is_bot({"login": "knoledgr[bot]", "type": "Bot"}))
        self.assertFalse(_is_bot({"login": "davitacols", "type": "User"}))

    def test_rubber_stamps_are_not_substantive(self):
        for stamp in ("LGTM", "lgtm!", "ship it", "+1", "👍", "Thanks!", "done"):
            self.assertFalse(_is_substantive(stamp), f"{stamp!r} should not count")

    def test_short_comments_are_not_substantive(self):
        self.assertFalse(_is_substantive("looks fine to me"))
        self.assertFalse(_is_substantive(""))

    def test_reasoning_is_substantive(self):
        self.assertTrue(_is_substantive(
            "I'd rather not add another dependency here — we already pull in "
            "two HTTP clients and this makes a third."
        ))

    def test_comment_starting_with_lgtm_but_explaining_still_counts(self):
        """Matching a prefix would drop real reasoning; match the whole comment."""
        self.assertTrue(_is_substantive(
            "LGTM, though I think we should revisit the retry budget later — "
            "three retries against a 30s timeout is 90 seconds of hanging."
        ))


class CaptureTests(TestCase):
    def setUp(self):
        self.org = Organization.objects.create(name="Capture QA", slug="capture-qa")
        self.user = User.objects.create_user(
            username="capture_user", email="capture@example.com", password="pass1234",
            organization=self.org, role="admin",
        )
        self.installation = GitHubAppInstallation.objects.create(
            organization=self.org, installation_id=880001, account_id=1,
            account_login="acme", installed_by=self.user,
        )
        self.repo = GitHubRepo.objects.create(
            organization=self.org, installation=self.installation, repo_id=77,
            full_name="acme/widgets", owner_login="acme", name="widgets",
        )
        self.pr = {
            "number": 12, "title": "Replace the retry loop",
            "html_url": "https://github.com/acme/widgets/pull/12",
            "body": "Swaps the hand-rolled loop for tenacity.",
            "merged": True, "merged_at": "2026-08-05T09:30:00Z",
        }

    def _capture_with(self, reviews=(), diff=(), comments=()):
        def fake_get(path, installation_id=None, params=None):
            if path.endswith("/reviews"):
                return _Resp(list(reviews))
            if "/pulls/" in path and path.endswith("/comments"):
                return _Resp(list(diff))
            return _Resp(list(comments))

        with patch("apps.integrations.github_pr_capture.github_get", side_effect=fake_get):
            return maybe_capture_pr_discussion(
                installation=self.installation, repo=self.repo, pr=self.pr
            )

    # -- the case worth capturing ------------------------------------------

    def test_real_argument_is_captured(self):
        conversation = self._capture_with(comments=[
            _human("alice",
                   "I'd rather not add another dependency here — we already pull "
                   "in two HTTP clients and this would make a third."),
            _human("bob",
                   "Fair, but the hand-rolled loop has no jitter, so every client "
                   "retries in lockstep and we hammer the service on recovery."),
            _human("alice",
                   "That's a good reason. Let's take tenacity and drop our own "
                   "backoff helper entirely."),
        ])

        self.assertIsNotNone(conversation)
        self.assertEqual(conversation.organization_id, self.org.id)
        self.assertEqual(conversation.source, Conversation.SOURCE_GITHUB_PR)
        self.assertEqual(conversation.external_id, "77:12")
        self.assertEqual(conversation.source_url, self.pr["html_url"])
        self.assertIn("PR #12", conversation.title)
        self.assertIn("jitter", conversation.content)
        self.assertIn("@alice", conversation.content)

    def test_capture_is_idempotent(self):
        """GitHub re-delivers webhooks; a second delivery must not duplicate."""
        thread = [
            _human("alice",
                   "I'd rather not add another dependency here — we already pull "
                   "in two HTTP clients and this would make a third, all with "
                   "their own timeout semantics."),
            _human("bob",
                   "Fair, but the hand-rolled loop has no jitter, so every client "
                   "retries in lockstep and we hammer the service exactly when "
                   "it is trying to recover."),
        ]
        first = self._capture_with(comments=list(thread))
        self.assertIsNotNone(first)

        second = self._capture_with(comments=list(thread))
        self.assertIsNone(second)
        self.assertEqual(
            Conversation.objects.filter(external_id="77:12").count(), 1
        )

    # -- the cases that must stay silent -----------------------------------

    def test_rubber_stamped_pr_is_not_captured(self):
        self.assertIsNone(self._capture_with(comments=[
            _human("alice", "LGTM"), _human("bob", "ship it"),
        ]))
        self.assertEqual(Conversation.objects.count(), 0)

    def test_bot_only_discussion_is_not_captured(self):
        """A dependabot PR with a Vercel preview is not institutional memory."""
        self.assertIsNone(self._capture_with(comments=[
            {"user": {"login": "dependabot[bot]", "type": "Bot"},
             "body": "Bumps pillow from 10.0.1 to 10.2.0. " * 12,
             "path": "", "created_at": "2026-08-05T09:00:00Z"},
            {"user": {"login": "vercel[bot]", "type": "Bot"},
             "body": "The latest updates on your projects. " * 12,
             "path": "", "created_at": "2026-08-05T09:01:00Z"},
        ]))
        self.assertEqual(Conversation.objects.count(), 0)

    def test_single_substantive_comment_is_not_enough(self):
        """One person explaining themselves is a note, not a discussion."""
        self.assertIsNone(self._capture_with(comments=[
            _human("alice",
                   "Swapping this out because the hand-rolled backoff has no "
                   "jitter and clients retry in lockstep on recovery."),
        ]))
        self.assertEqual(Conversation.objects.count(), 0)
        self.assertGreater(MIN_SUBSTANTIVE_COMMENTS, 1)

    def test_empty_discussion_is_not_captured(self):
        self.assertIsNone(self._capture_with())
        self.assertEqual(Conversation.objects.count(), 0)

    def test_one_failing_endpoint_does_not_lose_the_rest(self):
        def fake_get(path, installation_id=None, params=None):
            if path.endswith("/reviews"):
                raise RuntimeError("GitHub is having a moment")
            if "/pulls/" in path and path.endswith("/comments"):
                return _Resp([])
            return _Resp([
                _human("alice",
                       "I'd rather not add another dependency here — we already "
                       "pull in two HTTP clients and this would make a third, "
                       "each with its own timeout semantics."),
                _human("bob",
                       "Fair, but the hand-rolled loop has no jitter, so every "
                       "client retries in lockstep and we hammer the service "
                       "exactly when it is trying to recover."),
            ])

        with patch("apps.integrations.github_pr_capture.github_get", side_effect=fake_get):
            conversation = maybe_capture_pr_discussion(
                installation=self.installation, repo=self.repo, pr=self.pr
            )
        self.assertIsNotNone(conversation)

    # -- transcript ---------------------------------------------------------

    def test_transcript_attributes_each_speaker_and_keeps_the_link(self):
        transcript = _build_transcript(self.pr, [
            _human("alice", "First point about retries.", path="client.py"),
            _human("bob", "Second point about jitter."),
        ])
        self.assertIn("https://github.com/acme/widgets/pull/12", transcript)
        self.assertIn("**@alice** on `client.py`:", transcript)
        self.assertIn("**@bob**:", transcript)
        self.assertIn("> First point about retries.", transcript)
