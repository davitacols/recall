"""Client and cache helpers for the private embedding service.

The embedding model runs in one dedicated container.  Keeping it out of the
Gunicorn image prevents every web worker from loading its own copy of the model
and exhausting the backend's memory limit.
"""

from __future__ import annotations

import hashlib
import logging
import math
from typing import Iterable

import requests
from django.conf import settings
from django.core.cache import cache


logger = logging.getLogger(__name__)


class SemanticSearchUnavailable(RuntimeError):
    """Raised when the embedding service cannot safely answer a request."""


class SemanticSearchClient:
    """Small, failure-tolerant client for Hugging Face TEI's ``/embed`` API."""

    def __init__(self, base_url=None, timeout=None, batch_size=None):
        configured_url = base_url
        if configured_url is None:
            configured_url = getattr(settings, "SEMANTIC_SEARCH_URL", "")
        self.base_url = str(configured_url or "").strip().rstrip("/")
        self.timeout = float(
            timeout
            if timeout is not None
            else getattr(settings, "SEMANTIC_SEARCH_TIMEOUT", 15.0)
        )
        self.batch_size = max(
            1,
            int(
                batch_size
                if batch_size is not None
                else getattr(settings, "SEMANTIC_SEARCH_BATCH_SIZE", 32)
            ),
        )
        self.model_name = str(
            getattr(
                settings,
                "SEMANTIC_SEARCH_MODEL",
                "sentence-transformers/all-MiniLM-L6-v2",
            )
        )
        self.cache_timeout = int(
            getattr(settings, "SEMANTIC_SEARCH_CACHE_TIMEOUT", 7 * 24 * 3600)
        )
        self.max_chars = max(
            256, int(getattr(settings, "SEMANTIC_SEARCH_MAX_CHARS", 3000))
        )

    @property
    def enabled(self):
        return bool(self.base_url)

    def health(self):
        """Return ``available``, ``unavailable``, or ``disabled``."""
        if not self.enabled:
            return "disabled"

        try:
            response = requests.get(f"{self.base_url}/health", timeout=min(self.timeout, 3.0))
            return "available" if response.ok else "unavailable"
        except requests.RequestException:
            return "unavailable"

    def embed(self, texts: Iterable[str]):
        """Embed a batch of strings and validate the service response."""
        prepared = [self._prepare_text(text) for text in texts]
        if not prepared:
            return []
        if not self.enabled:
            raise SemanticSearchUnavailable("semantic search is not configured")

        try:
            response = requests.post(
                f"{self.base_url}/embed",
                json={"inputs": prepared},
                timeout=self.timeout,
            )
            response.raise_for_status()
            payload = response.json()
        except (requests.RequestException, ValueError) as exc:
            raise SemanticSearchUnavailable("embedding service is unavailable") from exc

        if not isinstance(payload, list) or len(payload) != len(prepared):
            raise SemanticSearchUnavailable("embedding service returned an invalid batch")

        embeddings = []
        for vector in payload:
            if not isinstance(vector, list) or not vector:
                raise SemanticSearchUnavailable("embedding service returned an invalid vector")
            try:
                embeddings.append([float(value) for value in vector])
            except (TypeError, ValueError) as exc:
                raise SemanticSearchUnavailable(
                    "embedding service returned a non-numeric vector"
                ) from exc
        return embeddings

    def embed_cached(self, texts: Iterable[str]):
        """Embed documents, sharing immutable content-hash results through Redis."""
        prepared = [self._prepare_text(text) for text in texts]
        if not prepared:
            return []

        keys = [self._cache_key(text) for text in prepared]
        try:
            cached = cache.get_many(keys)
        except Exception:  # A cache outage must not turn search into a 500.
            logger.warning("Semantic embedding cache read failed", exc_info=True)
            cached = {}

        results = [cached.get(key) for key in keys]
        missing = [index for index, vector in enumerate(results) if vector is None]

        for start in range(0, len(missing), self.batch_size):
            indexes = missing[start : start + self.batch_size]
            vectors = self.embed([prepared[index] for index in indexes])
            pending_cache = {}
            for index, vector in zip(indexes, vectors):
                results[index] = vector
                pending_cache[keys[index]] = vector
            try:
                cache.set_many(pending_cache, timeout=self.cache_timeout)
            except Exception:
                logger.warning("Semantic embedding cache write failed", exc_info=True)

        return results

    def _prepare_text(self, text):
        return " ".join(str(text or "").split())[: self.max_chars]

    def _cache_key(self, text):
        digest = hashlib.sha256(
            f"{self.model_name}\0{text}".encode("utf-8", errors="ignore")
        ).hexdigest()
        return f"semantic-embedding:v1:{digest}"


def cosine_similarity(left, right):
    """Return cosine similarity without adding NumPy to the backend image."""
    if not left or not right or len(left) != len(right):
        return 0.0
    dot = sum(a * b for a, b in zip(left, right))
    left_norm = math.sqrt(sum(value * value for value in left))
    right_norm = math.sqrt(sum(value * value for value in right))
    denominator = left_norm * right_norm
    return dot / denominator if denominator else 0.0


def get_semantic_search_status():
    """Return a briefly cached readiness status for the public health endpoint."""
    client = SemanticSearchClient()
    if not client.enabled:
        return "disabled"

    cache_key = "semantic-search-health:v1"
    try:
        cached = cache.get(cache_key)
    except Exception:
        cached = None
    if cached in {"available", "unavailable"}:
        return cached

    status = client.health()
    try:
        cache.set(cache_key, status, timeout=20)
    except Exception:
        pass
    return status
