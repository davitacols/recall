import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import UpgradeNotice from "../components/UpgradeNotice";
import { WorkspaceHero, WorkspaceToolbar } from "../components/WorkspaceChrome";
import { useTheme } from "../utils/ThemeAndAccessibility";
import api from "../services/api";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";
import { createPlainTextPreview } from "../utils/textPreview";

function moveSprintIssue(previousSprint, issueId, nextStatus) {
  if (!previousSprint?.issues) return previousSprint;
  const nextIssues = previousSprint.issues.map((issue) =>
    issue.id === issueId ? { ...issue, status: nextStatus } : issue
  );
  return {
    ...previousSprint,
    issues: nextIssues,
    issue_count: nextIssues.length,
    completed: nextIssues.filter((issue) => issue.status === "done").length,
    in_progress: nextIssues.filter((issue) => issue.status === "in_progress").length,
    todo: nextIssues.filter((issue) => issue.status === "todo").length,
  };
}

function SprintDetail() {
  const { darkMode } = useTheme();
  const { id } = useParams();
  const navigate = useNavigate();

  const [sprint, setSprint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [draggedIssue, setDraggedIssue] = useState(null);
  const [autopilot, setAutopilot] = useState(null);
  const [autopilotLoading, setAutopilotLoading] = useState(false);
  const [autopilotApplying, setAutopilotApplying] = useState(false);
  const [autopilotMessage, setAutopilotMessage] = useState("");
  const [decisionTwin, setDecisionTwin] = useState(null);
  const [decisionTwinLoading, setDecisionTwinLoading] = useState(false);
  const [decisionTwinApplying, setDecisionTwinApplying] = useState(false);
  const [decisionTwinMessage, setDecisionTwinMessage] = useState("");
  const [decisionTwinError, setDecisionTwinError] = useState("");
  const [decisionTwinUpgrade, setDecisionTwinUpgrade] = useState(null);
  const [decisionTwinPolicyHints, setDecisionTwinPolicyHints] = useState([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState("");
  const [movingIssueId, setMovingIssueId] = useState(null);
  const [moveError, setMoveError] = useState("");
  const [decisionTwinPolicy, setDecisionTwinPolicy] = useState({
    min_confidence_band: "medium",
    min_probability_delta: 1.0,
    max_scope_changes: 4,
    allow_backlog_adds: true,
    enforce_policy: true,
  });

  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [sprintRes, autopilotRes, twinRes] = await Promise.allSettled([
        api.get(`/api/agile/sprints/${id}/detail/`),
        api.get(`/api/agile/sprints/${id}/autopilot/`),
        api.get(`/api/agile/sprints/${id}/decision-twin/`, { params: decisionTwinPolicy }),
      ]);
      if (sprintRes.status === "fulfilled") {
        setSprint(sprintRes.value.data.data || sprintRes.value.data);
      } else {
        setSprint(null);
      }
      if (autopilotRes.status === "fulfilled") {
        setAutopilot(autopilotRes.value.data || null);
      } else {
        setAutopilot(null);
      }
      if (twinRes.status === "fulfilled") {
        const payload = twinRes.value.data || null;
        setDecisionTwin(payload);
        setSelectedScenarioId(payload?.recommended_scenario_id || "");
        setDecisionTwinError("");
        setDecisionTwinUpgrade(null);
      } else {
        const twinStatus = twinRes.reason?.response?.status;
        const twinBody = twinRes.reason?.response?.data || {};
        setDecisionTwin(null);
        setSelectedScenarioId((prev) => prev || "baseline");
        if (twinStatus === 402) {
          setDecisionTwinError(twinBody?.error || "Decision Twin is a paid feature.");
          setDecisionTwinUpgrade({
            required_plan: twinBody?.required_plan || "professional",
            current_plan: twinBody?.current_plan || "free",
          });
        } else {
          setDecisionTwinError("Decision Twin API is unavailable for this sprint. Showing fallback scenarios.");
          setDecisionTwinUpgrade(null);
        }
      }
    } catch (error) {
      console.error("Failed to fetch sprint:", error);
      setSprint(null);
      setAutopilot(null);
      setDecisionTwin(null);
      setSelectedScenarioId((prev) => prev || "baseline");
      setDecisionTwinError("Decision Twin failed to load. Showing fallback scenarios.");
      setDecisionTwinUpgrade(null);
    } finally {
      setLoading(false);
      setAutopilotLoading(false);
      setDecisionTwinLoading(false);
    }
  };

  const refreshAutopilot = async () => {
    setAutopilotLoading(true);
    try {
      const response = await api.get(`/api/agile/sprints/${id}/autopilot/`);
      setAutopilot(response.data || null);
    } catch (error) {
      console.error("Failed to refresh autopilot:", error);
    } finally {
      setAutopilotLoading(false);
    }
  };

  const handleDrop = async (status) => {
    if (!draggedIssue) return;
    if (status === draggedIssue.status || movingIssueId === draggedIssue.id) {
      setDraggedIssue(null);
      return;
    }
    let previousSprint = null;
    try {
      const issueId = draggedIssue.id;
      previousSprint = sprint;
      setMoveError("");
      setMovingIssueId(issueId);
      setSprint((current) => moveSprintIssue(current, issueId, status));
      setDraggedIssue(null);
      await api.put(`/api/agile/issues/${issueId}/`, { status });
      refreshAutopilot();
    } catch (error) {
      console.error("Failed to update issue:", error);
      if (previousSprint) {
        setSprint(previousSprint);
      }
      const responseData = error?.response?.data;
      setMoveError(
        responseData?.errors?.join(", ") ||
        responseData?.error ||
        responseData?.message ||
        "Failed to move issue."
      );
      setDraggedIssue(null);
    } finally {
      setMovingIssueId(null);
    }
  };

  const refreshDecisionTwin = async () => {
    setDecisionTwinLoading(true);
    try {
      const response = await api.get(`/api/agile/sprints/${id}/decision-twin/`, { params: decisionTwinPolicy });
      const payload = response.data || null;
      setDecisionTwin(payload);
      setSelectedScenarioId(payload?.recommended_scenario_id || "");
      setDecisionTwinError("");
      setDecisionTwinUpgrade(null);
    } catch (error) {
      console.error("Failed to refresh decision twin:", error);
      if (error?.response?.status === 402) {
        const body = error?.response?.data || {};
        setDecisionTwinError(body?.error || "Decision Twin is a paid feature.");
        setDecisionTwinUpgrade({
          required_plan: body?.required_plan || "professional",
          current_plan: body?.current_plan || "free",
        });
      } else {
        setDecisionTwinError("Decision Twin refresh failed. Using fallback scenarios.");
        setDecisionTwinUpgrade(null);
      }
    } finally {
      setDecisionTwinLoading(false);
    }
  };

  const applyAutopilotPlan = async () => {
    if (!autopilot) return;
    setAutopilotApplying(true);
    setAutopilotMessage("");
    try {
      const dropIds = (autopilot.scope_swap?.suggested_drops || []).map((item) => item.issue_id);
      const addIds = (autopilot.scope_swap?.suggested_adds || []).map((item) => item.issue_id);
      const response = await api.post(`/api/agile/sprints/${id}/autopilot/apply/`, {
        drop_issue_ids: dropIds,
        add_issue_ids: addIds,
        create_decision_followups: true,
      });
      setAutopilotMessage(
        `Applied plan: dropped ${response.data?.dropped_count || 0}, added ${response.data?.added_count || 0}, follow-ups ${response.data?.followups_created || 0}.`
      );
      await fetchData();
    } catch (error) {
      setAutopilotMessage(error?.response?.data?.error || "Failed to apply autopilot plan.");
    } finally {
      setAutopilotApplying(false);
    }
  };

  const applyDecisionTwinPlan = async () => {
    if (!decisionTwin && !selectedScenarioId) return;
    setDecisionTwinApplying(true);
    setDecisionTwinMessage("");
    try {
      const response = await api.post(`/api/agile/sprints/${id}/decision-twin/apply/`, {
        scenario_id: selectedScenarioId || decisionTwin.recommended_scenario_id,
        create_decision_followups: true,
        ...decisionTwinPolicy,
      });
      setDecisionTwinPolicyHints([]);
      setDecisionTwinMessage(
        `Applied ${response.data?.scenario_id || "scenario"}: dropped ${response.data?.dropped_count || 0}, added ${response.data?.added_count || 0}, follow-ups ${response.data?.followups_created || 0}.`
      );
      await fetchData();
    } catch (error) {
      const violations = error?.response?.data?.policy_violations;
      if (Array.isArray(violations) && violations.length > 0) {
        setDecisionTwinMessage(`Scenario violates decision twin policy`);
        setDecisionTwinPolicyHints(buildPolicyAdjustmentHints(violations, decisionTwinPolicy));
      } else if (error?.response?.status === 402) {
        const body = error?.response?.data || {};
        setDecisionTwinMessage(body?.error || "Decision Twin is a paid feature.");
        setDecisionTwinUpgrade({
          required_plan: body?.required_plan || "professional",
          current_plan: body?.current_plan || "free",
        });
        setDecisionTwinPolicyHints([]);
      } else {
        setDecisionTwinMessage(error?.response?.data?.error || "Failed to apply decision twin scenario.");
        setDecisionTwinPolicyHints([]);
      }
    } finally {
      setDecisionTwinApplying(false);
    }
  };

  const autoApplyDecisionTwinPlan = async () => {
    if (!decisionTwin) {
      setDecisionTwinMessage("Auto-apply requires Decision Twin API data. Click Refresh Twin after backend deploy.");
      return;
    }
    setDecisionTwinApplying(true);
    setDecisionTwinMessage("");
    try {
      const response = await api.post(`/api/agile/sprints/${id}/decision-twin/apply/`, {
        auto_apply: true,
        create_decision_followups: true,
        ...decisionTwinPolicy,
      });
      setDecisionTwinPolicyHints([]);
      setDecisionTwinMessage(
        `Auto-applied ${response.data?.scenario_id || "scenario"}: dropped ${response.data?.dropped_count || 0}, added ${response.data?.added_count || 0}, follow-ups ${response.data?.followups_created || 0}.`
      );
      await fetchData();
    } catch (error) {
      const violations = error?.response?.data?.policy_violations;
      if (Array.isArray(violations) && violations.length > 0) {
        setDecisionTwinMessage(`Failed policy guardrails: ${violations.join(" | ")}`);
        setDecisionTwinPolicyHints(buildPolicyAdjustmentHints(violations, decisionTwinPolicy));
      } else if (error?.response?.status === 402) {
        const body = error?.response?.data || {};
        setDecisionTwinMessage(body?.error || "Decision Twin is a paid feature.");
        setDecisionTwinUpgrade({
          required_plan: body?.required_plan || "professional",
          current_plan: body?.current_plan || "free",
        });
        setDecisionTwinPolicyHints([]);
      } else {
        setDecisionTwinMessage(error?.response?.data?.error || "Failed to auto-apply decision twin scenario.");
        setDecisionTwinPolicyHints([]);
      }
    } finally {
      setDecisionTwinApplying(false);
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
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <h2 style={{ color: palette.muted }}>Sprint not found</h2>
      </div>
    );
  }

  const issues = sprint.issues || [];
  const progress = sprint.issue_count > 0 ? Math.round(((sprint.completed || 0) / sprint.issue_count) * 100) : 0;
  const blockerCount = sprint.blocked ?? sprint.blocked_count ?? 0;
  const sprintPulse =
    blockerCount > 0
      ? `${blockerCount} blocker${blockerCount === 1 ? "" : "s"} are shaping this sprint's delivery posture.`
      : progress >= 70
        ? "Sprint is moving well and the execution lanes are mostly clear."
        : "Work is active across the sprint and still has room to tighten its flow.";
  const statuses = ["backlog", "todo", "in_progress", "in_review", "testing", "done"];
  const scenarioOptions = (decisionTwin?.scenarios && decisionTwin.scenarios.length > 0)
    ? decisionTwin.scenarios
    : [
        { id: "baseline", name: "Baseline Plan", projected_goal_probability: "--", delta_vs_baseline: 0 },
        { id: "scope_swap", name: "Scope Swap", projected_goal_probability: "--", delta_vs_baseline: 0 },
        { id: "focus_mode", name: "Focus Mode", projected_goal_probability: "--", delta_vs_baseline: 0 },
      ];

  return (
    <div style={{ minHeight: "100vh" }}>
      <div style={container}>
        <button onClick={() => navigate(-1)} style={backButton}>
          <ArrowLeftIcon style={icon14} /> Back
        </button>

        <WorkspaceHero
          palette={palette}
          darkMode={darkMode}
          variant="execution"
          eyebrow="Sprint Detail"
          title={sprint.name}
          description={
            sprint.goal
              ? createPlainTextPreview(sprint.goal, "", 240)
              : `Track how ${sprint.project_name || "this project"} is moving through the current sprint and adjust execution before drift compounds.`
          }
          stats={[
            { label: "Completion", value: `${progress}%`, helper: "Share of sprint work marked done." },
            { label: "Issues", value: sprint.issue_count || 0, helper: "Tracked work items inside this sprint." },
            { label: "In progress", value: sprint.in_progress || 0, helper: "Items currently moving through delivery." },
            { label: "Blocked", value: blockerCount, helper: "Known blockers affecting sprint flow." },
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
              <p style={{ ...spotlightEyebrow, color: palette.muted }}>Sprint window</p>
              <h3 style={{ margin: 0, fontSize: 22, lineHeight: 1.05, color: palette.text }}>
                {sprint.start_date} - {sprint.end_date}
              </h3>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: palette.muted }}>
                {sprint.project_name ? `${sprint.project_name}. ` : ""}{sprintPulse}
              </p>
            </div>
          }
          actions={
            <>
              <span style={statusPill}>{progress}% complete</span>
              <Link to="/sprint-management" className="ui-btn-polish ui-focus-ring" style={{ ...ui.secondaryButton, textDecoration: "none" }}>
                Sprint Management
              </Link>
            </>
          }
        />

        <WorkspaceToolbar palette={palette} darkMode={darkMode} variant="execution">
          <div style={toolbarLayout}>
            <div style={toolbarIntro}>
              <p style={{ ...toolbarEyebrow, color: palette.muted }}>Execution guide</p>
              <h2 style={{ ...toolbarTitle, color: palette.text }}>Move work through the sprint while watching autopilot and decision-twin pressure</h2>
              <p style={{ ...toolbarCopy, color: palette.muted }}>
                Use the issue lanes for day-to-day execution, and the planning intelligence sections below to see how scope changes could improve delivery.
              </p>
            </div>
            <div style={toolbarChipRail}>
              <span style={{ ...toolbarChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                {sprint.todo || 0} to do
              </span>
              <span style={{ ...toolbarChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                {sprint.completed || 0} done
              </span>
              <span style={{ ...toolbarChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                {blockerCount} blockers
              </span>
              <span style={{ ...toolbarChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                {issues.length} total issues
              </span>
            </div>
          </div>
        </WorkspaceToolbar>

        <section style={statsGrid}>
          <Metric label="Total" value={sprint.issue_count || 0} />
          <Metric label="Done" value={sprint.completed || 0} />
          <Metric label="In Progress" value={sprint.in_progress || 0} />
          <Metric label="Blocked" value={sprint.blocked || 0} />
          <Metric label="Decisions" value={sprint.decisions || 0} />
        </section>

        <section style={{ ...progressCard, background: palette.card, border: `1px solid ${palette.border}`, display: "grid", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <p style={{ margin: 0, fontSize: 11, color: palette.muted, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700 }}>
                Decision-Coupled Sprint Autopilot
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 16, color: palette.text, fontWeight: 800 }}>
                Goal Probability: {autopilot ? `${autopilot.goal_probability}%` : "--"}
              </p>
              {autopilot && (
                <p style={{ margin: "4px 0 0", fontSize: 12, color: palette.muted }}>
                  Confidence: {(autopilot.confidence_band || "low").toUpperCase()} | Unresolved decisions: {autopilot.signals?.unresolved_decisions || 0}
                </p>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={refreshAutopilot} disabled={autopilotLoading} style={secondaryButton}>
                {autopilotLoading ? "Refreshing..." : "Refresh Autopilot"}
              </button>
              <button onClick={applyAutopilotPlan} disabled={autopilotApplying || !autopilot} style={secondaryButton}>
                {autopilotApplying ? "Applying..." : "Apply Autopilot Plan"}
              </button>
            </div>
          </div>
          {autopilotMessage && (
            <p style={{ margin: 0, fontSize: 12, color: autopilotMessage.startsWith("Failed") ? palette.danger : "var(--ui-good)" }}>
              {autopilotMessage}
            </p>
          )}
          {autopilot?.risks?.length > 0 && (
            <ul style={{ margin: 0, paddingLeft: 18, color: palette.muted, fontSize: 12 }}>
              {autopilot.risks.slice(0, 3).map((risk, idx) => (
                <li key={idx}>{risk}</li>
              ))}
            </ul>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 8 }}>
            <div style={{ border: `1px solid ${palette.border}`, borderRadius: 10, padding: 9 }}>
              <p style={{ margin: "0 0 6px", fontSize: 12, color: palette.text, fontWeight: 700 }}>Scope Swap: Suggested Drops</p>
              {(autopilot?.scope_swap?.suggested_drops || []).slice(0, 3).map((item) => (
                <p key={item.issue_id} style={{ margin: "0 0 4px", fontSize: 11, color: palette.muted }}>
                  {item.key}: {item.title}
                </p>
              ))}
              {(autopilot?.scope_swap?.suggested_drops || []).length === 0 && (
                <p style={{ margin: 0, fontSize: 11, color: palette.muted }}>No drops suggested.</p>
              )}
            </div>
            <div style={{ border: `1px solid ${palette.border}`, borderRadius: 10, padding: 9 }}>
              <p style={{ margin: "0 0 6px", fontSize: 12, color: palette.text, fontWeight: 700 }}>Scope Swap: Suggested Adds</p>
              {(autopilot?.scope_swap?.suggested_adds || []).slice(0, 3).map((item) => (
                <p key={item.issue_id} style={{ margin: "0 0 4px", fontSize: 11, color: palette.muted }}>
                  {item.key}: {item.title}
                </p>
              ))}
              {(autopilot?.scope_swap?.suggested_adds || []).length === 0 && (
                <p style={{ margin: 0, fontSize: 11, color: palette.muted }}>No adds suggested.</p>
              )}
            </div>
            <div style={{ border: `1px solid ${palette.border}`, borderRadius: 10, padding: 9 }}>
              <p style={{ margin: "0 0 6px", fontSize: 12, color: palette.text, fontWeight: 700 }}>Decision Dependency Heatmap</p>
              {(autopilot?.decision_dependency_heatmap || []).slice(0, 4).map((item) => (
                <p key={item.issue_id} style={{ margin: "0 0 4px", fontSize: 11, color: palette.muted }}>
                  {item.key}: exposure {item.decision_exposure_score}
                </p>
              ))}
              {(autopilot?.decision_dependency_heatmap || []).length === 0 && (
                <p style={{ margin: 0, fontSize: 11, color: palette.muted }}>No dependency signals yet.</p>
              )}
            </div>
          </div>
        </section>

        <section style={{ ...progressCard, background: palette.card, border: `1px solid ${palette.border}`, display: "grid", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <p style={{ margin: 0, fontSize: 11, color: palette.muted, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700 }}>
                Autonomous Decision Twin
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 15, color: palette.text, fontWeight: 800 }}>
                Counterfactual Plan Engine
              </p>
              {decisionTwin && (
                <p style={{ margin: "4px 0 0", fontSize: 12, color: palette.muted }}>
                  Objective: {decisionTwin.objective}
                </p>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={refreshDecisionTwin} disabled={decisionTwinLoading} style={secondaryButton}>
                {decisionTwinLoading ? "Refreshing..." : "Refresh Twin"}
              </button>
              <button onClick={applyDecisionTwinPlan} disabled={decisionTwinApplying || !selectedScenarioId} style={secondaryButton}>
                {decisionTwinApplying ? "Applying..." : "Apply Selected Scenario"}
              </button>
              <button onClick={autoApplyDecisionTwinPlan} disabled={decisionTwinApplying || !decisionTwin} style={secondaryButton}>
                {decisionTwinApplying ? "Applying..." : "Auto-Apply Guarded"}
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 8 }}>
            <label style={{ display: "grid", gap: 4, fontSize: 11, color: palette.muted }}>
              Min Confidence
              <select
                value={decisionTwinPolicy.min_confidence_band}
                onChange={(event) => setDecisionTwinPolicy((prev) => ({ ...prev, min_confidence_band: event.target.value }))}
                style={{ borderRadius: 8, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text, padding: "7px 8px", fontSize: 12 }}
              >
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
              </select>
            </label>
            <label style={{ display: "grid", gap: 4, fontSize: 11, color: palette.muted }}>
              Min Uplift %
              <input
                type="number"
                step="0.1"
                value={decisionTwinPolicy.min_probability_delta}
                onChange={(event) => setDecisionTwinPolicy((prev) => ({ ...prev, min_probability_delta: Number(event.target.value || 0) }))}
                style={{ borderRadius: 8, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text, padding: "7px 8px", fontSize: 12 }}
              />
            </label>
            <label style={{ display: "grid", gap: 4, fontSize: 11, color: palette.muted }}>
              Max Scope Changes
              <input
                type="number"
                min="0"
                max="20"
                value={decisionTwinPolicy.max_scope_changes}
                onChange={(event) => setDecisionTwinPolicy((prev) => ({ ...prev, max_scope_changes: Number(event.target.value || 0) }))}
                style={{ borderRadius: 8, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text, padding: "7px 8px", fontSize: 12 }}
              />
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: palette.muted }}>
              <input
                type="checkbox"
                checked={decisionTwinPolicy.allow_backlog_adds}
                onChange={(event) => setDecisionTwinPolicy((prev) => ({ ...prev, allow_backlog_adds: event.target.checked }))}
              />
              Allow backlog adds
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: palette.muted }}>
              <input
                type="checkbox"
                checked={decisionTwinPolicy.enforce_policy}
                onChange={(event) => setDecisionTwinPolicy((prev) => ({ ...prev, enforce_policy: event.target.checked }))}
              />
              Enforce policy on apply
            </label>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <select
              value={selectedScenarioId || scenarioOptions[0]?.id || "baseline"}
              onChange={(event) => setSelectedScenarioId(event.target.value)}
              style={{ borderRadius: 8, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text, padding: "8px 10px", fontSize: 13 }}
            >
              {scenarioOptions.map((scenario) => (
                <option key={scenario.id} value={scenario.id}>
                  {scenario.name} | {scenario.projected_goal_probability}% ({scenario.delta_vs_baseline >= 0 ? "+" : ""}{scenario.delta_vs_baseline})
                </option>
              ))}
            </select>

            {(scenarioOptions || [])
              .filter((scenario) => scenario.id === (selectedScenarioId || scenarioOptions[0]?.id))
              .map((scenario) => (
                <div key={scenario.id} style={{ border: `1px solid ${palette.border}`, borderRadius: 10, padding: 10, background: palette.cardAlt }}>
                  <p style={{ margin: "0 0 6px", fontSize: 13, color: palette.text, fontWeight: 700 }}>
                    {scenario.name} | {scenario.projected_goal_probability}% | Confidence {String(scenario.confidence_band || "--").toUpperCase()}
                  </p>
                  <p style={{ margin: "0 0 6px", fontSize: 12, color: palette.muted }}>{scenario.summary || "Refresh Twin to load projected tradeoffs and evidence."}</p>
                  {scenario.tradeoffs && (
                    <p style={{ margin: "0 0 6px", fontSize: 12, color: palette.muted }}>
                      Tradeoffs: {(scenario.tradeoffs || []).join(" | ")}
                    </p>
                  )}
                  {scenario.policy_result && (
                    <p style={{ margin: "0 0 6px", fontSize: 11, color: (scenario.policy_result?.auto_apply_eligible ? "var(--ui-good)" : palette.danger) }}>
                      Policy: {scenario.policy_result?.auto_apply_eligible ? "auto-apply eligible" : "blocked"}
                    </p>
                  )}
                </div>
              ))}
          </div>

          {decisionTwinError && (
            <p style={{ margin: 0, fontSize: 12, color: "var(--ui-warn)" }}>
              {decisionTwinError}
            </p>
          )}
          {decisionTwinUpgrade && (
            <UpgradeNotice
              palette={palette}
              title="Decision Twin is plan-gated."
              description="Move this sprint onto a higher plan to unlock guarded scenario selection, counterfactual comparisons, and auto-apply support."
              currentPlan={decisionTwinUpgrade.current_plan}
              requiredPlan={decisionTwinUpgrade.required_plan}
              ctaTo="/subscription"
              ctaLabel="Open pricing"
            />
          )}

          {decisionTwinMessage && (
            <p style={{ margin: 0, fontSize: 12, color: (decisionTwinMessage.startsWith("Failed") || decisionTwinMessage.toLowerCase().includes("violates")) ? palette.danger : "var(--ui-good)" }}>
              {decisionTwinMessage}
            </p>
          )}
          {decisionTwinPolicyHints.length > 0 && (
            <div style={{ border: `1px solid ${palette.border}`, borderRadius: 10, padding: 10, background: palette.cardAlt }}>
              <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 700, color: palette.text }}>
                How to make this scenario eligible
              </p>
              {decisionTwinPolicyHints.map((hint, idx) => (
                <p key={`${hint}-${idx}`} style={{ margin: "0 0 4px", fontSize: 11, color: palette.muted }}>
                  {idx + 1}. {hint}
                </p>
              ))}
            </div>
          )}
        </section>

        <section style={{ ...progressCard, background: palette.card, border: `1px solid ${palette.border}` }}>
          <div style={progressTrack}>
            <div style={{ ...progressFill, width: `${progress}%` }} />
          </div>
        </section>

        {moveError ? (
          <section style={{ ...progressCard, background: palette.cardAlt, border: `1px solid ${palette.danger}`, color: palette.danger }}>
            <p style={{ margin: 0, fontSize: 12 }}>{moveError}</p>
          </section>
        ) : null}

        <section style={board}>
          {statuses.map((status) => {
            const columnIssues = issues.filter((issue) => issue.status === status);
            return (
              <article key={status} style={{ ...column, background: palette.card, border: `1px solid ${palette.border}` }}>
                <div style={columnHead}>
                  <p style={{ margin: 0, fontSize: 11, color: palette.muted, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>
                    {status.replace("_", " ")}
                  </p>
                  <span style={countBadge}>{columnIssues.length}</span>
                </div>
                <div
                  style={dropZone}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => handleDrop(status)}
                >
                  {columnIssues.map((issue) => (
                    <div
                      key={issue.id}
                      draggable={movingIssueId !== issue.id}
                      onDragStart={() => setDraggedIssue(issue)}
                      onDragEnd={() => setDraggedIssue(null)}
                      onClick={() => navigate(`/issues/${issue.id}`)}
                      style={{
                        ...issueCard,
                        opacity: movingIssueId === issue.id ? 0.55 : 1,
                        border: `1px solid ${palette.border}`,
                        background: palette.cardAlt,
                      }}
                    >
                      <p style={{ ...issueKey, color: palette.muted }}>{issue.key || `ISS-${issue.id}`}</p>
                      <p style={{ ...issueTitle, color: palette.text }}>{issue.title}</p>
                      <p style={{ ...issuePreview, color: palette.muted }}>
                        {createPlainTextPreview(issue.description || issue.summary || "", "No issue brief added yet.", 120)}
                      </p>
                      <div style={issueMetaRail}>
                        <span style={{ ...issueMetaChip, border: `1px solid ${palette.border}`, background: palette.card, color: palette.text }}>
                          {issue.assignee_name || issue.assignee || "Unassigned"}
                        </span>
                        <span style={{ ...issueMetaChip, border: `1px solid ${palette.border}`, background: palette.card, color: palette.text }}>
                          {issue.priority || "medium"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <article style={metricCard}>
      <p style={metricValue}>{value}</p>
      <p style={metricLabel}>{label}</p>
    </article>
  );
}

const container = { maxWidth: 1320, margin: "0 auto", padding: 20 };
const spinner = { width: 30, height: 30, border: "2px solid var(--ui-border)", borderTopColor: "var(--ui-accent)", borderRadius: "50%", animation: "spin 1s linear infinite" };
const backButton = { display: "inline-flex", alignItems: "center", gap: 6, border: "none", background: "transparent", color: "var(--ui-muted)", fontWeight: 700, fontSize: 13, cursor: "pointer", marginBottom: 10 };
const statusPill = { borderRadius: 999, border: "1px solid var(--ui-good)", background: "rgba(73,191,143,0.14)", color: "var(--ui-good)", fontSize: 11, fontWeight: 700, padding: "5px 10px" };
const secondaryButton = { border: "1px solid var(--ui-border)", borderRadius: 10, padding: "9px 12px", fontSize: 13, fontWeight: 700, color: "var(--ui-muted)", background: "transparent", textDecoration: "none" };
const spotlightCard = { minWidth: 240, borderRadius: 24, padding: 16, display: "grid", gap: 10 };
const spotlightEyebrow = { margin: 0, fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase" };
const toolbarLayout = { display: "grid", gap: 14 };
const toolbarIntro = { display: "grid", gap: 4 };
const toolbarEyebrow = { margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" };
const toolbarTitle = { margin: 0, fontSize: 24, lineHeight: 1.04 };
const toolbarCopy = { margin: 0, fontSize: 13, lineHeight: 1.65, maxWidth: 760 };
const toolbarChipRail = { display: "flex", gap: 8, flexWrap: "wrap" };
const toolbarChip = { display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, padding: "8px 12px", fontSize: 12, fontWeight: 700 };
const statsGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 8, marginBottom: 12 };
const metricCard = { borderRadius: 12, padding: 12, border: "1px solid var(--ui-border)", background: "var(--ui-panel-alt)" };
const metricValue = { margin: 0, fontSize: 26, fontWeight: 800, color: "var(--ui-text)" };
const metricLabel = { margin: "4px 0 0", fontSize: 12, color: "var(--ui-muted)" };
const progressCard = { borderRadius: 12, padding: 12, marginBottom: 12 };
const progressTrack = { width: "100%", height: 10, borderRadius: 999, background: "var(--ui-border)", overflow: "hidden" };
const progressFill = { height: "100%", background: "linear-gradient(90deg,var(--ui-good),var(--ui-info))" };
const board = { display: "grid", gridTemplateColumns: "repeat(6,minmax(190px,1fr))", gap: 8, overflowX: "auto", paddingBottom: 4 };
const column = { borderRadius: 12, padding: 10, minHeight: 420 };
const columnHead = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 };
const countBadge = { minWidth: 22, height: 22, borderRadius: 999, border: "1px solid var(--ui-border)", color: "var(--ui-muted)", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700 };
const dropZone = { display: "grid", gap: 8 };
const issueCard = { borderRadius: 16, padding: 10, cursor: "pointer", display: "grid", gap: 8 };
const issueKey = { margin: 0, fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" };
const issueTitle = { margin: 0, fontSize: 13, fontWeight: 700, lineHeight: 1.35 };
const issuePreview = { margin: 0, fontSize: 11, lineHeight: 1.55 };
const issueMetaRail = { display: "flex", gap: 6, flexWrap: "wrap" };
const issueMetaChip = { display: "inline-flex", alignItems: "center", borderRadius: 999, padding: "6px 8px", fontSize: 10, fontWeight: 700, textTransform: "capitalize" };
const icon14 = { width: 14, height: 14 };

function buildPolicyAdjustmentHints(violations, policy) {
  const hints = [];
  const lower = (text) => String(text || "").toLowerCase();
  if (violations.some((v) => lower(v).includes("confidence"))) {
    hints.push(
      `Lower Min Confidence from ${policy.min_confidence_band} to low, or choose a higher-confidence scenario.`
    );
  }
  if (violations.some((v) => lower(v).includes("uplift"))) {
    hints.push(
      `Lower Min Uplift % from ${policy.min_probability_delta} to 0, or pick a scenario with higher projected gain.`
    );
  }
  if (violations.some((v) => lower(v).includes("scope changes"))) {
    hints.push(
      `Increase Max Scope Changes above ${policy.max_scope_changes}, or pick a scenario with fewer adds/drops.`
    );
  }
  if (violations.some((v) => lower(v).includes("backlog adds"))) {
    hints.push("Enable Allow backlog adds, or use a no-add scenario like Focus Mode/Baseline.");
  }
  if (hints.length === 0) {
    hints.push("Temporarily disable Enforce policy on apply to proceed manually.");
  }
  return hints;
}

export default SprintDetail;


