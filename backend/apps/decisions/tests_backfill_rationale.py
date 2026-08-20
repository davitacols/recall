"""Tests for the rationale backfill.

The command writes to live decision records, so the properties that matter are
the ones that stop it doing harm: never overwrite, never invent, and never
attempt a decision with nothing to read.

The regression these were written for: the first version read only
decision.conversation.content and reported everything else as needing a person.
Decisions drafted from /decisions/new have no conversation by definition, yet
their description usually states the reason outright - so the command wrote off
the majority of the blanks it was built to fix.

generate_decision_rationale is patched throughout. It calls a model API, and a
test that reaches a third party is not a test.
"""

from unittest.mock import patch

from django.core.management import call_command
from django.test import TestCase
from io import StringIO

from apps.conversations.models import Conversation
from apps.decisions.management.commands.backfill_rationale import collect_source
from apps.decisions.models import Decision
from apps.organizations.models import Organization, User

TARGET = "apps.decisions.management.commands.backfill_rationale.generate_decision_rationale"


class BackfillRationaleTests(TestCase):
    def setUp(self):
        self.org = Organization.objects.create(name="Backfill Org", slug="backfill-org")
        self.user = User.objects.create_user(
            username="backfill_user", email="backfill@example.com", password="pass1234",
            organization=self.org, role="admin",
        )

    def _conversation(self, content):
        return Conversation.objects.create(
            organization=self.org, author=self.user, post_type="update",
            title="source", content=content, ai_processed=True,
        )

    def _decision(self, title="A decision", rationale="", description="",
                  conversation=None, **extra):
        return Decision.objects.create(
            organization=self.org, conversation=conversation, title=title,
            description=description, decision_maker=self.user, status="proposed",
            rationale=rationale, **extra,
        )

    def _run(self, **kwargs):
        out = StringIO()
        call_command("backfill_rationale", stdout=out, sleep=0, **kwargs)
        return out.getvalue()

    # ---------------------------------------------------------------- sources

    def test_description_alone_is_a_readable_source(self):
        """The regression: no conversation must not mean no source."""
        decision = self._decision(description="We picked Postgres for its JSON support.")

        text, labels = collect_source(decision)

        self.assertIn("Postgres", text)
        self.assertEqual(labels, "description")

    def test_conversation_and_description_are_both_collected(self):
        decision = self._decision(
            description="Short note.",
            conversation=self._conversation("The long argument about retries."),
        )

        text, labels = collect_source(decision)

        self.assertIn("retries", text)
        self.assertIn("Short note.", text)
        self.assertEqual(labels, "discussion+description")

    def test_extra_fields_are_collected(self):
        decision = self._decision(
            description="", context_reason="The vendor deprecated the old API.",
            tradeoffs="Slower writes, simpler reads.",
        )

        text, labels = collect_source(decision)

        self.assertIn("deprecated", text)
        self.assertIn("Slower writes", text)
        self.assertEqual(labels, "context+tradeoffs")

    def test_html_is_flattened_before_extraction(self):
        decision = self._decision(
            conversation=self._conversation("<p>First para.</p><p>Second para.</p>"),
        )

        text, _ = collect_source(decision)

        self.assertNotIn("<p>", text)
        self.assertIn("First para. Second para.", text)

    def test_a_decision_with_nothing_to_read_yields_no_source(self):
        decision = self._decision(description="")

        text, labels = collect_source(decision)

        self.assertEqual(text, "")
        self.assertEqual(labels, "")

    # ---------------------------------------------------------------- writing

    @patch(TARGET, return_value="Because the retry loop had no jitter.")
    def test_fills_a_blank_rationale(self, _mock):
        decision = self._decision(description="We added jitter to the retry loop.")

        self._run()

        decision.refresh_from_db()
        self.assertEqual(decision.rationale, "Because the retry loop had no jitter.")

    @patch(TARGET, return_value="Newly invented reasoning.")
    def test_never_overwrites_an_existing_rationale(self, mock):
        decision = self._decision(
            rationale="The original why.", description="Some description.",
        )

        self._run()

        decision.refresh_from_db()
        self.assertEqual(decision.rationale, "The original why.")
        mock.assert_not_called()

    @patch(TARGET, return_value="Should not be written.")
    def test_whitespace_rationale_counts_as_blank(self, _mock):
        """Must match the dashboard's definition, or the two disagree."""
        decision = self._decision(
            rationale="   \n\t ", description="We chose it for the JSON support.",
        )

        self._run()

        decision.refresh_from_db()
        self.assertEqual(decision.rationale, "Should not be written.")

    @patch(TARGET, return_value="")
    def test_leaves_the_field_alone_when_there_is_no_reasoning(self, _mock):
        """An empty return means the source stated no reason. Do not invent."""
        decision = self._decision(description="Standup is at 9:30.")

        output = self._run()

        decision.refresh_from_db()
        self.assertEqual(decision.rationale, "")
        self.assertIn("no reasoning", output)

    @patch(TARGET, return_value="Extracted reasoning.")
    def test_dry_run_writes_nothing(self, _mock):
        decision = self._decision(description="We chose it for the JSON support.")

        output = self._run(dry_run=True)

        decision.refresh_from_db()
        self.assertEqual(decision.rationale, "")
        self.assertIn("DRY RUN", output)

    @patch(TARGET, return_value="Extracted reasoning.")
    def test_reports_decisions_that_need_a_person(self, _mock):
        self._decision(title="No source at all", description="")

        output = self._run()

        self.assertIn("need a person", output)

    @patch(TARGET, return_value="Extracted reasoning.")
    def test_is_idempotent(self, mock):
        self._decision(description="We chose it for the JSON support.")

        self._run()
        self._run()

        self.assertEqual(mock.call_count, 1, "a filled decision must not be re-read")

    @patch(TARGET, return_value="Extracted reasoning.")
    def test_org_filter_leaves_other_workspaces_alone(self, _mock):
        other_org = Organization.objects.create(name="Other", slug="other-org")
        other_user = User.objects.create_user(
            username="other_backfill", email="other@example.com", password="pass1234",
            organization=other_org, role="admin",
        )
        theirs = Decision.objects.create(
            organization=other_org, title="Their decision",
            description="They chose it for the JSON support.",
            decision_maker=other_user, status="proposed", rationale="",
        )
        mine = self._decision(description="We chose it for the JSON support.")

        self._run(org=self.org.id)

        theirs.refresh_from_db()
        mine.refresh_from_db()
        self.assertEqual(theirs.rationale, "")
        self.assertEqual(mine.rationale, "Extracted reasoning.")
