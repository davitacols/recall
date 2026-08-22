"""The seeded marketplace apps must describe code that exists.

Three first-party apps are seeded into every environment, and the interface
puts an Install button beside each one. Installing records a row and changes
nothing else, so the description is the only thing telling an admin what they
are getting.

They used to promise capabilities nobody had built. Jira Portfolio Bridge
offered cross-project rollups, dependency views and execution drift alerts;
what exists is a one-way push turning a blocker into a Jira issue. An admin
could install it, see a success message, and reasonably conclude their
workspace had portfolio rollups.
"""

from django.test import TestCase

from apps.organizations.enterprise_views import (
    DEFAULT_MARKETPLACE_APPS,
    ensure_default_marketplace_apps,
)
from apps.organizations.enterprise_models import MarketplaceApp

#: Words that promise a capability none of these apps has. Each was in a
#: shipped description.
OVERSTATED = (
    "rollup",
    "dependency view",
    "drift alert",
    "on-call",
    "release sync",
    "commit sync",
    "delivery timeline",
    "deep ",
)


class MarketplaceHonestyTests(TestCase):
    def test_no_listing_promises_something_unbuilt(self):
        for app in DEFAULT_MARKETPLACE_APPS:
            blob = f"{app['name']} {app['description']}".lower()
            for phrase in OVERSTATED:
                self.assertNotIn(
                    phrase, blob,
                    f"{app['slug']} claims '{phrase.strip()}', which nothing implements",
                )

    def test_every_listing_points_somewhere_real(self):
        """A launch path that lands on a generic page teaches nothing."""
        for app in DEFAULT_MARKETPLACE_APPS:
            self.assertTrue(
                app["launch_path"].startswith("/integrations"),
                f"{app['slug']} launches to {app['launch_path']}, "
                "which is not where it is configured",
            )

    def test_seeding_updates_existing_rows(self):
        """Otherwise a corrected description never reaches a live workspace."""
        MarketplaceApp.objects.create(
            slug="jira-portfolio-bridge",
            name="Jira Portfolio Bridge",
            description="Cross-project rollups, dependency views, and execution drift alerts.",
            vendor="Knoledgr",
            category="reporting",
            pricing="included",
            is_active=True,
        )

        ensure_default_marketplace_apps()

        app = MarketplaceApp.objects.get(slug="jira-portfolio-bridge")
        self.assertNotIn("rollup", app.description.lower())
        self.assertIn("Jira issue", app.name)

    def test_seeding_is_idempotent(self):
        ensure_default_marketplace_apps()
        ensure_default_marketplace_apps()

        self.assertEqual(
            MarketplaceApp.objects.filter(
                slug__in=[a["slug"] for a in DEFAULT_MARKETPLACE_APPS]
            ).count(),
            len(DEFAULT_MARKETPLACE_APPS),
        )
