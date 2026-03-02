from django.test import TestCase
from rest_framework.test import APIClient

from apps.organizations.models import Organization, User, SavedSearch
from apps.conversations.models import Conversation
from apps.decisions.models import Decision


class SearchViewsTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.org = Organization.objects.create(name="Recall QA", slug="recall-qa")
        self.user = User.objects.create_user(
            username="qa_user",
            email="qa@example.com",
            password="pass1234",
            organization=self.org,
            role="admin",
        )
        self.client.force_authenticate(user=self.user)

        self.conversation = Conversation.objects.create(
            organization=self.org,
            author=self.user,
            post_type="update",
            title="Authentication Strategy",
            content="We should centralize auth with JWT and SSO for reliability.",
            ai_summary="Auth strategy discussion",
            ai_processed=True,
        )
        self.decision = Decision.objects.create(
            organization=self.org,
            conversation=self.conversation,
            title="Adopt JWT for API auth",
            description="Use JWT across services for unified authentication.",
            decision_maker=self.user,
            status="proposed",
            rationale="Reduce auth fragmentation and improve observability.",
        )

    def test_advanced_search_returns_real_results_and_logs_analytics(self):
        response = self.client.post("/api/recall/search/", {"query": "auth"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(response.data.get("total", 0), 1)
        self.assertTrue(any(item["type"] in {"conversation", "decision"} for item in response.data["results"]))

        analytics = self.client.get("/api/recall/search/analytics/")
        self.assertEqual(analytics.status_code, 200)
        self.assertGreaterEqual(analytics.data.get("total_searches", 0), 1)

    def test_search_suggestions_returns_query_and_tag_shapes(self):
        response = self.client.get("/api/recall/search/suggestions/?q=auth")
        self.assertEqual(response.status_code, 200)
        self.assertIn("suggestions", response.data)
        self.assertTrue(isinstance(response.data["suggestions"], list))

    def test_saved_search_lifecycle(self):
        create_response = self.client.post(
            "/api/recall/search/save/",
            {"query": "jwt auth", "filters": {"types": ["decision"]}},
            format="json",
        )
        self.assertEqual(create_response.status_code, 201)
        search_id = create_response.data["id"]

        list_response = self.client.get("/api/recall/search/saved/")
        self.assertEqual(list_response.status_code, 200)
        self.assertTrue(any(item["id"] == search_id for item in list_response.data))

        delete_response = self.client.delete(f"/api/recall/search/saved/{search_id}/")
        self.assertEqual(delete_response.status_code, 200)
        self.assertFalse(SavedSearch.objects.filter(id=search_id).exists())
