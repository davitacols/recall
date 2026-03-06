import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircleIcon, ExclamationTriangleIcon, LightBulbIcon } from "@heroicons/react/24/outline";
import api from "../services/api";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";

function Retrospectives() {
  const { sprintId } = useParams();
  const { darkMode } = useTheme();
  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  const [sprint, setSprint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    what_went_well: [],
    what_needs_improvement: [],
    action_items: [],
  });
  const [drafts, setDrafts] = useState({
    what_went_well: "",
    what_needs_improvement: "",
    action_items: "",
  });

  useEffect(() => {
    fetchData();
  }, [sprintId]);

  const fetchData = async () => {
    try {
      const [sprintRes, retroRes] = await Promise.all([
        api.get(`/api/agile/sprints/${sprintId}/detail/`),
        api.get(`/api/agile/sprints/${sprintId}/retrospective/`).catch(() => null),
      ]);

      setSprint(sprintRes.data);

      if (retroRes?.data) {
        setFormData({
          what_went_well: retroRes.data.what_went_well || [],
          what_needs_improvement: retroRes.data.what_needs_improvement || [],
          action_items: retroRes.data.action_items || [],
        });
      } else {
        setFormData({ what_went_well: [], what_needs_improvement: [], action_items: [] });
      }
    } catch (error) {
      console.error("Failed to fetch retrospective:", error);
      setSprint(null);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = (section) => {
    const text = (drafts[section] || "").trim();
    if (!text) return;
    setFormData((prev) => ({ ...prev, [section]: [...prev[section], text] }));
    setDrafts((prev) => ({ ...prev, [section]: "" }));
  };

  const handleRemoveItem = (section, index) => {
    setFormData((prev) => ({
      ...prev,
      [section]: prev[section].filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    try {
      await api.post(`/api/agile/sprints/${sprintId}/retrospective/`, formData);
      setEditing(false);
      fetchData();
    } catch (error) {
      console.error("Failed to save retrospective:", error);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <div style={spinner} />
      </div>
    );
  }

  if (!sprint) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", color: palette.muted }}>
        Sprint not found
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <div style={ui.container}>
        <section style={{ marginBottom: 12 }}>
          <p style={{ margin: 0, fontSize: 11, letterSpacing: "0.12em", color: palette.muted, fontWeight: 700 }}>RETROSPECTIVE</p>
          <h1 style={{ margin: "6px 0 0", fontSize: "clamp(1.6rem,3vw,2.25rem)", color: palette.text }}>{sprint.name}</h1>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: palette.muted }}>
            {sprint.start_date} to {sprint.end_date}
          </p>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 8, marginBottom: 12 }}>
          <Metric color="#16a34a" label="Completed" value={sprint.completed} palette={palette} />
          <Metric color="#ca8a04" label="In Progress" value={sprint.in_progress} palette={palette} />
          <Metric color={palette.muted} label="To Do" value={sprint.todo} palette={palette} />
        </section>

        <div style={{ display: "grid", gap: 8 }}>
          <RetrospectiveSection
            title="What Went Well"
            icon={CheckCircleIcon}
            section="what_went_well"
            color="#16a34a"
            items={formData.what_went_well}
            draft={drafts.what_went_well}
            editing={editing}
            palette={palette}
            ui={ui}
            onChangeDraft={(value) => setDrafts((prev) => ({ ...prev, what_went_well: value }))}
            onAdd={() => handleAddItem("what_went_well")}
            onRemove={(index) => handleRemoveItem("what_went_well", index)}
          />

          <RetrospectiveSection
            title="What Needs Improvement"
            icon={ExclamationTriangleIcon}
            section="what_needs_improvement"
            color="#ca8a04"
            items={formData.what_needs_improvement}
            draft={drafts.what_needs_improvement}
            editing={editing}
            palette={palette}
            ui={ui}
            onChangeDraft={(value) => setDrafts((prev) => ({ ...prev, what_needs_improvement: value }))}
            onAdd={() => handleAddItem("what_needs_improvement")}
            onRemove={(index) => handleRemoveItem("what_needs_improvement", index)}
          />

          <RetrospectiveSection
            title="Action Items"
            icon={LightBulbIcon}
            section="action_items"
            color="#7c3aed"
            items={formData.action_items}
            draft={drafts.action_items}
            editing={editing}
            palette={palette}
            ui={ui}
            onChangeDraft={(value) => setDrafts((prev) => ({ ...prev, action_items: value }))}
            onAdd={() => handleAddItem("action_items")}
            onRemove={(index) => handleRemoveItem("action_items", index)}
          />
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          {!editing ? (
            <button onClick={() => setEditing(true)} style={ui.primaryButton}>Edit Retrospective</button>
          ) : (
            <>
              <button onClick={handleSave} style={ui.primaryButton}>Save Changes</button>
              <button
                onClick={() => {
                  setEditing(false);
                  fetchData();
                }}
                style={ui.secondaryButton}
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function RetrospectiveSection({ title, icon: Icon, color, items, draft, editing, palette, ui, onChangeDraft, onAdd, onRemove }) {
  return (
    <section style={{ border: `1px solid ${palette.border}`, background: palette.card, padding: 12, borderRadius: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <Icon style={{ width: 18, height: 18, color }} />
        <h2 style={{ margin: 0, fontSize: 18, color: palette.text }}>{title}</h2>
      </div>

      {editing && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, marginBottom: 8 }}>
          <input
            type="text"
            value={draft}
            onChange={(event) => onChangeDraft(event.target.value)}
            placeholder={`Add ${title.toLowerCase()}...`}
            style={ui.input}
          />
          <button onClick={onAdd} style={ui.primaryButton}>Add</button>
        </div>
      )}

      {items.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13, color: palette.muted }}>No items added yet.</p>
      ) : (
        <div style={{ display: "grid", gap: 6 }}>
          {items.map((item, index) => (
            <div key={index} style={{ border: `1px solid ${palette.border}`, background: palette.cardAlt, padding: "8px 10px", display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
              <span style={{ color: palette.text, fontSize: 13 }}>{item}</span>
              {editing && (
                <button
                  onClick={() => onRemove(index)}
                  style={{ border: `1px solid ${palette.border}`, background: "transparent", color: "#dc2626", width: 28, height: 28, cursor: "pointer" }}
                >
                  x
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Metric({ label, value, color, palette }) {
  return (
    <article style={{ border: `1px solid ${palette.border}`, background: palette.card, padding: 10, borderRadius: 0 }}>
      <p style={{ margin: 0, color, fontSize: 24, fontWeight: 800 }}>{value}</p>
      <p style={{ margin: "4px 0 0", color: palette.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>{label}</p>
    </article>
  );
}

const spinner = { width: 28, height: 28, border: "2px solid rgba(120,120,120,0.35)", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 1s linear infinite" };

export default Retrospectives;
