import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DocumentTextIcon } from "@heroicons/react/24/outline";
import api from "../services/api";
import {
  WorkspaceEmptyState,
  WorkspaceHero,
  WorkspacePanel,
  WorkspaceToolbar,
} from "../components/WorkspaceChrome";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";
import { createPlainTextPreview } from "../utils/textPreview";

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

  const handleSubmit = async (event) => {
    event.preventDefault();
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

  const issueTypeCoverage = new Set(templates.map((template) => template.issue_type)).size;
  const highDefaultCount = templates.filter((template) =>
    ["high", "highest"].includes(String(template.default_priority || "").toLowerCase())
  ).length;
  const templatePulse =
    templates.length === 0
      ? "No issue templates exist yet, so every issue still starts from a blank form."
      : `${templates.length} template${templates.length === 1 ? "" : "s"} are available. Keep the ones people actually use and retire the rest.`;

  const templateAside = (
    <div
      style={{
        ...asideCard,
        border: `1px solid ${palette.border}`,
        background: darkMode
          ? "linear-gradient(150deg, rgba(32,27,23,0.92), rgba(22,18,15,0.84))"
          : "linear-gradient(150deg, rgba(255,252,248,0.98), rgba(244,237,226,0.9))",
      }}
    >
      <p style={{ ...asideEyebrow, color: palette.muted }}>Template Pulse</p>
      <h3 style={{ ...asideTitle, color: palette.text }}>
        {templates.length === 0 ? "Create the first issue template" : `${issueTypeCoverage} issue types covered`}
      </h3>
      <p style={{ ...asideCopy, color: palette.muted }}>{templatePulse}</p>
      <div style={asideMetricGrid}>
        <div style={{ ...asideMetric, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
          <p style={{ ...asideMetricLabel, color: palette.muted }}>Templates</p>
          <p style={{ ...asideMetricValue, color: palette.text }}>{templates.length}</p>
        </div>
        <div style={{ ...asideMetric, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
          <p style={{ ...asideMetricLabel, color: palette.muted }}>High priority</p>
          <p style={{ ...asideMetricValue, color: palette.text }}>{highDefaultCount}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh" }}>
      <div style={ui.container}>
        <WorkspaceHero
          palette={palette}
          darkMode={darkMode}
          variant="execution"
          eyebrow="Agile Templates"
          title="Issue Templates"
          description="Standardize repetitive issue creation so the team starts with sharper titles, clearer descriptions, and better default priority."
          aside={templateAside}
          stats={[
            { label: "Templates", value: templates.length, helper: "Reusable issue patterns." },
            { label: "Issue types", value: issueTypeCoverage, helper: "Different issue categories covered." },
            { label: "High priority", value: highDefaultCount, helper: "Templates that default to urgent work." },
            { label: "Blank starts", value: Math.max(0, 4 - issueTypeCoverage), helper: "Common types still missing a template." },
          ]}
          actions={
            <>
              <Link className="ui-btn-polish ui-focus-ring" to="/agile/filters" style={{ ...ui.secondaryButton, textDecoration: "none" }}>
                Saved Filters
              </Link>
              <button className="ui-btn-polish ui-focus-ring" onClick={() => setShowForm(true)} style={ui.primaryButton}>
                <DocumentTextIcon style={icon14} /> New Template
              </button>
            </>
          }
        />

        <WorkspaceToolbar palette={palette} darkMode={darkMode} variant="execution">
          <div style={toolbarLayout}>
            <div style={toolbarIntro}>
              <p style={{ ...toolbarEyebrow, color: palette.muted }}>Template Rules</p>
              <h2 style={{ ...toolbarTitle, color: palette.text }}>The best templates remove blank-page friction without turning issue creation into rigid bureaucracy</h2>
              <p style={{ ...toolbarCopy, color: palette.muted }}>
                Keep titles specific, descriptions useful, and priorities honest so templates accelerate work instead of creating noisy defaults people ignore.
              </p>
            </div>
            <div style={toolbarChipRail}>
              <span style={{ ...toolbarChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                Clear title patterns
              </span>
              <span style={{ ...toolbarChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                Useful description scaffolds
              </span>
              <span style={{ ...toolbarChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                Honest default priority
              </span>
            </div>
          </div>
        </WorkspaceToolbar>

        {showForm ? (
          <WorkspacePanel
            palette={palette}
            darkMode={darkMode}
            variant="execution"
            eyebrow="Composer"
            title="Create issue template"
            description="Build a starting structure the team can trust when creating repeatable work."
          >
            <form onSubmit={handleSubmit} style={formStack}>
              <input
                type="text"
                placeholder="Template name"
                value={formData.name}
                onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                className="ui-focus-ring"
                style={ui.input}
                required
              />
              <div style={ui.twoCol}>
                <select
                  value={formData.issue_type}
                  onChange={(event) => setFormData({ ...formData, issue_type: event.target.value })}
                  className="ui-focus-ring"
                  style={ui.input}
                >
                  <option value="epic">Epic</option>
                  <option value="story">Story</option>
                  <option value="task">Task</option>
                  <option value="bug">Bug</option>
                </select>
                <select
                  value={formData.default_priority}
                  onChange={(event) => setFormData({ ...formData, default_priority: event.target.value })}
                  className="ui-focus-ring"
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
                placeholder="Title template"
                value={formData.title_template}
                onChange={(event) => setFormData({ ...formData, title_template: event.target.value })}
                className="ui-focus-ring"
                style={ui.input}
                required
              />
              <textarea
                placeholder="Description template"
                value={formData.description_template}
                onChange={(event) => setFormData({ ...formData, description_template: event.target.value })}
                className="ui-focus-ring"
                style={{ ...ui.input, minHeight: 140, resize: "vertical" }}
                required
              />
              <div style={buttonRow}>
                <button type="button" onClick={() => setShowForm(false)} className="ui-btn-polish ui-focus-ring" style={ui.secondaryButton}>
                  Cancel
                </button>
                <button type="submit" className="ui-btn-polish ui-focus-ring" style={ui.primaryButton}>
                  Create template
                </button>
              </div>
            </form>
          </WorkspacePanel>
        ) : null}

        <WorkspacePanel
          palette={palette}
          darkMode={darkMode}
          variant="execution"
          eyebrow="Library"
          title="Template catalog"
          description="Review the patterns currently shaping issue intake and keep only the ones that still help the team move faster."
        >
          {templates.length === 0 ? (
            <WorkspaceEmptyState
              palette={palette}
              darkMode={darkMode}
              variant="execution"
              title="No issue templates yet"
              description="Create the first template to give repeatable issue types a stronger starting point."
              action={
                <button className="ui-btn-polish ui-focus-ring" onClick={() => setShowForm(true)} style={ui.primaryButton}>
                  <DocumentTextIcon style={icon14} /> New Template
                </button>
              }
            />
          ) : (
            <div style={grid}>
              {templates.map((template) => (
                <article
                  key={template.id}
                  className="ui-card-lift ui-smooth"
                  style={{
                    ...templateCard,
                    border: `1px solid ${palette.border}`,
                    background: palette.cardAlt,
                  }}
                >
                  <div style={templateHead}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ ...templateTitle, color: palette.text }}>{template.name}</p>
                      <p style={{ ...templateMeta, color: palette.muted }}>{template.title_template}</p>
                    </div>
                    <span style={{ ...badge, border: `1px solid ${palette.border}`, background: palette.card, color: palette.text }}>
                      {template.issue_type}
                    </span>
                  </div>
                  <p style={{ ...templateBody, color: palette.muted }}>
                    {createPlainTextPreview(
                      template.description_template,
                      "No description template has been defined yet.",
                      220
                    )}
                  </p>
                  <div style={badgeRail}>
                    <span style={{ ...badge, border: `1px solid ${palette.border}`, background: palette.card, color: palette.text }}>
                      Priority: {template.default_priority}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </WorkspacePanel>
      </div>
    </div>
  );
}

export default IssueTemplates;

const asideCard = {
  minWidth: 240,
  borderRadius: 24,
  padding: 16,
  display: "grid",
  gap: 10,
};

const asideEyebrow = {
  margin: 0,
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
};

const asideTitle = {
  margin: 0,
  fontSize: 22,
  lineHeight: 1.04,
};

const asideCopy = {
  margin: 0,
  fontSize: 13,
  lineHeight: 1.6,
};

const asideMetricGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 8,
};

const asideMetric = {
  borderRadius: 18,
  padding: "10px 12px",
  display: "grid",
  gap: 4,
};

const asideMetricLabel = {
  margin: 0,
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
};

const asideMetricValue = {
  margin: 0,
  fontSize: 20,
  lineHeight: 1,
  fontWeight: 800,
};

const toolbarLayout = {
  display: "grid",
  gap: 14,
};

const toolbarIntro = {
  display: "grid",
  gap: 4,
};

const toolbarEyebrow = {
  margin: 0,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
};

const toolbarTitle = {
  margin: 0,
  fontSize: 24,
  lineHeight: 1.04,
};

const toolbarCopy = {
  margin: 0,
  fontSize: 13,
  lineHeight: 1.65,
  maxWidth: 760,
};

const toolbarChipRail = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const toolbarChip = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  borderRadius: 999,
  padding: "8px 12px",
  fontSize: 12,
  fontWeight: 700,
};

const formStack = {
  display: "grid",
  gap: 10,
};

const buttonRow = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 8,
  flexWrap: "wrap",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 12,
};

const templateCard = {
  borderRadius: 22,
  padding: 18,
  display: "grid",
  gap: 12,
};

const templateHead = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "flex-start",
  flexWrap: "wrap",
};

const templateTitle = {
  margin: 0,
  fontSize: 18,
  fontWeight: 800,
  letterSpacing: "-0.03em",
};

const templateMeta = {
  margin: "4px 0 0",
  fontSize: 12,
};

const templateBody = {
  margin: 0,
  fontSize: 13,
  lineHeight: 1.65,
};

const badgeRail = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const badge = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 999,
  padding: "7px 11px",
  fontSize: 11,
  fontWeight: 800,
  textTransform: "capitalize",
};

const spinner = {
  width: 28,
  height: 28,
  border: "2px solid var(--app-border-strong)",
  borderTopColor: "var(--app-info)",
  borderRadius: "50%",
  animation: "spin 1s linear infinite",
};

const icon14 = { width: 14, height: 14 };
