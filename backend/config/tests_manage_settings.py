"""Tests for the settings-module selection in manage.py.

This logic runs before Django is configured, so it is the one thing the suite
cannot verify by simply passing: if it regresses, the tests either stop running
or silently run under production settings and report failures that are not real.
That is the state this code exists to prevent, and it went unnoticed for long
enough to be reported as "the test suite is broken".
"""

import sys
from pathlib import Path

from django.test import SimpleTestCase

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from manage import configure_settings  # noqa: E402


class SettingsSelectionTests(SimpleTestCase):
    def test_test_run_uses_test_settings(self):
        env = {}
        configure_settings(["manage.py", "test"], env)
        self.assertEqual(env["DJANGO_SETTINGS_MODULE"], "config.settings_test")

    def test_test_run_overrides_inherited_production_setting(self):
        """The container exports config.settings for the server process.

        Deferring to it would make the default a no-op in the one environment
        where the suite actually runs.
        """
        env = {"DJANGO_SETTINGS_MODULE": "config.settings"}
        configure_settings(["manage.py", "test"], env)
        self.assertEqual(env["DJANGO_SETTINGS_MODULE"], "config.settings_test")

    def test_explicit_settings_flag_wins(self):
        for flag in ("--settings=config.settings", "--settings", "--settings=custom.mod"):
            env = {}
            configure_settings(["manage.py", "test", flag], env)
            self.assertNotIn(
                "DJANGO_SETTINGS_MODULE", env,
                f"{flag!r} should be left for Django to read",
            )

    def test_test_label_arguments_do_not_change_the_choice(self):
        env = {}
        configure_settings(["manage.py", "test", "apps.integrations", "-v", "2"], env)
        self.assertEqual(env["DJANGO_SETTINGS_MODULE"], "config.settings_test")

    # -- everything that is not a test run --------------------------------

    def test_other_commands_use_production_settings(self):
        for command in ("runserver", "migrate", "shell", "collectstatic"):
            env = {}
            configure_settings(["manage.py", command], env)
            self.assertEqual(
                env["DJANGO_SETTINGS_MODULE"], "config.settings",
                f"{command} must not run under test settings",
            )

    def test_other_commands_respect_the_environment(self):
        """migrate in the container must keep using what the image exported."""
        env = {"DJANGO_SETTINGS_MODULE": "config.settings_custom"}
        configure_settings(["manage.py", "migrate"], env)
        self.assertEqual(env["DJANGO_SETTINGS_MODULE"], "config.settings_custom")

    def test_bare_invocation_does_not_select_test_settings(self):
        env = {}
        configure_settings(["manage.py"], env)
        self.assertEqual(env["DJANGO_SETTINGS_MODULE"], "config.settings")

    def test_a_command_merely_containing_test_is_not_a_test_run(self):
        """Guards against matching on substring rather than the command."""
        env = {}
        configure_settings(["manage.py", "testserver"], env)
        self.assertEqual(env["DJANGO_SETTINGS_MODULE"], "config.settings")
