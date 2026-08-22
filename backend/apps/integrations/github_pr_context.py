"""Tell a reviewer why the code in front of them is the way it is.

This is the inverse of everything else in the integration. The rest of it asks
"which decision does this pull request implement?" — a question about the PR.
This asks "what was already decided about the files this PR touches?" — a
question about the code, and the one a reviewer actually has.

It fires when a pull request opens, on the files in the diff, before anyone has
formed an opinion. That timing is the whole point: a reviewer about to unpick a
choice deliberately made six months ago is the moment the reasoning is worth
the most, and the moment it is least likely to be at hand.

Restraint is what makes it usable:

  - Nothing is posted unless a decision genuinely carries reasoning. A title
    with no rationale tells a reviewer nothing they cannot read from the diff.
  - Decisions the PR is already linked to are skipped — the author knows.
  - One comment per pull request, ever.
  - Silence is the default and by far the most common outcome.

A comment nobody wants is worse than no comment: it trains people to skim past
the bot, and that is not recoverable.
"""

from __future__ import annotations

import logging

from apps.integrations.github_app import github_get, github_post, installation_can_write_prs
from apps.integrations.github_decision_files import decisions_for_paths, is_noise

logger = logging.getLogger(__name__)

#: Distinct from the suggestion marker: the two comments answer different
#: questions and must be able to coexist on the same pull request.
CONTEXT_MARKER = "<!-- knoledgr-context -->"

#: How many decisions one comment may mention. Past three it stops reading as
#: context and starts reading as a wall.
MAX_DECISIONS = 3

#: How many file paths to name per decision before summarising the rest.
MAX_PATHS_SHOWN = 3


def _changed_paths(installation, repo, pr_number: int) -> list[str]:
    from apps.integrations.github_app import list_pr_files

    try:
        files = list_pr_files(installation.installation_id, repo.full_name, pr_number)
    except Exception:
        logger.exception("Could not read files for %s#%s", repo.full_name, pr_number)
        return []
    return [
        f["filename"] for f in files
        if f.get("filename") and not is_noise(f["filename"])
    ]


def _comment_body(entries, base_url: str) -> str:
    base = (base_url or "").rstrip("/")
    lines = [
        CONTEXT_MARKER,
        "**Files in this PR were shaped by earlier decisions.**",
        "",
    ]
    for decision, paths in entries:
        shown = paths[:MAX_PATHS_SHOWN]
        more = len(paths) - len(shown)
        where = ", ".join(f"`{p}`" for p in shown)
        if more > 0:
            where += f" and {more} more"

        lines.append(f"**[DEC-{decision.id}]({base}/decisions/{decision.id}) — {decision.title}**")
        rationale = str(getattr(decision, "rationale", "") or "").strip()
        snippet = rationale[:400] + ("…" if len(rationale) > 400 else "")
        lines.append(f"> {snippet}")
        lines.append(f"_Touched here: {where}_")
        lines.append("")

    lines.append(
        "This is context, not an objection — the decision may well be the thing "
        "that needs changing. It is here so that if it is being reversed, it is "
        "being reversed on purpose."
    )
    return "\n".join(lines)


def maybe_comment_context(installation, repo, pr: dict, base_url: str) -> bool:
    """Post one context comment on a PR. Returns True if a comment was made."""
    from apps.integrations.github_app_models import DecisionPullRequest

    if not installation_can_write_prs(installation):
        return False

    pr_number = pr.get("number")
    if not pr_number:
        return False

    paths = _changed_paths(installation, repo, pr_number)
    if not paths:
        return False

    entries = decisions_for_paths(
        repo.organization, repo, paths, limit=MAX_DECISIONS + 3
    )
    if not entries:
        return False

    # A decision this PR is already linked to is one the author chose; telling
    # them about it is noise.
    already = set(
        DecisionPullRequest.objects
        .filter(repo=repo, pr_number=pr_number)
        .values_list("decision_id", flat=True)
    )

    # Without a rationale there is nothing to say that the diff does not
    # already show. This is the filter that decides whether the feature is
    # useful or merely present.
    useful = [
        (d, p) for d, p in entries
        if d.id not in already and str(getattr(d, "rationale", "") or "").strip()
    ][:MAX_DECISIONS]

    if not useful:
        logger.info(
            "No context worth posting on %s#%s (%d decision(s) matched, none with reasoning)",
            repo.full_name, pr_number, len(entries),
        )
        return False

    try:
        existing = github_get(
            f"/repos/{repo.full_name}/issues/{pr_number}/comments",
            installation_id=installation.installation_id,
            params={"per_page": 100},
        )
        if not existing.ok:
            return False
        if any(CONTEXT_MARKER in (c.get("body") or "") for c in existing.json()):
            return False
    except Exception:
        logger.exception("Could not read comments on %s#%s", repo.full_name, pr_number)
        return False

    response = github_post(
        f"/repos/{repo.full_name}/issues/{pr_number}/comments",
        installation_id=installation.installation_id,
        json_body={"body": _comment_body(useful, base_url)},
    )
    if not response.ok:
        logger.warning(
            "Context comment failed on %s#%s: %s %s",
            repo.full_name, pr_number, response.status_code, response.text[:160],
        )
        return False

    logger.info(
        "Posted context on %s#%s: %s",
        repo.full_name, pr_number, ", ".join(f"DEC-{d.id}" for d, _ in useful),
    )
    return True
