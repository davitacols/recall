import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FunnelIcon, TrashIcon } from "@heroicons/react/24/outline";
import api from "../services/api";
import {
  WorkspaceEmptyState,
  WorkspaceHero,
  WorkspacePanel,
  WorkspaceToolbar,
} from "../components/WorkspaceChrome";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";

function SavedFilters() {
  const { darkMode } = useTheme();
  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  const [filters, setFilters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    is_public: false,
    filter_params: {},
  });

  useEffect(() => {
    fetchFilters();
  }, []);

  const fetchFilters = async () => {
    try {
      const response = await api.get("/api/agile/filters/");
      setFilters(response.data);
    } catch (error) {
      console.error("Failed to fetch filters:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await api.post("/api/agile/filters/", formData);
      setShowForm(false);
      setFormData({ name: "", is_public: false, filter_params: {} });
      fetchFilters();
    } catch (error) {
      console.error("Failed to create filter:", error);
    }
  };

  const handleDelete = async (filterId) => {
    if (!window.confirm("Delete this filter?")) return;
    try {
      await api.delete(`/api/agile/filters/${filterId}/`);
      fetchFilters();
    } catch (error) {
      console.error("Failed to delete filter:", error);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <div style={spinner} />
      </div>
    );
  }

  const publicCount = filters.filter((filter) => filter.is_public).length;
  const privateCount = Math.max(0, filters.length - publicCount);
  const configuredCount = filters.filter((filter) => Object.keys(filter.filter_params || {}).length > 0).length;
  const filterPulse =
    filters.length === 0
      ? "No reusable filters exist yet, so every issue search still starts from scratch."
      : `${filters.length} saved filter${filters.length === 1 ? "" : "s"} are available. Keep the shared ones crisp so search stays useful for the team.`;

  const filterAside = (
    <div
      style={{
        ...asideCard,
        border: `1px solid ${palette.border}`,
        background: darkMode
          ? "linear-gradient(150deg, rgba(32,27,23,0.92), rgba(22,18,15,0.84))"
          : "linear-gradient(150deg, rgba(255,252,248,0.98), rgba(244,237,226,0.9))",
      }}
    >
      <p style={{ ...asideEyebrow, color: palette.muted }}>Filter Pulse</p>
      <h3 style={{ ...asideTitle, color: palette.text }}>
        {filters.length === 0 ? "Create the first saved filter" : `${publicCount} shared across the team`}
      </h3>
      <p style={{ ...asideCopy, color: palette.muted }}>{filterPulse}</p>
      <div style={asideMetricGrid}>
        <div style={{ ...asideMetric, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
          <p style={{ ...asideMetricLabel, color: palette.muted }}>Private</p>
          <p style={{ ...asideMetricValue, color: palette.text }}>{privateCount}</p>
        </div>
        <div style={{ ...asideMetric, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
          <p style={{ ...asideMetricLabel, color: palette.muted }}>Configured</p>
          <p style={{ ...asideMetricValue, color: palette.text }}>{configuredCount}</p>
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
          eyebrow="Agile Filters"
          title="Saved Filters"
          description="Turn recurring issue searches into reusable filters so review, triage, and backlog cleanup stay fast."
          aside={filterAside}
          stats={[
            { label: "Filters", value: filters.length, helper: "Saved searches available." },
            { label: "Public", value: publicCount, helper: "Shared filters for the wider team." },
            { label: "Private", value: privateCount, helper: "Personal saved searches." },
            { label: "Configured", value: configuredCount, helper: "Filters with saved criteria." },
          ]}
          actions={
            <>
              <Link className="ui-btn-polish ui-focus-ring" to="/agile/templates" style={{ ...ui.secondaryButton, textDecoration: "none" }}>
                Issue Templates
              </Link>
              <button className="ui-btn-polish ui-focus-ring" onClick={() => setShowForm(true)} style={ui.primaryButton}>
                <FunnelIcon style={icon14} /> New Filter
              </button>
            </>
          }
        />

        <WorkspaceToolbar palette={palette} darkMode={darkMode} variant="execution">
          <div style={toolbarLayout}>
            <div style={toolbarIntro}>
              <p style={{ ...toolbarEyebrow, color: palette.muted }}>Search Rules</p>
              <h2 style={{ ...toolbarTitle, color: palette.text }}>A saved filter should answer a recurring question, not preserve a one-off search nobody will use again</h2>
              <p style={{ ...toolbarCopy, color: palette.muted }}>
                Use public filters for common triage, planning, and cleanup views. Keep personal filters private when they are only useful for your own workflow.
              </p>
            </div>
            <div style={toolbarChipRail}>
              <span style={{ ...toolbarChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                Shared triage views
              </span>
              <span style={{ ...toolbarChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                Private personal views
              </span>
              <span style={{ ...toolbarChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                {configuredCount} with saved criteria
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
            title="Create saved filter"
            description="Name the recurring view clearly so everyone knows when to use it."
          >
            <form onSubmit={handleSubmit} style={formStack}>
              <input
                type="text"
                placeholder="Filter name"
                value={formData.name}
                onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                className="ui-focus-ring"
                style={ui.input}
                required
              />
              <label style={{ ...checkboxRow, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
                <input
                  type="checkbox"
                  checked={formData.is_public}
                  onChange={(event) => setFormData({ ...formData, is_public: event.target.checked })}
                />
                <span style={{ fontSize: 13, color: palette.text }}>
                  Make this filter public for the whole team
                </span>
              </label>
              <div style={buttonRow}>
                <button type="button" onClick={() => setShowForm(false)} className="ui-btn-polish ui-focus-ring" style={ui.secondaryButton}>
                  Cancel
                </button>
                <button type="submit" className="ui-btn-polish ui-focus-ring" style={ui.primaryButton}>
                  Create filter
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
          title="Saved search catalog"
          description="Keep shared filters readable and ruthlessly delete the ones that no longer support a real workflow."
        >
          {filters.length === 0 ? (
            <WorkspaceEmptyState
              palette={palette}
              darkMode={darkMode}
              variant="execution"
              title="No saved filters yet"
              description="Create the first saved search to speed up triage, backlog reviews, or recurring issue audits."
              action={
                <button className="ui-btn-polish ui-focus-ring" onClick={() => setShowForm(true)} style={ui.primaryButton}>
                  <FunnelIcon style={icon14} /> New Filter
                </button>
              }
            />
          ) : (
            <div style={stack}>
              {filters.map((filter) => {
                const paramsCount = Object.keys(filter.filter_params || {}).length;

                return (
                  <article
                    key={filter.id}
                    className="ui-card-lift ui-smooth"
                    style={{
                      ...filterCard,
                      border: `1px solid ${palette.border}`,
                      background: palette.cardAlt,
                    }}
                  >
                    <div style={filterHead}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ ...filterTitle, color: palette.text }}>{filter.name}</p>
                        <p style={{ ...filterMeta, color: palette.muted }}>
                          {filter.is_public ? "Public" : "Private"} | Created by {filter.user_name}
                        </p>
                      </div>
                      <button
                        className="ui-btn-polish ui-focus-ring"
                        onClick={() => handleDelete(filter.id)}
                        style={deleteButton(palette)}
                      >
                        <TrashIcon style={icon16} />
                      </button>
                    </div>

                    <div style={badgeRail}>
                      <span style={{ ...badge, border: `1px solid ${palette.border}`, background: palette.card, color: palette.text }}>
                        {filter.is_public ? "Shared" : "Personal"}
                      </span>
                      <span style={{ ...badge, border: `1px solid ${palette.border}`, background: palette.card, color: palette.text }}>
                        {paramsCount} saved criteria
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </WorkspacePanel>
      </div>
    </div>
  );
}

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

const checkboxRow = {
  borderRadius: 18,
  padding: "12px 14px",
  display: "flex",
  alignItems: "center",
  gap: 10,
};

const buttonRow = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 8,
  flexWrap: "wrap",
};

const stack = {
  display: "grid",
  gap: 12,
};

const filterCard = {
  borderRadius: 22,
  padding: 18,
  display: "grid",
  gap: 12,
};

const filterHead = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "flex-start",
};

const filterTitle = {
  margin: 0,
  fontSize: 18,
  fontWeight: 800,
  letterSpacing: "-0.03em",
};

const filterMeta = {
  margin: "4px 0 0",
  fontSize: 12,
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
const icon16 = { width: 16, height: 16 };

function deleteButton(palette) {
  return {
    border: `1px solid ${palette.border}`,
    background: palette.card,
    color: palette.danger,
    width: 38,
    height: 38,
    borderRadius: 14,
    display: "grid",
    placeItems: "center",
    cursor: "pointer",
  };
}

export default SavedFilters;
