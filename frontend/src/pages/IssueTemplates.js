import React, { useEffect, useMemo, useState } from "react";
import { DocumentTextIcon } from "@heroicons/react/24/outline";
import api from "../services/api";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";

function IssueTemplates() {
  const { darkMode } = useTheme();
  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    issue_type: "task",
    title_template: "",
    description_template: "",
    default_priority: "medium",
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await api.get("/api/agile/templates/");
      setTemplates(response.data);
    } catch (error) {
      console.error("Failed to fetch templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/api/agile/templates/", formData);
      setShowForm(false);
      setFormData({
        name: "",
        issue_type: "task",
        title_template: "",
        description_template: "",
        default_priority: "medium",
      });
      fetchTemplates();
    } catch (error) {
      console.error("Failed to create template:", error);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <div style={spinner} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <div style={ui.container}>
        <div style={header}>
          <div>
            <p style={{ margin: 0, fontSize: 11, letterSpacing: "0.12em", color: palette.muted, fontWeight: 700 }}>AGILE</p>
            <h1 style={{ margin: "6px 0 0", fontSize: "clamp(1.24rem,2.25vw,1.84rem)", color: palette.text }}>Issue Templates</h1>
          </div>
          <button
            onClick={() => setShowForm(true)}
            style={ui.primaryButton}
          >
            <DocumentTextIcon style={icon14} />
            New Template
          </button>
        </div>

        {showForm && (
          <div style={{ ...panel, border: `1px solid ${palette.border}`, background: palette.card, marginBottom: 10 }}>
            <h2 style={{ margin: 0, fontSize: 18, color: palette.text }}>Create Template</h2>
            <form onSubmit={handleSubmit} style={{ marginTop: 10, display: "grid", gap: 8 }}>
              <input
                type="text"
                placeholder="Template Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={ui.input}
                required
              />
              <div style={ui.twoCol}>
                <select
                  value={formData.issue_type}
                  onChange={(e) => setFormData({ ...formData, issue_type: e.target.value })}
                  style={ui.input}
                >
                  <option value="epic">Epic</option>
                  <option value="story">Story</option>
                  <option value="task">Task</option>
                  <option value="bug">Bug</option>
                </select>
                <select
                  value={formData.default_priority}
                  onChange={(e) => setFormData({ ...formData, default_priority: e.target.value })}
                  style={ui.input}
                >
                  <option value="lowest">Lowest</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="highest">Highest</option>
                </select>
              </div>
              <input
                type="text"
                placeholder="Title Template (e.g., [BUG] )"
                value={formData.title_template}
                onChange={(e) => setFormData({ ...formData, title_template: e.target.value })}
                style={ui.input}
                required
              />
              <textarea
                placeholder="Description Template"
                value={formData.description_template}
                onChange={(e) => setFormData({ ...formData, description_template: e.target.value })}
                style={{ ...ui.input, minHeight: 120 }}
                required
              />
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
                <button type="submit" style={ui.primaryButton}>
                  Create
                </button>
                <button type="button" onClick={() => setShowForm(false)} style={ui.secondaryButton}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 8 }}>
          {templates.map(template => (
            <div key={template.id} style={{ ...panel, border: `1px solid ${palette.border}`, background: palette.card }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start", marginBottom: 6 }}>
                <h3 style={{ margin: 0, fontWeight: 700, color: palette.text }}>{template.name}</h3>
                <span style={{ fontSize: 10, padding: "3px 7px", border: `1px solid ${palette.border}`, color: palette.muted, textTransform: "uppercase", fontWeight: 700 }}>
                  {template.issue_type}
                </span>
              </div>
              <p style={{ margin: "0 0 4px", fontSize: 13, color: palette.text }}>{template.title_template}</p>
              <p style={{ margin: 0, fontSize: 12, color: palette.muted }}>{template.description_template}</p>
              <p style={{ margin: "8px 0 0", fontSize: 11, color: palette.muted }}>Priority: {template.default_priority}</p>
            </div>
          ))}
          {templates.length === 0 && (
            <div style={{ ...empty, border: `1px dashed ${palette.border}`, color: palette.muted }}>
              No templates yet. Create one to speed up issue creation.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default IssueTemplates;

const header = { display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 10, flexWrap: "wrap", marginBottom: 12 };
const panel = { borderRadius: 0, padding: 12 };
const empty = { borderRadius: 0, textAlign: "center", padding: "18px 12px", gridColumn: "1 / -1" };
const spinner = { width: 28, height: 28, border: "2px solid var(--app-border-strong)", borderTopColor: "var(--app-info)", borderRadius: "50%", animation: "spin 1s linear infinite" };
const icon14 = { width: 14, height: 14 };
