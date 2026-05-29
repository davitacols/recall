import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarIcon,
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
  Tabs,
} from "../components/atlas";

const STATUS_TABS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "planned", label: "Planned" },
  { id: "completed", label: "Completed" },
];

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function normalizeSprint(sprint, source = "primary") {
  if (!sprint) return null;
  return {
    id: sprint.id,
    name: sprint.name || `Sprint ${sprint.id}`,
    goal: sprint.goal || "",
    start_date: sprint.start_date,
    end_date: sprint.end_date,
    status: sprint.status || (source === "current" ? "active" : "completed"),
    completed_count: sprint.completed_count ?? sprint.completed ?? 0,
    blocked_count: sprint.blocked_count ?? sprint.blocked ?? 0,
    decisions_made: sprint.decisions_made ?? 0,
    project_id: sprint.project_id ?? null,
  };
}

export default function SprintManagement() {
  const navigate = useNavigate();
  const [sprints, setSprints] = useState([]);
  const [blockers, setBlockers] = useState([]);
  const [defaultProjectId, setDefaultProjectId] = useState(null);
  const [tab, setTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", start_date: "", end_date: "", goal: "" });

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    setError("");
    try {
      const [projRes, blockersRes] = await Promise.allSettled([
        api.get("/api/agile/projects/"),
        api.get("/api/agile/blockers/"),
      ]);
      const projects = projRes.status === "fulfilled" && Array.isArray(projRes.value?.data) ? projRes.value.data : [];
      if (projects.length) setDefaultProjectId(projects[0].id);

      let list = [];
      try {
        const res = await api.get("/api/agile/sprints/");
        list = (Array.isArray(res.data) ? res.data : []).map((s) => normalizeSprint(s));
      } catch (err) {
        if (err?.response?.status === 404) {
          const [currentResult, historyResult] = await Promise.allSettled([
            api.get("/api/agile/current-sprint/"),
            api.get("/api/agile/sprint-history/"),
          ]);
          const current = currentResult.status === "fulfilled" && currentResult.value?.data ? normalizeSprint(currentResult.value.data, "current") : null;
          const history = historyResult.status === "fulfilled" && Array.isArray(historyResult.value?.data)
            ? historyResult.value.data.map((s) => normalizeSprint(s, "history"))
            : [];
          const merged = new Map();
          if (current?.id) merged.set(current.id, current);
          history.forEach((s) => merged.set(s.id, s));
          list = Array.from(merged.values());
        } else {
          throw err;
        }
      }
      list.sort((a, b) => new Date(b.end_date || b.start_date || 0) - new Date(a.end_date || a.start_date || 0));
      setSprints(list);

      const blockersData = blockersRes.status === "fulfilled" ? blockersRes.value?.data || [] : [];
      setBlockers(blockersData.filter((b) => b.status === "active"));
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Failed to load sprints");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      if (defaultProjectId) {
        await api.post(`/api/agile/projects/${defaultProjectId}/sprints/`, form);
      } else {
        await api.post("/api/agile/sprints/", form);
      }
      setShowCreate(false);
      setForm({ name: "", start_date: "", end_date: "", goal: "" });
      await fetchAll();
    } catch (err) {
      if (err?.response?.status === 404 && defaultProjectId) {
        try {
          await api.post("/api/agile/sprints/", form);
          setShowCreate(false);
          await fetchAll();
        } catch (fallback) {
          setError(fallback?.response?.data?.detail || fallback?.message || "Failed to create sprint");
        }
      } else {
        setError(err?.response?.data?.detail || err?.message || "Failed to create sprint");
      }
    } finally {
      setCreating(false);
    }
  };

  const visible = useMemo(() => {
    if (tab === "all") return sprints;
    return sprints.filter((s) => s.status === tab);
  }, [sprints, tab]);

  const tabs = STATUS_TABS.map((t) => ({
    id: t.id,
    label: t.label,
    count: t.id === "all" ? sprints.length : sprints.filter((s) => s.status === t.id).length,
  }));

  return (
    <div style={{ padding: "0 32px 32px" }}>
      <PageHeader
        breadcrumb={[{ label: "Knoledgr", to: "/" }, { label: "Sprints" }]}
        title="Sprints"
        subtitle="Plan and review sprint cycles across the workspace."
        actions={
          <Button appearance="primary" iconBefore={<PlusIcon style={{ width: 14, height: 14 }} />} onClick={() => setShowCreate(true)}>
            New sprint
          </Button>
        }
        tabs={<Tabs tabs={tabs} value={tab} onChange={setTab} />}
        style={{ padding: "24px 0 0", background: "transparent" }}
      />

      {error ? <SectionMessage tone="error" style={{ marginTop: 16 }}>{error}</SectionMessage> : null}

      {blockers.length > 0 ? (
        <SectionMessage
          tone="warning"
          title={`${blockers.length} active blocker${blockers.length === 1 ? "" : "s"}`}
          style={{ marginTop: 16 }}
        >
          Resolve blockers to keep delivery on track.
        </SectionMessage>
      ) : null}

      {loading ? (
        <div style={{ marginTop: 16 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ height: 64, background: "var(--n20)", borderRadius: 4, marginBottom: 8 }} />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<RocketLaunchIcon style={{ width: "100%", height: "100%" }} />}
          title="No sprints in this view"
          description="Plan a new sprint to start tracking delivery rhythm."
          primaryAction={<Button appearance="primary" onClick={() => setShowCreate(true)}>New sprint</Button>}
        />
      ) : (
        <div style={listWrap}>
          {visible.map((s) => (
            <button key={s.id} type="button" onClick={() => navigate(`/sprint/${s.id}`)} style={sprintRow}>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "var(--app-text)" }}>{s.name}</span>
                  <Lozenge variant={s.status === "active" ? "inprogress" : s.status === "completed" ? "success" : "default"}>
                    {s.status}
                  </Lozenge>
                </span>
                {s.goal ? <p style={goalText}>{s.goal}</p> : null}
                <span style={dateRow}>
                  <CalendarIcon style={{ width: 12, height: 12 }} />
                  {formatDate(s.start_date)} – {formatDate(s.end_date)}
                </span>
              </span>
              <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                <Stat label="Completed" value={s.completed_count} />
                {s.blocked_count > 0 ? <Stat label="Blocked" value={s.blocked_count} tone="danger" /> : null}
                <Stat label="Decisions" value={s.decisions_made} />
              </div>
            </button>
          ))}
        </div>
      )}

      {showCreate ? (
        <Modal title="Create sprint" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Field label="Name" isRequired>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="atlas-input" required autoFocus />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <Field label="Start date">
                <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="atlas-input" />
              </Field>
              <Field label="End date">
                <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="atlas-input" />
              </Field>
            </div>
            <Field label="Goal">
              <textarea value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} className="atlas-input" rows={3} />
            </Field>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
              <Button type="button" appearance="subtle" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit" appearance="primary" isDisabled={creating || !form.name.trim()}>{creating ? "Creating…" : "Create"}</Button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}

function Stat({ label, value, tone }) {
  return (
    <div style={{ textAlign: "right" }}>
      <p style={{ margin: 0, fontSize: 11, color: "var(--app-muted)", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 700 }}>{label}</p>
      <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: tone === "danger" ? "var(--r500)" : "var(--app-text)" }}>{value}</p>
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

const listWrap = {
  marginTop: 16,
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const sprintRow = {
  display: "flex",
  alignItems: "center",
  gap: 16,
  padding: "16px 20px",
  background: "var(--app-surface)",
  border: "1px solid var(--app-border)",
  borderRadius: 4,
  textAlign: "left",
  cursor: "pointer",
  fontFamily: "inherit",
};

const goalText = {
  margin: "4px 0",
  fontSize: 13,
  color: "var(--app-muted)",
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};

const dateRow = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  fontSize: 12,
  color: "var(--app-muted)",
};
