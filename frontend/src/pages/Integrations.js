import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  CodeBracketIcon,
  CommandLineIcon,
  CubeTransparentIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  RectangleStackIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import api from "../services/api";
import { PageHeader } from "../components/atlas";
import "./Integrations.css";

// ─── catalog ────────────────────────────────────────────────────────────────

const CATALOG = [
  {
    key: "github",
    name: "GitHub",
    category: "Engineering",
    summary: "Link pull requests to decisions via a proper GitHub App install. Per-repo control, no personal access tokens, structured webhook delivery.",
    href: "/integrations/github",
    Glyph: GitHubGlyph,
    accentVar: "--int-accent-github",
    available: true,
  },
  {
    key: "slack",
    name: "Slack",
    category: "Notifications",
    summary: "Broadcast decision events, off-track outcomes, and stalled conversations to a Slack channel.",
    href: "/integrations#slack",
    Glyph: SlackGlyph,
    accentVar: "--int-accent-slack",
    available: true,
  },
  {
    key: "webhooks",
    name: "Outbound webhooks",
    category: "Engineering",
    summary: "Subscribe a URL to workspace events with HMAC-SHA256 signed deliveries and retry policy.",
    href: "/settings/webhooks",
    Glyph: WebhookGlyph,
    accentVar: "--int-accent-webhooks",
    available: true,
  },
  {
    key: "jira",
    name: "Jira",
    category: "Engineering",
    summary: "Mirror issues and decisions into Jira projects for delivery teams that still need a portfolio surface.",
    href: "/integrations#jira",
    Glyph: JiraGlyph,
    accentVar: "--int-accent-jira",
    available: true,
  },
  {
    key: "linear",
    name: "Linear",
    category: "Engineering",
    summary: "Bidirectional sync between Knoledgr decisions and Linear issues. Roadmap candidates and engineering work.",
    Glyph: LinearGlyph,
    accentVar: "--int-accent-linear",
    available: false,
    eta: "Q3 roadmap",
  },
  {
    key: "gitlab",
    name: "GitLab",
    category: "Engineering",
    summary: "Coming soon. Same shape as the GitHub App, scoped to GitLab projects.",
    Glyph: GitLabGlyph,
    accentVar: "--int-accent-gitlab",
    available: false,
    eta: "Vote it up to bump priority",
  },
  {
    key: "teams",
    name: "Microsoft Teams",
    category: "Notifications",
    summary: "Send the same decision and drift alerts to a Teams channel via an Incoming Webhook.",
    Glyph: TeamsGlyph,
    accentVar: "--int-accent-teams",
    available: false,
    eta: "Q3 roadmap",
  },
  {
    key: "notion",
    name: "Notion",
    category: "Knowledge",
    summary: "Push decision summaries and lessons into a Notion database keyed by your decision id.",
    Glyph: NotionGlyph,
    accentVar: "--int-accent-notion",
    available: false,
    eta: "Roadmap",
  },
];

const CATEGORIES = ["All", "Engineering", "Notifications", "Knowledge"];

// ─── page ───────────────────────────────────────────────────────────────────

