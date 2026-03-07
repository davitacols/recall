import React, { useEffect, useMemo, useState } from "react";
import { PlusIcon } from "@heroicons/react/24/outline";
import api from "../services/api";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";

function prettyJson(value) {
  try {
    return JSON.stringify(value || {}, null, 2);
  } catch {
    return "{}";
  }
}

export default function JourneyMaps() {
  const { darkMode } = useTheme();
  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  const [maps, setMaps] = useState([]);
  const [selectedMap, setSelectedMap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const [newForm, setNewForm] = useState({
    title: "",
    objective: "",
  });
  const [editDataText, setEditDataText] = useState("{}");

  useEffect(() => {
    loadMaps();
  }, []);

  const loadMaps = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/api/business/journeys/");
      const list = Array.isArray(response.data) ? response.data : [];
      setMaps(list);
      if (!selectedMap && list.length > 0) {
        setSelectedMap(list[0]);
        setEditDataText(prettyJson(list[0].map_data));
      }
    } catch (loadError) {
      setError(loadError?.response?.data?.error || "Failed to load journey maps.");
      setMaps([]);
    } finally {
      setLoading(false);
    }
  };

  const createMap = async (event) => {
    event.preventDefault();
    if (!newForm.title.trim()) return;
    setSaving(true);
    setError("");
    try {
      const response = await api.post("/api/business/journeys/", {
        title: newForm.title.trim(),
        objective: newForm.objective,
        map_data: {
          nodes: [],
          edges: [],
          notes: "",
        },
      });
      const detail = await api.get(`/api/business/journeys/${response.data.id}/`);
      const created = detail.data;
      setMaps((prev) => [created, ...prev]);
      setSelectedMap(created);
      setEditDataText(prettyJson(created.map_data));
      setNewForm({ title: "", objective: "" });
      setCreating(false);
    } catch (createError) {
      setError(createError?.response?.data?.error || "Failed to create journey map.");
    } finally {
      setSaving(false);
    }
  };

  const saveSelected = async () => {
    if (!selectedMap) return;
    let parsedMapData = {};
    try {
      parsedMapData = JSON.parse(editDataText || "{}");
    } catch {
      setError("Map data must be valid JSON.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await api.put(`/api/business/journeys/${selectedMap.id}/`, {
        title: selectedMap.title,
        objective: selectedMap.objective || "",
        map_data: parsedMapData,
      });
      const updated = { ...selectedMap, map_data: parsedMapData };
      setSelectedMap(updated);
      setMaps((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch (saveError) {
      setError(saveError?.response?.data?.error || "Failed to save journey map.");
    } finally {
      setSaving(false);
    }
  };

  const selectMap = (item) => {
    setSelectedMap(item);
    setEditDataText(prettyJson(item.map_data));
    setError("");
  };

  return (
    <div style={{ minHeight: "100vh" }}>
      <div style={ui.container}>
        <section style={{ borderRadius: 16, border: `1px solid ${palette.border}`, background: palette.card, padding: 16, marginBottom: 12 }}>
          <p style={{ margin: 0, fontSize: 11, letterSpacing: "0.12em", fontWeight: 700, color: palette.muted }}>CREATIVE DISCOVERY</p>
          <h1 style={{ margin: "8px 0 4px", fontSize: "clamp(1.2rem,2.1vw,1.8rem)", color: palette.text, letterSpacing: "-0.02em" }}>
            Journey Maps
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: palette.muted }}>
            Capture early-stage user journeys, assumptions, and friction points.
          </p>
        </section>

        {error ? (
          <div style={{ borderRadius: 12, border: `1px solid ${palette.error}`, background: palette.card, padding: 10, color: palette.error, marginBottom: 10, fontSize: 12 }}>
            {error}
          </div>
        ) : null}

        <section style={{ display: "grid", gridTemplateColumns: "minmax(240px,320px) minmax(0,1fr)", gap: 10 }}>
          <aside style={{ borderRadius: 12, border: `1px solid ${palette.border}`, background: palette.card, padding: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <p style={{ margin: 0, fontSize: 12, color: palette.muted }}>Maps</p>
              <button type="button" onClick={() => setCreating((prev) => !prev)} style={ui.secondaryButton}>
                <PlusIcon style={{ width: 14, height: 14 }} /> New
              </button>
            </div>

            {creating ? (
              <form onSubmit={createMap} style={{ display: "grid", gap: 8, marginBottom: 10 }}>
                <input
                  required
                  placeholder="Map title"
                  value={newForm.title}
                  onChange={(event) => setNewForm((prev) => ({ ...prev, title: event.target.value }))}
                  style={ui.input}
                />
                <textarea
                  rows={3}
                  placeholder="Objective"
                  value={newForm.objective}
                  onChange={(event) => setNewForm((prev) => ({ ...prev, objective: event.target.value }))}
                  style={ui.input}
                />
                <button type="submit" disabled={saving} style={ui.primaryButton}>
                  {saving ? "Creating..." : "Create Map"}
                </button>
              </form>
            ) : null}

            {loading ? (
              <p style={{ margin: 0, fontSize: 12, color: palette.muted }}>Loading maps...</p>
            ) : maps.length === 0 ? (
              <p style={{ margin: 0, fontSize: 12, color: palette.muted }}>No maps yet.</p>
            ) : (
              <div style={{ display: "grid", gap: 6 }}>
                {maps.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selectMap(item)}
                    style={{
                      textAlign: "left",
                      borderRadius: 10,
                      border: `1px solid ${item.id === selectedMap?.id ? palette.accent : palette.border}`,
                      background: item.id === selectedMap?.id ? palette.cardAlt : palette.card,
                      padding: 8,
                      color: palette.text,
                      cursor: "pointer",
                    }}
                  >
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>{item.title}</p>
                    <p style={{ margin: "4px 0 0", fontSize: 11, color: palette.muted }}>
                      {(item.objective || "No objective").slice(0, 80)}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </aside>

          <section style={{ borderRadius: 12, border: `1px solid ${palette.border}`, background: palette.card, padding: 12 }}>
            {!selectedMap ? (
              <p style={{ margin: 0, color: palette.muted, fontSize: 13 }}>Select a map to edit its journey data.</p>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                <input
                  value={selectedMap.title || ""}
                  onChange={(event) => setSelectedMap((prev) => ({ ...prev, title: event.target.value }))}
                  style={ui.input}
                />
                <textarea
                  rows={3}
                  value={selectedMap.objective || ""}
                  onChange={(event) => setSelectedMap((prev) => ({ ...prev, objective: event.target.value }))}
                  style={ui.input}
                />
                <textarea
                  rows={20}
                  value={editDataText}
                  onChange={(event) => setEditDataText(event.target.value)}
                  style={{ ...ui.input, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12 }}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                  <button type="button" onClick={saveSelected} disabled={saving} style={ui.primaryButton}>
                    {saving ? "Saving..." : "Save Journey Map"}
                  </button>
                </div>
              </div>
            )}
          </section>
        </section>
      </div>
    </div>
  );
}
