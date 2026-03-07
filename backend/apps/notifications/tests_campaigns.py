from unittest.mock import patch

from django.test import TestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.organizations.models import Organization, User
from .campaign_views import unsubscribe_marketing
from .models import EmailCampaign, EmailCampaignRecipient
from .tasks import send_marketing_campaign


class MarketingCampaignTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.org = Organization.objects.create(name='Campaign Org', slug='campaign-org')
        self.admin = User.objects.create_user(
            username='campaign-admin',
            email='campaign-admin@example.com',
            password='pass',
            organization=self.org,
            role='admin',
            marketing_opt_in=True,
        )
        self.opted_in = User.objects.create_user(
            username='opted-in-user',
            email='opted-in@example.com',
            password='pass',
            organization=self.org,
            role='contributor',
            marketing_opt_in=True,
        )
        self.opted_out = User.objects.create_user(
            username='opted-out-user',
            email='opted-out@example.com',
            password='pass',
            organization=self.org,
            role='contributor',
            marketing_opt_in=False,
        )

    def test_campaign_sends_only_to_opted_in_users(self):
        campaign = EmailCampaign.objects.create(
            organization=self.org,
            created_by=self.admin,
            name='Launch',
            subject='Big feature launch',
            preheader='New rollout',
            body_html='<p>We shipped it.</p>',
            cta_label='See updates',
            cta_url='/updates',
            segment='all_opted_in',
            status='draft',
        )

        with patch('apps.notifications.tasks.send_email', return_value=True) as mock_send:
            send_marketing_campaign(campaign.id)

        emails_sent = [call.args[0] for call in mock_send.call_args_list]
        self.assertIn(self.opted_in.email, emails_sent)
        self.assertNotIn(self.opted_out.email, emails_sent)

        campaign.refresh_from_db()
        self.assertEqual(campaign.status, 'sent')
        self.assertEqual(campaign.sent_count, 2)  # admin + opted_in
        self.assertEqual(
            EmailCampaignRecipient.objects.filter(campaign=campaign, status='sent').count(),
            2,
        )

    def test_unsubscribe_endpoint_turns_off_marketing(self):
        self.assertTrue(self.opted_in.marketing_opt_in)
        request = self.factory.get(f'/api/notifications/unsubscribe/{self.opted_in.marketing_unsubscribe_token}/')
        response = unsubscribe_marketing(request, self.opted_in.marketing_unsubscribe_token)
        self.assertEqual(response.status_code, 200)

        self.opted_in.refresh_from_db()
        self.assertFalse(self.opted_in.marketing_opt_in)
        self.assertIsNotNone(self.opted_in.marketing_unsubscribed_at)