export default function Integrations() {
  const [status, setStatus] = useState({});
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.allSettled([
      api.get("/api/integrations/github/app/"),
      api.get("/api/integrations/slack/"),
      api.get("/api/integrations/jira/"),
    ])
      .then(([gh, sl, ji]) => {
        if (!mounted) return;
        const next = {};
        if (gh.status === "fulfilled") {
          const data = gh.value?.data?.github_app;
          next.github = data && data.connected
            ? { connected: true, label: data.account_login }
            : { connected: false };
        }
        if (sl.status === "fulfilled") {
          const data = sl.value?.data;
          next.slack = data && (data.enabled || data.webhook_url)
            ? { connected: true, label: data.channel || "configured" }
            : { connected: false };
        }
        if (ji.status === "fulfilled") {
          const data = ji.value?.data;
          next.jira = data && data.enabled
            ? { connected: true, label: data.project_key || "configured" }
            : { connected: false };
        }
        // We always offer outbound webhooks since the model + endpoints
        // exist. Status is "available" — admin opens the manager.
        next.webhooks = { connected: false };
        setStatus(next);
      })
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CATALOG.filter((item) => {
      if (category !== "All" && item.category !== category) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q)
        || item.summary.toLowerCase().includes(q)
        || item.category.toLowerCase().includes(q)
      );
    });
  }, [query, category]);

  const connectedCount = useMemo(
    () => Object.values(status).filter((s) => s?.connected).length,
    [status]
  );
  const availableCount = useMemo(() => CATALOG.filter((c) => c.available).length, []);

  return (
    <div className="int-page">
      <PageHeader
        breadcrumb={[{ label: "Knoledgr", to: "/" }, { label: "Integrations" }]}
        title="Integrations"
        subtitle="Connect Knoledgr to the tools your team already uses. Each provider runs on its own dedicated page — pick one to configure."
        style={{ padding: "24px 0 0", background: "transparent" }}
      />

      <div className="int-strip">
        <div className="int-strip-search">
          <MagnifyingGlassIcon />
          <input
            type="search"
            value={query}
            placeholder="Search integrations"
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search integrations"
          />
        </div>
        <div className="int-strip-cats">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              className={`int-cat${category === c ? " is-active" : ""}`}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="int-strip-count">
          <CheckCircleIcon />
          <strong>{connectedCount}</strong>
          <span>of {availableCount} connected</span>
        </div>
      </div>

      <div className="int-grid">
        {filtered.length === 0 ? (
          <div className="int-empty">No integrations match that search.</div>
        ) : (
          filtered.map((item) => (
            <Card
              key={item.key}
              item={item}
              status={status[item.key]}
              loading={loading}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── card ───────────────────────────────────────────────────────────────────

function Card({ item, status, loading }) {
  const { Glyph } = item;
  const connected = status?.connected;
  const unavailable = !item.available;

  const Body = (
    <>
      <div className="int-card-head">
        <span className="int-card-glyph" style={{ "--accent": `var(${item.accentVar})` }}>
          <Glyph />
        </span>
        <span
          className={
            unavailable
              ? "int-card-pill int-card-pill-soon"
              : connected
              ? "int-card-pill int-card-pill-on"
              : "int-card-pill int-card-pill-off"
          }
        >
          {unavailable ? (
            <>Coming soon</>
          ) : loading ? (
            <>…</>
          ) : connected ? (
            <>
              <CheckCircleIcon />
              {status?.label || "Connected"}
            </>
          ) : (
            <>Available</>
          )}
        </span>
      </div>
      <h3 className="int-card-title">{item.name}</h3>
      <p className="int-card-summary">{item.summary}</p>
      <div className="int-card-foot">
        <span className="int-card-category">{item.category}</span>
        {unavailable ? (
          <span className="int-card-eta">
            <ExclamationTriangleIcon />
            {item.eta || "Not yet available"}
          </span>
        ) : connected ? (
          <span className="int-card-cta">
            Manage <ArrowTopRightOnSquareIcon />
          </span>
        ) : (
          <span className="int-card-cta">
            Configure <ArrowTopRightOnSquareIcon />
          </span>
        )}
      </div>
    </>
  );

  if (unavailable) {
    return (
      <article className="int-card is-disabled" aria-disabled="true">
        {Body}
      </article>
    );
  }

  return (
    <Link to={item.href} className="int-card">
      {Body}
    </Link>
  );
}

// ─── brand glyphs (inline SVG; no external icon load) ───────────────────────

function GitHubGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56l-.01-2c-3.2.7-3.87-1.54-3.87-1.54-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.56-.29-5.25-1.28-5.25-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.12 3.05.74.81 1.18 1.83 1.18 3.09 0 4.42-2.69 5.39-5.26 5.68.41.36.78 1.06.78 2.14l-.01 3.17c0 .31.21.67.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}
function SlackGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M5 14a2 2 0 1 1 0-4h2v4H5Zm5 5a2 2 0 1 1-4 0v-2h4v2Zm-2-9a2 2 0 1 1 4 0v5H8v-5Zm9 4a2 2 0 1 1 0 4h-2v-4h2Zm-5-5a2 2 0 1 1 4 0v2h-4V9Zm2 9a2 2 0 1 1-4 0v-5h4v5ZM10 5a2 2 0 1 1 4 0v2h-4V5Zm9 4a2 2 0 1 1 0-4h2v4h-2Z" />
    </svg>
  );
}
function JiraGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M11.4 0H22a10.6 10.6 0 0 1-10.6 10.6h-3.3v3.3A10.6 10.6 0 0 1 18.7 24H7.5V12.8a1.4 1.4 0 0 0-1.4-1.4H0a8.1 8.1 0 0 1 8.1-8.1h3.3V0Zm1.2 14.3a10.6 10.6 0 0 0 9.4 9.7v-8.3a1.4 1.4 0 0 0-1.4-1.4h-8Z" />
    </svg>
  );
}
function LinearGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3 14.2C4.4 19 8.5 22.5 13.5 22.9L3 12.4v1.8Zm0-4.5L14.4 21A10 10 0 0 0 21 14.3L9.7 3a10 10 0 0 0-6.7 6.7Zm.7-3.4L18.2 21A10 10 0 0 0 21.7 17.5L6.5 2.3a10 10 0 0 0-2.8 4Zm2.9-3.6L20.4 19.8A10 10 0 0 0 22 13.3L10.7 2A10 10 0 0 0 6.6 2.7Z" />
    </svg>
  );
}
function GitLabGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 22 4.7 9.2 3 4.4l9 16.4 9-16.4-1.7 4.8L12 22Zm0 0 4.6-12.8h-9.2L12 22Zm-9-17.6 1.7 4.8 7.3 12.8H7.3L3 4.4Zm18 0L16.7 22h-5.4l7.3-12.8L21 4.4Z" />
    </svg>
  );
}
function TeamsGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3 6h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Zm15.5 1A3 3 0 1 1 21 8.4V8a3 3 0 0 1-2.5 1Zm0 3.5h3a1 1 0 0 1 1 1V17a3 3 0 0 1-3 3h-.5a4 4 0 0 0-1-3.5l1.5-6Zm-12 1.5H5a.5.5 0 0 0 0 1h1.5v4.5a.5.5 0 0 0 1 0V13H9a.5.5 0 0 0 0-1H6.5Z" />
    </svg>
  );
}
function NotionGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M4.5 3.1 17.1 2c1-.1 1.3 0 1.9.5l3 2.6c.4.3.6.5.6 1v15c0 .9-.4 1.6-1.7 1.6L5.4 23.7c-.9.1-1.4 0-2-.6l-2.3-3c-.3-.4-.5-.7-.5-1.1V4.8c0-.7.3-1.3 1.9-1.4Zm12 .9-12 .8c-.4 0-.5.2-.4.6l2.3 1.9c.3.3.7.2 1.1.2l12-.7c.4 0 .2-.2.1-.3L17 4.2c-.2-.2-.4-.2-.5-.2Zm-.5 4.7v11.6c0 .6-.3.8-.9.8l-3.1.2c-.6 0-.8-.3-1.1-.7L7 12.7c-.3-.4-.5-.6-1-.6L4 12.3c-.5 0-.7-.3-.7-.8V7.7c0-.4.2-.7.8-.7L16 6.2c.5 0 .7.2 1 .5Z" />
    </svg>
  );
}
function WebhookGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 21a4 4 0 1 1-3.5-5.9l1.7-3a6 6 0 1 1 9.4-7.5 6 6 0 0 1 1 3l1 3.6a4 4 0 1 1-1.8.4l-1.1-4a4 4 0 1 0-5.4 4.5l-2 3.6A4 4 0 0 1 8 21Zm9.5-7a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm-12 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm6.5-12a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />
    </svg>
  );
}
