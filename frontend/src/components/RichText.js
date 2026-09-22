import React, { useMemo } from "react";
import DOMPurify from "dompurify";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * RichText — renders a body of user content that may be either HTML or markdown.
 *
 * The app stores both, in the same fields, and until now each surface picked
 * one format and rendered the other one wrongly. Conversations used
 * dangerouslySetInnerHTML, so a markdown body showed literal `**` and `>`.
 * Decisions used ReactMarkdown, so an HTML body showed its tags as text — and
 * because converting a conversation copies its content into the decision
 * verbatim, every decision converted from an editor-written thread displayed
 * raw markup. That was 7 of 23 decisions before this component existed.
 *
 * Guessing the format from the content is not elegant, but the alternative is
 * a migration that rewrites every stored body and an editor change, and it
 * would still have to guess for the existing rows. Detection keeps both
 * formats readable today and leaves that migration possible later.
 *
 * Sanitisation is not optional here. These fields hold text written by
 * workspace members and, since PR capture, by anyone who can comment on a
 * connected repository. Sanitising at the render boundary protects every
 * source at once, including the next integration that writes into them.
 */

const REMARK_PLUGINS = [remarkGfm];

// A tag we actually emit or that an editor produces. Deliberately not a
// general "does this contain angle brackets" test: prose about generics or a
// shell pipeline should stay markdown, not be reinterpreted as HTML.
const HTML_RE = /<(\/?)(p|div|br|strong|b|em|i|u|s|ul|ol|li|h[1-6]|blockquote|pre|code|a|img|span|table|thead|tbody|tr|td|th)\b[^>]*>/i;

export function looksLikeHtml(value) {
  return HTML_RE.test(String(value || ""));
}

/**
 * Plain-text excerpt for headers, cards, previews and anywhere else a body is
 * shown outside a renderer.
 *
 * Slicing a stored body directly is what put `<p>Captured from <a href=…` in a
 * page subtitle: the content is HTML or markdown, but the destination is a
 * plain string, so the markup is displayed as prose. Cutting at a fixed offset
 * also truncates mid-tag and mid-word.
 */
export function toPlainExcerpt(value, maxLength = 220) {
  let text = String(value || "");

  // Block-level tags carry a sentence break; without this, "…tenacity.</p><p>My
  // first instinct…" becomes "…tenacity.My first instinct…".
  text = text.replace(/<\/(p|div|li|h[1-6]|blockquote|tr)>/gi, " ");
  text = text.replace(/<br\s*\/?>/gi, " ");
  text = text.replace(/<[^>]*>/g, "");

  // Entities, since the text came out of an HTML context.
  const entities = {
    "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">",
    "&quot;": '"', "&#x27;": "'", "&#39;": "'", "&mdash;": "—", "&ndash;": "–",
  };
  text = text.replace(/&(nbsp|amp|lt|gt|quot|#x27|#39|mdash|ndash);/g, (m) => entities[m] || m);

  // Markdown syntax, for bodies that were never HTML in the first place.
  text = text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s{0,3}>\s?/gm, "")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(^|\W)[*_]([^*_]+)[*_](\W|$)/g, "$1$2$3")
    .replace(/`{1,3}([^`]*)`{1,3}/g, "$1");

  text = text.replace(/\s+/g, " ").trim();

  if (text.length <= maxLength) return text;
  // Cut on a word boundary so the excerpt does not end mid-word.
  const cut = text.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > maxLength * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

const SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    "p", "br", "hr", "div", "span",
    "strong", "b", "em", "i", "u", "s", "del", "mark",
    "ul", "ol", "li",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "blockquote", "pre", "code",
    "a", "img",
    "table", "thead", "tbody", "tr", "td", "th",
  ],
  ALLOWED_ATTR: ["href", "title", "target", "rel", "src", "alt", "class"],
  // javascript: and data: URIs are how a sanitiser gets bypassed by an href.
  ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|#|\/)/i,
  FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form", "input"],
  FORBID_ATTR: ["style", "onerror", "onload", "onclick"],
};


/* Markdown collapses a single newline into a space, so text typed the way
   people actually type — one line per thought, one Enter between them —
   renders as an unbroken wall. That is right for prose written as markdown
   and wrong for everything else that lands in these fields: pasted notes,
   captured transcripts, anything a person wrote in a textarea.
   
   Fenced code blocks are split out first and left exactly as they are, since
   a hard break inside one would change the code. */
function preserveLineBreaks(markdown) {
  return markdown
    .split(/(```[\s\S]*?```)/g)
    .map((chunk, index) =>
      index % 2 === 1 ? chunk : chunk.replace(/([^\n])\n(?!\n)/g, "$1  \n")
    )
    .join("");
}

export default function RichText({ content, className = "" }) {
  const value = String(content || "");
  const isHtml = looksLikeHtml(value);

  const clean = useMemo(
    () => (isHtml ? DOMPurify.sanitize(value, SANITIZE_CONFIG) : ""),
    [value, isHtml]
  );

  const markdown = useMemo(
    () => (isHtml ? "" : preserveLineBreaks(value)),
    [value, isHtml]
  );

  if (!value.trim()) return null;

  if (isHtml) {
    return (
      <div
        className={`rich-text ${className}`.trim()}
        // Sanitised immediately above with an allow-list. The only path into
        // this element is DOMPurify's output.
        dangerouslySetInnerHTML={{ __html: clean }}
      />
    );
  }

  return (
    <div className={`rich-text ${className}`.trim()}>
      <ReactMarkdown
        remarkPlugins={REMARK_PLUGINS}
        components={{
          // Markdown links are equally untrusted; never hand a tab opener a
          // reference back to this window.
          a: ({ node, ...props }) => (
            <a {...props} target="_blank" rel="noreferrer noopener" />
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
