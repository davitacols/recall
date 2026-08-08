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

# Linking without being asked is a stronger claim than suggesting, so it takes
# more evidence: a clear floor AND a clear margin over the next best match.
# See classify_match for why the margin carries most of the weight.
AUTO_LINK_MIN_SCORE = 6
AUTO_LINK_MARGIN = 2  # best must be >= 2x the runner-up

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


def rank_decisions_for_pr(pr: dict, decisions) -> list[tuple[object, int]]:
    """Score every decision against a PR, best first.

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
        return []

    scored: list[tuple[object, int]] = []
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
        scored.append((decision, score))

    scored.sort(key=lambda pair: pair[1], reverse=True)
    return scored


def suggest_decision_for_pr(org, pr: dict, decisions) -> tuple[object | None, int]:
    """Pick the decision a PR most plausibly implements."""
    ranked = rank_decisions_for_pr(pr, decisions)
    if not ranked:
        return None, 0
    best, best_score = ranked[0]
    if best_score < MIN_SCORE:
        return None, best_score
    return best, best_score


def classify_match(pr: dict, decisions) -> tuple[object | None, int, int, str]:
    """Decide whether to link a PR outright, merely suggest, or stay quiet.

    Returns ``(decision, score, runner_up, verdict)`` where verdict is one of
    ``"auto"``, ``"suggest"`` or ``"none"``.

    An absolute score threshold looks like the obvious rule and is the wrong
    one. Score grows with the number of overlapping words, so a workspace with
    200 decisions gives far more opportunity for something to overlap by
    accident than one with 8 — a fixed cutoff therefore gets *less* safe as a
    customer's corpus grows, which is precisely backwards.

    The margin over the runner-up is the more honest signal. If one decision
    beats every other by a wide margin, the match is distinctive. If the top
    two are neck and neck, the words are probably just generic project
    vocabulary, and picking one of them is a coin flip dressed up as an
    inference. Requiring both a floor and a margin keeps the rule stable as
    the corpus grows.
    """
    ranked = rank_decisions_for_pr(pr, decisions)
    if not ranked:
        return None, 0, 0, "none"

    best, best_score = ranked[0]
    runner_up = ranked[1][1] if len(ranked) > 1 else 0

    if best_score < MIN_SCORE:
        return None, best_score, runner_up, "none"

    if best_score >= AUTO_LINK_MIN_SCORE and best_score >= runner_up * AUTO_LINK_MARGIN:
        return best, best_score, runner_up, "auto"

    return best, best_score, runner_up, "suggest"


def _comment_body(decision, base_url: str, *, linked: bool = False) -> str:
    title = str(decision.title or "").strip()
    url = f"{base_url.rstrip('/')}/decisions/{decision.id}"
    headline = (
        f"**Linked to a recorded decision — [DEC-{decision.id}]({url})**"
        if linked else
        f"**This looks related to a recorded decision — [DEC-{decision.id}]({url})**"
    )
    lines = [COMMENT_MARKER, headline, "", f"> {title}"]

    rationale = str(getattr(decision, "rationale", "") or "").strip()
    if rationale:
        snippet = rationale[:280] + ("…" if len(rationale) > 280 else "")
        lines += ["", f"_Why it was decided:_ {snippet}"]

    if linked:
        # State plainly that something was written, and where to undo it.
        # A bot that changes a record without saying so is the kind of thing
        # people disable the whole integration over.
        lines += [
            "",
            f"This link was inferred from the PR title and description. "
            f"If it's wrong, remove it on [the decision page]({url}) — "
            f"nothing else is affected.",
        ]
    else:
        lines += [
            "",
            f"If that's right, add `<!-- knoledgr-decision:{decision.id} -->` to the "
            "description and Knoledgr will link them. If not, ignore this — no link "
            "is created without you.",
        ]
    return "\n".join(lines)


def _already_commented(installation, repo, pr_number: int) -> bool | None:
    """Whether our marker is already on the PR. None means we could not tell.

    The distinction matters: on an error we must not post, because "unknown"
    plus "post anyway" is how a bot ends up repeating itself on every event.
    """
    from apps.integrations.github_app import github_get

    try:
        existing = github_get(
            f"/repos/{repo.full_name}/issues/{pr_number}/comments",
            installation_id=installation.installation_id,
            params={"per_page": 100},
        )
        if not existing.ok:
            return None
        return any(COMMENT_MARKER in (c.get("body") or "") for c in existing.json())
    except Exception:
        logger.exception("Could not read existing comments on %s#%s", repo.full_name, pr_number)
        return None


def maybe_comment_suggestion(installation, repo, pr: dict, base_url: str, snapshot=None) -> bool:
    """Link or suggest a decision for a PR. Returns True if a comment was made.

    Safe to call on every pull_request event: it checks permission, existing
    links, and prior comments before writing anything.

    A confident match is linked outright and the comment says so. Anything
    less confident is only proposed, and the link still waits for a human.
    The asymmetry is deliberate — being quietly wrong in the record is worse
    than being visibly unhelpful in a comment.
    """
    from apps.decisions.models import Decision
    from apps.integrations.github_app_models import DecisionPullRequest

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

    org = repo.organization
    decisions = list(
        Decision.objects.filter(organization=org).only("id", "title", "rationale")[:200]
    )
    if not decisions:
        return False

    decision, score, runner_up, verdict = classify_match(pr, decisions)
    if verdict == "none" or not decision:
        return False

    # Do not comment twice. Checking costs one GET, which is cheaper than the
    # reputational cost of a bot that repeats itself on every push. An
    # inconclusive check counts as "already commented" — silence is the safe
    # failure here.
    if _already_commented(installation, repo, pr_number) is not False:
        return False

    if verdict == "auto":
        # snapshot already carries pr_node_id, so it must not also be passed
        # explicitly. Fall back to the raw payload when no snapshot is given.
        fields = dict(snapshot or {})
        fields.setdefault("pr_node_id", pr.get("node_id") or "")
        fields.setdefault("title", str(pr.get("title") or "")[:512])
        fields.setdefault("html_url", str(pr.get("html_url") or "")[:512])
        try:
            new_link = DecisionPullRequest.objects.create(
                organization=org,
                decision=decision,
                repo=repo,
                pr_number=pr_number,
                link_source=DecisionPullRequest.LINK_SOURCE_AUTO,
                linked_by=None,
                match_score=score,
                match_runner_up_score=runner_up,
                **fields,
            )
            # Record the files, so this decision is reachable from the code it
            # was implemented in. Separately guarded: losing the attribution
            # must not turn a successful link into a failed one.
            try:
                from apps.integrations.github_decision_files import sync_link_files

                sync_link_files(new_link)
            except Exception:
                logger.exception("File attribution failed for link %s", new_link.id)
        except Exception:
            # If the row cannot be written, do not claim in a comment that it
            # was. Fall back to suggesting, which is still useful and true.
            logger.exception(
                "Auto-link failed for DEC-%s on %s#%s", decision.id, repo.full_name, pr_number
            )
            verdict = "suggest"

    response = github_post(
        f"/repos/{repo.full_name}/issues/{pr_number}/comments",
        installation_id=installation.installation_id,
        json_body={"body": _comment_body(decision, base_url, linked=verdict == "auto")},
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
        "%s DEC-%s on %s#%s (score=%s runner_up=%s)",
        "Linked" if verdict == "auto" else "Suggested",
        decision.id, repo.full_name, pr_number, score, runner_up,
    )
    return True
