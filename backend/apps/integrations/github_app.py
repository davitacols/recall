"""GitHub App authentication helpers.

The GitHub App approach (vs personal access tokens) requires three layers
of credentials:

1. **App JWT** — short-lived (10 min) JWT signed by the App's RSA private
   key. Identifies "Knoledgr the App" to GitHub. Used to fetch installation
   metadata and to mint installation tokens. Never sent to users.
2. **Installation token** — short-lived (1 hour) token GitHub mints when we
   present a valid App JWT plus an installation_id. This is what we use
   for actual repo API calls on behalf of a Knoledgr workspace.
3. **Webhook signing secret** — symmetric secret shared between GitHub and
   us at App registration time. Used to verify incoming webhook signatures.

Tokens are never persisted in the database. Installation tokens are cached
in a process-local dict with a safety margin (50 min vs the 1 hour expiry)
so the tokens we hand to callers never expire mid-request.

Required environment variables (read via Django settings):

- GITHUB_APP_ID                  — numeric App id
- GITHUB_APP_SLUG                — URL slug (used to build install URLs)
- GITHUB_APP_PRIVATE_KEY         — PEM-encoded RSA private key
- GITHUB_APP_WEBHOOK_SECRET      — shared secret for webhook signatures

When these are unset, callers should surface a 503 "GitHub App not
configured for this deployment" response rather than 500.
"""

from __future__ import annotations

import hashlib
import hmac
import logging
import threading
import time
from dataclasses import dataclass
from typing import Optional

import jwt as pyjwt
import requests
from django.conf import settings

logger = logging.getLogger(__name__)

GITHUB_API = "https://api.github.com"
INSTALLATION_TOKEN_TTL = 60 * 50  # 50 min (GitHub gives us 60)
APP_JWT_TTL = 60 * 9              # 9 min (GitHub caps at 10)


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class GitHubAppConfig:
    app_id: str
    app_slug: str
    private_key: str
    webhook_secret: str

    @property
    def install_url(self) -> str:
        return f"https://github.com/apps/{self.app_slug}/installations/new"


def get_app_config() -> Optional[GitHubAppConfig]:
    """Load the GitHub App config from Django settings. Returns None when
    any required field is missing — callers should treat that as 'not
    configured for this deployment' rather than an error.
    """
    app_id = (getattr(settings, "GITHUB_APP_ID", "") or "").strip()
    app_slug = (getattr(settings, "GITHUB_APP_SLUG", "") or "").strip()
    private_key = (getattr(settings, "GITHUB_APP_PRIVATE_KEY", "") or "").strip()
    webhook_secret = (getattr(settings, "GITHUB_APP_WEBHOOK_SECRET", "") or "").strip()
    if not all([app_id, app_slug, private_key, webhook_secret]):
        return None
    # Render and similar PaaS providers store multi-line env vars with \n
    # literal escapes. Normalize back to newlines so cryptography can read
    # the PEM block.
    if "\\n" in private_key and "\n" not in private_key:
        private_key = private_key.replace("\\n", "\n")
    return GitHubAppConfig(
        app_id=app_id,
        app_slug=app_slug,
        private_key=private_key,
        webhook_secret=webhook_secret,
    )


# ---------------------------------------------------------------------------
# JWT minting
# ---------------------------------------------------------------------------

def build_app_jwt(config: Optional[GitHubAppConfig] = None) -> str:
    """Build a short-lived JWT that identifies our GitHub App to GitHub."""
    cfg = config or get_app_config()
    if not cfg:
        raise RuntimeError("GitHub App is not configured for this deployment")
    now = int(time.time())
    payload = {
        # Backdate iat by 60s to absorb clock skew between us and GitHub.
        "iat": now - 60,
        "exp": now + APP_JWT_TTL,
        "iss": cfg.app_id,
    }
    return pyjwt.encode(payload, cfg.private_key, algorithm="RS256")


# ---------------------------------------------------------------------------
# Installation tokens
# ---------------------------------------------------------------------------

# Process-local cache. For multi-worker deployments this is per-worker which
# is fine — installation tokens are cheap to mint and the worst case is
# slightly more requests to GitHub per minute, not a correctness issue.
_token_cache: dict[int, tuple[str, float]] = {}
_token_lock = threading.Lock()


