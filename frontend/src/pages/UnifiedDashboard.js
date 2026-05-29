import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRightIcon,
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
  Button,
  EmptyState,
  Lozenge,
  SectionMessage,
} from "../components/atlas";

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

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Up late";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 22) return "Good evening";
  return "Up late";
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

  const assignedCount = personal?.assigned_tasks?.length || 0;
  const watchingCount = personal?.watched_issues?.length || 0;
  const recentCount = timeline?.length || 0;
  const firstName = user?.full_name?.split(" ")[0];

  return (
    <>
      <style>{DASHBOARD_STYLES}</style>
      <div className="dash">
        <div className="dash-main">
          {/* ---------- Greeting hero ---------- */}
          <section className="dash-hero">
            <div className="dash-hero-copy">
              <span className="dash-hero-eyebrow">
                <span className="dash-hero-dot" aria-hidden="true" />
                {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
              </span>
              <h1>
                {greeting()}{firstName ? `, ${firstName}` : ""}.
              </h1>
              <p>
                {assignedCount > 0
                  ? `You have ${assignedCount} task${assignedCount === 1 ? "" : "s"} on your plate${drift.critical > 0 ? ` and ${drift.critical} decision${drift.critical === 1 ? "" : "s"} need follow-up` : ""}.`
                  : "Nothing's blocking you. Good time to push something forward."}
              </p>
              <div className="dash-hero-actions">
                <Link to="/ask" className="dash-hero-btn dash-hero-btn-primary">
                  <SparklesIcon style={{ width: 16, height: 16 }} />
                  Ask Recall
                </Link>
                <button
                  type="button"
                  className="dash-hero-btn dash-hero-btn-ghost"
                  onClick={() => navigate("/projects?new=1")}
                >
                  <PlusIcon style={{ width: 16, height: 16 }} />
                  Create
                </button>
              </div>
            </div>

            <div className="dash-hero-stats">
              <StatTile
                label="Assigned"
                value={assignedCount}
                hint="Open tasks"
                accent="blue"
                to="/dashboard?tab=assigned"
              />
              <StatTile
                label="Watching"
                value={watchingCount}
                hint="Followed issues"
                accent="amber"
                to="/dashboard?tab=worked"
              />
              <StatTile
                label="This week"
                value={recentCount}
                hint="Activity events"
                accent="violet"
                to="/dashboard?tab=viewed"
              />
            </div>
          </section>

          {error ? (
            <SectionMessage tone="error" title="Couldn't load dashboard" style={{ marginBottom: 16 }}>
              {error}
            </SectionMessage>
          ) : null}

          {drift.critical > 0 ? (
            <SectionMessage
              tone="warning"
              title={`${drift.critical} critical drift alert${drift.critical === 1 ? "" : "s"}`}
              style={{ marginBottom: 16 }}
              actions={
                <Button appearance="subtle" size="sm" onClick={() => navigate("/decisions")}>
                  Review decisions
                </Button>
              }
            >
              Decisions in this workspace need follow-up.
            </SectionMessage>
          ) : null}

          {/* ---------- Tabs ---------- */}
          <div className="dash-tabs" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`dash-tab ${tab === t.id ? "is-active" : ""}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ---------- Rows ---------- */}
          <section className="dash-rows">
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
              <ul className="dash-rowlist">
                {rowsForTab.map((item, idx) => {
                  const id = item.id || `${tab}-${idx}`;
                  const href = pickHref(item);
                  const key = pickKey(item);
                  const updated = pickUpdated(item);
                  const status = pickStatus(item);
                  return (
                    <li key={id} className="dash-row">
                      <button
                        type="button"
                        onClick={() => toggleStar(id)}
                        aria-label={stars[id] ? "Unstar" : "Star"}
                        className="dash-row-star"
                      >
                        {stars[id] ? (
                          <StarSolidIcon style={{ width: 16, height: 16, color: "#FF991F" }} />
                        ) : (
                          <StarIcon style={{ width: 16, height: 16 }} />
                        )}
                      </button>
                      <KindIcon kind={item.kind} />
                      <div className="dash-row-main">
                        <div className="dash-row-line">
                          {key ? <span className="dash-row-key">{key}</span> : null}
                          {href ? (
                            <Link to={href} className="dash-row-summary">
                              {pickSummary(item)}
                            </Link>
                          ) : (
                            <span className="dash-row-summary">{pickSummary(item)}</span>
                          )}
                        </div>
                        <div className="dash-row-meta">
                          <span className="dash-row-project">{pickProjectChip(item)}</span>
                          <span className="dash-row-dot" aria-hidden="true">·</span>
                          <span>{timeAgo(updated)}</span>
                        </div>
                      </div>
                      <Lozenge status={status} />
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        {/* ---------- Sidebar ---------- */}
        <aside className="dash-aside">
          <SidebarCard
            title="Current sprint"
            accent="blue"
            icon={<RocketLaunchIcon style={{ width: 14, height: 14 }} />}
            to={sprint?.id ? `/sprint/${sprint.id}` : "/sprint"}
          >
            {sprint ? (
              <>
                <p className="dash-card-line">{sprint.name || "Active sprint"}</p>
                <div className="dash-sprint-progress">
                  <SprintBar sprint={sprint} />
                  <p className="dash-card-meta">
                    {sprint.completed_count ?? 0} done · {sprint.in_progress_count ?? 0} in progress · {sprint.todo_count ?? 0} to do
                  </p>
                </div>
                {sprint.end_date ? (
                  <p className="dash-card-meta">
                    Ends {new Date(sprint.end_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </p>
                ) : null}
              </>
            ) : (
              <p className="dash-card-empty">No active sprint.</p>
            )}
          </SidebarCard>

          <SidebarCard
            title="Activity"
            accent="neutral"
            icon={<ClockIcon style={{ width: 14, height: 14 }} />}
          >
            {(timeline || []).slice(0, 6).map((evt, idx) => (
              <div key={evt.id || idx} className="dash-activity-item">
                <Avatar
                  size="xs"
                  name={evt.actor_name || evt.actor || evt.user_name || "Activity"}
                />
                <div style={{ minWidth: 0 }}>
                  <p className="dash-activity-line">
                    <strong>{evt.actor_name || evt.user_name || "Someone"}</strong>{" "}
                    {evt.action || evt.summary || "made an update"}
                  </p>
                  <p className="dash-card-meta">{timeAgo(evt.created_at || evt.timestamp)}</p>
                </div>
              </div>
            ))}
            {!timeline?.length ? <p className="dash-card-empty">No recent activity.</p> : null}
          </SidebarCard>

          <SidebarCard
            title="Quick links"
            accent="violet"
            icon={<SparklesIcon style={{ width: 14, height: 14 }} />}
          >
            <QuickLinkRow to="/knowledge" label="Search knowledge" />
            <QuickLinkRow to="/decisions" label="Decisions" />
            <QuickLinkRow to="/conversations" label="Conversations" />
            <QuickLinkRow to="/business/documents" label="Documents" />
            <QuickLinkRow to="/projects" label="All projects" />
          </SidebarCard>
        </aside>
      </div>
    </>
  );
}

function StatTile({ label, value, hint, accent, to }) {
  return (
    <Link to={to} className={`dash-stat dash-stat-${accent}`}>
      <span className="dash-stat-label">{label}</span>
      <span className="dash-stat-value">{value}</span>
      <span className="dash-stat-hint">{hint}</span>
      <ArrowRightIcon className="dash-stat-arrow" />
    </Link>
  );
}

function SidebarCard({ title, icon, to, accent = "neutral", children }) {
  return (
    <div className={`dash-card dash-card-${accent}`}>
      <div className="dash-card-head">
        <span className="dash-card-title">
          <span className="dash-card-icon" aria-hidden="true">{icon}</span>
          {title}
        </span>
        {to ? <Link to={to} className="dash-card-link">View all</Link> : null}
      </div>
      <div className="dash-card-body">{children}</div>
    </div>
  );
}

function SprintBar({ sprint }) {
  const done = sprint.completed_count ?? 0;
  const wip = sprint.in_progress_count ?? 0;
  const todo = sprint.todo_count ?? 0;
  const total = Math.max(1, done + wip + todo);
  const pDone = (done / total) * 100;
  const pWip = (wip / total) * 100;
  return (
    <div className="dash-sprint-bar" aria-hidden="true">
      <span className="dash-sprint-seg dash-sprint-seg-done" style={{ width: `${pDone}%` }} />
      <span className="dash-sprint-seg dash-sprint-seg-wip" style={{ width: `${pWip}%` }} />
    </div>
  );
}

function QuickLinkRow({ to, label }) {
  return (
    <Link to={to} className="dash-quick-link">
      <span>{label}</span>
      <ArrowRightIcon style={{ width: 14, height: 14 }} />
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
    <span className="dash-row-kind" style={{ color: meta.color }}>
      <Icon style={{ width: 16, height: 16 }} />
    </span>
  );
}

function SkeletonRows() {
  return (
    <ul className="dash-rowlist">
      {[0, 1, 2, 3, 4].map((i) => (
        <li key={i} className="dash-row dash-row-skeleton">
          <span className="dash-skel dash-skel-sm" />
          <span className="dash-skel dash-skel-lg" />
          <span className="dash-skel dash-skel-md" />
        </li>
      ))}
    </ul>
  );
}

const DASHBOARD_STYLES = `
.dash {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 28px;
  padding: 28px 32px 40px;
  max-width: 1440px;
  margin: 0 auto;
}

.dash-main { min-width: 0; display: flex; flex-direction: column; gap: 24px; }

/* ---------- Hero ---------- */

.dash-hero {
  position: relative;
  overflow: hidden;
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
  gap: 32px;
  align-items: center;
  padding: 32px;
  border-radius: 16px;
  background:
    radial-gradient(620px 320px at 100% 0%, rgba(138, 99, 210, 0.14), transparent 60%),
    radial-gradient(520px 280px at 0% 100%, rgba(94, 106, 210, 0.12), transparent 62%),
    var(--app-surface);
  border: 1px solid var(--app-border);
  box-shadow:
    0 1px 1px rgba(11, 12, 16, 0.04),
    0 16px 40px -22px rgba(11, 12, 16, 0.14);
}

.dash-hero::before {
  content: "";
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(11, 12, 16, 0.028) 1px, transparent 1px),
    linear-gradient(90deg, rgba(11, 12, 16, 0.028) 1px, transparent 1px);
  background-size: 32px 32px;
  -webkit-mask-image: radial-gradient(ellipse at 30% 50%, rgba(0, 0, 0, 0.5), transparent 70%);
  mask-image: radial-gradient(ellipse at 30% 50%, rgba(0, 0, 0, 0.5), transparent 70%);
  pointer-events: none;
}

.dash-hero-copy { position: relative; display: grid; gap: 14px; min-width: 0; }

.dash-hero-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: fit-content;
  padding: 4px 10px 4px 8px;
  border-radius: 999px;
  background: var(--app-surface-alt);
  border: 1px solid var(--app-border-subtle);
  color: var(--app-text-subtle);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.005em;
}

