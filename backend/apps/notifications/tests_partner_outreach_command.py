from io import StringIO
from unittest.mock import patch

from django.core.management import call_command
from django.test import SimpleTestCase

from apps.notifications.management.commands.send_partner_outreach import (
    build_partner_outreach_payload,
)


class PartnerOutreachCommandTests(SimpleTestCase):
    def test_build_partner_outreach_payload_personalizes_company(self):
        payload = build_partner_outreach_payload("525 System")

        self.assertIn("525 System", payload["subject"])
        self.assertIn("525 System", payload["html"])
        self.assertIn("525 System", payload["text"])

    @patch("apps.notifications.management.commands.send_partner_outreach.send_email", return_value=True)
    def test_command_sends_email(self, mock_send_email):
        stdout = StringIO()

        call_command(
            "send_partner_outreach",
            "--to",
            "admin@525system.com",
            "--company",
            "525 System",
            stdout=stdout,
        )

        self.assertTrue(mock_send_email.called)
        self.assertIn("Sent outreach email", stdout.getvalue())
