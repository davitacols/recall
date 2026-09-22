#!/usr/bin/env python
import os
import sys


def _is_test_run(argv):
    return len(argv) > 1 and argv[1] == 'test'


def _has_explicit_settings(argv):
    return any(arg.startswith('--settings') for arg in argv)


def configure_settings(argv, environ):
    """Point Django at the right settings module.

    Test runs default to config.settings_test. Under config.settings the suite
    reports 16 failures that have nothing to do with the code: SECURE_SSL_REDIRECT
    is on, so SecurityMiddleware answers every test-client request with a 301 and
    every assertion on a 200 fails. The suite is green under the test settings and
    always has been — but `python manage.py test`, the command anyone types and CI
    would run, reported a broken codebase. A default that is wrong for the most
    common use is worse than no default.

    For test runs this overrides DJANGO_SETTINGS_MODULE rather than deferring to
    it. The variable is set to config.settings in the container image for the
    server process, and inheriting it is an accident of where the command runs,
    not a statement about how tests should execute. An explicit --settings on the
    command line is real intent and still wins.
    """
    if _has_explicit_settings(argv):
        # Django parses the flag and sets the variable itself. Writing one here
        # first would work, but leaving the environment untouched keeps a single
        # source of truth when someone has been explicit.
        return
    if _is_test_run(argv):
        environ['DJANGO_SETTINGS_MODULE'] = 'config.settings_test'
        return
    environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')


if __name__ == '__main__':
    configure_settings(sys.argv, os.environ)
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)
