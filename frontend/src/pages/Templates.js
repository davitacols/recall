import React, { useEffect, useMemo, useState } from "react";
import {
  DocumentTextIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import api from "../services/api";
import { useToast } from "../components/Toast";
import {
  Button,
  EmptyState,
  Field,
  IconButton,
  Lozenge,
  PageHeader,
  SectionMessage,
  Tabs,
} from "../components/atlas";

const TYPES = [
  { id: "all", label: "All" },
  { id: "goal", label: "Goals" },
  { id: "meeting", label: "Meetings" },
  { id: "task", label: "Tasks" },
  { id: "document", label: "Documents" },
  { id: "other", label: "Other" },
];

function titleCase(value) {
  return String(value || "").replace(/[_-]+/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function normalizeTemplates(data) {
  if (Array.isArray(data)) return data;
  if (data?.results) return data.results;
  if (data && typeof data === "object") return data.templates || [];
  return [];
}

export default function Templates() {
  const toast = useToast?.() || { addToast: () => {} };
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", template_type: "goal", content_text: "{}" });
  const [contentError, setContentError] = useState("");

  useEffect(() => {
    loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/api/business/templates/");
      setTemplates(normalizeTemplates(res?.data));
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  const visible = useMemo(() => {
    if (tab === "all") return templates;
    return templates.filter((t) => t.template_type === tab);
  }, [templates, tab]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setContentError("");
    let content = {};
    try {
      content = form.content_text.trim() ? JSON.parse(form.content_text) : {};
    } catch (err) {
      setContentError("Content must be valid JSON.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/api/business/templates/", {
        name: form.name,
        template_type: form.template_type,
        content,
      });
      setShowModal(false);
      setForm({ name: "", template_type: "goal", content_text: "{}" });
      await loadTemplates();
      toast.addToast?.("Template created", "success");
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Failed to create template");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this template?")) return;
    try {
      await api.delete(`/api/business/templates/${id}/`);
      setTemplates((current) => current.filter((t) => t.id !== id));
      toast.addToast?.("Template deleted", "success");
    } catch (_) {
      toast.addToast?.("Failed to delete template", "error");
    }
  };

  const tabs = TYPES.map((t) => ({
    id: t.id,
    label: t.label,
    count: t.id === "all" ? templates.length : templates.filter((x) => x.template_type === t.id).length,
  }));

  return (
    <div style={{ padding: "0 32px 32px" }}>
      <PageHeader
        breadcrumb={[{ label: "Knoledgr", to: "/" }, { label: "Templates" }]}
        title="Templates"
        subtitle="Reusable starter structures for recurring workflows."
        actions={
          <Button appearance="primary" iconBefore={<PlusIcon style={{ width: 14, height: 14 }} />} onClick={() => setShowModal(true)}>
            New template
          </Button>
        }
        tabs={<Tabs tabs={tabs} value={tab} onChange={setTab} />}
        style={{ padding: "24px 0 0", background: "transparent" }}
      />

      {error ? <SectionMessage tone="error" style={{ marginTop: 16 }}>{error}</SectionMessage> : null}

      {loading ? (
        <div style={{ marginTop: 16 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ height: 56, background: "var(--n20)", borderRadius: 4, marginBottom: 6 }} />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<DocumentTextIcon style={{ width: "100%", height: "100%" }} />}
          title="No templates yet"
          description="Create a template to standardize recurring docs, goals, meetings, or tasks."
          primaryAction={<Button appearance="primary" onClick={() => setShowModal(true)}>New template</Button>}
        />
      ) : (
        <div style={tableWrap}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--app-surface-alt)" }}>
                <th style={th}>Name</th>
                <th style={th}>Type</th>
                <th style={th}>Owner</th>
                <th style={{ ...th, textAlign: "right" }} />
              </tr>
            </thead>
            <tbody>
              {visible.map((t) => (
                <tr key={t.id} style={{ borderBottom: "1px solid var(--app-border-subtle)" }}>
                  <td style={td}>
                    <span style={{ fontWeight: 600 }}>{t.name}</span>
                  </td>
                  <td style={td}><Lozenge>{titleCase(t.template_type)}</Lozenge></td>
                  <td style={td}>
                    <span style={{ fontSize: 13, color: "var(--app-muted)" }}>{t.created_by_name || t.owner || "—"}</span>
                  </td>
                  <td style={{ ...td, textAlign: "right" }}>
                    <Button appearance="subtle" size="sm" iconBefore={<TrashIcon style={{ width: 12, height: 12 }} />} onClick={() => handleDelete(t.id)}>
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal ? (
        <Modal title="New template" onClose={() => setShowModal(false)}>
          <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Field label="Name" isRequired>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="atlas-input" required autoFocus />
            </Field>
            <Field label="Type">
              <select value={form.template_type} onChange={(e) => setForm({ ...form, template_type: e.target.value })} className="atlas-input">
                {TYPES.filter((t) => t.id !== "all").map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="Content (JSON)" errorText={contentError} helpText="JSON object describing the template structure.">
              <textarea
                value={form.content_text}
                onChange={(e) => { setForm({ ...form, content_text: e.target.value }); setContentError(""); }}
                className="atlas-input"
                rows={8}
                style={{ fontFamily: "var(--font-mono)" }}
              />
            </Field>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
              <Button type="button" appearance="subtle" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button type="submit" appearance="primary" isDisabled={submitting || !form.name.trim()}>{submitting ? "Creating…" : "Create"}</Button>
            </div>
          </form>
        </Modal>
      ) : null}
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
const td = { padding: "10px 16px", fontSize: 14, color: "var(--app-text)", verticalAlign: "middle" };
