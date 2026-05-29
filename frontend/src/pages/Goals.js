import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FlagIcon,
  PlusIcon,
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
  { id: "not_started", label: "Not started" },
  { id: "in_progress", label: "In progress" },
  { id: "on_hold", label: "On hold" },
  { id: "completed", label: "Completed" },
];

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function statusVariant(s) {
  const v = String(s || "").toLowerCase();
  if (v === "completed") return "success";
  if (v === "in_progress") return "inprogress";
  if (v === "on_hold") return "moved";
  if (v === "blocked") return "removed";
  return "default";
}

export default function Goals() {
  const navigate = useNavigate();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", target_date: "", status: "not_started" });

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/api/business/goals/");
      setGoals(Array.isArray(res.data) ? res.data : res.data?.results || []);
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Failed to load goals");
      setGoals([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/api/business/goals/", form);
      setShowModal(false);
      setForm({ title: "", description: "", target_date: "", status: "not_started" });
      await fetchGoals();
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Failed to create goal");
    } finally {
      setSubmitting(false);
    }
  };

  const visible = useMemo(() => {
    if (tab === "all") return goals;
    return goals.filter((g) => g.status === tab);
  }, [goals, tab]);

  const tabs = STATUS_TABS.map((t) => ({
    id: t.id,
    label: t.label,
    count: t.id === "all" ? goals.length : goals.filter((g) => g.status === t.id).length,
  }));

  return (
    <div style={{ padding: "0 32px 32px" }}>
      <PageHeader
        breadcrumb={[{ label: "Knoledgr", to: "/" }, { label: "Goals" }]}
        title="Goals"
        subtitle="Track outcomes, owners, and progress across the workspace."
        actions={
          <Button appearance="primary" iconBefore={<PlusIcon style={{ width: 14, height: 14 }} />} onClick={() => setShowModal(true)}>
            Create goal
          </Button>
        }
        tabs={<Tabs tabs={tabs} value={tab} onChange={setTab} />}
        style={{ padding: "24px 0 0", background: "transparent" }}
      />

      {error ? <SectionMessage tone="error" style={{ marginTop: 16 }}>{error}</SectionMessage> : null}

      {loading ? (
        <div style={{ marginTop: 16 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ height: 64, background: "var(--n20)", borderRadius: 4, marginBottom: 8 }} />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<FlagIcon style={{ width: "100%", height: "100%" }} />}
          title="No goals in this view"
          description="Capture an objective to align team work with outcomes."
          primaryAction={<Button appearance="primary" onClick={() => setShowModal(true)}>Create goal</Button>}
        />
      ) : (
        <div style={tableWrap}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--app-surface-alt)" }}>
                <th style={{ ...th, width: "45%" }}>Goal</th>
                <th style={th}>Status</th>
                <th style={th}>Progress</th>
                <th style={th}>Owner</th>
                <th style={th}>Target</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((g) => (
                <tr key={g.id} style={{ borderBottom: "1px solid var(--app-border-subtle)" }}>
                  <td style={td}>
                    <Link to={`/business/goals/${g.id}`} style={{ color: "inherit", textDecoration: "none" }}>
                      <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: "var(--app-link)" }}>{g.title}</span>
                      {g.description ? (
                        <span style={{ display: "block", marginTop: 2, fontSize: 12, color: "var(--app-muted)", maxWidth: 520, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {g.description}
                        </span>
                      ) : null}
                    </Link>
                  </td>
                  <td style={td}>
                    <Lozenge variant={statusVariant(g.status)}>{(g.status || "not_started").replace(/_/g, " ")}</Lozenge>
                  </td>
                  <td style={td}>
                    <ProgressBar value={g.progress || 0} />
                  </td>
                  <td style={td}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <Avatar size="sm" name={g.owner_name || g.created_by_name || "—"} />
                      <span style={{ fontSize: 13 }}>{g.owner_name || g.created_by_name || "—"}</span>
                    </span>
                  </td>
                  <td style={td}>
                    <span style={{ fontSize: 13, color: "var(--app-muted)" }}>{formatDate(g.target_date)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal ? (
        <Modal title="Create goal" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Field label="Title" isRequired>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="atlas-input" required autoFocus />
            </Field>
            <Field label="Description">
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="atlas-input" rows={4} />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <Field label="Target date">
                <input type="date" value={form.target_date} onChange={(e) => setForm({ ...form, target_date: e.target.value })} className="atlas-input" />
              </Field>
              <Field label="Status">
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="atlas-input">
                  {STATUS_TABS.filter((t) => t.id !== "all").map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </Field>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
              <Button type="button" appearance="subtle" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button type="submit" appearance="primary" isDisabled={submitting || !form.title.trim()}>{submitting ? "Creating…" : "Create"}</Button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}

function ProgressBar({ value }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 140 }}>
      <div style={{ flex: 1, height: 6, background: "var(--n30)", borderRadius: 999, overflow: "hidden" }}>
        <div style={{ width: `${v}%`, height: "100%", background: v >= 80 ? "var(--g400)" : v >= 40 ? "var(--b400)" : "var(--y400)" }} />
      </div>
      <span style={{ fontSize: 12, color: "var(--app-muted)", minWidth: 32, textAlign: "right" }}>{v}%</span>
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

const tableWrap = { marginTop: 16, background: "var(--app-surface)", border: "1px solid var(--app-border)", borderRadius: 4, overflow: "hidden" };
const th = { textAlign: "left", fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--app-muted)", padding: "10px 16px", borderBottom: "1px solid var(--app-border)" };
const td = { padding: "12px 16px", fontSize: 14, color: "var(--app-text)", verticalAlign: "middle" };
