import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeftIcon,
  FlagIcon,
  PencilIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import api from "../services/api";
import { useToast } from "../components/Toast";
import {
  Avatar,
  Breadcrumb,
  Button,
  Field,
  IconButton,
  Lozenge,
  PageHeader,
  SectionMessage,
} from "../components/atlas";
import { useAgentContextHint } from "../components/AgentDock";

const STATUSES = [
  { id: "not_started", label: "Not started" },
  { id: "in_progress", label: "In progress" },
  { id: "on_hold", label: "On hold" },
  { id: "completed", label: "Completed" },
];

function statusVariant(s) {
  const v = String(s || "").toLowerCase();
  if (v === "completed") return "success";
  if (v === "in_progress") return "inprogress";
  if (v === "on_hold") return "moved";
  if (v === "blocked") return "removed";
  return "default";
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function GoalDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast?.() || { success: () => {}, error: () => {} };

  const [goal, setGoal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", target_date: "", status: "not_started", progress: 0 });
  const [busy, setBusy] = useState(false);

  // Frame the global agent dock around this goal.
  useAgentContextHint(
    goal
      ? {
          kind: "goal",
          label: `Goal · ${goal.title || `#${id}`}`,
          goalPrefix: `Goal "${goal.title || `#${id}`}" — what should we do to advance it? `,
          profile_slug: "general",
        }
      : null
  );

  useEffect(() => {
    fetchGoal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchGoal = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/api/business/goals/${id}/`);
      const data = res.data || {};
      setGoal(data);
      setForm({
        title: data.title || "",
        description: data.description || "",
        target_date: data.target_date ? data.target_date.slice(0, 10) : "",
        status: data.status || "not_started",
        progress: data.progress ?? 0,
      });
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Failed to load goal");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.put(`/api/business/goals/${id}/`, form);
      setEditing(false);
      await fetchGoal();
      toast.success?.("Goal updated");
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Failed to update goal");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this goal?")) return;
    try {
      await api.delete(`/api/business/goals/${id}/`);
      toast.success?.("Goal deleted");
      navigate("/business/goals");
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Failed to delete");
    }
  };

  if (loading) return <div style={{ padding: 32, color: "var(--app-muted)" }}>Loading goal…</div>;
  if (!goal) {
    return (
      <div style={{ padding: 32 }}>
        <SectionMessage tone="error" title="Goal not found">{error || "We couldn't find that goal."}</SectionMessage>
      </div>
    );
  }

  return (
    <div style={{ padding: "0 32px 32px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 24 }}>
        <IconButton icon={<ArrowLeftIcon style={{ width: 16, height: 16 }} />} label="Back" onClick={() => navigate(-1)} />
        <Breadcrumb
          items={[
            { label: "Knoledgr", to: "/" },
            { label: "Goals", to: "/business/goals" },
            { label: goal.title || "Goal" },
          ]}
        />
      </div>

      <PageHeader
        title={
          <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
            <FlagIcon style={{ width: 22, height: 22, color: "var(--g400)" }} />
            {goal.title}
            <Lozenge variant={statusVariant(goal.status)}>{(goal.status || "not_started").replace(/_/g, " ")}</Lozenge>
          </span>
        }
        subtitle={goal.description || ""}
        actions={
          editing ? (
            <>
              <Button appearance="subtle" onClick={() => setEditing(false)}>Cancel</Button>
              <Button appearance="primary" onClick={handleSave} isDisabled={busy}>{busy ? "Saving…" : "Save"}</Button>
            </>
          ) : (
            <>
              <Button appearance="subtle" iconBefore={<PencilIcon style={{ width: 14, height: 14 }} />} onClick={() => setEditing(true)}>Edit</Button>
              <Button appearance="subtle" iconBefore={<TrashIcon style={{ width: 14, height: 14 }} />} onClick={handleDelete}>Delete</Button>
            </>
          )
        }
        style={{ padding: "0 0 0", marginTop: 12, background: "transparent" }}
      />

      {error ? <SectionMessage tone="error" style={{ marginTop: 16 }}>{error}</SectionMessage> : null}

      <div style={pageGrid}>
        <section style={{ minWidth: 0 }}>
          <article style={{ background: "var(--app-surface)", border: "1px solid var(--app-border)", borderRadius: 4, padding: 24 }}>
            {editing ? (
              <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <Field label="Title" isRequired>
                  <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="atlas-input" required />
                </Field>
                <Field label="Description">
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="atlas-input" rows={6} />
                </Field>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  <Field label="Status">
                    <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="atlas-input">
                      {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                  </Field>
                  <Field label="Progress (%)">
                    <input type="number" min="0" max="100" value={form.progress} onChange={(e) => setForm({ ...form, progress: Number(e.target.value) })} className="atlas-input" />
                  </Field>
                  <Field label="Target date">
                    <input type="date" value={form.target_date} onChange={(e) => setForm({ ...form, target_date: e.target.value })} className="atlas-input" />
                  </Field>
                </div>
              </form>
            ) : (
              <div>
                {goal.description ? (
                  <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, color: "var(--app-text)", whiteSpace: "pre-wrap" }}>{goal.description}</p>
                ) : (
                  <p style={{ margin: 0, color: "var(--app-text-disabled)", fontSize: 14 }}>No description yet.</p>
                )}
              </div>
            )}
          </article>
        </section>

        <aside style={sidePanel}>
          <h3 style={panelTitle}>Details</h3>
          <DetailRow label="Status" value={<Lozenge variant={statusVariant(goal.status)}>{(goal.status || "not_started").replace(/_/g, " ")}</Lozenge>} />
          <DetailRow label="Progress" value={<ProgressBar value={goal.progress || 0} />} />
          <DetailRow label="Owner" value={
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Avatar size="sm" name={goal.owner_name || goal.created_by_name || "—"} />
              <span style={{ fontSize: 13 }}>{goal.owner_name || goal.created_by_name || "—"}</span>
            </span>
          } />
          <DetailRow label="Target" value={<span style={{ fontSize: 13 }}>{formatDate(goal.target_date)}</span>} />
          <DetailRow label="Created" value={<span style={{ fontSize: 13, color: "var(--app-muted)" }}>{formatDate(goal.created_at)}</span>} />
        </aside>
      </div>
    </div>
  );
}

function ProgressBar({ value }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: "var(--n30)", borderRadius: 999, overflow: "hidden" }}>
        <div style={{ width: `${v}%`, height: "100%", background: v >= 80 ? "var(--g400)" : v >= 40 ? "var(--b400)" : "var(--y400)" }} />
      </div>
      <span style={{ fontSize: 12, color: "var(--app-muted)" }}>{v}%</span>
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

const pageGrid = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 280px",
  gap: 24,
  marginTop: 16,
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
