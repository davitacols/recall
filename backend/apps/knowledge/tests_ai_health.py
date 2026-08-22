"""Reporting whether the model API is actually answering.

A configuration check cannot tell you this: the key is present and correct
while an exhausted credit balance rejects every request. So the interface used
to offer a question box that accepted a question, spun, and returned an error
reading as though the product were broken.
"""

from django.core.cache import cache
from django.test import TestCase

from apps.knowledge import ai_health


class AiHealthTests(TestCase):
    def setUp(self):
        cache.clear()

    def test_available_by_default(self):
        self.assertTrue(ai_health.get_state()["available"])

    def test_credit_exhaustion_marks_it_unavailable(self):
        ai_health.record_failure(
            "Error code: 400 - your credit balance is too low to access the API"
        )

        state = ai_health.get_state()

        self.assertFalse(state["available"])
        self.assertIn("credit balance", state["reason"].lower())

    def test_bad_key_marks_it_unavailable(self):
        ai_health.record_failure("authentication_error: invalid x-api-key")

        state = ai_health.get_state()

        self.assertFalse(state["available"])
        self.assertIn("key", state["reason"].lower())

    def test_a_transient_failure_is_not_recorded(self):
        """A timeout clears on its own. Warning about it is noise."""
        ai_health.record_failure("Read timed out after 20s")

        self.assertTrue(ai_health.get_state()["available"])

    def test_success_clears_it(self):
        ai_health.record_failure("credit balance is too low")
        self.assertFalse(ai_health.get_state()["available"])

        ai_health.record_success()

        self.assertTrue(ai_health.get_state()["available"])

    def test_the_reason_is_a_sentence_not_a_stack_trace(self):
        ai_health.record_failure(
            "anthropic.BadRequestError: Error code: 400 - {'type': 'error', "
            "'error': {'message': 'Your credit balance is too low'}}"
        )

        reason = ai_health.get_state()["reason"]

        self.assertNotIn("{", reason)
        self.assertTrue(reason.endswith("."))
