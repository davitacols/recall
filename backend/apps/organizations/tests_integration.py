import unittest

# These cases are written against pytest fixtures, but pytest is a dev-only
# dependency (requirements-dev.txt) and is absent from the runtime image. A bare
# `import pytest` made the whole module fail to load, which surfaced as a hard
# suite error rather than an honest "not installed". Skip cleanly instead, so
# `manage.py test` is green without pytest and these run as soon as it is there.
# The guard must cover every dev-only import this module makes, not just the
# first one. It checked pytest alone while the module also needs factory_boy,
# so installing requirements-dev.txt got you past the guard and straight into
# `ModuleNotFoundError: No module named 'factory'` — the hard suite error the
# guard exists to prevent, reachable only by following its own advice.
try:
    import pytest  # noqa: F401
    import factory  # noqa: F401
except ImportError as exc:  # pragma: no cover - depends on the environment
    raise unittest.SkipTest(
        f"{exc.name} not installed; run: pip install -r requirements-dev.txt"
    )

from django.test import TestCase, Client
from rest_framework.test import APIClient
from apps.organizations.factories import (
    OrganizationFactory, UserFactory, ConversationFactory, DecisionFactory
)
from apps.conversations.models import Conversation, ActionItem
from apps.decisions.models import Decision

@pytest.mark.django_db
class TestConversationWorkflow(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.org = OrganizationFactory()
        self.user = UserFactory(organization=self.org)
        self.client.force_authenticate(user=self.user)
    
    def test_create_conversation(self):
        response = self.client.post('/api/recall/conversations/', {
            'title': 'Test Conversation',
            'content': 'This is a test conversation',
            'post_type': 'decision',
            'priority': 'high'
        })
        assert response.status_code == 201
        assert Conversation.objects.count() == 1
    
    def test_add_reply_to_conversation(self):
        conv = ConversationFactory(organization=self.org, author=self.user)
        response = self.client.post(f'/api/recall/conversations/{conv.id}/replies/', {
            'content': 'This is a reply'
        })
        assert response.status_code == 201
        assert conv.replies.count() == 1
    
    def test_create_action_item(self):
        conv = ConversationFactory(organization=self.org, author=self.user)
        response = self.client.post(f'/api/recall/conversations/{conv.id}/action-items/', {
            'title': 'Test Action Item',
            'priority': 'high',
            'due_date': '2024-12-31'
        })
        assert response.status_code == 201
        assert ActionItem.objects.count() == 1

@pytest.mark.django_db
class TestDecisionWorkflow(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.org = OrganizationFactory()
        self.user = UserFactory(organization=self.org)
        self.client.force_authenticate(user=self.user)
    
    def test_create_decision(self):
        conv = ConversationFactory(organization=self.org, author=self.user)
        response = self.client.post('/api/recall/decisions/', {
            'conversation': conv.id,
            'title': 'Test Decision',
            'description': 'This is a test decision',
            'rationale': 'Because we need to',
            'status': 'proposed'
        })
        assert response.status_code == 201
        assert Decision.objects.count() == 1
    
    def test_approve_decision(self):
        dec = DecisionFactory(organization=self.org, decision_maker=self.user)
        response = self.client.patch(f'/api/recall/decisions/{dec.id}/', {
            'status': 'approved'
        })
        assert response.status_code == 200
        dec.refresh_from_db()
        assert dec.status == 'approved'
    
    def test_implement_decision(self):
        dec = DecisionFactory(organization=self.org, decision_maker=self.user, status='approved')
        response = self.client.patch(f'/api/recall/decisions/{dec.id}/', {
            'status': 'implemented'
        })
        assert response.status_code == 200
        dec.refresh_from_db()
        assert dec.status == 'implemented'

@pytest.mark.django_db
class TestSearchWorkflow(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.org = OrganizationFactory()
        self.user = UserFactory(organization=self.org)
        self.client.force_authenticate(user=self.user)
        
        # Create test data
        ConversationFactory(
            organization=self.org,
            author=self.user,
            title='Authentication Strategy',
            content='We need to implement JWT'
        )
        ConversationFactory(
            organization=self.org,
            author=self.user,
            title='Database Migration',
            content='Moving to PostgreSQL'
        )
    
    def test_search_conversations(self):
        response = self.client.get('/api/recall/conversations/', {
            'search': 'authentication'
        })
        assert response.status_code == 200
        assert len(response.data['results']) >= 1

@pytest.mark.django_db
class TestAnalyticsWorkflow(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.org = OrganizationFactory()
        self.user = UserFactory(organization=self.org)
        self.client.force_authenticate(user=self.user)
    
    def test_get_memory_health(self):
        ConversationFactory(organization=self.org, author=self.user)
        response = self.client.get('/api/recall/analytics/memory-health/')
        assert response.status_code == 200
        assert 'overall_score' in response.data
    
    def test_get_engagement_metrics(self):
        response = self.client.get('/api/recall/analytics/engagement/')
        assert response.status_code == 200
        assert 'total_conversations' in response.data
