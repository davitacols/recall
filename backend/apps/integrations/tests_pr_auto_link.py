"""Tests for the decision↔PR match classifier.

Auto-linking writes to the record without being asked, so the bar is higher
than for a suggestion. These tests pin the rule that keeps that honest: a
match must clear a floor *and* beat the runner-up by a margin.

The margin is the part that matters. Score grows with the number of
overlapping words, so a workspace with 200 decisions offers far more chance
for an accidental overlap than one with 8. A fixed cutoff alone would get
less safe as a customer's corpus grows, which is exactly backwards — hence
test_crowded_corpus_does_not_auto_link, which is the regression this design
exists to prevent.
"""

from django.test import TestCase

from apps.conversations.models import Conversation
from apps.decisions.models import Decision
from apps.integrations.github_pr_suggest import (
    AUTO_LINK_MARGIN,
    AUTO_LINK_MIN_SCORE,
    MIN_SCORE,
    classify_match,
    rank_decisions_for_pr,
)
from apps.organizations.models import Organization, User


class MatchClassifierTests(TestCase):
    def setUp(self):
        self.org = Organization.objects.create(name="Match QA", slug="match-qa")
        self.user = User.objects.create_user(
            username="match_user", email="match@example.com", password="pass1234",
            organization=self.org, role="admin",
        )
        self.conversation = Conversation.objects.create(
            organization=self.org, author=self.user, post_type="update",
            title="seed", content="seed", ai_processed=True,
        )

    def _decision(self, title, rationale=""):
        return Decision.objects.create(
            organization=self.org, conversation=self.conversation, title=title,
            description="", decision_maker=self.user, status="proposed",
            rationale=rationale,
        )

    # -- the confident case ------------------------------------------------

    def test_distinctive_match_is_auto_linked(self):
        target = self._decision("Migrate the reporting pipeline to GraphQL")
        self._decision("Standup moved to 09:30")
        self._decision("Adopt Kubernetes for staging")

        pr = {"title": "Migrate the reporting pipeline to GraphQL",
              "body": "", "head": {"ref": "graphql-reporting"}}
        decision, score, runner_up, verdict = classify_match(pr, list(Decision.objects.all()))

        self.assertEqual(verdict, "auto")
        self.assertEqual(decision.id, target.id)
        self.assertGreaterEqual(score, AUTO_LINK_MIN_SCORE)
        self.assertGreaterEqual(score, runner_up * AUTO_LINK_MARGIN)

    # -- the case the margin rule exists for -------------------------------

    def test_near_tie_is_suggested_not_linked(self):
        """Two decisions sharing the PR's vocabulary must not be guessed between."""
        self._decision("Migrate the billing service to GraphQL")
        self._decision("Migrate the billing service to gRPC")

        pr = {"title": "Migrate the billing service", "body": "", "head": {"ref": "billing"}}
        decision, score, runner_up, verdict = classify_match(pr, list(Decision.objects.all()))

        self.assertEqual(verdict, "suggest")
        self.assertIsNotNone(decision)
        self.assertLess(score, runner_up * AUTO_LINK_MARGIN)

    def test_crowded_corpus_does_not_auto_link_on_shared_vocabulary(self):
        """A fixed score floor alone would fail this; the margin rule saves it.

        Every decision here shares the PR's generic project words, so the top
        score is high in absolute terms while meaning nothing.
        """
        for n in range(12):
            self._decision(f"Improve the reporting dashboard performance for team {n}")

        pr = {"title": "Improve the reporting dashboard performance",
              "body": "", "head": {"ref": "reporting-dashboard-performance"}}
        _, score, runner_up, verdict = classify_match(pr, list(Decision.objects.all()))

        self.assertGreaterEqual(score, AUTO_LINK_MIN_SCORE,
                                "precondition: the floor alone would have passed")
        self.assertEqual(verdict, "suggest")

    # -- silence ------------------------------------------------------------

    def test_dependency_bump_matches_nothing(self):
        self._decision("Migrate the reporting pipeline to GraphQL")
        pr = {"title": "Bump pillow from 10.0.1 to 10.2.0",
              "body": "Dependabot automated update.",
              "head": {"ref": "dependabot/pip/pillow"}}
        decision, score, _, verdict = classify_match(pr, list(Decision.objects.all()))

        self.assertEqual(verdict, "none")
        self.assertIsNone(decision)
        self.assertLess(score, MIN_SCORE)

    def test_empty_pr_text_matches_nothing(self):
        self._decision("Migrate the reporting pipeline to GraphQL")
        decision, _, _, verdict = classify_match(
            {"title": "", "body": "", "head": {"ref": ""}}, list(Decision.objects.all())
        )
        self.assertEqual(verdict, "none")
        self.assertIsNone(decision)

    def test_no_decisions_at_all_is_silent(self):
        pr = {"title": "Migrate to GraphQL", "body": "", "head": {"ref": "graphql"}}
        decision, _, _, verdict = classify_match(pr, [])
        self.assertEqual(verdict, "none")
        self.assertIsNone(decision)

    def test_stopwords_alone_never_match(self):
        """'Add', 'fix', 'update' are how half of all PR titles start."""
        self._decision("Fix the update")
        pr = {"title": "Add a fix and update the tests", "body": "", "head": {"ref": "fix"}}
        _, _, _, verdict = classify_match(pr, list(Decision.objects.all()))
        self.assertEqual(verdict, "none")

    # -- ranking ------------------------------------------------------------

    def test_ranking_is_ordered_best_first(self):
        self._decision("Migrate the reporting pipeline to GraphQL")
        self._decision("GraphQL rate limiting")
        self._decision("Standup moved to 09:30")

        ranked = rank_decisions_for_pr(
            {"title": "Migrate the reporting pipeline to GraphQL", "body": "",
             "head": {"ref": ""}},
            list(Decision.objects.all()),
        )
        scores = [s for _, s in ranked]
        self.assertEqual(scores, sorted(scores, reverse=True))
        # The unrelated decision shares no terms and must not appear at all.
        self.assertNotIn("Standup moved to 09:30", [d.title for d, _ in ranked])

    def test_rationale_contributes_but_title_dominates(self):
        by_title = self._decision("Postgres partitioning strategy")
        self._decision("Unrelated title", rationale="We discussed postgres partitioning at length")

        ranked = rank_decisions_for_pr(
            {"title": "Postgres partitioning strategy", "body": "", "head": {"ref": ""}},
            list(Decision.objects.all()),
        )
        self.assertEqual(ranked[0][0].id, by_title.id)
