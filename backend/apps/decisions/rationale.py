"""Extract the reasoning behind a decision from the discussion that produced it.

More than half of the decisions recorded so far have an empty rationale. That is
the one field the product exists to preserve: a decision without its "why" is a
row in a list, and six months later it is exactly as useless as the ticket that
prompted the question.

Part of the cause was mechanical — the convert flow reused
generate_sprint_update_summary, whose prompt asks for "a summary of this sprint
update". That yields a description of *what was said*, not *why it was chosen*.

The important rule here: when the source does not actually contain reasoning,
this returns empty rather than inventing something. A fabricated "why" in a
decision-memory tool is worse than a blank one — a blank invites someone to fill
it in, while a plausible invention gets trusted, cited, and acted on.
"""

from __future__ import annotations

import logging

from django.conf import settings

logger = logging.getLogger(__name__)

_PROMPT = """You are extracting the reasoning behind a decision from a team discussion.

Return ONLY the reasoning: the goal being served, tradeoffs weighed, constraints
that forced the choice, or alternatives rejected. Do not narrate what the
discussion was about, and do not simply restate the decision.

Rules:
- 1-3 sentences, plain prose, no preamble and no bullet points.
- Use only what the text supports. Never infer motives that are not stated.
- A brief reason still counts. "We are moving to X for better performance"
  states a reason — capture it. Length is not the test.
- Reply with exactly NO_RATIONALE only when the text gives no reason at all:
  it announces a decision, a fact or a logistic and nothing more.

Examples:
- "Standup is at 9:30." -> NO_RATIONALE (a fact, no reason)
- "We want to adopt deep learning for v3" -> NO_RATIONALE (a want, no reason)
- "Moving to Postgres for better JSON support" -> the JSON support is the reason

Title: {title}

Discussion:
{content}"""

_SENTINEL = "NO_RATIONALE"
_MAX_CONTENT = 6000


class RationaleUnavailable(Exception):
    """The source could not be examined at all.

    Distinct from "the source contains no reasoning", and the distinction is
    the whole point. Both used to come back as an empty string, so a caller
    reporting on the result told the user their decisions had no reasoning in
    them when in fact the API had refused every request — a confident verdict
    about records nothing had read. An expired API key or an exhausted credit
    balance would quietly become a statement about the quality of the record.
    """


def generate_decision_rationale(title: str, content: str, *, strict: bool = False) -> str:
    """Return the reasoning behind a decision, or '' when there is none to find.

    Never raises by default: capture must not fail because an LLM call did. A
    decision recorded without a rationale is recoverable; a decision not
    recorded at all is lost.

    Pass strict=True when the caller reports its results to a person and the
    difference between "no reasoning here" and "could not check" matters.
    """
    text = str(content or "").strip()
    if not text:
        return ""

    api_key = getattr(settings, "ANTHROPIC_API_KEY", "")
    if not api_key:
        # No silent degradation to a word-count "summary" — that is what filled
        # the field with restatements in the first place. Better empty.
        logger.info("Rationale extraction skipped: no ANTHROPIC_API_KEY configured")
        if strict:
            raise RationaleUnavailable("No ANTHROPIC_API_KEY is configured")
        return ""

    try:
        import anthropic

        client = anthropic.Anthropic(api_key=api_key, timeout=20.0, max_retries=1)
        message = client.messages.create(
            model=getattr(settings, "CLAUDE_MODEL", "claude-sonnet-4-6"),
            max_tokens=220,
            messages=[{
                "role": "user",
                "content": _PROMPT.format(title=str(title or "")[:300], content=text[:_MAX_CONTENT]),
            }],
        )
        parts = getattr(message, "content", None) or []
        answer = "".join(getattr(p, "text", "") for p in parts).strip()
    except Exception as exc:
        # Under strict the caller surfaces this, so a traceback per decision is
        # just noise burying the one line that matters.
        if strict:
            raise RationaleUnavailable(str(exc)) from exc
        logger.exception("Rationale extraction failed for %r", str(title)[:80])
        return ""

    if not answer or _SENTINEL in answer.upper():
        return ""

    # A model that ignores the instruction and returns a paragraph of preamble
    # is more likely restating than reasoning; keep the field trustworthy.
    if len(answer) > 900:
        answer = answer[:900].rsplit(" ", 1)[0] + "…"
    return answer
