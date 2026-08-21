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


def github_post(path: str, *, installation_id: int, json_body: dict) -> requests.Response:
    """POST to a GitHub API path using the installation's token.

    Writing requires a permission the App may not hold — it shipped read-only.
    Callers must treat 403 as "not granted yet" rather than an error, so a
    workspace that has not accepted the updated permissions keeps working with
    the read-only behaviour instead of erroring on every webhook.
    """
    token = get_installation_token(installation_id)
    return requests.post(
        f"{GITHUB_API}{path}",
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        },
        json=json_body,
        timeout=15,
    )


def installation_can_write_prs(installation) -> bool:
    """Whether this installation granted pull_requests: write.

    Checked before attempting a comment so the common case (permission not yet
    accepted) costs nothing and logs once, rather than issuing a request that
    is guaranteed to 403.
    """
    perms = getattr(installation, "permissions", None) or {}
    return str(perms.get("pull_requests", "")).lower() == "write"


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


#: Ceiling on how far back a backfill will walk. Capture normally rides live
#: merge events, so this exists only for the one-off catch-up when a repo is
#: first connected. Beyond a few hundred the useful discussions are long since
#: stale, and each one costs three API calls to examine.
MAX_BACKFILL_PRS = 300


def list_recent_merged_prs(
    installation_id: int, repo_full_name: str, limit: int = 100
) -> list[dict]:
    """Merged pull requests, newest merged first.

    Capture is otherwise driven entirely by live merge events, which means a
    team connecting a repo sees an empty workspace until the next substantive
    PR lands - possibly a fortnight, since most merges are deliberately
    skipped. Their own history is the best demonstration the product has, and
    it was sitting there unread.

    GitHub cannot filter by merged, only by closed, and a closed-unmerged PR
    has review discussion that never became anything. Those are filtered here
    rather than left for the caller, so "merged" means merged.
    """
    limit = max(1, min(int(limit or 100), MAX_BACKFILL_PRS))
    merged: list[dict] = []
    url = (
        f"{GITHUB_API}/repos/{repo_full_name}/pulls"
        "?state=closed&sort=updated&direction=desc&per_page=100"
    )
    token = get_installation_token(installation_id)

    while url and len(merged) < limit:
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
                f"GitHub rejected pulls for {repo_full_name} "
                f"({resp.status_code}): {resp.text[:200]}"
            )
        page = resp.json()
        if not isinstance(page, list) or not page:
            break
        merged.extend(pr for pr in page if pr.get("merged_at"))
        url = _next_page_url(resp.headers.get("Link", ""))

    merged.sort(key=lambda pr: str(pr.get("merged_at") or ""), reverse=True)
    return merged[:limit]


#: A pull request touching more files than this is a bulk move, a generated
#: lockfile sweep, or a vendored dependency drop. Attributing a decision to all
#: of them would bury the handful of files the decision is actually about, so
#: the whole PR is skipped rather than paged through.
MAX_PR_FILES = 300


def list_pr_files(installation_id: int, repo_full_name: str, pr_number: int) -> list[dict]:
    """Return the files a pull request touched.

    This is the join that makes "why is this code here?" answerable: a
    decision knows its pull request, and a pull request knows its files, so a
    file can be traced back to the reasoning behind it.

    Returns an empty list when the PR exceeds MAX_PR_FILES — a caller cannot
    tell that from "no files", and should not need to: in both cases there is
    nothing worth attributing.
    """
    files: list[dict] = []
    url = f"{GITHUB_API}/repos/{repo_full_name}/pulls/{pr_number}/files?per_page=100"
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
                f"GitHub rejected pulls/{pr_number}/files ({resp.status_code}): {resp.text[:200]}"
            )
        files.extend(resp.json())
        if len(files) > MAX_PR_FILES:
            logger.info(
                "Skipping file attribution for %s#%s: %d+ files changed",
                repo_full_name, pr_number, len(files),
            )
            return []
        url = _next_page_url(resp.headers.get("Link", ""))
    return files


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
