from unittest.mock import Mock, patch

from django.core.cache import cache
from django.test import SimpleTestCase, TestCase, override_settings

from apps.decisions.models import Decision
from apps.knowledge.search_engine import EnhancedSearchEngine
from apps.knowledge.semantic_search import (
    SemanticSearchClient,
    SemanticSearchUnavailable,
    get_semantic_search_status,
)
from apps.organizations.models import Organization, User


class FakeSemanticClient:
    enabled = True

    def __init__(self, fail=False):
        self.fail = fail

    def _vector(self, text):
        lowered = str(text).lower()
        if "safeguard user sign in" in lowered or "passkeys" in lowered:
            return [1.0, 0.0]
        return [0.0, 1.0]

    def embed(self, texts):
        if self.fail:
            raise SemanticSearchUnavailable("offline")
        return [self._vector(text) for text in texts]

    def embed_cached(self, texts):
        return self.embed(list(texts))


@override_settings(
    SEMANTIC_SEARCH_CANDIDATE_LIMIT=20,
    SEMANTIC_SEARCH_MIN_SCORE=0.5,
)
class HybridSemanticSearchTests(TestCase):
    def setUp(self):
        self.org = Organization.objects.create(name="Semantic Org", slug="semantic-org")
        self.other_org = Organization.objects.create(name="Other Org", slug="other-org")
        self.user = User.objects.create_user(
            username="semantic-owner",
            email="semantic@example.com",
            password="pass1234",
            organization=self.org,
        )
        self.other_user = User.objects.create_user(
            username="other-owner",
            email="other@example.com",
            password="pass1234",
            organization=self.other_org,
        )
        self.relevant = Decision.objects.create(
            organization=self.org,
            title="Authentication strategy",
            description="Adopt passkeys and secondary verification.",
            rationale="Reduces account takeover risk.",
            decision_maker=self.user,
            status="approved",
        )
        self.unrelated = Decision.objects.create(
            organization=self.org,
            title="Database retention",
            description="Keep audit records for the agreed period.",
            decision_maker=self.user,
            status="approved",
        )
        self.other_org_match = Decision.objects.create(
            organization=self.other_org,
            title="Passkey rollout",
            description="Passkeys protect sign in.",
            decision_maker=self.other_user,
            status="approved",
        )

    def test_semantic_retrieval_finds_different_words_and_preserves_org_scope(self):
        engine = EnhancedSearchEngine(semantic_client=FakeSemanticClient())

        results = engine.search(
            "safeguard user sign in",
            self.org.id,
            filters={"types": ["decision"]},
            limit=5,
        )

        ids = [item["id"] for item in results["decisions"]]
        self.assertIn(self.relevant.id, ids)
        self.assertNotIn(self.unrelated.id, ids)
        self.assertNotIn(self.other_org_match.id, ids)
        self.assertGreater(results["decisions"][0]["semantic_score"], 0.9)

    def test_kinds_alias_restricts_results_to_requested_type(self):
        engine = EnhancedSearchEngine(semantic_client=FakeSemanticClient())

        results = engine.search(
            "safeguard user sign in",
            self.org.id,
            filters={"kinds": ["decision"]},
            limit=5,
        )

        self.assertEqual(results["decisions"][0]["id"], self.relevant.id)
        self.assertTrue(all(not rows for name, rows in results.items() if name not in {"decisions", "total"}))

    def test_embedding_outage_falls_back_to_keyword_search(self):
        engine = EnhancedSearchEngine(semantic_client=FakeSemanticClient(fail=True))

        results = engine.search(
            "authentication",
            self.org.id,
            filters={"types": ["decision"]},
            limit=5,
        )

        self.assertEqual(results["decisions"][0]["id"], self.relevant.id)
        self.assertNotIn("semantic_score", results["decisions"][0])


@override_settings(
    SEMANTIC_SEARCH_URL="http://semantic:80",
    SEMANTIC_SEARCH_MODEL="sentence-transformers/all-MiniLM-L6-v2",
    SEMANTIC_SEARCH_BATCH_SIZE=8,
)
class SemanticSearchClientTests(SimpleTestCase):
    def setUp(self):
        cache.clear()

    @patch("apps.knowledge.semantic_search.requests.post")
    def test_document_embeddings_are_cached_by_content(self, post):
        response = Mock()
        response.raise_for_status.return_value = None
        response.json.return_value = [[1.0, 0.0], [0.0, 1.0]]
        post.return_value = response
        client = SemanticSearchClient()

        first = client.embed_cached(["alpha", "beta"])
        second = client.embed_cached(["alpha", "beta"])

        self.assertEqual(first, second)
        self.assertEqual(post.call_count, 1)

    @patch("apps.knowledge.semantic_search.requests.get")
    def test_health_reports_the_private_service_readiness(self, get):
        get.return_value.ok = True

        self.assertEqual(get_semantic_search_status(), "available")
        self.assertEqual(get.call_count, 1)

    @patch("apps.knowledge.semantic_search.requests.post")
    def test_invalid_embedding_response_fails_closed(self, post):
        response = Mock()
        response.raise_for_status.return_value = None
        response.json.return_value = {"unexpected": "payload"}
        post.return_value = response

        with self.assertRaises(SemanticSearchUnavailable):
            SemanticSearchClient().embed(["query"])
