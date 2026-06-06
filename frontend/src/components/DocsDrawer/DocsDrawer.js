import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeftIcon,
  ArrowTopRightOnSquareIcon,
  ArrowUturnLeftIcon,
  BookOpenIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { DOCUMENTATION_GROUPS, DOCUMENTATION_PAGES } from "../../content/documentationPages";
import { DOCS_DRAWER_SHORTCUT_HINT, useDocsDrawer } from "./DocsDrawerContext";
import "./DocsDrawer.css";

// Flatten every page into a searchable record once at module load. The
// content set ships with the bundle and doesn't change at runtime, so
// rebuilding the index on every search would be wasted work.
const SEARCH_INDEX = DOCUMENTATION_PAGES.map((page) => {
  const sectionBlob = (page.sections || []).map((section) => {
    const parts = [section.heading || ""];
    if (Array.isArray(section.paragraphs)) parts.push(section.paragraphs.join(" "));
    if (Array.isArray(section.bullets)) parts.push(section.bullets.join(" "));
    return parts.join(" ");
  }).join(" ");
  const haystack = [
    page.title || "",
    page.summary || "",
    page.audience || "",
    page.groupTitle || "",
    sectionBlob,
  ].join(" ").toLowerCase();
  return { page, haystack };
});

function rankResults(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const tokens = q.split(/\s+/).filter(Boolean);
  const results = [];
  for (const { page, haystack } of SEARCH_INDEX) {
    let score = 0;
    for (const token of tokens) {
      const inTitle = (page.title || "").toLowerCase().includes(token);
      const inSummary = (page.summary || "").toLowerCase().includes(token);
      const inBody = haystack.includes(token);
      if (inTitle) score += 8;
      if (inSummary) score += 4;
      if (inBody) score += 1;
    }
    if (score > 0) results.push({ page, score });
  }
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, 12);
}

function snippetForQuery(page, query) {
  const q = (query || "").trim().toLowerCase();
  if (!q) return page.summary || "";
  const tokens = q.split(/\s+/).filter(Boolean);
  const bodies = [];
  for (const section of page.sections || []) {
    if (Array.isArray(section.paragraphs)) bodies.push(...section.paragraphs);
    if (Array.isArray(section.bullets)) bodies.push(...section.bullets);
  }
  for (const body of bodies) {
    const lower = body.toLowerCase();
    for (const token of tokens) {
      const idx = lower.indexOf(token);
      if (idx >= 0) {
        const start = Math.max(0, idx - 40);
        const end = Math.min(body.length, idx + 160);
        const prefix = start > 0 ? "…" : "";
        const suffix = end < body.length ? "…" : "";
        return `${prefix}${body.slice(start, end)}${suffix}`;
      }
    }
  }
  return page.summary || "";
}

function highlight(text, query) {
  const q = (query || "").trim();
  if (!q || !text) return text || "";
  const tokens = q.split(/\s+/).filter(Boolean);
  if (!tokens.length) return text;
  const escaped = tokens
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const re = new RegExp(`(${escaped})`, "ig");
  const parts = String(text).split(re);
  return parts.map((part, i) =>
    re.test(part) ? <mark key={i} className="docs-drawer-hit">{part}</mark> : <React.Fragment key={i}>{part}</React.Fragment>
  );
}