def get_installation_token(installation_id: int, *, force_refresh: bool = False) -> str:
    """Return a valid installation token for the given installation_id.

    Mints a new token via GitHub's API when the cache is cold or expired,
    otherwise returns the cached value.
    """
    if not installation_id:
        raise ValueError("installation_id is required")

    now = time.time()
    if not force_refresh:
        with _token_lock:
            cached = _token_cache.get(int(installation_id))
            if cached and cached[1] > now + 30:
                return cached[0]

    cfg = get_app_config()
    if not cfg:
        raise RuntimeError("GitHub App is not configured for this deployment")

    app_jwt = build_app_jwt(cfg)
    resp = requests.post(
        f"{GITHUB_API}/app/installations/{installation_id}/access_tokens",
        headers={
            "Authorization": f"Bearer {app_jwt}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        },
        timeout=15,
    )
    if resp.status_code != 201:
        raise RuntimeError(
            f"GitHub rejected installation token request ({resp.status_code}): {resp.text[:200]}"
        )

    body = resp.json()
    token = body.get("token")
    if not token:
        raise RuntimeError("GitHub returned no token in installation token response")

    # Cache with our shorter TTL so callers never get one about to expire.
    expires_at = now + INSTALLATION_TOKEN_TTL
    with _token_lock:
        _token_cache[int(installation_id)] = (token, expires_at)
    return token


def invalidate_installation_token(installation_id: int) -> None:
    """Drop the cached token for an installation — call this when GitHub
    sends an installation.suspend or installation.deleted webhook."""
    with _token_lock:
        _token_cache.pop(int(installation_id), None)


# ---------------------------------------------------------------------------
# Authenticated HTTP helpers
# ---------------------------------------------------------------------------

def github_get(path: str, *, installation_id: int, params: Optional[dict] = None) -> requests.Response:
    """GET a GitHub API path using the installation's token."""
    token = get_installation_token(installation_id)
    return requests.get(
        f"{GITHUB_API}{path}",
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        },
        params=params or None,
        timeout=15,
    )


def list_installation_repos(installation_id: int) -> list[dict]:
    """Pull every repo the installation has access to.

    GitHub paginates at 100 per page. We follow next_url links until exhausted.
    A worst-case install of 1000 repos is 10 round-trips — well within an
    HTTP request budget.
    """
    repos: list[dict] = []
    url = f"{GITHUB_API}/installation/repositories?per_page=100"
    token = get_installation_token(installation_id)
    while url:
        resp = requests.get(
            url,
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
            },
            timeout=20,
        )
        if resp.status_code != 200:
            raise RuntimeError(
                f"GitHub rejected installation/repositories ({resp.status_code}): {resp.text[:200]}"
            )
        body = resp.json()
        repos.extend(body.get("repositories", []))
        url = _next_page_url(resp.headers.get("Link", ""))
    return repos


def fetch_installation_metadata(installation_id: int) -> dict:
    """Read the GitHub-side installation record for our local copy."""
    cfg = get_app_config()
    if not cfg:
        raise RuntimeError("GitHub App is not configured for this deployment")
    app_jwt = build_app_jwt(cfg)
    resp = requests.get(
        f"{GITHUB_API}/app/installations/{installation_id}",
        headers={
            "Authorization": f"Bearer {app_jwt}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        },
        timeout=15,
    )
    if resp.status_code != 200:
        raise RuntimeError(
            f"GitHub rejected app/installations/<id> ({resp.status_code}): {resp.text[:200]}"
        )
    return resp.json()


def _next_page_url(link_header: str) -> Optional[str]:
    """Parse the RFC 5988 Link header and return the rel="next" URL."""
    if not link_header:
        return None
    for part in link_header.split(","):
        try:
            url_part, rel_part = part.split(";", 1)
        except ValueError:
            continue
        if 'rel="next"' in rel_part:
            return url_part.strip().lstrip("<").rstrip(">")
    return None


# ---------------------------------------------------------------------------
# Webhook signature verification
# ---------------------------------------------------------------------------

def verify_webhook_signature(body: bytes, header_signature: str) -> bool:
    """Verify GitHub's X-Hub-Signature-256 header against our secret.

    GitHub sends the signature as `sha256=<hex>`. We recompute HMAC-SHA256
    over the raw body using our shared secret and compare in constant time.
    """
    cfg = get_app_config()
    if not cfg:
        return False
    if not header_signature or not header_signature.startswith("sha256="):
        return False
    expected = hmac.new(
        cfg.webhook_secret.encode("utf-8"), body, hashlib.sha256
    ).hexdigest()
    received = header_signature.split("=", 1)[1]
    return hmac.compare_digest(expected, received)
