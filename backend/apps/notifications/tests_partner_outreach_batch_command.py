from io import StringIO
from unittest.mock import patch

from django.core.management import call_command
from django.test import SimpleTestCase


class PartnerOutreachBatchCommandTests(SimpleTestCase):
    @patch("apps.notifications.management.commands.send_partner_outreach_batch.send_email", return_value=True)
    def test_batch_command_sends_csv_rows(self, mock_send_email):
        stdout = StringIO()

        call_command(
            "send_partner_outreach_batch",
            "--csv",
            "outreach/partner_targets.csv",
            "--limit",
            "2",
            stdout=stdout,
        )

        self.assertEqual(mock_send_email.call_count, 2)
        self.assertIn("Sent outreach email", stdout.getvalue())

    def test_batch_command_dry_run_prints_targets(self):
        stdout = StringIO()

        call_command(
            "send_partner_outreach_batch",
            "--csv",
            "outreach/partner_targets.csv",
            "--limit",
            "2",
            "--dry-run",
            stdout=stdout,
        )

        output = stdout.getvalue()
        self.assertIn("[DRY RUN]", output)
        self.assertIn("thoughtbot", output)