function PageBrowser({ onSelect, query }) {
  const groups = DOCUMENTATION_GROUPS;
  return (
    <div className="docs-drawer-browser">
      {groups.map((group) => (
        <section key={group.id} className="docs-drawer-group">
          <h4 className="docs-drawer-group-title">{group.title}</h4>
          <ul className="docs-drawer-group-list">
            {group.pages.map((page) => (
              <li key={page.slug}>
                <button
                  type="button"
                  className="docs-drawer-page-row"
                  onClick={() => onSelect(page.slug)}
                >
                  <span className="docs-drawer-page-title">{highlight(page.title, query)}</span>
                  <span className="docs-drawer-page-summary">{highlight(page.summary, query)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function SearchResults({ results, query, onSelect }) {
  if (!results.length) {
    return (
      <div className="docs-drawer-empty">
        <p>No docs match <strong>"{query}"</strong>.</p>
        <p className="docs-drawer-empty-sub">
          Try a feature name (predictions, drift, agent), a workflow (sprint planning),
          or a concept (workspace memory).
        </p>
      </div>
    );
  }
  return (
    <ul className="docs-drawer-results">
      {results.map(({ page }) => (
        <li key={page.slug}>
          <button
            type="button"
            className="docs-drawer-result"
            onClick={() => onSelect(page.slug)}
          >
            <span className="docs-drawer-result-meta">
              <span className="docs-drawer-result-group">{page.groupTitle}</span>
              {page.readTime ? <span className="docs-drawer-result-read">{page.readTime}</span> : null}
            </span>
            <span className="docs-drawer-result-title">{highlight(page.title, query)}</span>
            <span className="docs-drawer-result-snippet">{highlight(snippetForQuery(page, query), query)}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function PageReader({ page, onBack }) {
  const sections = page.sections || [];
  return (
    <div className="docs-drawer-reader">
      <button type="button" className="docs-drawer-back" onClick={onBack}>
        <ArrowLeftIcon /> Back to docs
      </button>
      <div className="docs-drawer-page-head">
        <span className="docs-drawer-page-group">{page.groupTitle}</span>
        <h2 className="docs-drawer-page-h">{page.title}</h2>
        {page.summary ? <p className="docs-drawer-page-sum">{page.summary}</p> : null}
        <div className="docs-drawer-page-meta">
          {page.readTime ? <span>{page.readTime}</span> : null}
          {page.audience ? <span>For {page.audience}</span> : null}
        </div>
        <a
          className="docs-drawer-open-full"
          href={`/docs/${page.slug}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <ArrowTopRightOnSquareIcon /> Open the full doc
        </a>
      </div>

      {sections.map((section, i) => (
        <section key={i} className="docs-drawer-section">
          {section.heading ? <h3>{section.heading}</h3> : null}
          {Array.isArray(section.paragraphs)
            ? section.paragraphs.map((p, idx) => <p key={idx}>{p}</p>)
            : null}
          {Array.isArray(section.bullets) && section.bullets.length ? (
            <ul>
              {section.bullets.map((b, idx) => <li key={idx}>{b}</li>)}
            </ul>
          ) : null}
        </section>
      ))}
    </div>
  );
}

export default function DocsDrawer() {
  const { isOpen, close, seedSlug } = useDocsDrawer();
  const [query, setQuery] = useState("");
  const [activeSlug, setActiveSlug] = useState(null);
  const inputRef = useRef(null);
  const panelRef = useRef(null);

  // When opened, reset to the search view (or pre-select a seeded page) and
  // focus the search field so the user can type immediately.
  useEffect(() => {
    if (!isOpen) return;
    setQuery("");
    setActiveSlug(seedSlug || null);
    queueMicrotask(() => {
      inputRef.current?.focus();
    });
  }, [isOpen, seedSlug]);

  const results = useMemo(() => rankResults(query), [query]);
  const activePage = useMemo(
    () => (activeSlug ? DOCUMENTATION_PAGES.find((p) => p.slug === activeSlug) || null : null),
    [activeSlug]
  );

  if (!isOpen) return null;

  return (
    <>
      <div className="docs-drawer-scrim" onClick={close} aria-hidden="true" />
      <aside
        ref={panelRef}
        className="docs-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Docs"
      >
        <header className="docs-drawer-head">
          <div className="docs-drawer-head-id">
            <span className="docs-drawer-head-icon"><BookOpenIcon /></span>
            <div>
              <h2 className="docs-drawer-head-title">Help &amp; docs</h2>
              <p className="docs-drawer-head-sub">
                Search the workspace docs without leaving the page.
                <kbd className="docs-drawer-kbd">{DOCS_DRAWER_SHORTCUT_HINT}</kbd>
              </p>
            </div>
          </div>
          <button type="button" className="docs-drawer-close" onClick={close} aria-label="Close docs">
            <XMarkIcon />
          </button>
        </header>

        <div className="docs-drawer-searchbar">
          <MagnifyingGlassIcon />
          <input
            ref={inputRef}
            type="search"
            value={query}
            placeholder="Search docs — features, workflows, integrations"
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search docs"
          />
          {activePage ? (
            <button
              type="button"
              className="docs-drawer-back-mini"
              onClick={() => setActiveSlug(null)}
              title="Back to search"
            >
              <ArrowUturnLeftIcon />
            </button>
          ) : null}
        </div>

        <div className="docs-drawer-body">
          {activePage ? (
            <PageReader page={activePage} onBack={() => setActiveSlug(null)} />
          ) : query.trim() ? (
            <SearchResults results={results} query={query} onSelect={setActiveSlug} />
          ) : (
            <PageBrowser onSelect={setActiveSlug} query={query} />
          )}
        </div>
      </aside>
    </>
  );
}
