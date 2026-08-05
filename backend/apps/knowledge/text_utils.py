"""Flatten stored bodies into plain text for previews, snippets and context.

Conversation and decision bodies hold editor HTML, and since pull request
capture they also hold generated markup. Anywhere that text is shown outside a
renderer — a citation preview, a search snippet, a card, the context handed to
the agent — it has to be flattened first.

Five helpers were doing this independently, and four of them shared the same
bug: ``strip_tags`` replaces a tag with nothing, which is correct for inline
markup and wrong at a block boundary. ``…merged 2026-08-05.</p><p>Pull request
description</p>`` came out as ``…merged 2026-08-05.Pull request description``,
fusing the last word of one paragraph onto the first word of the next. Every
citation preview on the Ask Recall page read that way.

It is one function now so the next caller inherits the fix instead of the bug.
"""

from __future__ import annotations

import re
from html import unescape

from django.utils.html import strip_tags

# Closing block-level tags imply a sentence break, so they become whitespace
# before the rest of the markup is stripped.
_BLOCK_END_RE = re.compile(
    r'</(p|div|li|h[1-6]|blockquote|tr|td|th|section|article|figcaption)>',
    re.IGNORECASE,
)
_BR_RE = re.compile(r'<br\s*/?>', re.IGNORECASE)

# Markdown syntax, for bodies that were never HTML.
_MD_IMAGE_RE = re.compile(r'!\[([^\]]*)\]\([^)]*\)')
_MD_LINK_RE = re.compile(r'\[([^\]]*)\]\([^)]*\)')
_MD_HEADING_RE = re.compile(r'^\s{0,3}#{1,6}\s+', re.MULTILINE)
_MD_QUOTE_RE = re.compile(r'^\s{0,3}>\s?', re.MULTILINE)
_MD_BOLD_RE = re.compile(r'(\*\*|__)(.*?)\1', re.DOTALL)
_MD_CODE_RE = re.compile(r'`{1,3}([^`]*)`{1,3}', re.DOTALL)


def to_plain_text(value, limit: int | None = None, ellipsis: str = '...') -> str:
    """Return ``value`` as a single line of readable plain text.

    ``limit`` truncates on a word boundary rather than mid-word, so a preview
    does not end halfway through a token.
    """
    text = str(value or '')
    if not text.strip():
        return ''

    text = _BR_RE.sub(' ', text)
    text = _BLOCK_END_RE.sub(' ', text)
    text = unescape(strip_tags(text))

    text = _MD_IMAGE_RE.sub(r'\1', text)
    text = _MD_LINK_RE.sub(r'\1', text)
    text = _MD_HEADING_RE.sub('', text)
    text = _MD_QUOTE_RE.sub('', text)
    text = _MD_BOLD_RE.sub(r'\2', text)
    text = _MD_CODE_RE.sub(r'\1', text)

    text = ' '.join(text.split())

    if limit is None or len(text) <= limit:
        return text

    cut = text[:limit]
    last_space = cut.rfind(' ')
    if last_space > limit * 0.6:
        cut = cut[:last_space]
    return f'{cut.rstrip()}{ellipsis}'
