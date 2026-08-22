"""Capture the discussion on a merged pull request as a Conversation.

Why this exists: across every workspace, 26 conversations have ever been
recorded and the most recent is six weeks old. Everything downstream of
capture works — 69% of conversations get converted to decisions, the
rationale extractor pulls out the why, Ask Recall answers from it — but the
corpus is nearly empty, because the only way in was for a person to retype a
discussion into Knoledgr. Asking someone to paste their argument into a second
tool is a bigger favour than asking them to type a marker, and that one
already never happened.

Engineering decisions get argued out in pull request reviews. That discussion
is already written down, already attributed, already timestamped, and we
already receive the webhook.

Design choices worth stating:

**On merge, not on every comment.** Streaming each comment as it arrives would
produce partial threads that get revised as the review continues, and a stream
of half-finished records is worse than none. At merge the argument is over and
the outcome is known.

**No new permission or subscription.** This rides the ``pull_request`` events
we already receive, and reads comments with the ``pull_requests: read`` scope
the App already holds. Adding an event subscription would mean another trip
through GitHub's settings, which has already cost enough.

**Silence is the default.** Most merged PRs contain no discussion worth
keeping — a typo fix with an "LGTM" is not institutional memory. Capturing
those would bury the few that matter, so the substance bar is deliberately
high and most PRs produce nothing.
"""

from __future__ import annotations

import html
import logging

from apps.integrations.github_app import github_get

logger = logging.getLogger(__name__)

# A merged PR earns a conversation only when people actually argued in it.
# These thresholds are the difference between a memory worth searching and a
# log of every "looks good to me" ever typed.
MIN_SUBSTANTIVE_COMMENTS = 2
MIN_TOTAL_CHARS = 240
MIN_COMMENT_CHARS = 40

# Phrases that are a rubber stamp rather than a reason. Matched against the
# whole stripped comment, so a comment that merely *starts* with "LGTM" and
# then explains something still counts.
_RUBBER_STAMPS = {
    "lgtm", "lgtm!", "looks good", "looks good to me", "looks good!",
    "ship it", "ship it!", "+1", "👍", "🚀", "nice", "thanks", "thank you",
    "done", "fixed", "ok", "okay", "sure", "yes", "no", "approved",
    "merging", "merged", "rebased", "bump", "ping",
}

_MAX_COMMENTS = 60
_MAX_CONTENT_CHARS = 20000


def _is_bot(user: dict) -> bool:
    login = str((user or {}).get("login") or "")
    return (user or {}).get("type") == "Bot" or login.endswith("[bot]")


def _is_substantive(body: str) -> bool:
    text = str(body or "").strip()
    if len(text) < MIN_COMMENT_CHARS:
        return False
    if text.lower().strip(" .!") in _RUBBER_STAMPS:
        return False
    return True


def _collect_comments(installation, repo, pr_number: int) -> list[dict]:
    """Gather review bodies, diff comments and issue comments for one PR.

    Three endpoints because GitHub splits PR discussion across three places,
    and a decision can be argued in any of them:
      - /pulls/{n}/reviews          — the summary a reviewer writes
      - /pulls/{n}/comments         — comments anchored to a line of the diff
      - /issues/{n}/comments        — top-level conversation on the PR
    """
    collected: list[dict] = []
    endpoints = [
        (f"/repos/{repo.full_name}/pulls/{pr_number}/reviews", "review"),
        (f"/repos/{repo.full_name}/pulls/{pr_number}/comments", "diff"),
        (f"/repos/{repo.full_name}/issues/{pr_number}/comments", "comment"),
    ]
    for path, kind in endpoints:
        try:
            resp = github_get(
                path,
                installation_id=installation.installation_id,
                params={"per_page": 100},
            )
            if not resp.ok:
                logger.info("PR capture: %s returned %s", path, resp.status_code)
                continue
            for item in resp.json():
                collected.append({
                    "kind": kind,
                    "user": item.get("user") or {},
                    "body": item.get("body") or "",
                    "path": item.get("path") or "",
                    "created_at": item.get("submitted_at") or item.get("created_at") or "",
                })
        except Exception:
            # One endpoint failing should not lose the discussion held in the
            # other two.
            logger.exception("PR capture: could not read %s", path)

    collected.sort(key=lambda c: c["created_at"] or "")
    return collected[:_MAX_COMMENTS]


def _capture_author(installation, org):
    """Pick the Knoledgr user a captured conversation is attributed to.

    Conversation.author is required and GitHub participants are usually not
    Knoledgr users, so this is a custodian rather than a claim of authorship —
    the transcript names who actually said what.
    """
    from apps.organizations.models import User

    # The installer only qualifies if they are actually in the workspace the
    # conversation lands in — with one installation serving several, they may
    # not be.
    installer = installation.installed_by
    if installer and installer.organization_id == org.id:
        return installer
    org_users = User.objects.filter(organization=org)
    return org_users.filter(role="admin").first() or org_users.first()


def _paragraphs(text: str) -> str:
    """Escape untrusted text and turn its line breaks into paragraphs."""
    out = []
    for line in str(text or "").strip().split("\n"):
        line = line.strip()
        if line:
            out.append(f"<p>{html.escape(line)}</p>")
    return "".join(out)


