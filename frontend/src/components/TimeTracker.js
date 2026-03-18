import React, { useEffect, useMemo, useState } from "react";
import { ClockIcon, PlusIcon } from "@heroicons/react/24/outline";
import api from "../services/api";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";

export function TimeTracker({ issueId }) {
  const { darkMode } = useTheme();
  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);
  const [workLogs, setWorkLogs] = useState([]);
  const [showLogForm, setShowLogForm] = useState(false);
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadWorkLogs();
  }, [issueId]);

  const loadWorkLogs = async () => {
    try {
      const response = await api.get(`/api/agile/issues/${issueId}/work-logs/`);
      setWorkLogs(response.data || []);
    } catch (error) {
      console.error("Failed to load work logs:", error);
      setWorkLogs([]);
    }
  };

  const handleLogWork = async (event) => {
    event.preventDefault();
    const totalMinutes = (parseInt(hours, 10) || 0) * 60 + (parseInt(minutes, 10) || 0);
    if (totalMinutes <= 0) return;

    setLoading(true);
    try {
      await api.post(`/api/agile/issues/${issueId}/log-work/`, {
        time_spent_minutes: totalMinutes,
        description,
        started_at: new Date().toISOString(),
      });
      setHours("");
      setMinutes("");
      setDescription("");
      setShowLogForm(false);
      await loadWorkLogs();
    } catch (error) {
      console.error("Failed to log work:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (minutes) => {
    const hoursSpent = Math.floor((minutes || 0) / 60);
    const remainingMinutes = (minutes || 0) % 60;
    return hoursSpent > 0 ? `${hoursSpent}h ${remainingMinutes}m` : `${remainingMinutes}m`;
  };

  const totalLogged = workLogs.reduce((sum, log) => sum + (log.time_spent_minutes || 0), 0);

  return (
    <div style={stack}>
      <div style={headerRow}>
        <div style={headerMain}>
          <div style={{ ...iconWrap, background: palette.accentSoft, color: palette.accent }}>
            <ClockIcon style={icon16} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ ...title, color: palette.text }}>Time Tracking</p>
            <p style={{ ...meta, color: palette.muted }}>{formatTime(totalLogged)} logged across this issue</p>
          </div>
        </div>

        <button
          className="ui-btn-polish ui-focus-ring"
          onClick={() => setShowLogForm((value) => !value)}
          style={showLogForm ? secondaryButton(palette) : primaryButton(palette)}
        >
          <PlusIcon style={icon14} />
          {showLogForm ? "Hide Form" : "Log Work"}
        </button>
      </div>

      {showLogForm ? (
        <form onSubmit={handleLogWork} style={{ ...innerCard, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
          <div style={ui.twoCol}>
            <Field label="Hours" palette={palette}>
              <input
                type="number"
                min="0"
                value={hours}
                onChange={(event) => setHours(event.target.value)}
                style={ui.input}
                placeholder="0"
              />
            </Field>
            <Field label="Minutes" palette={palette}>
              <input
                type="number"
                min="0"
                max="59"
                value={minutes}
                onChange={(event) => setMinutes(event.target.value)}
                style={ui.input}
                placeholder="0"
              />
            </Field>
          </div>

          <Field label="What changed?" palette={palette}>
            <textarea
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              style={{ ...ui.input, resize: "vertical" }}
              placeholder="Add a short note about the work completed."
            />
          </Field>

          <div style={actionRow}>
            <button
              className="ui-btn-polish ui-focus-ring"
              type="button"
              onClick={() => setShowLogForm(false)}
              style={secondaryButton(palette)}
            >
              Cancel
            </button>
            <button
              className="ui-btn-polish ui-focus-ring"
              type="submit"
              disabled={loading}
              style={{
                ...primaryButton(palette),
                border: "none",
                cursor: loading ? "wait" : "pointer",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Logging..." : "Log Time"}
            </button>
          </div>
        </form>
      ) : null}

      {workLogs.length ? (
        <div style={stack}>
          {workLogs.map((log) => (
            <article
              key={log.id}
              className="ui-card-lift ui-smooth"
              style={{ ...logCard, border: `1px solid ${palette.border}`, background: palette.cardAlt }}
            >
              <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
                <div style={logHeader}>
                  <span style={{ ...pill, background: palette.accentSoft, color: palette.accent }}>
                    {formatTime(log.time_spent_minutes)}
                  </span>
                  <span style={{ ...tinyMeta, color: palette.muted }}>
                    {new Date(log.started_at).toLocaleDateString()}
                  </span>
                </div>
                <p style={{ ...tinyMeta, color: palette.muted }}>by {log.user || "Unknown"}</p>
                {log.description ? <p style={{ ...body, color: palette.text }}>{log.description}</p> : null}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div style={{ ...emptyState, border: `1px dashed ${palette.border}`, color: palette.muted }}>
          No work logs yet. Add time when progress starts moving.
        </div>
      )}
    </div>
  );
}

export function TimeEstimate({ issueId, estimate, onUpdate }) {
  const { darkMode } = useTheme();
  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);
  const [showForm, setShowForm] = useState(false);
  const [original, setOriginal] = useState("");
  const [remaining, setRemaining] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (estimate) {
      setOriginal(
        estimate.original_estimate_minutes ? Math.floor(estimate.original_estimate_minutes / 60).toString() : ""
      );
      setRemaining(
        estimate.remaining_estimate_minutes ? Math.floor(estimate.remaining_estimate_minutes / 60).toString() : ""
      );
    } else {
      setOriginal("");
      setRemaining("");
    }
  }, [estimate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      await api.post(`/api/agile/issues/${issueId}/time-estimate/`, {
        original_estimate_minutes: original ? parseInt(original, 10) * 60 : null,
        remaining_estimate_minutes: remaining ? parseInt(remaining, 10) * 60 : null,
      });
      setShowForm(false);
      onUpdate?.();
    } catch (error) {
      console.error("Failed to set estimate:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={stack}>
      <div style={headerRow}>
        <div>
          <p style={{ ...title, color: palette.text }}>Time Estimate</p>
          <p style={{ ...meta, color: palette.muted }}>
            Track original and remaining effort in hours.
          </p>
        </div>

        <button
          className="ui-btn-polish ui-focus-ring"
          onClick={() => setShowForm((value) => !value)}
          style={secondaryButton(palette)}
        >
          {showForm ? "Close" : estimate ? "Edit" : "Set Estimate"}
        </button>
      </div>

      {estimate && !showForm ? (
        <div style={summaryGrid}>
          <article style={{ ...summaryCard, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
            <p style={{ ...fieldLabel, color: palette.muted }}>Original</p>
            <p style={{ ...summaryMetric, color: palette.text }}>
              {estimate.original_estimate_minutes ? Math.floor(estimate.original_estimate_minutes / 60) : 0}h
            </p>
          </article>
          <article style={{ ...summaryCard, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
            <p style={{ ...fieldLabel, color: palette.muted }}>Remaining</p>
            <p style={{ ...summaryMetric, color: palette.text }}>
              {estimate.remaining_estimate_minutes ? Math.floor(estimate.remaining_estimate_minutes / 60) : 0}h
            </p>
          </article>
        </div>
      ) : null}

      {showForm ? (
        <form onSubmit={handleSubmit} style={{ ...innerCard, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
          <Field label="Original estimate (hours)" palette={palette}>
            <input type="number" min="0" value={original} onChange={(event) => setOriginal(event.target.value)} style={ui.input} />
          </Field>
          <Field label="Remaining estimate (hours)" palette={palette}>
            <input type="number" min="0" value={remaining} onChange={(event) => setRemaining(event.target.value)} style={ui.input} />
          </Field>
          <div style={actionRow}>
            <button className="ui-btn-polish ui-focus-ring" type="submit" disabled={loading} style={{ ...primaryButton(palette), border: "none", opacity: loading ? 0.7 : 1 }}>
              {loading ? "Saving..." : "Save Estimate"}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

function Field({ label, children, palette }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ ...fieldLabel, color: palette.muted }}>{label}</span>
      {children}
    </label>
  );
}

function primaryButton(palette) {
  return {
    borderRadius: 999,
    padding: "10px 14px",
    fontSize: 12,
    fontWeight: 800,
    color: palette.buttonText,
    background: palette.ctaGradient,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    cursor: "pointer",
    border: "none",
  };
}

function secondaryButton(palette) {
  return {
    borderRadius: 999,
    padding: "10px 14px",
    fontSize: 12,
    fontWeight: 800,
    color: palette.text,
    background: palette.card,
    border: `1px solid ${palette.border}`,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    cursor: "pointer",
  };
}

const stack = { display: "grid", gap: 12 };
const headerRow = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" };
const headerMain = { display: "flex", alignItems: "center", gap: 10, minWidth: 0 };
const iconWrap = { width: 34, height: 34, borderRadius: 12, display: "grid", placeItems: "center", flexShrink: 0 };
const title = { margin: 0, fontSize: 14, fontWeight: 800, letterSpacing: "-0.01em" };
const meta = { margin: "2px 0 0", fontSize: 12, lineHeight: 1.5 };
const innerCard = { borderRadius: 18, padding: 14, display: "grid", gap: 12 };
const fieldLabel = { fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" };
const actionRow = { display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" };
const logCard = { borderRadius: 16, padding: 14, display: "grid", gap: 6 };
const logHeader = { display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" };
const pill = { display: "inline-flex", alignItems: "center", borderRadius: 999, padding: "5px 9px", fontSize: 11, fontWeight: 800 };
const tinyMeta = { margin: 0, fontSize: 11, lineHeight: 1.5 };
const body = { margin: 0, fontSize: 13, lineHeight: 1.6 };
const emptyState = { borderRadius: 16, padding: "16px 14px", textAlign: "center", fontSize: 12 };
const summaryGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 };
const summaryCard = { borderRadius: 16, padding: 12, display: "grid", gap: 4 };
const summaryMetric = { margin: 0, fontSize: 18, fontWeight: 800, lineHeight: 1 };
const icon14 = { width: 14, height: 14 };
const icon16 = { width: 16, height: 16 };
