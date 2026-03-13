import React, { useEffect, useMemo, useState } from "react";
import {
  ChevronRightIcon,
  PlusIcon,
  Squares2X2Icon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useTheme } from "../utils/ThemeAndAccessibility";
import api from "../services/api";
import { useToast } from "../components/Toast";
import {
  WorkspaceEmptyState,
  WorkspaceHero,
  WorkspacePanel,
  WorkspaceToolbar,
} from "../components/WorkspaceChrome";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";

function normalizeTemplates(payload) {
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload)) return payload;
  return [];
}

function titleCase(value) {
  const text = String(value || "");
  if (!text) return "Unknown";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default function Templates() {
  const { darkMode } = useTheme();
  const { addToast, confirm } = useToast();
  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  const [templates, setTemplates] = useState([]);
  const [filterType, setFilterType] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ name: "", template_type: "goal", content: {} });
  const [contentText, setContentText] = useState("{}");
  const [contentError, setContentError] = useState("");

  useEffect(() => {
    const loadTemplates = async () => {
      setLoading(true);
      try {
        const response = await api.get("/api/business/templates/");
        setTemplates(normalizeTemplates(response?.data));
      } catch (error) {
        addToast("Failed to load templates", "error");
      } finally {
        setLoading(false);
      }
    };

    loadTemplates();
  }, [addToast]);

  const filteredTemplates =
    filterType === "all"
      ? templates
      : templates.filter((template) => template.template_type === filterType);

  const typeCounts = useMemo(
    () =>
      templates.reduce(
        (accumulator, template) => ({
          ...accumulator,
          [template.template_type]: (accumulator[template.template_type] || 0) + 1,
        }),
        {}
      ),
    [templates]
  );

  const stats = [
    {
      label: "Templates",
      value: templates.length,
      helper: "Reusable structures for recurring business workflows",
      tone: palette.info,
    },
    {
      label: "Visible",
      value: filteredTemplates.length,
      helper: filterType === "all" ? "Showing every template type" : `Filtered to ${titleCase(filterType)} templates`,
      tone: palette.accent,
    },
    {
      label: "Coverage",
      value: Object.keys(typeCounts).length || 0,
      helper: "Template categories currently in rotation",
      tone: palette.success,
    },
  ];

  const createTemplate = async (event) => {
    event.preventDefault();
    if (contentError) return;

    try {
      await api.post("/api/business/templates/", formData);
      setShowModal(false);
      setFormData({ name: "", template_type: "goal", content: {} });
      setContentText("{}");
      setContentError("");

      const response = await api.get("/api/business/templates/");
      setTemplates(normalizeTemplates(response?.data));
      addToast("Template created", "success");
    } catch (error) {
      addToast("Failed to create template", "error");
    }
  };

  const deleteTemplate = (id) => {
    confirm("Delete this template?", async () => {
      try {
        await api.delete(`/api/business/templates/${id}/`);
        setTemplates((current) => current.filter((template) => template.id !== id));
        addToast("Template deleted", "success");
      } catch (error) {
        addToast("Failed to delete template", "error");
      }
    });
  };

  return (
    <div style={{ ...ui.container, display: "grid", gap: 14 }}>
      <WorkspaceHero
        palette={palette}
        darkMode={darkMode}
        eyebrow="Reusable Structures"
        title="Templates"
        description="Standardize how goals, meetings, and tasks are created so new work starts with the right fields, structure, and shared expectations."
        stats={stats}
        actions={
          <button type="button" onClick={() => setShowModal(true)} className="ui-btn-polish ui-focus-ring" style={ui.primaryButton}>
            <PlusIcon style={{ width: 15, height: 15 }} />
            New Template
          </button>
        }
        aside={
          <div
            style={{
              minWidth: 220,
              borderRadius: 20,
              border: `1px solid ${palette.border}`,
              background: palette.cardAlt,
              padding: 14,
              display: "grid",
              gap: 8,
            }}
          >
            <p style={{ margin: 0, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 800, color: palette.muted }}>
              Best Practice
            </p>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: palette.text }}>
              Use templates for recurring planning rituals so teams capture owners, intent, and next actions the same way every time.
            </p>
          </div>
        }
      />

      <WorkspaceToolbar palette={palette}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <select
            value={filterType}
            onChange={(event) => setFilterType(event.target.value)}
            className="ui-focus-ring"
            style={{ ...ui.input, width: "auto", minWidth: 220, padding: "9px 12px", fontSize: 13 }}
          >
            <option value="all">All Types</option>
            <option value="goal">Goal Templates</option>
            <option value="meeting">Meeting Templates</option>
            <option value="task">Task Templates</option>
          </select>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["goal", "meeting", "task"].map((type) => (
              <span
                key={type}
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: `1px solid ${palette.border}`,
                  background: palette.cardAlt,
                  color: palette.muted,
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: "capitalize",
                }}
              >
                {type} {typeCounts[type] || 0}
              </span>
            ))}
          </div>
        </div>
      </WorkspaceToolbar>

      <WorkspacePanel
        palette={palette}
        eyebrow="Library"
        title="Template catalog"
        description="Keep reusable structures lean so teams adopt them instead of bypassing them."
      >
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                style={{
                  minHeight: 160,
                  borderRadius: 18,
                  border: `1px solid ${palette.border}`,
                  background: palette.cardAlt,
                  opacity: 0.7,
                }}
              />
            ))}
          </div>
        ) : null}

        {!loading && filteredTemplates.length === 0 ? (
          <WorkspaceEmptyState
            palette={palette}
            title="No templates found"
            description="Create a template for a recurring goal, meeting, or task flow to speed up repeated work."
            action={
              <button type="button" onClick={() => setShowModal(true)} className="ui-btn-polish ui-focus-ring" style={ui.primaryButton}>
                <PlusIcon style={{ width: 15, height: 15 }} />
                Create Template
              </button>
            }
          />
        ) : null}

        {!loading && filteredTemplates.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
            {filteredTemplates.map((template) => {
              const fields = Object.keys(template.content || {});
              return (
                <article
                  key={template.id}
                  className="ui-card-lift ui-smooth"
                  style={{
                    border: `1px solid ${palette.border}`,
                    borderRadius: 20,
                    padding: 16,
                    background: palette.cardAlt,
                    display: "grid",
                    gap: 12,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 14,
                        background: palette.accentSoft,
                        color: palette.info,
                        display: "grid",
                        placeItems: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Squares2X2Icon style={{ width: 18, height: 18 }} />
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      <span
                        style={{
                          padding: "5px 10px",
                          borderRadius: 999,
                          border: `1px solid ${palette.border}`,
                          color: palette.muted,
                          fontSize: 11,
                          fontWeight: 800,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                        }}
                      >
                        {template.template_type}
                      </span>
                      <button
                        type="button"
                        onClick={() => deleteTemplate(template.id)}
                        className="ui-btn-polish ui-focus-ring"
                        style={{
                          border: `1px solid ${palette.danger}`,
                          background: `${palette.danger}18`,
                          color: palette.danger,
                          borderRadius: 12,
                          padding: "8px",
                          cursor: "pointer",
                        }}
                      >
                        <TrashIcon style={{ width: 14, height: 14 }} />
                      </button>
                    </div>
                  </div>

                  <div style={{ display: "grid", gap: 6 }}>
                    <h3 style={{ margin: 0, fontSize: 17, lineHeight: 1.2, letterSpacing: "-0.03em", color: palette.text }}>
                      {template.name}
                    </h3>
                    <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: palette.muted }}>
                      Created by {template.created_by || "Unknown"}.
                    </p>
                  </div>

                  <div style={{ display: "grid", gap: 8 }}>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: palette.muted }}>
                      Included Fields
                    </p>
                    {fields.length ? (
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {fields.slice(0, 6).map((field) => (
                          <span
                            key={field}
                            style={{
                              padding: "6px 9px",
                              borderRadius: 999,
                              border: `1px solid ${palette.border}`,
                              background: palette.card,
                              fontSize: 12,
                              color: palette.muted,
                              fontWeight: 700,
                            }}
                          >
                            {field}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p style={{ margin: 0, fontSize: 12, color: palette.muted }}>
                        This template starts with a blank JSON body.
                      </p>
                    )}
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, color: palette.link, fontSize: 12, fontWeight: 700 }}>
                    <span>Reusable structure</span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      Review JSON
                      <ChevronRightIcon style={{ width: 14, height: 14 }} />
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </WorkspacePanel>

      {showModal ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 130,
            display: "grid",
            placeItems: "center",
            padding: 18,
            background: "var(--app-overlay)",
          }}
        >
          <div
            style={{
              width: "min(680px, 100%)",
              borderRadius: 24,
              border: `1px solid ${palette.border}`,
              background: palette.card,
              boxShadow: "var(--ui-shadow-lg)",
              padding: 18,
              display: "grid",
              gap: 14,
            }}
          >
            <div style={{ display: "grid", gap: 4 }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: palette.muted }}>
                New Template
              </p>
              <h2 style={{ margin: 0, fontSize: 24, letterSpacing: "-0.04em", color: palette.text }}>
                Create a reusable workflow shell
              </h2>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: palette.muted }}>
                Keep template JSON simple and intentional so teams can start quickly without cleanup work later.
              </p>
            </div>

            <form onSubmit={createTemplate} style={{ display: "grid", gap: 10 }}>
              <input
                required
                placeholder="Template name"
                value={formData.name}
                onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))}
                className="ui-focus-ring"
                style={ui.input}
              />

              <select
                value={formData.template_type}
                onChange={(event) => setFormData((current) => ({ ...current, template_type: event.target.value }))}
                className="ui-focus-ring"
                style={ui.input}
              >
                <option value="goal">Goal</option>
                <option value="meeting">Meeting</option>
                <option value="task">Task</option>
              </select>

              <textarea
                rows={10}
                value={contentText}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setContentText(nextValue);
                  try {
                    const parsed = JSON.parse(nextValue || "{}");
                    setFormData((current) => ({ ...current, content: parsed }));
                    setContentError("");
                  } catch {
                    setContentError("Content must be valid JSON");
                  }
                }}
                className="ui-focus-ring"
                style={{
                  ...ui.input,
                  minHeight: 220,
                  resize: "vertical",
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
                  fontSize: 12,
                  lineHeight: 1.6,
                }}
              />

              {contentError ? (
                <p style={{ margin: 0, fontSize: 12, color: palette.danger }}>
                  {contentError}
                </p>
              ) : null}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="ui-btn-polish ui-focus-ring"
                  style={ui.secondaryButton}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={Boolean(contentError)}
                  className="ui-btn-polish ui-focus-ring"
                  style={{ ...ui.primaryButton, opacity: contentError ? 0.6 : 1 }}
                >
                  Create Template
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
