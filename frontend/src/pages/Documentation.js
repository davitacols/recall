import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { MagnifyingGlassIcon, ArrowRightIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";
import {
  DOCUMENTATION_GROUPS,
  DOCUMENTATION_PAGES,
  findDocumentationPageBySlug,
} from "../content/documentationPages";
import "./Documentation.css";

const DEFAULT_SLUG = "getting-started/overview";

function docsSlugFromPathname(pathname) {
  if (pathname === "/docs" || pathname === "/docs/") return "";
  return pathname.replace(/^\/docs\/?/, "").replace(/\/+$/, "");
}

function sectionId(heading) {
  return String(heading || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function formatExamplePayload(value) {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  return JSON.stringify(value, null, 2);
}

function methodClass(method) {
  const m = String(method || "").toLowerCase();
  if (m === "get") return "doc-method doc-method-get";
  if (m === "post") return "doc-method doc-method-post";
  if (m === "put") return "doc-method doc-method-put";
  if (m === "patch") return "doc-method doc-method-patch";
  if (m === "delete") return "doc-method doc-method-delete";
  return "doc-method";
}

function searchMatch(page, needle) {
  if (!needle) return true;
  const blob = [
    page.title,
    page.summary,
    page.audience,
    ...(page.routes || []),
    ...(page.workflow?.steps || []).flatMap((step) => [step.title, step.detail]),
    page.visual?.title || "",
    page.visual?.caption || "",
    ...(page.visual?.panels || []).flatMap((panel) => [panel.title, panel.value, panel.helper]),
    ...(page.examples || []).flatMap((example) => [
      example.title,
      example.description,
      example.method,
      example.endpoint,
      formatExamplePayload(example.request),
      formatExamplePayload(example.response),
    ]),
    ...(page.sections || []).flatMap((section) => [
      section.heading,
      ...(section.paragraphs || []),
      ...(section.bullets || []),
    ]),
  ]
    .join(" ")
    .toLowerCase();
  return blob.includes(needle.toLowerCase());
}

export default function Documentation() {
  const location = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const currentSlug = docsSlugFromPathname(location.pathname);
  const isDocsHome = currentSlug === "";
  const activePage =
    findDocumentationPageBySlug(currentSlug) || findDocumentationPageBySlug(DEFAULT_SLUG);
  const showingFallback = Boolean(currentSlug && !findDocumentationPageBySlug(currentSlug));

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [currentSlug]);

  const filteredGroups = useMemo(() => {
    const needle = query.trim();
    if (!needle) return DOCUMENTATION_GROUPS;
    return DOCUMENTATION_GROUPS
      .map((group) => ({
        ...group,
        pages: group.pages.filter((page) => searchMatch(page, needle)),
      }))
      .filter((group) => group.pages.length > 0);
  }, [query]);

  const currentIndex = DOCUMENTATION_PAGES.findIndex((page) => page.slug === activePage.slug);
  const previousPage = currentIndex > 0 ? DOCUMENTATION_PAGES[currentIndex - 1] : null;
  const nextPage =
    currentIndex >= 0 && currentIndex < DOCUMENTATION_PAGES.length - 1
      ? DOCUMENTATION_PAGES[currentIndex + 1]
      : null;
  const relatedPages = DOCUMENTATION_PAGES.filter(
    (page) => page.groupId === activePage.groupId && page.slug !== activePage.slug
  ).slice(0, 4);

  const onPageItems = [
    ...(activePage.workflow ? [{ id: "workflow", label: activePage.workflow.title || "Workflow" }] : []),
    ...(activePage.visual ? [{ id: "surface-map", label: activePage.visual.title || "Surface map" }] : []),
    ...((activePage.sections || []).map((section) => ({ id: sectionId(section.heading), label: section.heading }))),
    ...((activePage.examples || []).length ? [{ id: "api-examples", label: activePage.examplesTitle || "API examples" }] : []),
  ];

  const goToPage = (slug) => navigate(slug ? `/docs/${slug}` : "/docs");

  return (
    <div className="doc-shell">
      <header className="doc-topbar">
        <div className="doc-topbar-inner">
          <Link to="/" className="doc-brand">
            <span className="doc-brand-mark">K</span>
            Knoledgr
            <span className="doc-brand-tag">Docs</span>
          </Link>

          <div className="doc-topbar-search">
            <MagnifyingGlassIcon />
            <input
              type="search"
              value={query}
              placeholder="Search docs — features, workflows, integrations"
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search docs"
            />
          </div>

          <div className="doc-topbar-actions">
            <Link to="/" className="doc-topbar-btn">Homepage</Link>
            <Link to="/login" className="doc-topbar-btn is-primary">Open Knoledgr</Link>
          </div>
        </div>
      </header>

      <div className="doc-grid">
        {/* Left nav */}
        <nav className="doc-nav" aria-label="Documentation">
          {filteredGroups.length === 0 ? (
            <div className="doc-nav-empty">No pages match that search.</div>
          ) : (
            filteredGroups.map((group) => (
              <div key={group.id} className="doc-nav-group">
                <h3 className="doc-nav-group-title">{group.title}</h3>
                <ul className="doc-nav-list">
                  {group.pages.map((page) => {
                    const active = page.slug === activePage.slug;
                    return (
                      <li key={page.slug}>
                        <button
                          type="button"
                          className={`doc-nav-link${active ? " is-active" : ""}`}
                          onClick={() => goToPage(page.slug)}
                        >
                          {page.title}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </nav>

        {/* Main content */}
        <article className="doc-content">
          <div className="doc-breadcrumb">
            <Link to="/docs">Docs</Link>
            <span className="doc-breadcrumb-sep">/</span>
            <span>{activePage.groupTitle}</span>
            <span className="doc-breadcrumb-sep">/</span>
            <span>{activePage.title}</span>
          </div>

          <h1 className="doc-page-title">{activePage.title}</h1>
          {activePage.summary ? <p className="doc-page-summary">{activePage.summary}</p> : null}

          <div className="doc-page-meta">
            {activePage.readTime ? <span><strong>Read time:</strong> {activePage.readTime}</span> : null}
            {activePage.audience ? <span><strong>For:</strong> {activePage.audience}</span> : null}
          </div>

          {(activePage.routes || []).length ? (
            <div className="doc-routes">
              {activePage.routes.map((route) => (
                <span key={route} className="doc-route">{route}</span>
              ))}
            </div>
          ) : null}

          {showingFallback ? (
            <div className="doc-fallback">
              That docs page was not found, so Knoledgr is showing the overview page instead.
            </div>
          ) : null}

          {isDocsHome ? <DocsHome onSelect={goToPage} /> : null}

          {activePage.workflow ? (
            <section id="workflow" className="doc-callout">
              <p className="doc-callout-eyebrow">{activePage.workflow.eyebrow || "Workflow"}</p>
              <h2 className="doc-callout-title">{activePage.workflow.title}</h2>
              {activePage.workflow.description ? (
                <p className="doc-callout-sub">{activePage.workflow.description}</p>
              ) : null}
              <div className="doc-card-grid">
                {activePage.workflow.steps.map((step, index) => (
                  <article key={`${step.title}-${index}`} className="doc-card">
                    <p className="doc-card-step">Step {index + 1}</p>
                    <p className="doc-card-title">{step.title}</p>
                    <p className="doc-card-helper">{step.detail}</p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {activePage.visual ? (
            <section id="surface-map" className="doc-callout">
              <p className="doc-callout-eyebrow">{activePage.visual.eyebrow || "Surface map"}</p>
              <h2 className="doc-callout-title">{activePage.visual.title}</h2>
              {activePage.visual.caption ? (
                <p className="doc-callout-sub">{activePage.visual.caption}</p>
              ) : null}
              <div className="doc-card-grid">
                {activePage.visual.panels.map((panel) => (
                  <article key={panel.title} className={`doc-card${panel.emphasis ? " is-emphasis" : ""}`}>
                    <p className="doc-card-step">{panel.title}</p>
                    <p className="doc-card-value">{panel.value}</p>
                    {panel.helper ? <p className="doc-card-helper">{panel.helper}</p> : null}
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          <div className="doc-prose">
            {(activePage.sections || []).map((section) => (
              <section key={section.heading} id={sectionId(section.heading)}>
                <h2>{section.heading}</h2>
                {(section.paragraphs || []).map((paragraph, idx) => (
                  <p key={idx}>{paragraph}</p>
                ))}
                {(section.bullets || []).length ? (
                  <ul>
                    {section.bullets.map((bullet, idx) => (
                      <li key={idx}>{bullet}</li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </div>

          {(activePage.examples || []).length ? (
            <section id="api-examples" className="doc-callout" style={{ marginTop: 48 }}>
              <p className="doc-callout-eyebrow">{activePage.examplesEyebrow || "API examples"}</p>
              <h2 className="doc-callout-title">
                {activePage.examplesTitle || "Implementation examples"}
              </h2>
              {activePage.examplesDescription ? (
                <p className="doc-callout-sub">{activePage.examplesDescription}</p>
              ) : null}
              <div className="doc-examples">
                {activePage.examples.map((example) => (
                  <article
                    key={`${example.method}-${example.endpoint}-${example.title}`}
                    className="doc-example"
                  >
                    <div className="doc-example-head">
                      <span className={methodClass(example.method)}>{example.method}</span>
                      <code className="doc-endpoint">{example.endpoint}</code>
                    </div>
                    <p className="doc-example-title">{example.title}</p>
                    {example.description ? (
                      <p className="doc-example-desc">{example.description}</p>
                    ) : null}
                    {(example.request || example.response) ? (
                      <div className="doc-codepair">
                        {example.request ? (
                          <div className="doc-code-card">
                            <p className="doc-code-label">Request</p>
                            <pre>{formatExamplePayload(example.request)}</pre>
                          </div>
                        ) : null}
                        {example.response ? (
                          <div className="doc-code-card">
                            <p className="doc-code-label">Response</p>
                            <pre>{formatExamplePayload(example.response)}</pre>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {(previousPage || nextPage) ? (
            <div className="doc-prevnext">
              {previousPage ? (
                <button type="button" className="doc-prevnext-btn" onClick={() => goToPage(previousPage.slug)}>
                  <span className="doc-prevnext-eyebrow"><ArrowLeftIcon style={{ width: 12, height: 12, verticalAlign: "middle", marginRight: 4 }} />Previous</span>
                  <span className="doc-prevnext-title">{previousPage.title}</span>
                </button>
              ) : <div />}
              {nextPage ? (
                <button type="button" className="doc-prevnext-btn is-next" onClick={() => goToPage(nextPage.slug)}>
                  <span className="doc-prevnext-eyebrow">Next<ArrowRightIcon style={{ width: 12, height: 12, verticalAlign: "middle", marginLeft: 4 }} /></span>
                  <span className="doc-prevnext-title">{nextPage.title}</span>
                </button>
              ) : null}
            </div>
          ) : null}
        </article>

        {/* Right rail */}
        <aside className="doc-onthispage" aria-label="On this page">
          {onPageItems.length ? (
            <>
              <p className="doc-rail-title">On this page</p>
              <ul className="doc-onthispage-list">
                {onPageItems.map((item) => (
                  <li key={item.id}>
                    <a href={`#${item.id}`}>{item.label}</a>
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          {relatedPages.length ? (
            <>
              <p className="doc-rail-title">Related</p>
              <ul className="doc-related-list">
                {relatedPages.map((page) => (
                  <li key={page.slug}>
                    <button
                      type="button"
                      className="doc-related-link"
                      onClick={() => goToPage(page.slug)}
                    >
                      <span className="doc-related-title">{page.title}</span>
                      {page.readTime ? <span className="doc-related-read">{page.readTime}</span> : null}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function DocsHome({ onSelect }) {
  return (
    <div className="doc-home">
      {DOCUMENTATION_GROUPS.map((group) => (
        <section key={group.id}>
          <h2 className="doc-home-group-title">{group.title}</h2>
          <div className="doc-home-grid">
            {group.pages.map((page) => (
              <button
                key={page.slug}
                type="button"
                className="doc-home-card"
                onClick={() => onSelect(page.slug)}
              >
                <span className="doc-home-card-title">{page.title}</span>
                <span className="doc-home-card-summary">{page.summary}</span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
