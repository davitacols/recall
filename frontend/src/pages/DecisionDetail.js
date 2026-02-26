import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeftIcon,
  CalendarIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  LinkIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";
import { AIEnhancementButton, AIResultsPanel } from "../components/AIEnhancements";
import ContextPanel from "../components/ContextPanel";
import QuickLink from "../components/QuickLink";
import {
  FavoriteButton,
  ExportButton,
  DecisionReminder,
  UndoRedoButtons,
} from "../components/QuickWinFeatures";
import api from "../services/api";

function DecisionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  const [decision, setDecision] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [showLinkPR, setShowLinkPR] = useState(false);
  const [prUrl, setPrUrl] = useState("");
  const [linking, setLinking] = useState(false);
  const [aiResults, setAiResults] = useState(null);
  const [outcomeSaving, setOutcomeSaving] = useState(false);
  const [outcomeError, setOutcomeError] = useState("");
  const [outcomeMessage, setOutcomeMessage] = useState("");
  const [impactTrail, setImpactTrail] = useState({ nodes: [], edges: [] });
  const [impactTrailLoading, setImpactTrailLoading] = useState(false);
  const [driftAlert, setDriftAlert] = useState(null);
  const [orchestrating, setOrchestrating] = useState(false);
  const [replayLoading, setReplayLoading] = useState(false);
  const [replayError, setReplayError] = useState("");
  const [replayTaskMessage, setReplayTaskMessage] = useState("");
  const [replayTaskSaving, setReplayTaskSaving] = useState(false);
  const [replayResult, setReplayResult] = useState(null);
  const [replayForm, setReplayForm] = useState({
    alternative_title: "",
    alternative_summary: "",
    risk_tolerance: "balanced",
    execution_speed: "normal",
    impact_level: "medium",
  });
  const [outcomeForm, setOutcomeForm] = useState({
    was_successful: "",
    review_confidence: "3",
    outcome_notes: "",
    impact_review_notes: "",
    lessons_learned: "",
    success_metrics_text: "{}",
  });

  const fetchDecision = async () => {
    try {
      const res = await api.get(`/api/decisions/${id}/`);
      setDecision(res.data);
      setReplayForm((prev) => ({
        ...prev,
        impact_level: res.data.impact_level || "medium",
      }));
      setOutcomeForm({
        was_successful:
          res.data.was_successful === true
            ? "true"
            : res.data.was_successful === false
              ? "false"
              : "",
        review_confidence: String(
          res.data.success_metrics?._review_meta?.review_confidence || 3
        ),
        outcome_notes: res.data.outcome_notes || "",
        impact_review_notes: res.data.impact_review_notes || "",
        lessons_learned: res.data.lessons_learned || "",
        success_metrics_text: JSON.stringify(res.data.success_metrics || {}, null, 2),
      });
    } catch (error) {
      console.error("Failed to fetch decision:", error);
      setDecision(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchDecisionIntelligence = async () => {
    try {
      setImpactTrailLoading(true);
      const [trailRes, driftRes] = await Promise.all([
        api.get(`/api/decisions/${id}/impact-trail/?depth=2`),
        api.get("/api/decisions/outcomes/drift-alerts/"),
      ]);
      setImpactTrail({
        nodes: trailRes.data?.nodes || [],
        edges: trailRes.data?.edges || [],
      });
      const drift = (driftRes.data?.items || []).find(
        (item) => Number(item.decision_id) === Number(id)
      );
      setDriftAlert(drift || null);
    } catch (error) {
      console.error("Failed to fetch decision intelligence:", error);
      setImpactTrail({ nodes: [], edges: [] });
      setDriftAlert(null);
    } finally {
      setImpactTrailLoading(false);
    }
  };

  useEffect(() => {
    fetchDecision();
    fetchDecisionIntelligence();
  }, [id]);

  const handleLinkPR = async (event) => {
    event.preventDefault();
    if (!prUrl.trim()) return;
    setLinking(true);

    try {
      await api.post(`/api/decisions/${id}/link-pr/`, { pr_url: prUrl });
      setPrUrl("");
      setShowLinkPR(false);
      fetchDecision();
    } catch (error) {
      console.error("Failed to link PR:", error);
      alert("Failed to link PR");
    } finally {
      setLinking(false);
    }
  };

  const handleSaveOutcome = async (event) => {
    event.preventDefault();
    setOutcomeError("");
    setOutcomeMessage("");
    if (decision.status !== "implemented") {
      setOutcomeError("Outcome review is available after implementation.");
      return;
    }
    if (!outcomeForm.was_successful) {
      setOutcomeError("Select success or failure.");
      return;
    }

    let successMetrics = {};
    try {
      successMetrics = outcomeForm.success_metrics_text?.trim()
        ? JSON.parse(outcomeForm.success_metrics_text)
        : {};
    } catch {
      setOutcomeError("Success metrics must be valid JSON.");
      return;
    }

    setOutcomeSaving(true);
    try {
      await api.post(`/api/decisions/${id}/outcome-review/`, {
        was_successful: outcomeForm.was_successful === "true",
        review_confidence: Number(outcomeForm.review_confidence),
        outcome_notes: outcomeForm.outcome_notes,
        impact_review_notes: outcomeForm.impact_review_notes,
        lessons_learned: outcomeForm.lessons_learned,
        success_metrics: successMetrics,
      });
      await fetchDecision();
      await fetchDecisionIntelligence();
      setOutcomeMessage("Outcome review saved.");
    } catch (error) {
      setOutcomeError(error?.response?.data?.error || "Failed to save outcome review.");
    } finally {
      setOutcomeSaving(false);
    }
  };

  const runFollowUpOrchestrator = async () => {
    setOutcomeError("");
    setOutcomeMessage("");
    setOrchestrating(true);
    try {
      const res = await api.post("/api/decisions/outcomes/follow-up/run/", {
        decision_id: Number(id),
      });
      const createdCount = res.data?.created_count || 0;
      setOutcomeMessage(
        createdCount > 0
          ? `Created ${createdCount} follow-up task(s).`
          : "No follow-up task created (already exists or decision is not eligible)."
      );
      await fetchDecisionIntelligence();
    } catch (error) {
      setOutcomeError(error?.response?.data?.error || "Failed to run follow-up orchestrator.");
    } finally {
      setOrchestrating(false);
    }
  };

  const runReplaySimulation = async () => {
    setReplayError("");
    setReplayTaskMessage("");
    setReplayLoading(true);
    try {
      const res = await api.post(`/api/decisions/${id}/replay-simulator/`, replayForm);
      setReplayResult(res.data);
    } catch (error) {
      setReplayResult(null);
      setReplayError(error?.response?.data?.error || "Failed to run decision replay simulation.");
    } finally {
      setReplayLoading(false);
    }
  };

  const createTasksFromSimulation = async () => {
    if (!replayResult?.recommended_safeguards?.length) return;
    setReplayTaskSaving(true);
    setReplayError("");
    setReplayTaskMessage("");
    try {
      const res = await api.post(`/api/decisions/${id}/replay-simulator/create-follow-up/`, {
        safeguards: replayResult.recommended_safeguards,
        scenario_title: replayResult?.scenario?.alternative_title || replayForm.alternative_title,
      });
      const createdCount = res.data?.created_count || 0;
      setReplayTaskMessage(
        createdCount > 0
          ? `Created ${createdCount} follow-up task(s) from simulation safeguards.`
          : "No new tasks created (possible duplicates)."
      );
    } catch (error) {
      setReplayError(error?.response?.data?.error || "Failed to create follow-up tasks from simulation.");
    } finally {
      setReplayTaskSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: palette.bg, display: "grid", placeItems: "center" }}>
        <div style={{ width: 30, height: 30, border: "2px solid rgba(120,120,120,0.35)", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  if (!decision) {
    return (
      <div style={{ minHeight: "100vh", background: palette.bg, display: "grid", placeItems: "center", color: palette.muted }}>
        Decision not found
      </div>
    );
  }

  const status = (decision.status || "proposed").replace("_", " ");
  const impact = (decision.impact_level || "medium").replace("_", " ");

  return (
    <div style={{ minHeight: "100vh", background: palette.bg }}>
      <div style={ui.container}>
        <button onClick={() => navigate("/decisions")} style={{ ...ui.secondaryButton, marginBottom: 10, display: "inline-flex", alignItems: "center", gap: 6 }}>
          <ArrowLeftIcon style={{ width: 14, height: 14 }} /> Back to Decisions
        </button>

        <section style={{ borderRadius: 16, border: `1px solid ${palette.border}`, background: palette.card, padding: 16, marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                <Pill text={status} tone="blue" />
                <Pill text={impact} tone="amber" />
              </div>
              <h1 style={{ margin: "0 0 8px", fontSize: "clamp(1.4rem,2.8vw,2rem)", color: palette.text, letterSpacing: "-0.02em" }}>{decision.title}</h1>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12, color: palette.muted }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><UserIcon style={{ width: 14, height: 14 }} /> {decision.decision_maker_name || "Unknown"}</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><CalendarIcon style={{ width: 14, height: 14 }} /> {new Date(decision.created_at).toLocaleDateString()}</span>
                {decision.confidence?.score && <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><ChartBarIcon style={{ width: 14, height: 14 }} /> {decision.confidence.score}% confidence</span>}
              </div>
            </div>

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <QuickLink sourceType="decisions.decision" sourceId={id} />
              <AIEnhancementButton content={decision?.description} title={decision?.title} type="decision" onResult={(feature, data) => setAiResults(data)} />
              <FavoriteButton decisionId={id} />
              <ExportButton decisionId={id} type="decision" />
              <UndoRedoButtons />
            </div>
          </div>
        </section>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 340px", gap: 10 }}>
          <section style={{ borderRadius: 12, border: `1px solid ${palette.border}`, background: palette.card, padding: 12 }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
              {["overview", "rationale", "code", "details", "outcome", "impact", "replay"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    ...ui.secondaryButton,
                    padding: "7px 10px",
                    fontSize: 11,
                    textTransform: "capitalize",
                    background: activeTab === tab ? "rgba(59,130,246,0.2)" : "transparent",
                    border: activeTab === tab ? "1px solid rgba(59,130,246,0.45)" : ui.secondaryButton.border,
                    color: activeTab === tab ? "#93c5fd" : ui.secondaryButton.color,
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            {activeTab === "overview" && <TextBlock title="Overview" text={decision.description} />}
            {activeTab === "rationale" && <TextBlock title="Rationale" text={decision.rationale || "No rationale provided"} />}

            {activeTab === "code" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <h3 style={{ margin: 0, fontSize: 16, color: palette.text }}>Related Code</h3>
                  <button onClick={() => setShowLinkPR((prev) => !prev)} style={ui.secondaryButton}>{showLinkPR ? "Cancel" : "Link PR"}</button>
                </div>

                {showLinkPR && (
                  <form onSubmit={handleLinkPR} style={{ borderRadius: 10, border: `1px solid ${palette.border}`, padding: 10, marginBottom: 8, display: "grid", gap: 8 }}>
                    <input type="url" value={prUrl} onChange={(event) => setPrUrl(event.target.value)} placeholder="https://github.com/org/repo/pull/123" style={ui.input} />
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <button type="submit" disabled={!prUrl.trim() || linking} style={ui.primaryButton}>{linking ? "Linking..." : "Link"}</button>
                    </div>
                  </form>
                )}

                {decision.code_links?.length ? (
                  <div style={{ display: "grid", gap: 8 }}>
                    {decision.code_links.map((link, index) => (
                      <a key={index} href={link.url} target="_blank" rel="noreferrer" style={{ borderRadius: 10, border: `1px solid ${palette.border}`, padding: 10, display: "grid", gridTemplateColumns: "auto 1fr", gap: 8, textDecoration: "none", color: palette.text }}>
                        <LinkIcon style={{ width: 16, height: 16, color: palette.muted, marginTop: 1 }} />
                        <div>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>{link.title || `PR #${link.number || ""}`}</p>
                          <p style={{ margin: "4px 0 0", fontSize: 11, color: palette.muted }}>{link.url}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                ) : (
                  <div style={{ borderRadius: 10, border: `1px dashed ${palette.border}`, padding: "14px 10px", color: palette.muted, fontSize: 12, textAlign: "center" }}>
                    No linked PRs
                  </div>
                )}
              </div>
            )}

            {activeTab === "details" && (
              <div style={{ display: "grid", gap: 10 }}>
                {decision.context_reason && <TextBlock title="Context" text={decision.context_reason} />}

                {decision.if_this_fails && (
                  <div style={{ borderRadius: 10, border: "1px solid rgba(239,68,68,0.4)", background: "rgba(239,68,68,0.1)", padding: 10 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 8 }}>
                      <ExclamationTriangleIcon style={{ width: 16, height: 16, color: "#fca5a5", marginTop: 1 }} />
                      <div>
                        <p style={{ margin: 0, fontSize: 13, color: "#fca5a5", fontWeight: 700 }}>If This Fails</p>
                        <p style={{ margin: "4px 0 0", fontSize: 12, color: "#fca5a5" }}>{decision.if_this_fails}</p>
                      </div>
                    </div>
                  </div>
                )}

                {decision.alternatives_considered && (
                  <div>
                    <p style={{ margin: 0, fontSize: 13, color: palette.text, fontWeight: 700 }}>Alternatives Considered</p>
                    <ul style={{ margin: "6px 0 0", paddingLeft: 18, color: palette.muted, fontSize: 12 }}>
                      {(Array.isArray(decision.alternatives_considered) ? decision.alternatives_considered : [decision.alternatives_considered]).map((alt, index) => (
                        <li key={index} style={{ marginBottom: 4 }}>{alt}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {activeTab === "outcome" && (
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ borderRadius: 10, border: `1px solid ${palette.border}`, padding: 10 }}>
                  <p style={{ margin: "0 0 4px", fontSize: 13, color: palette.text, fontWeight: 700 }}>Review status</p>
                  <p style={{ margin: 0, fontSize: 12, color: palette.muted }}>
                    {decision.review_completed_at
                      ? `Reviewed on ${new Date(decision.review_completed_at).toLocaleDateString()}`
                      : "No outcome review yet"}
                  </p>
                </div>
                <div style={{ borderRadius: 10, border: `1px solid ${palette.border}`, padding: 10 }}>
                  <p style={{ margin: "0 0 4px", fontSize: 13, color: palette.text, fontWeight: 700 }}>Outcome reliability</p>
                  <p style={{ margin: 0, fontSize: 12, color: palette.muted }}>
                    {decision.outcome_reliability?.score ?? 0}% ({decision.outcome_reliability?.band || "low"})
                  </p>
                </div>
                {driftAlert && (
                  <div style={{ borderRadius: 10, border: "1px solid rgba(239,68,68,0.35)", background: "rgba(239,68,68,0.08)", padding: 10 }}>
                    <p style={{ margin: "0 0 4px", fontSize: 13, color: "#fca5a5", fontWeight: 700 }}>
                      Drift alert: {driftAlert.severity} ({driftAlert.drift_score})
                    </p>
                    <ul style={{ margin: 0, paddingLeft: 16, color: "#fecaca", fontSize: 12 }}>
                      {(driftAlert.signals || []).slice(0, 3).map((signal, idx) => (
                        <li key={idx}>{signal}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <form onSubmit={handleSaveOutcome} style={{ display: "grid", gap: 8 }}>
                  <label style={fieldLabel}>Outcome</label>
                  <select
                    value={outcomeForm.was_successful}
                    onChange={(event) => setOutcomeForm((prev) => ({ ...prev, was_successful: event.target.value }))}
                    style={ui.input}
                  >
                    <option value="">Select outcome</option>
                    <option value="true">Successful</option>
                    <option value="false">Unsuccessful</option>
                  </select>

                  <label style={fieldLabel}>Review Confidence (1-5)</label>
                  <select
                    value={outcomeForm.review_confidence}
                    onChange={(event) => setOutcomeForm((prev) => ({ ...prev, review_confidence: event.target.value }))}
                    style={ui.input}
                  >
                    <option value="1">1 - Low confidence</option>
                    <option value="2">2</option>
                    <option value="3">3 - Medium</option>
                    <option value="4">4</option>
                    <option value="5">5 - High confidence</option>
                  </select>

                  <label style={fieldLabel}>Outcome Notes</label>
                  <textarea
                    rows={3}
                    value={outcomeForm.outcome_notes}
                    onChange={(event) => setOutcomeForm((prev) => ({ ...prev, outcome_notes: event.target.value }))}
                    style={ui.input}
                  />

                  <label style={fieldLabel}>Impact Review Notes</label>
                  <textarea
                    rows={3}
                    value={outcomeForm.impact_review_notes}
                    onChange={(event) => setOutcomeForm((prev) => ({ ...prev, impact_review_notes: event.target.value }))}
                    style={ui.input}
                  />

                  <label style={fieldLabel}>Lessons Learned</label>
                  <textarea
                    rows={3}
                    value={outcomeForm.lessons_learned}
                    onChange={(event) => setOutcomeForm((prev) => ({ ...prev, lessons_learned: event.target.value }))}
                    style={ui.input}
                  />

                  <label style={fieldLabel}>Success Metrics (JSON)</label>
                  <textarea
                    rows={4}
                    value={outcomeForm.success_metrics_text}
                    onChange={(event) => setOutcomeForm((prev) => ({ ...prev, success_metrics_text: event.target.value }))}
                    style={ui.input}
                  />

                  {outcomeError && (
                    <p style={{ margin: 0, fontSize: 12, color: "#f87171" }}>{outcomeError}</p>
                  )}
                  {outcomeMessage && (
                    <p style={{ margin: 0, fontSize: 12, color: "#34d399" }}>{outcomeMessage}</p>
                  )}

                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                    <button
                      type="button"
                      onClick={runFollowUpOrchestrator}
                      style={ui.secondaryButton}
                      disabled={orchestrating || decision.was_successful !== false}
                    >
                      {orchestrating ? "Running..." : "Auto Create Follow-up Task"}
                    </button>
                    <button type="submit" style={ui.primaryButton} disabled={outcomeSaving || decision.status !== "implemented"}>
                      {outcomeSaving ? "Saving..." : "Save Outcome Review"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === "impact" && (
              <div style={{ display: "grid", gap: 10 }}>
                <h3 style={{ margin: 0, fontSize: 15, color: palette.text }}>Knowledge Graph Impact Trail</h3>
                {impactTrailLoading ? (
                  <p style={{ margin: 0, fontSize: 12, color: palette.muted }}>Loading impact graph...</p>
                ) : (
                  <>
                    <div style={{ borderRadius: 10, border: `1px solid ${palette.border}`, padding: 10 }}>
                      <InfoRow label="Nodes" value={`${impactTrail.nodes.length}`} />
                      <InfoRow label="Edges" value={`${impactTrail.edges.length}`} />
                    </div>
                    <div style={{ display: "grid", gap: 6 }}>
                      {(impactTrail.edges || []).slice(0, 8).map((edge, idx) => (
                        <div key={idx} style={{ borderRadius: 8, border: `1px solid ${palette.border}`, padding: "7px 9px", fontSize: 12, color: palette.muted }}>
                          <span style={{ color: palette.text }}>{edge.type}</span> ({Number(edge.strength || 0).toFixed(2)})
                        </div>
                      ))}
                      {(!impactTrail.edges || impactTrail.edges.length === 0) && (
                        <p style={{ margin: 0, fontSize: 12, color: palette.muted }}>No connected impact links yet.</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === "replay" && (
              <div style={{ display: "grid", gap: 10 }}>
                <h3 style={{ margin: 0, fontSize: 15, color: palette.text }}>Decision Replay Simulator</h3>
                <p style={{ margin: 0, fontSize: 12, color: palette.muted }}>
                  Model a what-if alternative against historical decisions and outcomes.
                </p>

                <div style={{ display: "grid", gap: 8 }}>
                  <label style={fieldLabel}>Alternative Title</label>
                  <input
                    type="text"
                    value={replayForm.alternative_title}
                    onChange={(event) => setReplayForm((prev) => ({ ...prev, alternative_title: event.target.value }))}
                    style={ui.input}
                    placeholder="Alternative approach title"
                  />

                  <label style={fieldLabel}>Alternative Summary</label>
                  <textarea
                    rows={3}
                    value={replayForm.alternative_summary}
                    onChange={(event) => setReplayForm((prev) => ({ ...prev, alternative_summary: event.target.value }))}
                    style={ui.input}
                    placeholder="Describe how this alternative differs"
                  />

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 8 }}>
                    <div style={{ display: "grid", gap: 4 }}>
                      <label style={fieldLabel}>Risk Tolerance</label>
                      <select
                        value={replayForm.risk_tolerance}
                        onChange={(event) => setReplayForm((prev) => ({ ...prev, risk_tolerance: event.target.value }))}
                        style={ui.input}
                      >
                        <option value="conservative">Conservative</option>
                        <option value="balanced">Balanced</option>
                        <option value="aggressive">Aggressive</option>
                      </select>
                    </div>
                    <div style={{ display: "grid", gap: 4 }}>
                      <label style={fieldLabel}>Execution Speed</label>
                      <select
                        value={replayForm.execution_speed}
                        onChange={(event) => setReplayForm((prev) => ({ ...prev, execution_speed: event.target.value }))}
                        style={ui.input}
                      >
                        <option value="slow">Slow</option>
                        <option value="normal">Normal</option>
                        <option value="fast">Fast</option>
                      </select>
                    </div>
                    <div style={{ display: "grid", gap: 4 }}>
                      <label style={fieldLabel}>Impact Level</label>
                      <select
                        value={replayForm.impact_level}
                        onChange={(event) => setReplayForm((prev) => ({ ...prev, impact_level: event.target.value }))}
                        style={ui.input}
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button type="button" onClick={runReplaySimulation} style={ui.primaryButton} disabled={replayLoading}>
                      {replayLoading ? "Running..." : "Run Replay Simulation"}
                    </button>
                  </div>
                </div>

                {replayError && <p style={{ margin: 0, fontSize: 12, color: "#f87171" }}>{replayError}</p>}
                {replayTaskMessage && <p style={{ margin: 0, fontSize: 12, color: "#34d399" }}>{replayTaskMessage}</p>}

                {replayResult && (
                  <div style={{ display: "grid", gap: 8 }}>
                    <div style={{ borderRadius: 10, border: `1px solid ${palette.border}`, padding: 10 }}>
                      <p style={{ margin: "0 0 6px", fontSize: 13, color: palette.text, fontWeight: 700 }}>Forecast</p>
                      <InfoRow label="Failure risk" value={`${replayResult.forecast?.predicted_failure_risk_pct ?? 0}%`} />
                      <InfoRow label="Expected impact" value={`${replayResult.forecast?.expected_impact_score ?? 0}/100`} />
                      <InfoRow label="Confidence" value={`${replayResult.forecast?.confidence_pct ?? 0}%`} />
                      <InfoRow label="Sample size" value={`${replayResult.based_on?.sample_size ?? 0}`} />
                    </div>

                    <div style={{ borderRadius: 10, border: `1px solid ${palette.border}`, padding: 10 }}>
                      <p style={{ margin: "0 0 6px", fontSize: 13, color: palette.text, fontWeight: 700 }}>Teams Most Affected</p>
                      <ul style={{ margin: 0, paddingLeft: 16, color: palette.muted, fontSize: 12 }}>
                        {(replayResult.teams_most_affected || []).map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>

                    <div style={{ borderRadius: 10, border: `1px solid ${palette.border}`, padding: 10 }}>
                      <p style={{ margin: "0 0 6px", fontSize: 13, color: palette.text, fontWeight: 700 }}>Recommended Safeguards</p>
                      <ul style={{ margin: 0, paddingLeft: 16, color: palette.muted, fontSize: 12 }}>
                        {(replayResult.recommended_safeguards || []).map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                        <button
                          type="button"
                          onClick={createTasksFromSimulation}
                          disabled={replayTaskSaving || !(replayResult.recommended_safeguards || []).length}
                          style={ui.secondaryButton}
                        >
                          {replayTaskSaving ? "Creating..." : "Create Follow-up Tasks from Simulation"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          <aside style={{ display: "grid", gap: 10, alignContent: "start" }}>
            {decision.confidence && (
              <section style={{ borderRadius: 12, border: `1px solid ${palette.border}`, background: palette.card, padding: 12 }}>
                <h3 style={{ margin: "0 0 8px", fontSize: 14, color: palette.text }}>Confidence</h3>
                <p style={{ margin: 0, fontSize: 30, fontWeight: 800, color: "#f4ece0" }}>{decision.confidence.score || 0}%</p>
                <div style={{ width: "100%", height: 8, borderRadius: 999, background: "rgba(120,120,120,0.25)", overflow: "hidden", marginTop: 6 }}>
                  <div style={{ height: "100%", width: `${decision.confidence.score || 0}%`, background: "linear-gradient(90deg,#10b981,#34d399)" }} />
                </div>
                {decision.confidence.factors?.length > 0 && (
                  <ul style={{ margin: "8px 0 0", paddingLeft: 16, color: palette.muted, fontSize: 11 }}>
                    {decision.confidence.factors.map((factor, index) => <li key={index} style={{ marginBottom: 4 }}>{factor}</li>)}
                  </ul>
                )}
              </section>
            )}

            <section style={{ borderRadius: 12, border: `1px solid ${palette.border}`, background: palette.card, padding: 12 }}>
              <h3 style={{ margin: "0 0 8px", fontSize: 14, color: palette.text }}>Reliability</h3>
              <InfoRow label="Outcome reliability" value={`${decision.outcome_reliability?.score ?? 0}%`} />
              <InfoRow label="Band" value={(decision.outcome_reliability?.band || "low").toUpperCase()} />
            </section>

            <DecisionReminder decisionId={id} />

            <section style={{ borderRadius: 12, border: `1px solid ${palette.border}`, background: palette.card, padding: 12 }}>
              <h3 style={{ margin: "0 0 8px", fontSize: 14, color: palette.text }}>Details</h3>
              <InfoRow label="Decided" value={decision.decided_at ? new Date(decision.decided_at).toLocaleDateString() : "-"} />
              <InfoRow label="Deadline" value={decision.implementation_deadline ? new Date(decision.implementation_deadline).toLocaleDateString() : "-"} />
            </section>

            <ContextPanel contentType="decisions.decision" objectId={id} />
          </aside>
        </div>
      </div>

      <AIResultsPanel results={aiResults} onClose={() => setAiResults(null)} />
    </div>
  );
}

function Pill({ text, tone = "blue" }) {
  const style = tone === "amber"
    ? { border: "1px solid rgba(245,158,11,0.45)", color: "#fcd34d", background: "rgba(245,158,11,0.12)" }
    : { border: "1px solid rgba(59,130,246,0.45)", color: "#93c5fd", background: "rgba(59,130,246,0.12)" };
  return <span style={{ ...style, fontSize: 11, fontWeight: 700, borderRadius: 999, padding: "3px 8px", textTransform: "capitalize" }}>{text}</span>;
}

function TextBlock({ title, text }) {
  return (
    <div>
      <h3 style={{ margin: "0 0 8px", fontSize: 16, color: "#f4ece0" }}>{title}</h3>
      <div style={{ color: "#d9cdbf", fontSize: 13, lineHeight: 1.6 }}>
        {(text || "").split("\n\n").map((paragraph, index) => (
          <p key={index} style={{ margin: "0 0 10px" }}>{paragraph}</p>
        ))}
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12, marginBottom: 6 }}>
      <span style={{ color: "#baa892" }}>{label}</span>
      <span style={{ color: "#f4ece0", fontWeight: 700 }}>{value}</span>
    </div>
  );
}

const fieldLabel = { margin: 0, fontSize: 12, color: "#baa892", fontWeight: 700 };

export default DecisionDetail;
