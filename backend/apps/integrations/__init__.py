"""GitHub, Slack and webhook integrations.

This file is not incidental. Without it the directory is a namespace package:
Django imports it and everything works in production, but unittest's test
discovery only recurses into regular packages, so `manage.py test` walked past
the whole app in silence.

The result was 85 tests — the GitHub App permission gate, cross-tenant
isolation, PR capture, auto-linking, decision-to-file attribution — that ran
only when the app was named explicitly, and never once in CI. The suite was
green and the label was accurate; the tests simply were not in it.
"""
