import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CheckCircleIcon,
  ChatBubbleLeftIcon,
  ClockIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  PlusIcon,
  RocketLaunchIcon,
  SparklesIcon,
  StarIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarSolidIcon } from "@heroicons/react/24/solid";
import { useAuth } from "../hooks/useAuth";
import { buildApiUrl } from "../utils/apiBase";
import {
  Avatar,
  Badge,
  Breadcrumb,
  Button,
  EmptyState,
  Lozenge,
  PageHeader,
  SectionMessage,
  Tabs,
} from "../components/atlas";
import { statusToLozenge } from "../utils/designTokens";

const TABS = [
  { id: "worked", label: "Worked on" },
  { id: "viewed", label: "Viewed" },
  { id: "assigned", label: "Assigned to me" },
  { id: "starred", label: "Starred" },
  { id: "boards", label: "Boards" },
];

async function readJsonSafe(res, fallback) {
  try {
    const text = await res.text();
    return text ? JSON.parse(text) : fallback;
  } catch (_) {
    return fallback;
  }
}

function unwrap(payload, fallback) {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    return payload.data && typeof payload.data === "object" ? payload.data : payload;
  }
  return fallback;
}

function timeAgo(input) {
  if (!input) return "—";
  const d = typeof input === "string" || typeof input === "number" ? new Date(input) : input;
  if (!d || isNaN(d.getTime())) return "—";
  const sec = Math.max(1, Math.round((Date.now() - d.getTime()) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const m = Math.round(sec / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function pickProjectChip(item) {
  const slug = item?.project_slug || item?.project?.slug;
  const name = item?.project_name || item?.project?.name || (slug ? slug.toUpperCase() : "");
  return name || "Workspace";
}

function pickKey(item) {
  return (
    item?.key ||
    item?.issue_key ||
    item?.task_key ||
    (item?.id ? `#${item.id}` : null)
  );
}

function pickSummary(item) {
  return item?.summary || item?.title || item?.name || item?.headline || "Untitled";
}

function pickStatus(item) {
  return item?.status_label || item?.status || item?.state || "Open";
}

function pickUpdated(item) {
  return item?.updated_at || item?.modified_at || item?.last_active_at || item?.created_at;
}

function pickHref(item) {
  if (item?.suggested_action_url) return item.suggested_action_url;
  if (item?.source_url) return item.source_url;
  if (item?.url) return item.url;
  if (item?.kind === "conversation" && item.id) return `/conversations/${item.id}`;
  if (item?.kind === "decision" && item.id) return `/decisions/${item.id}`;
  if (item?.kind === "document" && item.id) return `/business/documents/${item.id}`;
  if (item?.kind === "issue" && item.id) return `/issues/${item.id}`;
  if (item?.kind === "task" && item.id) return `/business/tasks/${item.id}`;
  return null;
}

export default function UnifiedDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("worked");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [personal, setPersonal] = useState(null);
  const [workspace, setWorkspace] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [sprint, setSprint] = useState(null);
  const [drift, setDrift] = useState({ items: [], total: 0, critical: 0 });
  const [stars, setStars] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("atlasDashboardStars") || "{}") || {};
    } catch (_) {
      return {};
    }
  });

  useEffect(() => {
    let mounted = true;
    const token = localStorage.getItem("access_token") || localStorage.getItem("token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    Promise.all([
      fetch(buildApiUrl("/api/knowledge/dashboard/personal-briefing/"), { headers }),
      fetch(buildApiUrl("/api/knowledge/dashboard/workspace-briefing/"), { headers }),
      fetch(buildApiUrl("/api/knowledge/timeline/?days=7&page=1&per_page=15"), { headers }),
      fetch(buildApiUrl("/api/agile/current-sprint/"), { headers }),
      fetch(buildApiUrl("/api/decisions/outcomes/drift-alerts/"), { headers }),
    ])
      .then(async ([pRes, wRes, tRes, sRes, dRes]) => {
        if (!mounted) return;
        const p = unwrap(await readJsonSafe(pRes, {}), {});
        const w = unwrap(await readJsonSafe(wRes, {}), {});
        const t = unwrap(await readJsonSafe(tRes, { results: [] }), { results: [] });
        const s = unwrap(await readJsonSafe(sRes, null), null);
        const d = unwrap(await readJsonSafe(dRes, { items: [] }), { items: [] });
        setPersonal(p);
        setWorkspace(w);
        setTimeline(Array.isArray(t.results) ? t.results : Array.isArray(t) ? t : []);
        setSprint(s);
        setDrift({ items: d.items || [], total: d.total || 0, critical: d.critical || 0 });
        setLoading(false);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err.message || "Unable to load dashboard");
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const toggleStar = (id) => {
    setStars((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = true;
      try {
        localStorage.setItem("atlasDashboardStars", JSON.stringify(next));
      } catch (_) {}
      return next;
    });
  };

  const rowsForTab = useMemo(() => {
    if (!personal && !timeline?.length) return [];
    const assigned = personal?.assigned_tasks || [];
    const watched = personal?.watched_issues || [];
    const conversations = personal?.recent_conversations || [];
    const decisions = personal?.relevant_decisions || [];
    const tagKind = (k) => (item) => ({ ...item, kind: item.kind || k });

    switch (tab) {
      case "assigned":
        return assigned.map(tagKind("task"));
      case "viewed":
        return [
          ...conversations.map(tagKind("conversation")),
          ...decisions.map(tagKind("decision")),
          ...(timeline || []).slice(0, 10),
        ].slice(0, 25);
      case "starred":
        return [...assigned, ...watched, ...conversations]
          .map(tagKind("item"))
          .filter((x) => stars[x.id]);
      case "boards":
        return (workspace?.what_changed || []).filter((x) => x.kind === "project");
      case "worked":
      default:
        return [
          ...assigned.map(tagKind("task")),
          ...watched.map(tagKind("issue")),
          ...conversations.slice(0, 5).map(tagKind("conversation")),
        ].slice(0, 25);
    }
  }, [tab, personal, workspace, timeline, stars]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 320px", gap: 24, padding: "0 32px 32px" }}>
      <div style={{ minWidth: 0 }}>
        <PageHeader
          breadcrumb={[
            { label: "Knoledgr", to: "/" },
            { label: "Your work" },
          ]}
          title="Your work"
          subtitle={user?.full_name ? `Welcome back, ${user.full_name.split(" ")[0]}.` : undefined}
          actions={
            <>
              <Button appearance="subtle" onClick={() => navigate("/ask")}>
                Ask Recall
              </Button>
              <Button
                appearance="primary"
                iconBefore={<PlusIcon style={{ width: 14, height: 14 }} />}
                onClick={() => navigate("/projects?new=1")}
              >
                Create
              </Button>
            </>
          }
          tabs={<Tabs tabs={TABS} value={tab} onChange={setTab} />}
          style={{ padding: "24px 0 0", background: "transparent" }}
        />

        {error ? (
          <SectionMessage tone="error" title="Couldn't load dashboard" style={{ marginTop: 16 }}>
            {error}
          </SectionMessage>
        ) : null}

        {drift.critical > 0 ? (
          <SectionMessage
            tone="warning"
            title={`${drift.critical} critical drift alert${drift.critical === 1 ? "" : "s"}`}
            style={{ marginTop: 16 }}
            actions={
              <Button appearance="subtle" size="sm" onClick={() => navigate("/decisions")}>
                Review decisions
              </Button>
            }
          >
            Decisions in this workspace need follow-up.
          </SectionMessage>
        ) : null}

        <section style={{ marginTop: 16 }}>
          {loading ? (
            <SkeletonRows />
          ) : rowsForTab.length === 0 ? (
            <EmptyState
              icon={<DocumentTextIcon style={{ width: "100%", height: "100%" }} />}
              title="Nothing here yet"
              description={
                tab === "starred"
                  ? "Star issues, tasks, or conversations from the rows below to pin them here."
                  : "Once activity picks up in your workspace, items will appear in this list."
              }
              primaryAction={
                <Button appearance="primary" onClick={() => navigate("/projects")}>Browse projects</Button>
              }
            />
          ) : (
            <ul style={listStyle}>
              {rowsForTab.map((item, idx) => {
                const id = item.id || `${tab}-${idx}`;
                const href = pickHref(item);
                const key = pickKey(item);
                const updated = pickUpdated(item);
                const status = pickStatus(item);
                return (
                  <li key={id} style={rowStyle}>
                    <button
                      type="button"
                      onClick={() => toggleStar(id)}
                      aria-label={stars[id] ? "Unstar" : "Star"}
                      style={starButton}
                    >
                      {stars[id] ? (
                        <StarSolidIcon style={{ width: 16, height: 16, color: "#FF991F" }} />
                      ) : (
                        <StarIcon style={{ width: 16, height: 16 }} />
                      )}
                    </button>
                    <KindIcon kind={item.kind} />
                    {key ? <span style={keyChip}>{key}</span> : null}
                    <span style={summaryCell}>
                      {href ? (
                        <Link to={href} style={summaryLink}>
                          {pickSummary(item)}
                        </Link>
                      ) : (
                        pickSummary(item)
                      )}
                    </span>
                    <span style={projectChip}>{pickProjectChip(item)}</span>
                    <Lozenge status={status} />
                    <span style={updatedCell}>{timeAgo(updated)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <aside style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 24 }}>
        <SidebarCard
          title="Current sprint"
          icon={<RocketLaunchIcon style={{ width: 16, height: 16 }} />}
          to={sprint?.id ? `/sprint/${sprint.id}` : "/sprint"}
        >
          {sprint ? (
            <>
              <p style={cardLine}>{sprint.name || "Active sprint"}</p>
              <p style={cardMeta}>
                {sprint.completed_count ?? 0} done · {sprint.in_progress_count ?? 0} in progress · {sprint.todo_count ?? 0} to do
              </p>
              {sprint.end_date ? (
                <p style={cardMeta}>Ends {new Date(sprint.end_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</p>
              ) : null}
            </>
          ) : (
            <p style={cardEmpty}>No active sprint.</p>
          )}
        </SidebarCard>

        <SidebarCard
          title="Activity"
          icon={<ClockIcon style={{ width: 16, height: 16 }} />}
        >
          {(timeline || []).slice(0, 6).map((evt, idx) => (
            <div key={evt.id || idx} style={activityItem}>
              <Avatar
                size="xs"
                name={evt.actor_name || evt.actor || evt.user_name || "Activity"}
              />
              <div style={{ minWidth: 0 }}>
                <p style={activityLine}>
                  <strong style={{ fontWeight: 600 }}>{evt.actor_name || evt.user_name || "Someone"}</strong>{" "}
                  {evt.action || evt.summary || "made an update"}
                </p>
                <p style={cardMeta}>{timeAgo(evt.created_at || evt.timestamp)}</p>
              </div>
            </div>
          ))}
          {!timeline?.length ? <p style={cardEmpty}>No recent activity.</p> : null}
        </SidebarCard>

        <SidebarCard
          title="Quick links"
          icon={<SparklesIcon style={{ width: 16, height: 16 }} />}
        >
          <QuickLinkRow to="/knowledge" label="Search knowledge" />
          <QuickLinkRow to="/decisions" label="Decisions" />
          <QuickLinkRow to="/conversations" label="Conversations" />
          <QuickLinkRow to="/business/documents" label="Documents" />
          <QuickLinkRow to="/projects" label="All projects" />
        </SidebarCard>
      </aside>
    </div>
  );
}

function SidebarCard({ title, icon, to, children }) {
  const head = (
    <div style={cardHead}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <span style={{ color: "var(--app-muted)" }}>{icon}</span>
        <span style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--app-muted)" }}>
          {title}
        </span>
      </span>
      {to ? (
        <Link to={to} style={{ fontSize: 12, color: "var(--app-link)", textDecoration: "none" }}>
          View all
        </Link>
      ) : null}
    </div>
  );
  return (
    <div className="atlas-card" style={{ padding: 0 }}>
      {head}
      <div style={{ padding: "12px 16px 16px" }}>{children}</div>
    </div>
  );
}

function QuickLinkRow({ to, label }) {
  return (
    <Link
      to={to}
      style={{
        display: "block",
        padding: "6px 0",
        fontSize: 14,
        color: "var(--app-text)",
        textDecoration: "none",
        borderBottom: "1px solid var(--app-border-subtle)",
      }}
    >
      {label}
    </Link>
  );
}

function KindIcon({ kind }) {
  const map = {
    task: { icon: CheckCircleIcon, color: "var(--b400)" },
    issue: { icon: ExclamationTriangleIcon, color: "var(--y400)" },
    bug: { icon: ExclamationTriangleIcon, color: "var(--r400)" },
    conversation: { icon: ChatBubbleLeftIcon, color: "var(--t400)" },
    decision: { icon: SparklesIcon, color: "var(--p400)" },
    document: { icon: DocumentTextIcon, color: "var(--n400)" },
    project: { icon: RocketLaunchIcon, color: "var(--g400)" },
    activity: { icon: EyeIcon, color: "var(--n400)" },
  };
  const meta = map[kind] || map.activity;
  const Icon = meta.icon;
  return (
    <span style={{ width: 16, height: 16, color: meta.color, display: "inline-flex", flexShrink: 0 }}>
      <Icon style={{ width: 16, height: 16 }} />
    </span>
  );
}

function SkeletonRows() {
  return (
    <ul style={listStyle}>
      {[0, 1, 2, 3, 4].map((i) => (
        <li key={i} style={{ ...rowStyle, color: "transparent" }}>
          <span style={{ ...keyChip, background: "var(--n30)" }}>—</span>
          <span style={{ ...summaryCell, height: 14, background: "var(--n30)", borderRadius: 3 }} />
          <span style={{ ...projectChip, background: "var(--n30)" }} />
          <span style={{ ...updatedCell, color: "transparent" }}>—</span>
        </li>
      ))}
    </ul>
  );
}

const listStyle = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  background: "var(--app-surface)",
  border: "1px solid var(--app-border)",
  borderRadius: 4,
  overflow: "hidden",
};

const rowStyle = {
  display: "grid",
  gridTemplateColumns: "24px 16px auto minmax(0, 1fr) auto auto 88px",
  alignItems: "center",
  gap: 12,
  padding: "8px 16px",
  borderBottom: "1px solid var(--app-border-subtle)",
  fontSize: 14,
  color: "var(--app-text)",
};

const starButton = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 24,
  height: 24,
  background: "transparent",
  border: "none",
  color: "var(--app-muted)",
  cursor: "pointer",
  borderRadius: 3,
};

const keyChip = {
  display: "inline-flex",
  alignItems: "center",
  height: 16,
  padding: "0 4px",
  background: "var(--n20)",
  border: "1px solid var(--app-border-subtle)",
  borderRadius: 3,
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  color: "var(--app-muted)",
  fontWeight: 600,
};

const summaryCell = {
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const summaryLink = {
  color: "var(--app-text)",
  textDecoration: "none",
  fontWeight: 500,
};

const projectChip = {
  display: "inline-flex",
  alignItems: "center",
  padding: "2px 6px",
  background: "var(--app-surface-alt)",
  borderRadius: 3,
  fontSize: 11,
  fontWeight: 600,
  color: "var(--app-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  whiteSpace: "nowrap",
};

const updatedCell = {
  fontSize: 12,
  color: "var(--app-muted)",
  textAlign: "right",
  whiteSpace: "nowrap",
};

const cardHead = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "12px 16px",
  borderBottom: "1px solid var(--app-border-subtle)",
};

const cardLine = {
  margin: 0,
  fontSize: 14,
  fontWeight: 500,
  color: "var(--app-text)",
};

const cardMeta = {
  margin: "2px 0 0",
  fontSize: 12,
  color: "var(--app-muted)",
};

const cardEmpty = {
  margin: 0,
  fontSize: 13,
  color: "var(--app-muted)",
};

const activityItem = {
  display: "flex",
  gap: 8,
  alignItems: "flex-start",
  padding: "6px 0",
};

const activityLine = {
  margin: 0,
  fontSize: 13,
  color: "var(--app-text)",
  lineHeight: 1.4286,
};
