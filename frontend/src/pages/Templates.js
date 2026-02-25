import React, { useEffect, useMemo, useState } from "react";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useTheme } from "../utils/ThemeAndAccessibility";
import api from "../services/api";
import { useToast } from "../components/Toast";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";

export default function Templates() {
  const { darkMode } = useTheme();
  const { addToast, confirm } = useToast();
  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  const [templates, setTemplates] = useState([]);
  const [filterType, setFilterType] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: "", template_type: "goal", content: {} });
  const [contentText, setContentText] = useState("{}");
  const [contentError, setContentError] = useState("");

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const res = await api.get("/api/business/templates/");
      setTemplates(res.data || []);
    } catch (error) {
      addToast("Failed to load templates", "error");
    }
  };

  const createTemplate = async (event) => {
    event.preventDefault();
    if (contentError) return;

    try {
      await api.post("/api/business/templates/", formData);
      setShowModal(false);
      setFormData({ name: "", template_type: "goal", content: {} });
      setContentText("{}");
      setContentError("");
      loadTemplates();
      addToast("Template created", "success");
    } catch (error) {
      addToast("Failed to create template", "error");
    }
  };

  const deleteTemplate = (id) => {
    confirm("Delete this template?", async () => {
      try {
        await api.delete(`/api/business/templates/${id}/`);
        setTemplates((prev) => prev.filter((template) => template.id !== id));
        addToast("Template deleted", "success");
      } catch (error) {
        addToast("Failed to delete template", "error");
      }
    });
  };

  const filteredTemplates = filterType === "all" ? templates : templates.filter((template) => template.template_type === filterType);

  return (
    <div style={{ minHeight: "100vh", background: palette.bg }}>
      <div style={ui.container}>
        <section style={{ borderRadius: 16, border: `1px solid ${palette.border}`, background: palette.card, padding: 16, display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
          <div>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: palette.muted }}>REUSABLE TEMPLATES</p>
            <h1 style={{ margin: "8px 0 4px", fontSize: "clamp(1.5rem,3vw,2.2rem)", color: palette.text, letterSpacing: "-0.02em" }}>Templates</h1>
            <p style={{ margin: 0, fontSize: 13, color: palette.muted }}>Standardized structures for goals, meetings, and tasks.</p>
          </div>
          <button onClick={() => setShowModal(true)} style={ui.primaryButton}><PlusIcon style={{ width: 14, height: 14 }} /> New Template</button>
        </section>

        <section style={{ borderRadius: 12, border: `1px solid ${palette.border}`, background: palette.card, padding: 10, marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: palette.muted, marginBottom: 6 }}>
            Filter
          </label>
          <select value={filterType} onChange={(event) => setFilterType(event.target.value)} style={{ ...ui.input, maxWidth: 260 }}>
            <option value="all">All Types</option>
            <option value="goal">Goal Templates</option>
            <option value="meeting">Meeting Templates</option>
            <option value="task">Task Templates</option>
          </select>
        </section>

        {filteredTemplates.length === 0 ? (
          <div style={{ borderRadius: 12, border: `1px dashed ${palette.border}`, background: palette.card, padding: "20px 14px", textAlign: "center", color: palette.muted, fontSize: 13 }}>
            No templates found.
          </div>
        ) : (
          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 10 }}>
            {filteredTemplates.map((template) => (
              <article key={template.id} style={{ borderRadius: 12, border: `1px solid ${palette.border}`, background: palette.card, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: palette.muted, border: `1px solid ${palette.border}`, borderRadius: 999, padding: "3px 8px", textTransform: "capitalize", fontWeight: 700 }}>
                    {template.template_type}
                  </span>
                  <button onClick={() => deleteTemplate(template.id)} style={{ border: "1px solid rgba(239,68,68,0.45)", background: "rgba(239,68,68,0.08)", color: "#ef4444", borderRadius: 8, padding: "6px", cursor: "pointer" }}>
                    <TrashIcon style={{ width: 13, height: 13 }} />
                  </button>
                </div>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: palette.text }}>{template.name}</p>
                <p style={{ margin: "6px 0 0", fontSize: 12, color: palette.muted }}>Created by {template.created_by || "Unknown"}</p>
              </article>
            ))}
          </section>
        )}

        {showModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "grid", placeItems: "center", zIndex: 120, padding: 16 }}>
            <div style={{ width: "min(620px,100%)", borderRadius: 14, border: `1px solid ${palette.border}`, background: palette.card, padding: 16 }}>
              <h2 style={{ margin: 0, fontSize: 20, color: palette.text }}>New Template</h2>
              <form onSubmit={createTemplate} style={{ marginTop: 12, display: "grid", gap: 8 }}>
                <input required placeholder="Template name" value={formData.name} onChange={(event) => setFormData({ ...formData, name: event.target.value })} style={ui.input} />
                <select value={formData.template_type} onChange={(event) => setFormData({ ...formData, template_type: event.target.value })} style={ui.input}>
                  <option value="goal">Goal</option>
                  <option value="meeting">Meeting</option>
                  <option value="task">Task</option>
                </select>
                <textarea
                  rows={8}
                  value={contentText}
                  onChange={(event) => {
                    const next = event.target.value;
                    setContentText(next);
                    try {
                      const parsed = JSON.parse(next || "{}");
                      setFormData((prev) => ({ ...prev, content: parsed }));
                      setContentError("");
                    } catch {
                      setContentError("Content must be valid JSON");
                    }
                  }}
                  style={{ ...ui.input, fontFamily: "monospace", fontSize: 12 }}
                />
                {contentError && <p style={{ margin: 0, fontSize: 12, color: "#ef4444" }}>{contentError}</p>}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
                  <button type="button" onClick={() => setShowModal(false)} style={ui.secondaryButton}>Cancel</button>
                  <button type="submit" disabled={Boolean(contentError)} style={{ ...ui.primaryButton, opacity: contentError ? 0.6 : 1 }}>Create</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
