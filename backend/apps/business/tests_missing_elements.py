from datetime import timedelta
from unittest.mock import patch

from django.test import TestCase, override_settings
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.organizations.models import Organization, User
from .missing_elements_views import (
    burnout_risk,
    calendar_free_busy,
    calendar_oauth_start,
    journey_maps,
    slot_task,
)
from .models import CalendarConnection, Goal, Meeting, Task


class MissingElementsViewTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.org = Organization.objects.create(name='Biz Org', slug='biz-org')
        self.user = User.objects.create_user(
            username='owner',
            email='owner@example.com',
            password='pass',
            organization=self.org,
            role='admin',
        )
        self.member = User.objects.create_user(
            username='member',
            email='member@example.com',
            password='pass',
            organization=self.org,
            role='contributor',
        )
        self.goal = Goal.objects.create(
            organization=self.org,
            title='Goal 1',
            owner=self.user,
        )

    def test_journey_map_create_and_list(self):
        create_request = self.factory.post(
            '/api/business/journeys/',
            {
                'title': 'Checkout Journey',
                'objective': 'Map drop-off points',
                'map_data': {'nodes': [{'id': 'n1', 'label': 'Landing'}], 'edges': []},
            },
            format='json',
        )
        force_authenticate(create_request, user=self.user)
        create_response = journey_maps(create_request)
        self.assertEqual(create_response.status_code, 201)

        list_request = self.factory.get('/api/business/journeys/')
        force_authenticate(list_request, user=self.user)
        list_response = journey_maps(list_request)
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(len(list_response.data), 1)
        self.assertEqual(list_response.data[0]['title'], 'Checkout Journey')

    def test_slot_task_suggests_time_after_busy_meeting(self):
        task = Task.objects.create(
            organization=self.org,
            title='Prepare QBR deck',
            assigned_to=self.member,
            goal=self.goal,
            priority='high',
        )
        meeting = Meeting.objects.create(
            organization=self.org,
            title='Morning sync',
            meeting_date=timezone.now().replace(hour=9, minute=0, second=0, microsecond=0),
            duration_minutes=120,
            created_by=self.user,
        )
        meeting.attendees.add(self.member)

        start = timezone.now().replace(hour=9, minute=0, second=0, microsecond=0)
        end = start + timedelta(days=1)
        request = self.factory.post(
            '/api/business/calendar/slot-task/',
            {
                'task_id': task.id,
                'duration_minutes': 60,
                'start': start.isoformat(),
                'end': end.isoformat(),
            },
            format='json',
        )
        force_authenticate(request, user=self.user)
        response = slot_task(request)

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['scheduled'])
        suggested_start_raw = response.data['suggested_slot']['start']
        suggested_start = parse_datetime(suggested_start_raw) if isinstance(suggested_start_raw, str) else suggested_start_raw
        self.assertIsNotNone(suggested_start)
        self.assertGreaterEqual(suggested_start, meeting.meeting_date + timedelta(minutes=meeting.duration_minutes))

    def test_calendar_free_busy_includes_external_provider_windows(self):
        CalendarConnection.objects.create(
            organization=self.org,
            user=self.member,
            provider='google',
            is_connected=True,
            external_calendar_id='primary',
            metadata={'access_token': 'token'},
        )

        now = timezone.now()
        external_start = now + timedelta(hours=2)
        external_end = now + timedelta(hours=3)

        request = self.factory.get(
            '/api/business/calendar/free-busy/',
            {
                'user_id': self.member.id,
                'provider': 'google',
                'start': now.isoformat(),
                'end': (now + timedelta(days=1)).isoformat(),
            },
        )
        force_authenticate(request, user=self.user)

        with patch(
            'apps.business.missing_elements_views.fetch_external_busy_windows',
            return_value=[(external_start, external_end)],
        ):
            response = calendar_free_busy(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['provider_used'], 'google')
        self.assertEqual(response.data['counts']['external'], 1)
        self.assertTrue(any(item.get('source') == 'external' for item in response.data['busy']))

    def test_burnout_risk_flags_high_load(self):
        for i in range(30):
            Task.objects.create(
                organization=self.org,
                title=f'Open Task {i}',
                assigned_to=self.member,
                goal=self.goal,
                priority='high',
                due_date=(timezone.now() - timedelta(days=2)).date(),
                status='todo',
            )

        request = self.factory.get('/api/business/team/burnout-risk/?days=14')
        force_authenticate(request, user=self.user)
        response = burnout_risk(request)

        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(response.data['high_risk_count'], 1)
        member_row = next((row for row in response.data['results'] if row['user_id'] == self.member.id), None)
        self.assertIsNotNone(member_row)
        self.assertIn(member_row['risk_level'], {'medium', 'high'})

    @override_settings(GOOGLE_CLIENT_ID='test-google-client-id')
    def test_calendar_oauth_start_returns_authorize_url(self):
        request = self.factory.get('/api/business/calendar/oauth/start/?provider=google')
        force_authenticate(request, user=self.user)
        response = calendar_oauth_start(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['provider'], 'google')
        self.assertIn('accounts.google.com', response.data['authorize_url'])
