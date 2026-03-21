import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  DOCUMENTATION_GROUPS,
  DOCUMENTATION_PAGES,
  findDocumentationPageBySlug,
} from "../content/documentationPages";
import { useTheme } from "../utils/ThemeAndAccessibility";

const DEFAULT_SLUG = "getting-started/overview";

function docsSlugFromPathname(pathname) {
  if (pathname === "/docs" || pathname === "/docs/") return "";
  return pathname.replace(/^\/docs\/?/, "").replace(/\/+$/, "");
}

function sectionId(heading) {
  return heading.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function Documentation() {
  const { darkMode } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === "undefined" ? 1440 : window.innerWidth
  );

  const currentSlug = docsSlugFromPathname(location.pathname);
  const isDocsHome = currentSlug === "";
  const activePage = findDocumentationPageBySlug(currentSlug) || findDocumentationPageBySlug(DEFAULT_SLUG);
  const showingFallback = Boolean(currentSlug && !findDocumentationPageBySlug(currentSlug));

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [currentSlug]);

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const palette = useMemo(
    () =>
      darkMode
        ? {
            page: "#0d0b0c",
            panel: "rgba(26, 23, 25, 0.92)",
            panelAlt: "rgba(34, 29, 31, 0.92)",
            border: "rgba(255,255,255,0.08)",
            text: "#f7efe6",
            muted: "#c1b3a3",
            accent: "#f5b36f",
            accentSoft: "rgba(245,179,111,0.12)",
            link: "#9dcbff",
          }
        : {
            page: "#f6f1e8",
            panel: "rgba(255, 251, 246, 0.94)",
            panelAlt: "rgba(255,255,255,0.9)",
            border: "rgba(73, 53, 35, 0.12)",
            text: "#1e1813",
            muted: "#635646",
            accent: "#9c5522",
            accentSoft: "rgba(156,85,34,0.08)",
            link: "#1e5da8",
          },
    [darkMode]
  );

  const filteredGroups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return DOCUMENTATION_GROUPS;
    return DOCUMENTATION_GROUPS.map((group) => ({
      ...group,
      pages: group.pages.filter((page) =>
        [page.title, page.summary, page.audience, ...(page.sections || []).flatMap((section) => [section.heading, ...(section.paragraphs || []), ...(section.bullets || [])])]
          .join(" ")
          .toLowerCase()
          .includes(needle)
      ),
    })).filter((group) => group.pages.length > 0);
  }, [query]);

  const currentIndex = DOCUMENTATION_PAGES.findIndex((page) => page.slug === activePage.slug);
  const previousPage = currentIndex > 0 ? DOCUMENTATION_PAGES[currentIndex - 1] : null;
  const nextPage = currentIndex >= 0 && currentIndex < DOCUMENTATION_PAGES.length - 1 ? DOCUMENTATION_PAGES[currentIndex + 1] : null;
  const relatedPages = DOCUMENTATION_PAGES.filter((page) => page.groupId === activePage.groupId && page.slug !== activePage.slug).slice(0, 3);
  const isMobile = viewportWidth < 980;
  const isTablet = viewportWidth < 1280;
  const featuredPages = DOCUMENTATION_PAGES.filter((page) =>
    ["getting-started/overview", "workflows/decisions", "intelligence/ask-recall", "integrations/github", "enterprise/compliance", "reference/api-highlights"].includes(page.slug)
  );

  const goToPage = (slug) => navigate(slug ? `/docs/${slug}` : "/docs");

  return (
    <div style={{ background: palette.page, minHeight: "100vh", padding: "clamp(14px,2vw,24px)" }}>
      <div style={{ maxWidth: 1480, margin: "0 auto", display: "grid", gap: 16 }}>
        <section
          style={{
            borderRadius: 28,
            border: `1px solid ${palette.border}`,
            background: `linear-gradient(135deg, ${palette.panel} 0%, ${palette.panelAlt} 100%)`,
            padding: "clamp(18px,3vw,30px)",
            boxShadow: darkMode ? "none" : "0 24px 70px rgba(30, 24, 19, 0.08)",
          }}
        >
          <p style={{ margin: 0, fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: palette.muted }}>
            Knoledgr Documentation
          </p>
          <div style={{ display: "grid", gap: 16, gridTemplateColumns: "minmax(0,1.3fr) minmax(280px,0.7fr)", marginTop: 12 }}>
            <div style={{ minWidth: 0 }}>
              <h1 style={{ margin: 0, fontSize: "clamp(2rem,4vw,3.4rem)", lineHeight: 1.02, color: palette.text }}>
                Complete product docs for teams building with context.
              </h1>
              <p style={{ margin: "14px 0 0", fontSize: 16, lineHeight: 1.75, color: palette.muted, maxWidth: 820 }}>
                Browse setup, workflows, AI behavior, execution systems, integrations, enterprise controls, and technical reference. These docs now map to the real Knoledgr routes and product surfaces.
              </p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
                <Link to="/" style={{ textDecoration: "none", color: palette.text, border: `1px solid ${palette.border}`, background: palette.panelAlt, borderRadius: 999, padding: "11px 16px", fontWeight: 700 }}>
                  Homepage
                </Link>
                <Link to="/login" style={{ textDecoration: "none", color: "#fff8ef", background: palette.accent, borderRadius: 999, padding: "11px 16px", fontWeight: 700 }}>
                  Open Knoledgr
                </Link>
              </div>
            </div>
            <div style={{ display: "grid", gap: 10, alignContent: "start" }}>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search docs, workflows, integrations..."
                style={{ width: "100%", borderRadius: 16, border: `1px solid ${palette.border}`, background: palette.panelAlt, color: palette.text, padding: "13px 14px", fontSize: 14 }}
              />
              <div style={{ display: "grid", gap: 8 }}>
                <p style={{ margin: 0, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: palette.muted }}>Popular reads</p>
                {featuredPages.slice(0, 4).map((page) => (
                  <button
                    key={page.slug}
                    type="button"
                    onClick={() => goToPage(page.slug)}
                    style={{ borderRadius: 16, border: `1px solid ${palette.border}`, background: palette.accentSoft, color: palette.text, padding: "12px 14px", textAlign: "left", cursor: "pointer" }}
                  >
                    <strong style={{ display: "block", fontSize: 14 }}>{page.title}</strong>
                    <span style={{ fontSize: 12, color: palette.muted }}>{page.groupTitle}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div
          style={{
            display: "grid",
            gap: 16,
            gridTemplateColumns: isMobile ? "1fr" : isTablet ? "minmax(250px,300px) minmax(0,1fr)" : "minmax(250px,300px) minmax(0,1fr) minmax(220px,260px)",
            alignItems: "start",
          }}
        >
          <aside style={{ borderRadius: 24, border: `1px solid ${palette.border}`, background: palette.panel, padding: 16, position: "sticky", top: 20, maxHeight: "calc(100vh - 40px)", overflowY: "auto" }}>
            {filteredGroups.map((group) => (
              <div key={group.id} style={{ marginBottom: 14 }}>
                <p style={{ margin: "0 0 8px", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: palette.muted }}>{group.title}</p>
                <div style={{ display: "grid", gap: 6 }}>
                  {group.pages.map((page) => {
                    const active = page.slug === activePage.slug;
                    return (
                      <button
                        key={page.slug}
                        type="button"
                        onClick={() => goToPage(page.slug)}
                        style={{
                          borderRadius: 14,
                          border: `1px solid ${active ? palette.accent : palette.border}`,
                          background: active ? palette.accentSoft : palette.panelAlt,
                          color: active ? palette.text : palette.muted,
                          padding: "10px 12px",
                          textAlign: "left",
                          cursor: "pointer",
                        }}
                      >
                        <strong style={{ display: "block", fontSize: 13 }}>{page.title}</strong>
                        <span style={{ fontSize: 11 }}>{page.readTime}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </aside>

          <main style={{ borderRadius: 24, border: `1px solid ${palette.border}`, background: palette.panel, padding: "clamp(18px,3vw,30px)", minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 12, color: palette.muted }}>{activePage.groupTitle}</p>
            <h2 style={{ margin: "6px 0 0", fontSize: "clamp(1.8rem,3vw,2.8rem)", color: palette.text }}>{activePage.title}</h2>
            <p style={{ margin: "10px 0 0", fontSize: 14, color: palette.muted }}>
              {activePage.readTime} | {activePage.audience}
            </p>
            <p style={{ margin: "16px 0 0", fontSize: 16, lineHeight: 1.8, color: palette.muted }}>{activePage.summary}</p>

            {showingFallback ? (
              <div style={{ marginTop: 18, borderRadius: 18, border: `1px solid ${palette.border}`, background: palette.accentSoft, padding: 14, color: palette.text }}>
                That docs page was not found, so Knoledgr is showing the overview page instead.
              </div>
            ) : null}

            {isDocsHome ? (
              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", marginTop: 20 }}>
                {featuredPages.map((page) => (
                  <button
                    key={page.slug}
                    type="button"
                    onClick={() => goToPage(page.slug)}
                    style={{ borderRadius: 20, border: `1px solid ${palette.border}`, background: palette.panelAlt, padding: 16, textAlign: "left", cursor: "pointer" }}
                  >
                    <p style={{ margin: 0, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: palette.muted }}>{page.groupTitle}</p>
                    <h3 style={{ margin: "8px 0 6px", fontSize: 18, color: palette.text }}>{page.title}</h3>
                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7, color: palette.muted }}>{page.summary}</p>
                  </button>
                ))}
              </div>
            ) : null}

            <div style={{ display: "grid", gap: 12, marginTop: 24 }}>
              {activePage.sections.map((section) => (
                <section key={section.heading} id={sectionId(section.heading)} style={{ borderRadius: 20, border: `1px solid ${palette.border}`, background: palette.panelAlt, padding: 18 }}>
                  <h3 style={{ margin: 0, fontSize: 18, color: palette.text }}>{section.heading}</h3>
                  {(section.paragraphs || []).map((paragraph) => (
                    <p key={paragraph} style={{ margin: "12px 0 0", fontSize: 14, lineHeight: 1.8, color: palette.muted }}>
                      {paragraph}
                    </p>
                  ))}
                  {(section.bullets || []).length ? (
                    <ul style={{ margin: "12px 0 0", paddingLeft: 18, color: palette.muted, lineHeight: 1.75, fontSize: 14 }}>
                      {section.bullets.map((bullet) => (
                        <li key={bullet} style={{ marginBottom: 8 }}>
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              ))}
            </div>

            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", marginTop: 24 }}>
              {previousPage ? <button type="button" onClick={() => goToPage(previousPage.slug)} style={{ borderRadius: 18, border: `1px solid ${palette.border}`, background: palette.panelAlt, padding: 14, textAlign: "left", cursor: "pointer" }}><p style={{ margin: 0, fontSize: 11, color: palette.muted, textTransform: "uppercase", letterSpacing: "0.12em" }}>Previous</p><strong style={{ color: palette.text }}>{previousPage.title}</strong></button> : <div />}
              {nextPage ? <button type="button" onClick={() => goToPage(nextPage.slug)} style={{ borderRadius: 18, border: `1px solid ${palette.border}`, background: palette.panelAlt, padding: 14, textAlign: "left", cursor: "pointer" }}><p style={{ margin: 0, fontSize: 11, color: palette.muted, textTransform: "uppercase", letterSpacing: "0.12em" }}>Next</p><strong style={{ color: palette.text }}>{nextPage.title}</strong></button> : null}
            </div>
          </main>

          {!isTablet ? (
            <aside style={{ borderRadius: 24, border: `1px solid ${palette.border}`, background: palette.panel, padding: 16, position: "sticky", top: 20 }}>
            <p style={{ margin: 0, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: palette.muted }}>On this page</p>
            <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
              {activePage.sections.map((section) => (
                <a key={section.heading} href={`#${sectionId(section.heading)}`} style={{ color: palette.link, fontSize: 13, textDecoration: "none" }}>
                  {section.heading}
                </a>
              ))}
            </div>
            {relatedPages.length ? (
              <div style={{ marginTop: 20 }}>
                <p style={{ margin: 0, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: palette.muted }}>Related docs</p>
                <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                  {relatedPages.map((page) => (
                    <button key={page.slug} type="button" onClick={() => goToPage(page.slug)} style={{ borderRadius: 14, border: `1px solid ${palette.border}`, background: palette.panelAlt, padding: "10px 12px", color: palette.text, textAlign: "left", cursor: "pointer" }}>
                      <strong style={{ display: "block", fontSize: 13 }}>{page.title}</strong>
                      <span style={{ fontSize: 11, color: palette.muted }}>{page.readTime}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            </aside>
          ) : null}
        </div>
      </div>
    </div>
  );
}
