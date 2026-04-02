import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircleIcon, ExclamationTriangleIcon, LightBulbIcon } from "@heroicons/react/24/outline";
import api from "../services/api";
import { WorkspaceHero, WorkspaceToolbar } from "../components/WorkspaceChrome";
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

  const totalReviewItems =
    (formData.what_went_well?.length || 0) +
    (formData.what_needs_improvement?.length || 0) +
    (formData.action_items?.length || 0);
  const reviewPulse =
    totalReviewItems === 0
      ? "This retrospective has not been filled in yet."
      : `${formData.action_items?.length || 0} action item${(formData.action_items?.length || 0) === 1 ? "" : "s"} are currently carrying the review forward.`;

  return (
    <div style={{ minHeight: "100vh" }}>
      <div style={ui.container}>
        <WorkspaceHero
          palette={palette}
          darkMode={darkMode}
          variant="execution"
          eyebrow="Retrospective"
          title={sprint.name}
          description="Review what landed well, what needs improvement, and what the team should carry into the next sprint cycle."
          stats={[
            { label: "Completed", value: sprint.completed || 0, helper: "Work marked complete in this sprint." },
            { label: "In progress", value: sprint.in_progress || 0, helper: "Items that remained in motion." },
            { label: "To do", value: sprint.todo || 0, helper: "Items that did not land in this cycle." },
            { label: "Review items", value: totalReviewItems, helper: "Total retrospective notes currently captured." },
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
              <p style={{ ...spotlightEyebrow, color: palette.muted }}>Review pulse</p>
              <h3 style={{ margin: 0, fontSize: 22, lineHeight: 1.05, color: palette.text }}>
                {totalReviewItems === 0 ? "Review not started" : `${totalReviewItems} notes captured`}
              </h3>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: palette.muted }}>
                {sprint.start_date} to {sprint.end_date}. {reviewPulse}
              </p>
            </div>
          }
          actions={
            <Link to="/retrospectives" className="ui-btn-polish ui-focus-ring" style={{ ...ui.secondaryButton, textDecoration: "none" }}>
              Review Memory
            </Link>
          }
        />

        <WorkspaceToolbar palette={palette} darkMode={darkMode} variant="execution">
          <div style={toolbarLayout}>
            <div style={toolbarIntro}>
              <p style={{ ...toolbarEyebrow, color: palette.muted }}>Review guide</p>
              <h2 style={{ ...toolbarTitle, color: palette.text }}>Capture what worked, what slipped, and what the team should improve next</h2>
              <p style={{ ...toolbarCopy, color: palette.muted }}>
                This page should turn sprint review into a reusable memory artifact, not just a one-time meeting note.
              </p>
            </div>
            <div style={toolbarChipRail}>
              <span style={{ ...toolbarChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                {formData.what_went_well.length} wins
              </span>
              <span style={{ ...toolbarChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                {formData.what_needs_improvement.length} improvements
              </span>
              <span style={{ ...toolbarChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                {formData.action_items.length} actions
              </span>
            </div>
          </div>
        </WorkspaceToolbar>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 8, marginBottom: 12 }}>
          <Metric color="var(--app-success)" label="Completed" value={sprint.completed} palette={palette} />
          <Metric color="var(--app-warning)" label="In Progress" value={sprint.in_progress} palette={palette} />
          <Metric color={palette.muted} label="To Do" value={sprint.todo} palette={palette} />
        </section>

        <div style={{ display: "grid", gap: 8 }}>
          <RetrospectiveSection
            title="What Went Well"
            icon={CheckCircleIcon}
            section="what_went_well"
            color="var(--app-success)"
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
            color="var(--app-warning)"
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
    <section style={{ border: `1px solid ${palette.border}`, background: palette.card, padding: 16, borderRadius: 24 }}>
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
            <div key={index} style={{ border: `1px solid ${palette.border}`, background: palette.cardAlt, borderRadius: 18, padding: "10px 12px", display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
              <span style={{ color: palette.text, fontSize: 13 }}>{item}</span>
              {editing && (
                <button
                  onClick={() => onRemove(index)}
                  style={{ border: `1px solid ${palette.border}`, background: "transparent", color: "var(--app-danger)", width: 28, height: 28, cursor: "pointer" }}
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
    <article style={{ border: `1px solid ${palette.border}`, background: palette.card, padding: 10, borderRadius: 18 }}>
      <p style={{ margin: 0, color, fontSize: 24, fontWeight: 800 }}>{value}</p>
      <p style={{ margin: "4px 0 0", color: palette.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>{label}</p>
    </article>
  );
}

const spinner = { width: 28, height: 28, border: "2px solid var(--app-border-strong)", borderTopColor: "var(--app-info)", borderRadius: "50%", animation: "spin 1s linear infinite" };
const spotlightCard = { minWidth: 240, borderRadius: 24, padding: 16, display: "grid", gap: 10 };
const spotlightEyebrow = { margin: 0, fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase" };
const toolbarLayout = { display: "grid", gap: 14 };
const toolbarIntro = { display: "grid", gap: 4 };
const toolbarEyebrow = { margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" };
const toolbarTitle = { margin: 0, fontSize: 24, lineHeight: 1.04 };
const toolbarCopy = { margin: 0, fontSize: 13, lineHeight: 1.65, maxWidth: 760 };
const toolbarChipRail = { display: "flex", gap: 8, flexWrap: "wrap" };
const toolbarChip = { display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, padding: "8px 12px", fontSize: 12, fontWeight: 700 };

export default Retrospectives;