.dash-hero-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #36B37E;
  box-shadow: 0 0 0 3px rgba(54, 179, 126, 0.18);
}

.dash-hero h1 {
  margin: 0;
  color: var(--app-text);
  font-size: clamp(28px, 3.4vw, 40px);
  line-height: 1.06;
  font-weight: 700;
  letter-spacing: -0.025em;
}

.dash-hero-copy > p {
  margin: 0;
  max-width: 480px;
  color: var(--app-muted);
  font-size: 15px;
  line-height: 1.55;
}

.dash-hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}

.dash-hero-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 38px;
  padding: 0 14px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.005em;
  cursor: pointer;
  text-decoration: none;
  border: 1px solid transparent;
  font-family: inherit;
  transition: transform 140ms ease, background 140ms ease, border-color 140ms ease;
}
.dash-hero-btn:hover { transform: translateY(-1px); }

.dash-hero-btn-primary {
  background: var(--app-accent);
  color: #FFFFFF;
  box-shadow: 0 1px 2px rgba(11, 12, 16, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.18);
}
.dash-hero-btn-primary:hover { background: var(--b500); }

.dash-hero-btn-ghost {
  background: transparent;
  border-color: var(--app-border);
  color: var(--app-text);
}
.dash-hero-btn-ghost:hover { background: var(--app-surface-alt); border-color: var(--app-text-subtle); }

