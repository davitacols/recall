import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PlusIcon, SparklesIcon } from "@heroicons/react/24/outline";
import api from "../services/api";
import { WorkspaceEmptyState, WorkspaceHero, WorkspacePanel, WorkspaceToolbar } from "../components/WorkspaceChrome";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";
import { buildAskRecallPath } from "../utils/askRecall";
import { createPlainTextPreview } from "../utils/textPreview";

function Releases() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);
  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    version: "",
    release_date: "",
    status: "unreleased",
    description: "",
  });

  useEffect(() => {
    fetchReleases();
  }, [projectId]);

  const fetchReleases = async () => {
    try {
      const response = await api.get(`/api/agile/projects/${projectId}/releases/`);
      setReleases(response.data);
    } catch (error) {
      console.error("Failed to fetch releases:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/api/agile/projects/${projectId}/releases/`, formData);
      setShowForm(false);
      setFormData({ name: "", version: "", release_date: "", status: "unreleased", description: "" });
      fetchReleases();
    } catch (error) {
      console.error("Failed to create release:", error);
    }
  };

  const updateStatus = async (releaseId, status) => {
    try {
      await api.patch(`/api/agile/releases/${releaseId}/`, { status });
      fetchReleases();
    } catch (error) {
      console.error("Failed to update release:", error);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <div style={spinner} />
      </div>
    );
  }

  const releasedCount = releases.filter((release) => release.status === "released").length;
  const upcomingCount = releases.filter((release) => release.status === "unreleased").length;
  const archivedCount = releases.filter((release) => release.status === "archived").length;
  const nextRelease = releases.find((release) => release.status === "unreleased") || null;
  const releasePulse =
    releases.length === 0
      ? "No release train has been defined for this project yet."
      : nextRelease
        ? `The next release in view is ${nextRelease.name}${nextRelease.release_date ? ` on ${new Date(nextRelease.release_date).toLocaleDateString()}` : ""}.`
        : "All visible releases are either shipped or archived.";
  const releaseAskRecallQuestion = nextRelease
    ? `What should we watch before shipping ${nextRelease.name}?`
    : releases.length
      ? "Which release is closest to shipping, and what should we watch next?"
      : "What release should this project define first, based on the current delivery context?";

  return (
    <div style={{ minHeight: "100vh" }}>
      <div style={ui.container}>
        <WorkspaceHero
          palette={palette}
          darkMode={darkMode}
          variant="execution"
          eyebrow="Roadmap"
          title="Releases"
          description="Track what is shipping, what is upcoming, and how the project is staging delivery across release windows."
          stats={[
            { label: "Total releases", value: releases.length, helper: "Release records tied to this project." },
            { label: "Upcoming", value: upcomingCount, helper: "Releases still waiting to ship." },
            { label: "Released", value: releasedCount, helper: "Releases already shipped." },
            { label: "Archived", value: archivedCount, helper: "Older release records parked for reference." },
          ]}
          aside={
            <div
              style={{
                ...spotlightCard,
                border: `1px solid ${palette.border}`,
                background: darkMode
                  ? "linear-gradient(145deg, rgba(29,24,20,0.96), rgba(20,17,14,0.88))"
                  : "linear-gradient(145deg, rgba(255,252,248,0.98), rgba(245,239,229,0.9))",
              }}
            >
              <p style={{ ...spotlightEyebrow, color: palette.muted }}>Release pulse</p>
              <h3 style={{ margin: 0, fontSize: 22, lineHeight: 1.05, color: palette.text }}>
                {nextRelease ? nextRelease.name : "No upcoming release"}
              </h3>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: palette.muted }}>{releasePulse}</p>
            </div>
          }
          actions={
            <>
              <button onClick={() => setShowForm(true)} className="ui-btn-polish ui-focus-ring" style={ui.primaryButton}>
                <PlusIcon style={icon14} />
                New Release
              </button>
              <button
                onClick={() => navigate(buildAskRecallPath(releaseAskRecallQuestion))}
                className="ui-btn-polish ui-focus-ring"
                style={ui.secondaryButton}
              >
                <SparklesIcon style={icon14} />
                Ask Recall
              </button>
            </>
          }
        />

        <WorkspaceToolbar palette={palette} darkMode={darkMode} variant="execution">
          <div style={toolbarLayout}>
            <div style={toolbarIntro}>
              <p style={{ ...toolbarEyebrow, color: palette.muted }}>Planning guide</p>
              <h2 style={{ ...toolbarTitle, color: palette.text }}>Use release records as the shipping layer above sprint work and issue flow</h2>
              <p style={{ ...toolbarCopy, color: palette.muted }}>
                Releases should make the roadmap tangible. Capture the target window, keep the status current, and use the description as the shipping brief.
              </p>
            </div>
            <div style={toolbarChipRail}>
              <span style={{ ...toolbarChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                {upcomingCount} upcoming
              </span>
              <span style={{ ...toolbarChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                {releasedCount} shipped
              </span>
              <span style={{ ...toolbarChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                {archivedCount} archived
              </span>
            </div>
          </div>
        </WorkspaceToolbar>

        {showForm && (
          <WorkspacePanel
            palette={palette}
            darkMode={darkMode}
            variant="execution"
            eyebrow="New release"
            title="Create release"
            description="Capture the shipping brief, version, and target window for this release."
          >
            <form onSubmit={handleSubmit} style={{ display: "grid", gap: 8 }}>
              <div style={ui.twoCol}>
                <input
                  type="text"
                  placeholder="Release Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={ui.input}
                  required
                />
                <input
                  type="text"
                  placeholder="Version (e.g., 1.0.0)"
                  value={formData.version}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                  style={ui.input}
                  required
                />
              </div>
              <input
                type="date"
                value={formData.release_date}
                onChange={(e) => setFormData({ ...formData, release_date: e.target.value })}
                style={ui.input}
              />
              <textarea
                placeholder="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                style={{ ...ui.input, minHeight: 90 }}
              />
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
                <button type="button" onClick={() => setShowForm(false)} style={ui.secondaryButton}>
                  Cancel
                </button>
                <button type="submit" className="ui-btn-polish ui-focus-ring" style={ui.primaryButton}>
                  Create
                </button>
              </div>
            </form>
          </WorkspacePanel>
        )}

        <WorkspacePanel
          palette={palette}
          darkMode={darkMode}
          variant="execution"
          eyebrow="Release atlas"
          title="Shipping windows"
          description="Update release status as delivery moves from planned to shipped to archived."
        >
          {releases.length === 0 ? (
            <WorkspaceEmptyState
              palette={palette}
              darkMode={darkMode}
              variant="execution"
              title="No releases yet"
              description="Create the first release to start shaping the shipping roadmap for this project."
            />
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {releases.map((release) => (
                <article key={release.id} style={{ ...panel, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ minWidth: 0, display: "grid", gap: 6 }}>
                      <h3 style={{ margin: 0, fontSize: 24, color: palette.text }}>{release.name}</h3>
                      <p style={{ margin: 0, color: palette.muted }}>Version {release.version}</p>
                    </div>
                    <select
                      value={release.status}
                      onChange={(e) => updateStatus(release.id, e.target.value)}
                      style={{
                        ...ui.input,
                        width: 140,
                        padding: "6px 8px",
                        color: release.status === "released" ? palette.success : release.status === "archived" ? palette.muted : palette.warn,
                      }}
                    >
                      <option value="unreleased">Unreleased</option>
                      <option value="released">Released</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                  <p style={{ color: palette.muted, margin: "8px 0 0", fontSize: 13, lineHeight: 1.65 }}>
                    {createPlainTextPreview(release.description || "", "No release brief recorded yet.", 180)}
                  </p>
                  <div style={metaRail}>
                    <span style={{ ...metaChip, border: `1px solid ${palette.border}`, background: palette.card, color: palette.text }}>
                      {release.status}
                    </span>
                    {release.release_date ? (
                      <span style={{ ...metaChip, border: `1px solid ${palette.border}`, background: palette.card, color: palette.text }}>
                        {new Date(release.release_date).toLocaleDateString()}
                      </span>
                    ) : null}
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

export default Releases;

const spotlightCard = { minWidth: 240, borderRadius: 24, padding: 16, display: "grid", gap: 10 };
const spotlightEyebrow = { margin: 0, fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase" };
const toolbarLayout = { display: "grid", gap: 14 };
const toolbarIntro = { display: "grid", gap: 4 };
const toolbarEyebrow = { margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" };
const toolbarTitle = { margin: 0, fontSize: 24, lineHeight: 1.04 };
const toolbarCopy = { margin: 0, fontSize: 13, lineHeight: 1.65, maxWidth: 760 };
const toolbarChipRail = { display: "flex", gap: 8, flexWrap: "wrap" };
const toolbarChip = { display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, padding: "8px 12px", fontSize: 12, fontWeight: 700 };
const panel = { borderRadius: 22, padding: 14 };
const metaRail = { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 };
const metaChip = { display: "inline-flex", alignItems: "center", borderRadius: 999, padding: "7px 11px", fontSize: 11, fontWeight: 700, textTransform: "capitalize" };
const icon14 = { width: 14, height: 14 };
const spinner = { width: 28, height: 28, border: "2px solid var(--app-border-strong)", borderTopColor: "var(--app-info)", borderRadius: "50%", animation: "spin 1s linear infinite" };
