"""Map decisions onto the files that implement them, and back again.

`git blame` answers who changed a line and when. Nothing answers why, and that
is the question someone reading unfamiliar code actually has. The reasoning is
usually recorded somewhere — it just is not reachable from the file.

A decision knows its pull requests and a pull request knows its files, so the
join already exists; it was never stored in a shape you could query from the
file end. This module stores it, and answers the inverse:

    decisions_for_paths(org, repo, ["client/retry.py"]) -> [(decision, paths)]

Two properties matter for the surface built on top of it.

**Noise is the enemy.** A reviewer who is told about an irrelevant decision
once will ignore the next one, and there is no recovering from that. So files
that carry no design intent — lockfiles, snapshots, generated clients — are
never attributed, and a pull request that rewrites half the tree is skipped
entirely rather than claiming authorship of everything it touched.

**Deletions are not implementations.** A decision that removed a file is not
the reason the file exists, because it does not exist. Removed paths are
recorded but excluded from lookups.
"""

from __future__ import annotations

import logging
import re

from apps.integrations.github_app import list_pr_files

logger = logging.getLogger(__name__)

#: Paths that change constantly and carry no reasoning of their own. Matching
#: is on the full path, so `package-lock.json` is caught anywhere in a tree.
_NOISE_PATTERNS = [
    r"(^|/)package-lock\.json$",
    r"(^|/)yarn\.lock$",
    r"(^|/)pnpm-lock\.yaml$",
    r"(^|/)poetry\.lock$",
    r"(^|/)Pipfile\.lock$",
    r"(^|/)go\.sum$",
    r"(^|/)Cargo\.lock$",
    r"(^|/)composer\.lock$",
    r"(^|/)Gemfile\.lock$",
    r"(^|/)node_modules/",
    r"(^|/)vendor/",
    r"(^|/)dist/",
    r"(^|/)build/",
    r"(^|/)__snapshots__/",
    r"\.min\.(js|css)$",
    r"\.(png|jpe?g|gif|svg|ico|woff2?|ttf|eot|pdf|mp4|zip)$",
    r"(^|/)migrations/\d{4}_",
]
_NOISE_RE = re.compile("|".join(_NOISE_PATTERNS), re.IGNORECASE)

#: A decision spread across more files than this in a single PR is a rename,
#: a reformat, or a dependency bump. Attributing it to all of them buries the
#: files it was actually about.
MAX_FILES_PER_LINK = 50


def is_noise(path: str) -> bool:
    return bool(_NOISE_RE.search(str(path or "")))


def sync_link_files(link) -> int:
    """Record the files a decision's pull request touched. Returns the count.

    Never raises: this runs inside webhook handling, where GitHub retries any
    non-2xx and a retry storm is worse than a missing attribution.
    """
    from apps.integrations.github_app_models import DecisionFile

    repo = link.repo
    installation = getattr(repo, "installation", None)
    if not installation:
        return 0

    try:
        files = list_pr_files(installation.installation_id, repo.full_name, link.pr_number)
    except Exception:
        logger.exception(
            "Could not read files for %s#%s", repo.full_name, link.pr_number
        )
        return 0

    meaningful = [f for f in files if not is_noise(f.get("filename", ""))]
    if not meaningful:
        return 0
    if len(meaningful) > MAX_FILES_PER_LINK:
        logger.info(
            "Skipping file attribution for %s#%s: %d meaningful files is too broad "
            "to attribute to one decision",
            repo.full_name, link.pr_number, len(meaningful),
        )
        return 0

    # Rebuilt rather than merged: a force-push can drop files from a PR, and a
    # stale row would keep claiming a decision governs a file it no longer
    # touches.
    DecisionFile.objects.filter(link=link).delete()

    rows = [
        DecisionFile(
            organization_id=link.organization_id,
            link=link,
            decision_id=link.decision_id,
            repo=repo,
            path=str(f.get("filename", ""))[:512],
            status=str(f.get("status", ""))[:16],
            changes=int(f.get("changes") or 0),
        )
        for f in meaningful
        if f.get("filename")
    ]
    DecisionFile.objects.bulk_create(rows, ignore_conflicts=True)
    logger.info(
        "Attributed decision %s to %d file(s) via %s#%s",
        link.decision_id, len(rows), repo.full_name, link.pr_number,
    )
    return len(rows)


def decisions_for_paths(organization, repo, paths, *, limit=5):
    """Which recorded decisions govern these files?

    Returns [(decision, sorted_paths)] ordered by how many of the given paths
    each decision accounts for, so the most relevant reads first.

    Excludes decisions whose only claim is having deleted the file: a decision
    that removed something is not the reason it is there.
    """
    from apps.integrations.github_app_models import DecisionFile

    clean = [p for p in {str(p or "") for p in paths} if p and not is_noise(p)]
    if not clean:
        return []

    rows = (
        DecisionFile.objects
        .filter(organization=organization, repo=repo, path__in=clean)
        .exclude(status="removed")
        .select_related("decision")
    )

    by_decision: dict[int, dict] = {}
    for row in rows:
        entry = by_decision.setdefault(
            row.decision_id, {"decision": row.decision, "paths": set()}
        )
        entry["paths"].add(row.path)

    ranked = sorted(
        by_decision.values(),
        key=lambda e: (-len(e["paths"]), e["decision"].id),
    )
    return [(e["decision"], sorted(e["paths"])) for e in ranked[:limit]]
