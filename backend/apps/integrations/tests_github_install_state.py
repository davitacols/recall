"""The GitHub install CSRF state must survive crossing a process boundary.

The state used to live in a module-level dict. Production runs gunicorn with
3 workers, so install-url/ and callback/ are almost never handled by the same
process: the state was written into one worker's memory and looked up in
another's. A legitimate install failed with "Install state did not match"
roughly two times in three, and retrying only re-rolled the dice.

A single-process test suite cannot see that bug by calling the two endpoints in
sequence - they share memory, so it passes either way. These tests instead
assert the property that was actually missing: the state is readable from the
shared cache rather than from the module, and clearing what a worker holds in
memory does not lose it.
"""

from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.integrations import github_app_views as views
from apps.organizations.models import Organization, User


@override_settings(TURNSTILE_ENABLED=False)
class InstallStateTests(TestCase):
    def setUp(self):
        cache.clear()
        self.org = Organization.objects.create(name="State Org", slug="state-org")
        self.user = User.objects.create_user(
            username="state_user",
            email="user@state.test",
            password="pass1234",
            organization=self.org,
            role="admin",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_state_is_stored_in_the_shared_cache_not_in_module_memory(self):
        views._put_state("token-abc", self.user.id, self.org.id)

        self.assertIsNotNone(
            cache.get(views._state_key("token-abc")),
            "state must be in the shared cache so every worker can read it",
        )
        self.assertFalse(
            hasattr(views, "_install_states"),
            "the per-process dict must be gone, not merely bypassed",
        )

    def test_state_survives_a_reader_with_no_local_memory(self):
        """Stand in for the callback landing on a different gunicorn worker."""
        views._put_state("token-xyz", self.user.id, self.org.id)

        record = views._pop_state("token-xyz")

        self.assertIsNotNone(record)
        self.assertEqual(record["user_id"], self.user.id)
        self.assertEqual(record["org_id"], self.org.id)

    def test_state_is_single_use(self):
        views._put_state("token-once", self.user.id, self.org.id)

        self.assertIsNotNone(views._pop_state("token-once"))
        self.assertIsNone(
            views._pop_state("token-once"),
            "a replayed state token must not validate a second time",
        )

    def test_unknown_state_returns_none(self):
        self.assertIsNone(views._pop_state("never-issued"))

    def test_callback_rejects_a_state_this_user_did_not_issue(self):
        other = User.objects.create_user(
            username="other_user",
            email="other@state.test",
            password="pass1234",
            organization=self.org,
            role="member",
        )
        views._put_state("token-theirs", other.id, self.org.id)

        response = self.client.post(
            "/api/integrations/github/app/callback/",
            {"installation_id": 12345, "state": "token-theirs"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("did not match", response.data["error"])

    def test_callback_still_requires_a_state(self):
        response = self.client.post(
            "/api/integrations/github/app/callback/",
            {"installation_id": 12345},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("Missing install state", response.data["error"])