def _build_transcript(pr: dict, comments: list[dict]) -> str:
    """Render the discussion as HTML.

    HTML rather than markdown because conversation content is rendered with
    dangerouslySetInnerHTML — it holds rich-text editor output everywhere else,
    so markdown would display as literal ``**`` and ``>`` with its line breaks
    collapsed.

    That same renderer is why every value interpolated here is escaped. This
    text is written by anyone who can comment on a connected repository, which
    on a public repo is anyone at all. Unescaped, a comment containing markup
    would be stored once and executed in the browser of every colleague who
    later opened the record.
    """
    url = str(pr.get("html_url") or "")
    safe_url = html.escape(url, quote=True)
    merged_on = html.escape(str(pr.get("merged_at") or "")[:10])

    parts = [
        f'<p>Captured from <a href="{safe_url}" target="_blank" rel="noreferrer noopener">'
        f'{html.escape(url)}</a> — merged {merged_on}.</p>'
    ]

    body = str(pr.get("body") or "").strip()
    if body:
        parts.append("<h3>Pull request description</h3>")
        parts.append(_paragraphs(body[:2000]))

    parts.append("<h3>Review discussion</h3>")
    for c in comments:
        who = html.escape(str((c["user"] or {}).get("login") or "someone"))
        where = (
            f" on <code>{html.escape(str(c['path']))}</code>" if c.get("path") else ""
        )
        parts.append(f"<p><strong>@{who}</strong>{where}:</p>")
        parts.append(f"<blockquote>{_paragraphs(c['body'])}</blockquote>")

    return "".join(parts)[:_MAX_CONTENT_CHARS]


def external_id_for(repo, pr_number) -> str:
    """The stable identity of a captured pull request discussion."""
    return f"{repo.repo_id}:{pr_number}"


def already_captured(repo, pr_number) -> bool:
    """Whether this pull request has been recorded before.

    Exists so a caller can tell "we already have this" apart from "this did
    not clear the bar". Capture returns None for both, which is right for a
    webhook and wrong for anything reporting to a person: the import command
    told an operator that two pull requests carrying 731 and 316 characters of
    real argument had no substantive discussion, when in fact both were
    already recorded.
    """
    from apps.conversations.models import Conversation

    return Conversation.objects.filter(
        organization=repo.organization,
        source=Conversation.SOURCE_GITHUB_PR,
        external_id=external_id_for(repo, pr_number),
    ).exists()


def maybe_capture_pr_discussion(installation, repo, pr: dict):
    """Record a merged PR's review discussion as a Conversation.

    Returns the Conversation when one was created, otherwise None. Never
    raises: a capture failure must not fail the webhook, because GitHub
    retries non-2xx and a retry storm is worse than a missed record.
    """
    from django.db import IntegrityError
    from apps.conversations.models import Conversation

    pr_number = pr.get("number")
    if not pr_number:
        return None

    org = repo.organization

    if already_captured(repo, pr_number):
        return None

    external_id = external_id_for(repo, pr_number)

    comments = _collect_comments(installation, repo, pr_number)
    human = [
        c for c in comments
        if not _is_bot(c["user"]) and _is_substantive(c["body"])
    ]

    total_chars = sum(len(c["body"]) for c in human)
    if len(human) < MIN_SUBSTANTIVE_COMMENTS or total_chars < MIN_TOTAL_CHARS:
        logger.info(
            "PR capture: %s#%s not substantive enough (%d comment(s), %d chars)",
            repo.full_name, pr_number, len(human), total_chars,
        )
        return None

    author = _capture_author(installation, org)
    if not author:
        logger.warning(
            "PR capture: no user to attribute %s#%s to in org %s",
            repo.full_name, pr_number, org.id,
        )
        return None

    title = f"PR #{pr_number}: {str(pr.get('title') or '').strip()}"[:255]

    try:
        conversation = Conversation.objects.create(
            organization=org,
            author=author,
            post_type="discussion",
            title=title,
            content=_build_transcript(pr, human),
            priority="medium",
            source=Conversation.SOURCE_GITHUB_PR,
            source_url=str(pr.get("html_url") or "")[:512],
            external_id=external_id,
        )
    except IntegrityError:
        # The unique constraint did its job — a concurrent or re-delivered
        # webhook got here first.
        return None

    logger.info(
        "Captured discussion from %s#%s as conversation %s (%d comments)",
        repo.full_name, pr_number, conversation.id, len(human),
    )

    # Say so. Capture is the one thing here that happens without anyone
    # typing, and it used to happen in silence - a row and a log line - so
    # the only way to learn it was working was to open the list on a hunch.
    # Neither of these may take the capture down with them: the conversation
    # is the valuable part and it is already saved.
    try:
        from apps.notifications.helpers import notify_conversation_captured
        notify_conversation_captured(conversation, repo.full_name, pr_number)
    except Exception:
        logger.exception("Capture notification failed for conversation %s", conversation.id)

    try:
        from apps.organizations.activity import log_activity
        log_activity(
            organization=org,
            actor=author,
            action_type="conversation_captured",
            content_object=conversation,
            title=conversation.title,
            source=f"{repo.full_name}#{pr_number}",
        )
    except Exception:
        logger.exception("Capture activity log failed for conversation %s", conversation.id)

    return conversation
