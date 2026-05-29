import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeftIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  SparklesIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import api from "../services/api";
import {
  Avatar,
  Breadcrumb,
  Button,
  EmptyState,
  Field,
  IconButton,
  Lozenge,
  PageHeader,
  SectionMessage,
  Tabs,
} from "../components/atlas";

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function daysLeft(end) {
  if (!end) return null;
  const e = new Date(end);
  if (isNaN(e.getTime())) return null;
  return Math.ceil((e - Date.now()) / 86400000);
}

function statusVariant(s) {
  const v = String(s || "").toLowerCase();
  if (v === "active") return "inprogress";
  if (v === "completed") return "success";
  return "default";
}

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "issues", label: "Issues" },
  { id: "blockers", label: "Blockers" },
  { id: "autopilot", label: "Autopilot" },
];

export default function SprintDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sprint, setSprint] = useState(null);
  const [autopilot, setAutopilot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("overview");
  const [showBlocker, setShowBlocker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [blockerForm, setBlockerForm] = useState({ title: "", description: "", type: "blocker" });

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const [sprintRes, autopilotRes] = await Promise.allSettled([
        api.get(`/api/agile/sprints/${id}/detail/`),
        api.get(`/api/agile/sprints/${id}/autopilot/`),
      ]);
      if (sprintRes.status === "fulfilled") {
        setSprint(sprintRes.value.data?.data || sprintRes.value.data);
      } else {
        setError(sprintRes.reason?.response?.data?.detail || "Failed to load sprint");
      }
      if (autopilotRes.status === "fulfilled") {
        setAutopilot(autopilotRes.value.data || null);
      }
    } catch (err) {
      setError(err?.message || "Failed to load sprint");
    } finally {
      setLoading(false);
    }
  };

  const handleAddBlocker = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/api/agile/blockers/", {
        sprint_id: id,
        title: blockerForm.title,
        description: blockerForm.description,
        type: blockerForm.type,
      });
      setShowBlocker(false);
      setBlockerForm({ title: "", description: "", type: "blocker" });
      await fetchData();
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Failed to add blocker");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{ padding: 32, color: "var(--app-muted)" }}>Loading sprint…</div>;
  if (!sprint) {
    return (
      <div style={{ padding: 32 }}>
        <SectionMessage tone="error" title="Sprint not found">{error || "We couldn't find that sprint."}</SectionMessage>
      </div>
    );
  }

  const issues = sprint.issues || [];
  const blockers = (sprint.blockers || []).filter((b) => String(b.status || "active").toLowerCase() === "active");
  const done = issues.filter((i) => ["done", "closed", "resolved"].includes(String(i.status || "").toLowerCase())).length;
  const inProgress = issues.filter((i) => ["in_progress", "in_review", "testing"].includes(String(i.status || "").toLowerCase())).length;
  const todo = issues.length - done - inProgress;
  const percent = issues.length ? Math.round((done / issues.length) * 100) : 0;
  const remaining = daysLeft(sprint.end_date);

  return (
    <div style={{ padding: "0 32px 32px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 24 }}>
        <IconButton icon={<ArrowLeftIcon style={{ width: 16, height: 16 }} />} label="Back" onClick={() => navigate(-1)} />
        <Breadcrumb
          items={[
            { label: "Knoledgr", to: "/" },
            { label: "Sprints", to: "/sprint" },
            { label: sprint.name || "Sprint" },
          ]}
        />
      </div>

      <PageHeader
        title={
          <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
            {sprint.name}
            <Lozenge variant={statusVariant(sprint.status)}>{sprint.status || "planned"}</Lozenge>
          </span>
        }
        subtitle={sprint.goal || ""}
        actions={
          <Button appearance="primary" iconBefore={<PlusIcon style={{ width: 14, height: 14 }} />} onClick={() => setShowBlocker(true)}>
            Report blocker
          </Button>
        }
        tabs={<Tabs tabs={TABS.map((t) => ({ ...t, count: t.id === "issues" ? issues.length : t.id === "blockers" ? blockers.length : undefined }))} value={tab} onChange={setTab} />}
        style={{ padding: "0 0 0", marginTop: 12, background: "transparent" }}
      />

      {error ? <SectionMessage tone="error" style={{ marginTop: 16 }}>{error}</SectionMessage> : null}

      {tab === "overview" ? (
        <Overview
          sprint={sprint}
          stats={{ todo, inProgress, done, total: issues.length, percent, remaining }}
          blockers={blockers}
        />
      ) : null}

      {tab === "issues" ? <IssueList issues={issues} /> : null}

      {tab === "blockers" ? (
        <BlockerList blockers={blockers} onAdd={() => setShowBlocker(true)} />
      ) : null}

      {tab === "autopilot" ? <AutopilotView autopilot={autopilot} /> : null}

      {showBlocker ? (
        <Modal title="Report blocker" onClose={() => setShowBlocker(false)}>
          <form onSubmit={handleAddBlocker} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Field label="Title" isRequired>
              <input value={blockerForm.title} onChange={(e) => setBlockerForm({ ...blockerForm, title: e.target.value })} className="atlas-input" required autoFocus />
            </Field>
            <Field label="Description">
              <textarea value={blockerForm.description} onChange={(e) => setBlockerForm({ ...blockerForm, description: e.target.value })} className="atlas-input" rows={3} />
            </Field>
            <Field label="Type">
              <select value={blockerForm.type} onChange={(e) => setBlockerForm({ ...blockerForm, type: e.target.value })} className="atlas-input">
                <option value="blocker">Blocker</option>
                <option value="risk">Risk</option>
                <option value="dependency">Dependency</option>
              </select>
            </Field>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
              <Button type="button" appearance="subtle" onClick={() => setShowBlocker(false)}>Cancel</Button>
              <Button type="submit" appearance="primary" isDisabled={submitting || !blockerForm.title.trim()}>
                {submitting ? "Saving…" : "Report"}
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}

function Overview({ sprint, stats, blockers }) {
  return (
    <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "minmax(0, 1fr) 280px", gap: 24, alignItems: "start" }}>
      <section>
        <div style={statsRow}>
          <Stat label="To do" value={stats.todo} />
          <Stat label="In progress" value={stats.inProgress} tone="b" />
          <Stat label="Done" value={stats.done} tone="g" />
          <Stat label="Days left" value={stats.remaining ?? "—"} />
          <Stat label="Progress" value={`${stats.percent}%`} />
        </div>
        <div style={progressTrack}>
          <div style={{ ...progressFill, width: `${stats.percent}%` }} />
        </div>
        <div style={{ marginTop: 4, display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--app-muted)" }}>
          <span>{formatDate(sprint.start_date)}</span>
          <span>{formatDate(sprint.end_date)}</span>
        </div>

        {blockers.length > 0 ? (
          <SectionMessage tone="warning" title={`${blockers.length} active blocker${blockers.length === 1 ? "" : "s"}`} style={{ marginTop: 16 }}>
            {blockers.slice(0, 3).map((b) => (
              <div key={b.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginTop: 4 }}>
                <ExclamationTriangleIcon style={{ width: 14, height: 14, color: "var(--y500)", flexShrink: 0, marginTop: 2 }} />
                <span style={{ fontSize: 13 }}><strong>{b.title}</strong>{b.description ? <span style={{ color: "var(--app-muted)" }}> — {b.description}</span> : null}</span>
              </div>
            ))}
          </SectionMessage>
        ) : null}
      </section>

      <aside style={sidePanel}>
        <h3 style={panelTitle}>Details</h3>
        <DetailRow label="Status" value={<Lozenge variant={statusVariant(sprint.status)}>{sprint.status || "planned"}</Lozenge>} />
        <DetailRow label="Start" value={<span style={{ fontSize: 13 }}>{formatDate(sprint.start_date)}</span>} />
        <DetailRow label="End" value={<span style={{ fontSize: 13 }}>{formatDate(sprint.end_date)}</span>} />
        {sprint.project_name ? <DetailRow label="Project" value={<Link to={sprint.project_id ? `/projects/${sprint.project_id}` : "/projects"} style={{ color: "var(--app-link)", fontSize: 13 }}>{sprint.project_name}</Link>} /> : null}
        {sprint.team_health ? <DetailRow label="Team health" value={<Lozenge variant={sprint.team_health === "healthy" ? "success" : sprint.team_health === "at_risk" ? "moved" : "removed"}>{sprint.team_health}</Lozenge>} /> : null}
      </aside>
    </div>
  );
}

function IssueList({ issues }) {
  if (issues.length === 0) {
    return <EmptyState title="No issues in this sprint" description="Move issues from the backlog to plan this sprint." />;
  }
  return (
    <div style={{ marginTop: 16, background: "var(--app-surface)", border: "1px solid var(--app-border)", borderRadius: 4, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "var(--app-surface-alt)" }}>
            <th style={th}>Key</th>
            <th style={{ ...th, width: "50%" }}>Summary</th>
            <th style={th}>Status</th>
            <th style={th}>Priority</th>
            <th style={th}>Assignee</th>
          </tr>
        </thead>
        <tbody>
          {issues.map((iss) => (
            <tr key={iss.id} style={{ borderBottom: "1px solid var(--app-border-subtle)" }}>
              <td style={td}><span style={keyChip}>{iss.key || `#${iss.id}`}</span></td>
              <td style={td}>
                <Link to={`/issues/${iss.id}`} style={{ color: "var(--app-link)", textDecoration: "none", fontWeight: 500 }}>
                  {iss.title || iss.summary}
                </Link>
              </td>
              <td style={td}><Lozenge status={iss.status} /></td>
              <td style={td}>{iss.priority || "—"}</td>
              <td style={td}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Avatar size="sm" name={iss.assignee_name || "Unassigned"} />
                  <span style={{ fontSize: 13 }}>{iss.assignee_name || "—"}</span>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BlockerList({ blockers, onAdd }) {
  if (blockers.length === 0) {
    return (
      <EmptyState
        icon={<ExclamationTriangleIcon style={{ width: "100%", height: "100%" }} />}
        title="No active blockers"
        description="The sprint is moving without reported blockers."
        primaryAction={<Button appearance="primary" onClick={onAdd}>Report blocker</Button>}
      />
    );
  }
  return (
    <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
      {blockers.map((b) => (
        <div key={b.id} style={{ display: "flex", gap: 12, padding: 16, background: "var(--app-surface)", border: "1px solid var(--app-border)", borderRadius: 4 }}>
          <ExclamationTriangleIcon style={{ width: 20, height: 20, color: "var(--y500)", flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <p style={{ margin: 0, fontWeight: 600 }}>{b.title}</p>
              <Lozenge variant="removed">{b.type || "blocker"}</Lozenge>
            </div>
            {b.description ? <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--app-muted)" }}>{b.description}</p> : null}
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--app-muted)" }}>Reported {formatDate(b.created_at)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function AutopilotView({ autopilot }) {
  if (!autopilot) {
    return (
      <EmptyState
        icon={<SparklesIcon style={{ width: "100%", height: "100%" }} />}
        title="Autopilot not available"
        description="The autopilot service didn't return suggestions for this sprint."
      />
    );
  }
  const suggestions = autopilot?.suggestions || autopilot?.actions || [];
  return (
    <div style={{ marginTop: 16, background: "var(--app-surface)", border: "1px solid var(--app-border)", borderRadius: 4, padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <SparklesIcon style={{ width: 20, height: 20, color: "var(--p400)" }} />
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 500 }}>Autopilot suggestions</h2>
      </div>
      {suggestions.length === 0 ? (
        <p style={{ color: "var(--app-muted)", fontSize: 13 }}>No suggestions right now.</p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          {suggestions.map((s, i) => (
            <li key={s.id || i} style={{ padding: 12, border: "1px solid var(--app-border)", borderRadius: 4 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{s.title || s.label || s.action}</p>
              {s.description ? <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--app-muted)" }}>{s.description}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value, tone }) {
  const color = tone === "b" ? "var(--b400)" : tone === "g" ? "var(--g400)" : "var(--app-text)";
  return (
    <div style={statCard}>
      <p style={{ margin: 0, fontSize: 11, color: "var(--app-muted)", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 700 }}>{label}</p>
      <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 500, color }}>{value}</p>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "90px 1fr", alignItems: "center", padding: "6px 0", gap: 8 }}>
      <span style={{ fontSize: 12, color: "var(--app-muted)" }}>{label}</span>
      <div>{value}</div>
    </div>
  );
}

function Modal({ children, onClose, title, width = 520 }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "var(--app-overlay)", zIndex: 199 }} />
      <div role="dialog" aria-modal="true" style={{ position: "fixed", top: "10vh", left: "50%", transform: "translateX(-50%)", width, maxWidth: "calc(100vw - 32px)", background: "var(--app-surface-overlay)", border: "1px solid var(--app-border)", borderRadius: 6, boxShadow: "var(--ui-shadow-lg)", zIndex: 200, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--app-border)" }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{title}</h2>
          <IconButton icon={<XMarkIcon style={{ width: 16, height: 16 }} />} label="Close" onClick={onClose} />
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </>
  );
}

const statsRow = {
  display: "grid",
  gridTemplateColumns: "repeat(5, 1fr)",
  gap: 8,
  marginBottom: 16,
};

const statCard = {
  background: "var(--app-surface)",
  border: "1px solid var(--app-border)",
  borderRadius: 4,
  padding: 16,
};

const progressTrack = {
  height: 6,
  background: "var(--n30)",
  borderRadius: 999,
  overflow: "hidden",
};

const progressFill = {
  height: "100%",
  background: "linear-gradient(90deg, var(--b400), var(--g400))",
  transition: "width 240ms cubic-bezier(0.2, 0, 0, 1)",
};

const sidePanel = {
  background: "var(--app-surface-alt)",
  border: "1px solid var(--app-border)",
  borderRadius: 4,
  padding: 16,
};

const panelTitle = {
  margin: "0 0 8px",
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: "var(--app-muted)",
};

const th = { textAlign: "left", fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--app-muted)", padding: "10px 16px", borderBottom: "1px solid var(--app-border)" };
const td = { padding: "10px 16px", fontSize: 14, color: "var(--app-text)", verticalAlign: "middle" };

const keyChip = {
  display: "inline-flex",
  alignItems: "center",
  height: 18,
  padding: "0 6px",
  background: "var(--n20)",
  border: "1px solid var(--app-border-subtle)",
  borderRadius: 3,
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  color: "var(--app-muted)",
  fontWeight: 600,
};
