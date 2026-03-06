import React, { useEffect, useMemo, useState } from "react";
import { FunnelIcon, TrashIcon } from "@heroicons/react/24/outline";
import api from "../services/api";
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

  return (
    <div style={{ minHeight: "100vh" }}>
      <div style={ui.container}>
        <div style={header}>
          <div>
            <p style={{ margin: 0, fontSize: 11, letterSpacing: "0.12em", color: palette.muted, fontWeight: 700 }}>AGILE</p>
            <h1 style={{ margin: "6px 0 0", fontSize: "clamp(1.6rem,3vw,2.25rem)", color: palette.text }}>Saved Filters</h1>
          </div>
          <button onClick={() => setShowForm(true)} style={ui.primaryButton}>
            <FunnelIcon style={icon14} />
            New Filter
          </button>
        </div>

        {showForm && (
          <div style={{ ...panel, border: `1px solid ${palette.border}`, background: palette.card, marginBottom: 10 }}>
            <h2 style={{ margin: 0, fontSize: 18, color: palette.text }}>Create Filter</h2>
            <form onSubmit={handleSubmit} style={{ marginTop: 10, display: "grid", gap: 8 }}>
              <input
                type="text"
                placeholder="Filter Name"
                value={formData.name}
                onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                style={ui.input}
                required
              />
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={formData.is_public}
                  onChange={(event) => setFormData({ ...formData, is_public: event.target.checked })}
                />
                <span style={{ fontSize: 13, color: palette.text }}>Make this filter public</span>
              </label>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
                <button type="submit" style={ui.primaryButton}>Create</button>
                <button type="button" onClick={() => setShowForm(false)} style={ui.secondaryButton}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        <div style={{ display: "grid", gap: 8 }}>
          {filters.map((filter) => (
            <div
              key={filter.id}
              style={{
                ...panel,
                border: `1px solid ${palette.border}`,
                background: palette.card,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div>
                <h3 style={{ margin: 0, color: palette.text }}>{filter.name}</h3>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: palette.muted }}>
                  {filter.is_public ? "Public" : "Private"} | Created by {filter.user_name}
                </p>
              </div>
              <button
                onClick={() => handleDelete(filter.id)}
                style={{ border: `1px solid ${palette.border}`, background: "transparent", color: "#dc2626", width: 34, height: 34, display: "grid", placeItems: "center", cursor: "pointer" }}
              >
                <TrashIcon style={icon16} />
              </button>
            </div>
          ))}
          {filters.length === 0 && (
            <div style={{ ...empty, border: `1px dashed ${palette.border}`, color: palette.muted }}>No saved filters yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}

const header = { display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 10, flexWrap: "wrap", marginBottom: 12 };
const panel = { borderRadius: 0, padding: 12 };
const empty = { borderRadius: 0, textAlign: "center", padding: "18px 12px" };
const spinner = { width: 28, height: 28, border: "2px solid rgba(120,120,120,0.35)", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 1s linear infinite" };
const icon14 = { width: 14, height: 14 };
const icon16 = { width: 16, height: 16 };

export default SavedFilters;
