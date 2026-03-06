from unittest.mock import patch

from django.test import TestCase

from apps.organizations.models import Organization, User
from .models import Notification
from .tasks import send_notification_digest, send_notification_email


class NotificationTaskTests(TestCase):
    def setUp(self):
        self.dispatch_patcher = patch('apps.notifications.signals.dispatch_notification')
        self.dispatch_patcher.start()
        self.org = Organization.objects.create(name='Notify Org', slug='notify-org')
        self.user = User.objects.create_user(
            username='notify-user',
            email='notify-user@example.com',
            password='pass',
            organization=self.org,
            role='contributor',
            email_notifications=True,
            digest_frequency='daily',
        )

    def tearDown(self):
        self.dispatch_patcher.stop()

    def test_realtime_notifications_send_immediately(self):
        self.user.digest_frequency = 'realtime'
        self.user.save(update_fields=['digest_frequency'])
        notification = Notification.objects.create(
            user=self.user,
            notification_type='decision',
            title='Decision updated',
            message='A decision changed.',
            link='/decisions/10',
        )

        with patch('apps.notifications.tasks.send_notification_email_via_resend') as mock_send:
            send_notification_email(notification.id)
            mock_send.assert_called_once_with(self.user, notification)

    def test_non_realtime_notifications_do_not_send_immediately(self):
        self.user.digest_frequency = 'daily'
        self.user.save(update_fields=['digest_frequency'])
        notification = Notification.objects.create(
            user=self.user,
            notification_type='decision',
            title='Decision updated',
            message='A decision changed.',
            link='/decisions/11',
        )

        with patch('apps.notifications.tasks.send_notification_email_via_resend') as mock_send:
            send_notification_email(notification.id)
            mock_send.assert_not_called()

    def test_digest_email_contains_item_deep_links(self):
        Notification.objects.create(
            user=self.user,
            notification_type='decision',
            title='Decision 1',
            message='First update',
            link='/decisions/21',
        )
        Notification.objects.create(
            user=self.user,
            notification_type='task',
            title='Task 1',
            message='Task moved',
            link='/issues/33',
        )

        with patch('apps.notifications.tasks.send_email') as mock_send_email:
            send_notification_digest(self.user.id, 'daily')

            self.assertTrue(mock_send_email.called)
            call_args = mock_send_email.call_args
            html = call_args.args[2]
            text = call_args.kwargs.get('text_content', '')

            self.assertIn('/decisions/21', html)
            self.assertIn('/issues/33', html)
            self.assertIn('Open:', text)

    def test_digest_uses_batch_summary_when_engine_groups_items(self):
        n1 = Notification.objects.create(
            user=self.user,
            notification_type='decision',
            title='Decision A',
            message='Update A',
            link='/decisions/31',
        )
        n2 = Notification.objects.create(
            user=self.user,
            notification_type='task',
            title='Task B',
            message='Update B',
            link='/issues/41',
        )

        batch_payload = [{
            'type': 'batch',
            'count': 2,
            'items': [n1, n2],
            'summary': 'You have 2 bundled updates',
        }]

        with patch('apps.organizations.automation_engine.SmartNotificationEngine.batch_notifications', return_value=batch_payload):
            with patch('apps.notifications.tasks.send_email') as mock_send_email:
                send_notification_digest(self.user.id, 'daily')
                html = mock_send_email.call_args.args[2]
                text = mock_send_email.call_args.kwargs.get('text_content', '')
                self.assertIn('You have 2 bundled updates', html)
                self.assertIn('You have 2 bundled updates', text)
