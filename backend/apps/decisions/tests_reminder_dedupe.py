"""Tests that the overdue-outcome sweep does not re-notify every morning.

The sweep runs daily. Its dedupe check asked whether a DecisionOutcomeCheck
existed for the prediction in the last 7 days — "did a human log an outcome?"
rather than "did we already ask?" — and the queryset feeding the loop already
excluded predictions with an observation in the last 14 days, so the condition
could never be true. Nothing was ever skipped.

The result in production was one decision reminder repeated 24 times, and a
third of every notification in the workspace being a duplicate. That is how a
notification bell becomes something people stop opening, which costs far more
than the reminder was worth.

The failure was silent: the task completed successfully every run, and the
count it returned went up rather than down.
"""

from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from apps.conversations.models import Conversation
from apps.decisions.intelligence_models import DecisionPrediction
from apps.decisions.models import Decision
from apps.decisions.tasks import decision_intelligence_sweep
from apps.notifications.models import Notification
from apps.organizations.models import Organization, User


class OverdueReminderDedupeTests(TestCase):
    def setUp(self):
        self.org = Organization.objects.create(name="Sweep QA", slug="sweep-qa")
        self.user = User.objects.create_user(
            username="sweep_user", email="sweep@example.com", password="pass1234",
            organization=self.org, role="admin",
        )
        self.conversation = Conversation.objects.create(
            organization=self.org, author=self.user, post_type="update",
            title="seed conversation", content="seed content", ai_processed=True,
        )
        self.decision = Decision.objects.create(
            organization=self.org, conversation=self.conversation,
            title="Ship the two-stage pipeline", description="",
            decision_maker=self.user, status="approved", rationale="Because.",
        )
        # Due a fortnight ago and never checked — exactly the state that made
        # the sweep notify on every run.
        self.prediction = DecisionPrediction.objects.create(
            organization=self.org,
            decision=self.decision,
            dimension="latency",
            statement="p95 stays under 200ms",
            check_at=(timezone.now() - timedelta(days=14)).date(),
        )

    def _reminders(self):
        return Notification.objects.filter(
            user=self.user, notification_type="reminder",
            link=f"/decisions/{self.decision.id}",
        )

    def test_first_sweep_notifies(self):
        decision_intelligence_sweep()
        self.assertEqual(self._reminders().count(), 1)

    def test_running_daily_for_a_week_notifies_once(self):
        """The regression itself: seven runs used to produce seven copies."""
        for _ in range(7):
            decision_intelligence_sweep()
        self.assertEqual(
            self._reminders().count(), 1,
            "a daily sweep must not re-notify an unanswered reminder",
        )

    def test_reminder_repeats_after_the_window_lapses(self):
        """Dedupe must suppress noise, not silence the reminder permanently."""
        decision_intelligence_sweep()
        self.assertEqual(self._reminders().count(), 1)

        stale = timezone.now() - timedelta(days=8)
        self._reminders().update(created_at=stale)

        decision_intelligence_sweep()
        self.assertEqual(
            self._reminders().count(), 2,
            "after 7 days an unanswered outcome check should nudge again",
        )

    def test_dedupe_is_per_user(self):
        """One person having been told must not silence everyone else."""
        other = User.objects.create_user(
            username="sweep_other", email="other@example.com", password="pass1234",
            organization=self.org, role="member",
        )
        Notification.objects.create(
            user=other, notification_type="reminder",
            title="Outcome check overdue: Ship the two-stage pipeline",
            message="earlier", link=f"/decisions/{self.decision.id}",
        )

        decision_intelligence_sweep()

        self.assertEqual(self._reminders().count(), 1)

    def test_unrelated_notifications_do_not_suppress_the_reminder(self):
        """Only a prior reminder for this decision counts as having asked."""
        Notification.objects.create(
            user=self.user, notification_type="task",
            title="Something else", message="unrelated",
            link=f"/decisions/{self.decision.id}",
        )
        decision_intelligence_sweep()
        self.assertEqual(self._reminders().count(), 1)
