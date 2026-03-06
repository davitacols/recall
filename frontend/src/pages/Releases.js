import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { PlusIcon } from "@heroicons/react/24/outline";
import api from "../services/api";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";

function Releases() {
  const { projectId } = useParams();
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

  return (
    <div style={{ minHeight: "100vh" }}>
      <div style={ui.container}>
        <div style={header}>
          <div>
            <p style={{ margin: 0, fontSize: 11, letterSpacing: "0.12em", color: palette.muted, fontWeight: 700 }}>ROADMAP</p>
            <h1 style={{ margin: "6px 0 0", fontSize: "clamp(1.6rem,3vw,2.25rem)", color: palette.text }}>Releases</h1>
          </div>
          <button
            onClick={() => setShowForm(true)}
            style={ui.primaryButton}
          >
            <PlusIcon style={icon14} />
            New Release
          </button>
        </div>

        {showForm && (
          <div style={{ ...panel, border: `1px solid ${palette.border}`, background: palette.card, marginBottom: 10 }}>
            <h2 style={{ margin: 0, fontSize: 18, color: palette.text }}>Create Release</h2>
            <form onSubmit={handleSubmit} style={{ marginTop: 10, display: "grid", gap: 8 }}>
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

        <div style={{ display: "grid", gap: 8 }}>
          {releases.map(release => (
            <div key={release.id} style={{ ...panel, border: `1px solid ${palette.border}`, background: palette.card }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 24, color: palette.text }}>{release.name}</h3>
                  <p style={{ margin: "4px 0 0", color: palette.muted }}>Version {release.version}</p>
                </div>
                <select
                  value={release.status}
                  onChange={(e) => updateStatus(release.id, e.target.value)}
                  style={{
                    ...ui.input,
                    width: 130,
                    padding: "6px 8px",
                    color: release.status === "released" ? "#15803d" : release.status === "archived" ? palette.muted : "#b45309",
                  }}
                >
                  <option value="unreleased">Unreleased</option>
                  <option value="released">Released</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              {release.description && <p style={{ color: palette.text, margin: "8px 0 0" }}>{release.description}</p>}
              {release.release_date && (
                <p style={{ margin: "8px 0 0", fontSize: 12, color: palette.muted }}>Release Date: {new Date(release.release_date).toLocaleDateString()}</p>
              )}
            </div>
          ))}
          {releases.length === 0 && (
            <div style={{ ...empty, border: `1px dashed ${palette.border}`, color: palette.muted }}>
              No releases yet. Create one to get started.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Releases;

const header = { display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 10, flexWrap: "wrap", marginBottom: 12 };
const panel = { borderRadius: 0, padding: 12 };
const empty = { borderRadius: 0, textAlign: "center", padding: "18px 12px" };
const icon14 = { width: 14, height: 14 };
const spinner = { width: 28, height: 28, border: "2px solid rgba(120,120,120,0.35)", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 1s linear infinite" };