/* ---------- Stat tiles ---------- */

.dash-hero-stats {
  position: relative;
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

.dash-stat {
  position: relative;
  display: grid;
  grid-template-columns: auto 1fr auto;
  grid-template-rows: auto auto;
  column-gap: 14px;
  align-items: center;
  padding: 14px 16px;
  border-radius: 10px;
  background: var(--app-surface);
  border: 1px solid var(--app-border);
  text-decoration: none;
  color: var(--app-text);
  transition: border-color 140ms ease, transform 140ms ease, box-shadow 140ms ease;
  overflow: hidden;
}
.dash-stat:hover {
  transform: translateY(-1px);
  border-color: var(--app-border-strong);
  box-shadow: 0 8px 24px -16px rgba(11, 12, 16, 0.22);
}

.dash-stat::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
}
.dash-stat-blue::before { background: linear-gradient(180deg, #6E76E0, #5E6AD2); }
.dash-stat-amber::before { background: linear-gradient(180deg, #E6A23C, #D08621); }
.dash-stat-violet::before { background: linear-gradient(180deg, #A78BFA, #8A63D2); }

.dash-stat-label {
  grid-column: 1 / 3;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--app-muted);
}
.dash-stat-value {
  grid-column: 1;
  grid-row: 2;
  font-size: 30px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.025em;
  color: var(--app-text);
}
.dash-stat-hint {
  grid-column: 2;
  grid-row: 2;
  font-size: 12px;
  font-weight: 500;
  color: var(--app-muted);
  align-self: end;
}
.dash-stat-arrow {
  grid-column: 3;
  grid-row: 1 / 3;
  width: 16px;
  height: 16px;
  color: var(--app-text-subtle);
  align-self: center;
  transition: transform 140ms ease;
}
.dash-stat:hover .dash-stat-arrow { transform: translateX(2px); color: var(--app-text); }

/* ---------- Tabs ---------- */

.dash-tabs {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 4px;
  background: var(--app-surface-alt);
  border: 1px solid var(--app-border);
  border-radius: 10px;
  width: fit-content;
  max-width: 100%;
  overflow-x: auto;
}

.dash-tab {
  background: transparent;
  border: none;
  padding: 7px 14px;
  border-radius: 7px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  color: var(--app-muted);
  cursor: pointer;
  white-space: nowrap;
  transition: background 120ms ease, color 120ms ease;
}
.dash-tab:hover { color: var(--app-text); }
.dash-tab.is-active {
  background: var(--app-surface);
  color: var(--app-text);
  box-shadow:
    0 1px 1px rgba(9, 30, 66, 0.06),
    0 1px 0 rgba(9, 30, 66, 0.03);
}

/* ---------- Row list ---------- */

.dash-rows { display: contents; }

.dash-rowlist {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 4px;
}

.dash-row {
  display: grid;
  grid-template-columns: 24px 16px minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border-radius: 10px;
  background: var(--app-surface);
  border: 1px solid var(--app-border);
  transition: border-color 120ms ease, box-shadow 120ms ease, transform 120ms ease;
}
.dash-row:hover {
  border-color: var(--app-text-subtle);
  box-shadow: 0 4px 16px -8px rgba(9, 30, 66, 0.14);
}

.dash-row-star {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: transparent;
  border: none;
  color: var(--app-text-subtle);
  cursor: pointer;
  border-radius: 6px;
  transition: background 120ms ease, color 120ms ease;
}
.dash-row-star:hover { background: var(--app-surface-alt); color: var(--app-text); }

.dash-row-kind {
  display: inline-flex;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.dash-row-main { display: grid; gap: 4px; min-width: 0; }

.dash-row-line {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.dash-row-key {
  display: inline-flex;
  align-items: center;
  padding: 2px 6px;
  background: var(--app-surface-alt);
  border-radius: 4px;
  font-family: var(--font-mono, "SF Mono", Menlo, monospace);
  font-size: 11px;
  font-weight: 600;
  color: var(--app-muted);
  flex-shrink: 0;
}

.dash-row-summary {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--app-text);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
}
a.dash-row-summary:hover { color: var(--app-link); text-decoration: underline; text-underline-offset: 3px; }

.dash-row-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--app-muted);
}

.dash-row-project {
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--app-text-subtle);
}

.dash-row-dot { opacity: 0.5; }

.dash-row-skeleton {
  display: flex;
  align-items: center;
  gap: 14px;
  height: 56px;
}
.dash-skel { background: var(--app-surface-alt); border-radius: 6px; height: 12px; }
.dash-skel-sm { width: 60px; }
.dash-skel-md { width: 90px; }
.dash-skel-lg { flex: 1; }

/* ---------- Sidebar ---------- */

.dash-aside { display: flex; flex-direction: column; gap: 14px; }

.dash-card {
  position: relative;
  border-radius: 12px;
  background: var(--app-surface);
  border: 1px solid var(--app-border);
  overflow: hidden;
}
.dash-card::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
}
.dash-card-blue::before { background: linear-gradient(180deg, #0065FF, #0052CC); }
.dash-card-violet::before { background: linear-gradient(180deg, #8777D9, #5243AA); }
.dash-card-neutral::before { background: linear-gradient(180deg, var(--app-text-subtle), var(--app-muted)); }

.dash-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--app-border-subtle);
}

.dash-card-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--app-muted);
}
.dash-card-icon { display: inline-flex; color: var(--app-text-subtle); }

.dash-card-link {
  font-size: 12px;
  color: var(--app-link);
  text-decoration: none;
  font-weight: 600;
}
.dash-card-link:hover { text-decoration: underline; }

.dash-card-body { padding: 14px 16px 16px; display: grid; gap: 10px; }

.dash-card-line { margin: 0; font-size: 14px; font-weight: 600; color: var(--app-text); }
.dash-card-meta { margin: 0; font-size: 12px; color: var(--app-muted); }
.dash-card-empty { margin: 0; font-size: 13px; color: var(--app-muted); }

.dash-sprint-progress { display: grid; gap: 6px; }
.dash-sprint-bar {
  position: relative;
  display: flex;
  height: 6px;
  border-radius: 999px;
  background: var(--app-surface-alt);
  overflow: hidden;
}
.dash-sprint-seg { height: 100%; display: block; }
.dash-sprint-seg-done { background: #36B37E; }
.dash-sprint-seg-wip { background: #0065FF; }

.dash-activity-item {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 4px 0;
}
.dash-activity-line {
  margin: 0;
  font-size: 13px;
  color: var(--app-text);
  line-height: 1.45;
}
.dash-activity-line strong { font-weight: 600; }

.dash-quick-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  margin: 0 -10px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  color: var(--app-text);
  text-decoration: none;
  transition: background 120ms ease;
}
.dash-quick-link:hover { background: var(--app-surface-alt); }
.dash-quick-link svg { color: var(--app-text-subtle); transition: transform 120ms ease; }
.dash-quick-link:hover svg { transform: translateX(2px); color: var(--app-text); }

/* ---------- Responsive ---------- */

@media (max-width: 1100px) {
  .dash { grid-template-columns: minmax(0, 1fr); gap: 24px; padding: 24px 20px 32px; }
  .dash-hero { grid-template-columns: 1fr; gap: 24px; padding: 24px; }
}
@media (max-width: 640px) {
  .dash-hero h1 { font-size: 26px; }
  .dash-row { grid-template-columns: 24px 16px minmax(0, 1fr); }
  .dash-row > :nth-child(4) { grid-column: 1 / -1; justify-self: start; }
}
`;
