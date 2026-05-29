import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ExclamationTriangleIcon,
  PlusIcon,
  RocketLaunchIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import api from "../services/api";
import {
  Avatar,
  Button,
  EmptyState,
  Field,
  IconButton,
  Lozenge,
  PageHeader,
  SectionMessage,
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
  const diff = Math.ceil((e - Date.now()) / (1000 * 60 * 60 * 24));
  return diff;
}

export default function CurrentSprint() {
  const [sprint, setSprint] = useState(null);
  const [blockers, setBlockers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showBlocker, setShowBlocker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", type: "blocker" });

  const fetchSprint = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/api/agile/current-sprint/");
      const current = res.data;
      setSprint(current);
      if (current?.id) {
        const blockersRes = await api.get(`/api/agile/blockers/?sprint_id=${current.id}`).catch(() => ({ data: [] }));
        setBlockers(Array.isArray(blockersRes.data) ? blockersRes.data : blockersRes.data?.results || []);
      } else {
        setBlockers([]);
      }
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Failed to load sprint");
      setSprint(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSprint();
  }, [fetchSprint]);

  const handleAddBlocker = async (e) => {
    e.preventDefault();
    if (!sprint?.id) return;
    setSubmitting(true);
    try {
      await api.post("/api/agile/blockers/", {
        sprint_id: sprint.id,
        title: form.title,
        description: form.description,
        type: form.type,
      });
      setShowBlocker(false);
      setForm({ title: "", description: "", type: "blocker" });
      await fetchSprint();
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Failed to add blocker");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 32, color: "var(--app-muted)" }}>Loading sprint…</div>;
  }

  if (!sprint) {
    return (
      <div style={{ padding: "0 32px 32px" }}>
        <PageHeader
          breadcrumb={[{ label: "Knoledgr", to: "/" }, { label: "Current sprint" }]}
          title="Current sprint"
          style={{ padding: "24px 0 0", background: "transparent" }}
        />
        <EmptyState
          icon={<RocketLaunchIcon style={{ width: "100%", height: "100%" }} />}
          title="No active sprint"
          description="Plan a sprint to start tracking delivery rhythm."
          primaryAction={<Button appearance="primary" onClick={() => (window.location.href = "/sprint")}>Plan a sprint</Button>}
        />
      </div>
    );
  }

  const remaining = daysLeft(sprint.end_date);
  const issues = sprint.issues || [];
  const done = issues.filter((i) => ["done", "closed", "resolved"].includes(String(i.status || "").toLowerCase())).length;
  const inProgress = issues.filter((i) => ["in_progress", "in_review", "testing"].includes(String(i.status || "").toLowerCase())).length;
  const todo = issues.length - done - inProgress;
  const percent = issues.length ? Math.round((done / issues.length) * 100) : 0;

  return (
    <div style={{ padding: "0 32px 32px" }}>
      <PageHeader
        breadcrumb={[{ label: "Knoledgr", to: "/" }, { label: "Sprints", to: "/sprint" }, { label: sprint.name || "Current" }]}
        title={
          <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
            {sprint.name || "Current sprint"}
            <Lozenge variant="inprogress">Active</Lozenge>
          </span>
        }
        subtitle={sprint.goal || ""}
        actions={
          <Button
            appearance="primary"
            iconBefore={<PlusIcon style={{ width: 14, height: 14 }} />}
            onClick={() => setShowBlocker(true)}
          >
            Report blocker
          </Button>
        }
        style={{ padding: "24px 0 0", background: "transparent" }}
      />

      {error ? <SectionMessage tone="error" style={{ marginTop: 16 }}>{error}</SectionMessage> : null}

      <div style={statsRow}>
        <Stat label="To do" value={todo} />
        <Stat label="In progress" value={inProgress} tone="b400" />
        <Stat label="Done" value={done} tone="g400" />
        <Stat label="Days left" value={remaining ?? "—"} />
        <Stat label="Progress" value={`${percent}%`} />
      </div>

      <div style={progressTrack}>
        <div style={{ ...progressFill, width: `${percent}%` }} />
      </div>
      <div style={{ marginTop: 4, display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--app-muted)" }}>
        <span>{formatDate(sprint.start_date)}</span>
        <span>{formatDate(sprint.end_date)}</span>
      </div>

      {blockers.length > 0 ? (
        <SectionMessage
          tone="warning"
          title={`${blockers.length} active blocker${blockers.length === 1 ? "" : "s"}`}
          style={{ marginTop: 16 }}
        >
          {blockers.slice(0, 3).map((b) => (
            <div key={b.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginTop: 4 }}>
              <ExclamationTriangleIcon style={{ width: 14, height: 14, color: "var(--y500)", flexShrink: 0, marginTop: 2 }} />
              <span style={{ fontSize: 13 }}>
                <strong>{b.title}</strong>
                {b.description ? <span style={{ color: "var(--app-muted)" }}> — {b.description}</span> : null}
              </span>
            </div>
          ))}
        </SectionMessage>
      ) : null}

      <h2 style={sectionHeading}>Issues in this sprint</h2>
      {issues.length === 0 ? (
        <EmptyState title="No issues in this sprint" description="Move issues from the backlog to plan this sprint." />
      ) : (
        <div style={listWrap}>
          {issues.map((iss) => (
            <Link key={iss.id} to={`/issues/${iss.id}`} style={issueRow}>
              <span style={keyChip}>{iss.key || `#${iss.id}`}</span>
              <span style={{ flex: 1, minWidth: 0, fontSize: 14, color: "var(--app-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {iss.title || iss.summary}
              </span>
              <Lozenge status={iss.status} />
              <Avatar size="sm" name={iss.assignee_name || "Unassigned"} src={iss.assignee_avatar} />
            </Link>
          ))}
        </div>
      )}

      {showBlocker ? (
        <Modal title="Report blocker" onClose={() => setShowBlocker(false)}>
          <form onSubmit={handleAddBlocker} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Field label="Title" isRequired>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="atlas-input" required autoFocus />
            </Field>
            <Field label="Description">
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="atlas-input" rows={4} />
            </Field>
            <Field label="Type">
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="atlas-input">
                <option value="blocker">Blocker</option>
                <option value="risk">Risk</option>
                <option value="dependency">Dependency</option>
              </select>
            </Field>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
              <Button type="button" appearance="subtle" onClick={() => setShowBlocker(false)}>Cancel</Button>
              <Button type="submit" appearance="primary" isDisabled={submitting || !form.title.trim()}>{submitting ? "Saving…" : "Report"}</Button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}

function Stat({ label, value, tone }) {
  const color = tone === "b400" ? "var(--b400)" : tone === "g400" ? "var(--g400)" : "var(--app-text)";
  return (
    <div style={statCard}>
      <p style={{ margin: 0, fontSize: 11, color: "var(--app-muted)", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 700 }}>{label}</p>
      <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 500, color }}>{value}</p>
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
  marginTop: 16,
  display: "grid",
  gridTemplateColumns: "repeat(5, 1fr)",
  gap: 8,
};

const statCard = {
  background: "var(--app-surface)",
  border: "1px solid var(--app-border)",
  borderRadius: 4,
  padding: 16,
};

const progressTrack = {
  marginTop: 16,
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

const sectionHeading = {
  margin: "32px 0 8px",
  fontSize: 16,
  fontWeight: 600,
  color: "var(--app-text)",
};

const listWrap = {
  background: "var(--app-surface)",
  border: "1px solid var(--app-border)",
  borderRadius: 4,
  overflow: "hidden",
};

const issueRow = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "10px 16px",
  borderBottom: "1px solid var(--app-border-subtle)",
  color: "inherit",
  textDecoration: "none",
};

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
