import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { buildApiUrl } from "../utils/apiBase";

export default function ChiefOfStaffPanel({ darkMode }) {
  const [plan, setPlan] = useState(null);
  const [selected, setSelected] = useState({});
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [lastRun, setLastRun] = useState(null);
  const [error, setError] = useState("");

  const palette = useMemo(
    () =>
      darkMode
        ? {
            panel: "#171215",
            border: "rgba(255,225,193,0.14)",
            text: "#f4ece0",
            muted: "#baa892",
            accent: "#ffb476",
            good: "#66d5ab",
            warn: "#f59e0b",
            bad: "#ef4444",
          }
        : {
            panel: "#fffaf3",
            border: "#eadfce",
            text: "#231814",
            muted: "#7d6d5a",
            accent: "#d9692e",
            good: "#1f8f66",
            warn: "#b45309",
            bad: "#b91c1c",
          },
    [darkMode]
  );

  useEffect(() => {
    fetchPlan();
  }, []);

  const fetchPlan = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(buildApiUrl("/api/knowledge/ai/chief-of-staff/plan/"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        let message = `Request failed (${response.status})`;
        try {
          const errBody = await response.json();
          if (errBody?.error) message = errBody.error;
          else if (errBody?.detail) message = errBody.detail;
        } catch (_e) {
          // Keep fallback message.
        }
        setPlan(null);
        setError(message);
        return;
      }
      const data = await response.json();
      setPlan(data);

      const next = {};
      (data.interventions || []).slice(0, 3).forEach((item) => {
        next[item.id] = true;
      });
      setSelected(next);
    } catch (error) {
      setPlan(null);
      setError("Unable to load Chief of Staff plan");
    } finally {
      setLoading(false);
    }
  };

  const execute = async (dryRun = false) => {
    if (!plan || executing) return;
    const interventionIds = Object.keys(selected).filter((id) => selected[id]);
    if (interventionIds.length === 0) return;

    setExecuting(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(buildApiUrl("/api/knowledge/ai/chief-of-staff/execute/"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          intervention_ids: interventionIds,
          dry_run: dryRun,
        }),
      });
      const data = await response.json();
      setLastRun(data);
      if (!dryRun) {
        await fetchPlan();
      }
    } catch (error) {
      setLastRun({ error: "Execution failed" });
    } finally {
      setExecuting(false);
    }
  };

  const toggle = (id) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading) return null;

  if (!plan) {
    return (
      <article style={{ borderRadius: 14, border: `1px solid ${palette.border}`, background: palette.panel, padding: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", marginBottom: 8 }}>
          <h3 style={{ margin: 0, fontSize: 14, color: palette.text }}>Chief of Staff</h3>
          <button
            onClick={fetchPlan}
            style={{ border: `1px solid ${palette.border}`, borderRadius: 8, background: "transparent", color: palette.text, fontSize: 11, padding: "5px 8px", cursor: "pointer" }}
          >
            Retry
          </button>
        </div>
        <p style={{ margin: 0, fontSize: 12, color: palette.bad }}>
          {error || "No Chief of Staff data available."}
        </p>
      </article>
    );
  }

  const status = plan.status || "watch";
  const statusColor = status === "stable" ? palette.good : status === "watch" ? palette.warn : palette.bad;
  const selectedCount = Object.values(selected).filter(Boolean).length;

  return (
    <article style={{ borderRadius: 14, border: `1px solid ${palette.border}`, background: palette.panel, padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", marginBottom: 8 }}>
        <h3 style={{ margin: 0, fontSize: 14, color: palette.text }}>Chief of Staff</h3>
        <button
          onClick={fetchPlan}
          style={{ border: `1px solid ${palette.border}`, borderRadius: 8, background: "transparent", color: palette.text, fontSize: 11, padding: "5px 8px", cursor: "pointer" }}
        >
          Refresh
        </button>
      </div>

      <div style={{ borderRadius: 10, border: `1px solid ${palette.border}`, padding: 10, marginBottom: 8 }}>
        <p style={{ margin: 0, fontSize: 11, color: palette.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>Readiness Score</p>
        <p style={{ margin: "4px 0 0", fontSize: 28, fontWeight: 800, color: palette.text }}>{plan.readiness_score ?? "--"}</p>
        <p style={{ margin: "2px 0 0", fontSize: 12, color: statusColor, fontWeight: 700 }}>{status.toUpperCase()}</p>
      </div>

      <div style={{ borderRadius: 10, border: `1px solid ${palette.border}`, padding: 10, marginBottom: 8 }}>
        <p style={{ margin: "0 0 6px", fontSize: 12, color: palette.text, fontWeight: 700 }}>
          Proposed Interventions ({selectedCount} selected)
        </p>
        {(plan.interventions || []).slice(0, 6).map((item) => (
          <label
            key={item.id}
            style={{
              display: "grid",
              gridTemplateColumns: "16px 1fr",
              gap: 8,
              alignItems: "start",
              marginBottom: 8,
              cursor: "pointer",
            }}
          >
            <input type="checkbox" checked={!!selected[item.id]} onChange={() => toggle(item.id)} />
            <div>
              <p style={{ margin: 0, fontSize: 12, color: palette.text, fontWeight: 700 }}>{item.title}</p>
              <p style={{ margin: "2px 0 0", fontSize: 11, color: palette.muted }}>
                {item.reason} | {item.impact} impact | {item.confidence}% confidence
              </p>
              <Link to={item.url || "/"} style={{ fontSize: 11, color: palette.accent, textDecoration: "none" }}>
                Open
              </Link>
            </div>
          </label>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={() => execute(true)}
          disabled={executing || selectedCount === 0}
          style={{
            border: `1px solid ${palette.border}`,
            borderRadius: 8,
            background: "transparent",
            color: palette.text,
            fontSize: 11,
            padding: "7px 8px",
            cursor: "pointer",
            opacity: executing || selectedCount === 0 ? 0.6 : 1,
          }}
        >
          {executing ? "Running..." : "Dry Run"}
        </button>
        <button
          onClick={() => execute(false)}
          disabled={executing || selectedCount === 0}
          style={{
            border: `1px solid ${palette.border}`,
            borderRadius: 8,
            background: palette.accent,
            color: "#fff",
            fontSize: 11,
            padding: "7px 8px",
            cursor: "pointer",
            opacity: executing || selectedCount === 0 ? 0.6 : 1,
          }}
        >
          {executing ? "Executing..." : "Approve & Execute"}
        </button>
      </div>

      {lastRun && (
        <div style={{ borderRadius: 10, border: `1px solid ${palette.border}`, padding: 10, marginTop: 8 }}>
          {"error" in lastRun ? (
            <p style={{ margin: 0, fontSize: 12, color: palette.bad }}>{lastRun.error}</p>
          ) : (
            <>
              <p style={{ margin: 0, fontSize: 12, color: palette.text, fontWeight: 700 }}>
                Last run: {lastRun.executed_count || 0} executed, {lastRun.skipped_count || 0} skipped
              </p>
              <p style={{ margin: "2px 0 0", fontSize: 11, color: palette.muted }}>
                Audit records: {(lastRun.audit_log_ids || []).length}
              </p>
            </>
          )}
        </div>
      )}
    </article>
  );
}
