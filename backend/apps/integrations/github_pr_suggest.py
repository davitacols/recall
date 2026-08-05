"""Suggest which decision a pull request relates to, and say so on the PR.

Why this exists: every existing way to link a PR to a decision requires the
author to do something they never do — type `<!-- knoledgr-decision:42 -->`
into the body, name a branch `dec/42-...`, or open Knoledgr and use the picker.
Across every workspace, zero of the recorded decisions have ever been linked to
a pull request. The pipeline works; the human step does not happen.

So the link is inferred instead, and the suggestion is delivered *inside
GitHub* — a comment on the PR — because that is the only place the author
already is. Confirming stays a deliberate human act: the comment proposes, a
person disposes.

Everything here degrades quietly. If the App has not been granted
pull_requests: write, if nothing matches well enough, or if GitHub rejects the
call, the webhook still records its delivery and refreshes existing links.
"""

from __future__ import annotations

import logging
import re

from apps.integrations.github_app import (
    github_post,
    installation_can_write_prs,
)

logger = logging.getLogger(__name__)

# A marker on our own comment so we can recognise it later and avoid posting a
# second one on the same PR. GitHub gives no other durable handle for "did we
# already say this".
COMMENT_MARKER = "<!-- knoledgr-suggestion -->"

# Below this, the match is noise. A wrong suggestion on someone's PR is worse
# than none: it trains people to ignore the bot, which is unrecoverable.
MIN_SCORE = 2

_WORD_RE = re.compile(r"[a-z0-9]+")
_STOPWORDS = {
    "the", "a", "an", "and", "or", "but", "for", "to", "of", "in", "on", "at",
    "by", "with", "from", "into", "is", "are", "was", "were", "be", "been",
    "we", "our", "us", "it", "its", "this", "that", "these", "those", "add",
    "fix", "update", "remove", "change", "make", "use", "using", "new", "wip",
    "chore", "feat", "refactor", "test", "docs", "bug", "merge", "branch",
}


def _terms(text: str) -> set[str]:
    return {
        w for w in _WORD_RE.findall(str(text or "").lower())
        if len(w) > 2 and w not in _STOPWORDS
    }


def suggest_decision_for_pr(org, pr: dict, decisions) -> tuple[object | None, int]:
    """Pick the decision a PR most plausibly implements.

    Deliberately lexical and explainable rather than a model call. A wrong
    suggestion costs trust, and "these words overlap" is a rationale a reviewer
    can check at a glance. It also means no API cost or latency on a webhook.
    """
    haystack = " ".join([
        str(pr.get("title") or ""),
        str(pr.get("body") or "")[:2000],
        str((pr.get("head") or {}).get("ref") or "").replace("-", " ").replace("/", " "),
    ])
    pr_terms = _terms(haystack)
    if not pr_terms:
        return None, 0

    best, best_score = None, 0
    for decision in decisions:
        title_terms = _terms(decision.title)
        # Rationale is where the "why" lives, so it earns a look — but the
        # title is the stronger signal and is weighted accordingly below.
        d_terms = title_terms | _terms(getattr(decision, "rationale", "") or "")

        overlap = pr_terms & d_terms
        if not overlap:
            continue
        # Title matches count double: a PR sharing words with a decision's
        # title is far more likely to implement it than one brushing its prose.
        score = len(overlap) + len(pr_terms & title_terms)
        if score > best_score:
            best, best_score = decision, score

    if best_score < MIN_SCORE:
        return None, best_score
    return best, best_score


def _comment_body(decision, base_url: str) -> str:
    title = str(decision.title or "").strip()
    url = f"{base_url.rstrip('/')}/decisions/{decision.id}"
    lines = [
        COMMENT_MARKER,
        f"**This looks related to a recorded decision — [DEC-{decision.id}]({url})**",
        "",
        f"> {title}",
    ]
    rationale = str(getattr(decision, "rationale", "") or "").strip()
    if rationale:
        snippet = rationale[:280] + ("…" if len(rationale) > 280 else "")
        lines += ["", f"_Why it was decided:_ {snippet}"]
    lines += [
        "",
        f"If that's right, add `<!-- knoledgr-decision:{decision.id} -->` to the "
        "description and Knoledgr will link them. If not, ignore this — no link "
        "is created without you.",
    ]
    return "\n".join(lines)


def maybe_comment_suggestion(installation, repo, pr: dict, base_url: str) -> bool:
    """Post one suggestion comment on a PR. Returns True if a comment was made.

    Safe to call on every pull_request event: it checks permission, existing
    links, and prior comments before writing anything.
    """
    from apps.decisions.models import Decision
    from apps.integrations.github_app_models import DecisionPullRequest
    from apps.integrations.github_app import github_get

    if not installation_can_write_prs(installation):
        logger.info(
            "Skipping PR suggestion for %s: installation %s lacks pull_requests: write",
            repo.full_name, installation.installation_id,
        )
        return False

    pr_number = pr.get("number")
    if not pr_number:
        return False

    # Already linked? Then the author does not need a nudge.
    if DecisionPullRequest.objects.filter(repo=repo, pr_number=pr_number).exists():
        return False

    org = installation.organization
    decisions = list(
        Decision.objects.filter(organization=org).only("id", "title", "rationale")[:200]
    )
    if not decisions:
        return False

    decision, score = suggest_decision_for_pr(org, pr, decisions)
    if not decision:
        return False

    # Do not comment twice. Checking costs one GET, which is cheaper than the
    # reputational cost of a bot that repeats itself on every push.
    try:
        existing = github_get(
            f"/repos/{repo.full_name}/issues/{pr_number}/comments",
            installation_id=installation.installation_id,
            params={"per_page": 100},
        )
        if existing.ok and any(
            COMMENT_MARKER in (c.get("body") or "") for c in existing.json()
        ):
            return False
    except Exception:
        logger.exception("Could not read existing comments on %s#%s", repo.full_name, pr_number)
        return False

    response = github_post(
        f"/repos/{repo.full_name}/issues/{pr_number}/comments",
        installation_id=installation.installation_id,
        json_body={"body": _comment_body(decision, base_url)},
    )
    if response.status_code == 403:
        logger.warning(
            "GitHub refused the comment on %s#%s — pull_requests: write not accepted "
            "for installation %s", repo.full_name, pr_number, installation.installation_id,
        )
        return False
    if not response.ok:
        logger.warning(
            "Comment failed on %s#%s: %s %s",
            repo.full_name, pr_number, response.status_code, response.text[:160],
        )
        return False

    logger.info(
        "Suggested DEC-%s on %s#%s (score=%s)",
        decision.id, repo.full_name, pr_number, score,
    )
    return True
