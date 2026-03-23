import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
  CalendarIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  LinkIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";
import RichTextRenderer from "../components/RichTextRenderer";
import DecisionIllustration from "../components/DecisionIllustration";
import ContextPanel from "../components/ContextPanel";
import QuickLink from "../components/QuickLink";
import { WorkspaceHero, WorkspaceToolbar } from "../components/WorkspaceChrome";
import api from "../services/api";

function DecisionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1100);

  const [decision, setDecision] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [showLinkPR, setShowLinkPR] = useState(false);
  const [prUrl, setPrUrl] = useState("");
  const [linking, setLinking] = useState(false);
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
  const [exporting, setExporting] = useState(false);
  const [contextRefreshKey, setContextRefreshKey] = useState(0);
  const [githubTimeline, setGithubTimeline] = useState(null);
  const [githubLoading, setGithubLoading] = useState(false);
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

  const fetchDecisionGithub = async () => {
    try {
      setGithubLoading(true);
      const res = await api.get(`/api/integrations/fresh/github/decisions/${id}/timeline/`);
      setGithubTimeline(res.data);
    } catch (error) {
      console.error("Failed to fetch decision GitHub timeline:", error);
      setGithubTimeline(null);
    } finally {
      setGithubLoading(false);
    }
  };

  useEffect(() => {
    fetchDecision();
    fetchDecisionIntelligence();
    fetchDecisionGithub();
  }, [id]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1100);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleLinkPR = async (event) => {
    event.preventDefault();
    if (!prUrl.trim()) return;
    setLinking(true);

    try {
      await api.post(`/api/decisions/${id}/link-pr/`, { pr_url: prUrl });
      setPrUrl("");
      setShowLinkPR(false);
      fetchDecision();
      fetchDecisionGithub();
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

  const handleExportDecision = async () => {
    setExporting(true);
    try {
      const response = await api.get("/api/recall/export/decision-pdf/", {
        params: { id },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `decision_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export decision:", error);
      alert("Failed to export decision");
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <div style={{ width: 30, height: 30, border: `2px solid ${palette.border}`, borderTopColor: palette.info, borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  if (!decision) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", color: palette.muted }}>
        Decision not found
      </div>
    );
  }

  const status = (decision.status || "proposed").replace("_", " ");
  const impact = (decision.impact_level || "medium").replace("_", " ");
  const reliabilityScore = decision.outcome_reliability?.score ?? 0;
  const confidenceScore = decision.confidence?.score || 0;
  const decisionMakerName =
    decision.decision_maker_name ||
    decision.decision_maker?.full_name ||
    decision.decision_maker?.username ||
    "Unknown";
  const createdLabel = new Date(decision.created_at).toLocaleDateString();
  const decisionDate = decision.decided_at
    ? new Date(decision.decided_at).toLocaleDateString()
    : "Awaiting final approval";
  const linkedConversation = decision.conversation || null;

  return (
    <div style={{ minHeight: "100vh", position: "relative", fontFamily: "'Sora', 'Space Grotesk', 'Segoe UI', sans-serif" }}>
      <div
        style={{
          ...ambientLayer,
          background: darkMode
            ? "radial-gradient(circle at 8% 3%, rgba(59,130,246,0.18), transparent 34%), radial-gradient(circle at 90% 8%, rgba(16,185,129,0.1), transparent 30%), radial-gradient(circle at 52% 0%, rgba(99,102,241,0.1), transparent 24%)"
            : "radial-gradient(circle at 8% 3%, rgba(59,130,246,0.12), transparent 34%), radial-gradient(circle at 90% 8%, rgba(16,185,129,0.08), transparent 30%), radial-gradient(circle at 52% 0%, rgba(99,102,241,0.08), transparent 24%)",
        }}
      />
      <div style={{ ...ui.container, display: "grid", gap: 16 }}>
        <WorkspaceHero
          palette={palette}
          darkMode={darkMode}
          eyebrow="Decision Record"
          title={decision.title}
          description="Recover the reasoning, confidence, review signals, and downstream impact from one structured decision workspace."
          stats={[
            { label: "Confidence", value: `${confidenceScore}%`, helper: "Current decision confidence score." },
            { label: "Reliability", value: `${reliabilityScore}%`, helper: "Outcome reliability recorded so far." },
            { label: "Impact trail", value: `${impactTrail.edges?.length || 0}`, helper: "Connected links in the graph trail." },
          ]}
          aside={<DecisionIllustration decision={decision} darkMode={darkMode} size={96} />}
          actions={
            <>
              <button className="ui-btn-polish ui-focus-ring" onClick={() => navigate("/decisions")} style={ui.secondaryButton}>
                <ArrowLeftIcon style={{ width: 14, height: 14 }} /> Back to Decisions
              </button>
              <QuickLink
                sourceType="decisions.decision"
                sourceId={id}
                onLinked={() => {
                  setContextRefreshKey((current) => current + 1);
                  fetchDecisionIntelligence();
                }}
              />
              <button className="ui-btn-polish ui-focus-ring" onClick={handleExportDecision} disabled={exporting} style={ui.secondaryButton}>
                <ArrowDownTrayIcon style={{ width: 14, height: 14 }} /> {exporting ? "Exporting..." : "Export PDF"}
              </button>
            </>
          }
        />

        <WorkspaceToolbar palette={palette}>
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Pill text={status} tone="blue" palette={palette} />
              <Pill text={impact} tone="amber" palette={palette} />
              <span style={toolbarMetaChip(palette)}>
                <UserIcon style={{ width: 14, height: 14 }} /> {decisionMakerName}
              </span>
              <span style={toolbarMetaChip(palette)}>
                <CalendarIcon style={{ width: 14, height: 14 }} /> {createdLabel}
              </span>
              {decision.confidence?.score ? (
                <span style={toolbarMetaChip(palette)}>
                  <ChartBarIcon style={{ width: 14, height: 14 }} /> {decision.confidence.score}% confidence
                </span>
              ) : null}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="ui-btn-polish ui-focus-ring" onClick={() => navigate("/decisions")} style={ui.secondaryButton}>All Decisions</button>
              <button className="ui-btn-polish ui-focus-ring" onClick={() => setActiveTab("outcome")} style={ui.secondaryButton}>Outcome Review</button>
              <button className="ui-btn-polish ui-focus-ring" onClick={fetchDecision} style={ui.secondaryButton}>
                <ArrowPathIcon style={{ width: 13, height: 13 }} /> Refresh
              </button>
            </div>
          </div>
        </WorkspaceToolbar>

        <div className="ui-enter" style={{ ...mainGrid, gridTemplateColumns: isMobile ? "minmax(0,1fr)" : "minmax(0,1fr) 360px", gap: 14, "--ui-delay": "180ms" }}>
          <section className="ui-card-lift ui-smooth" style={{ ...panelCard, border: `1px solid ${palette.border}`, background: palette.card }}>
            <div style={{ display: "grid", gap: 12, marginBottom: 16, paddingBottom: 16, borderBottom: `1px solid ${palette.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
                <div style={{ display: "grid", gap: 6, maxWidth: 760 }}>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: palette.muted }}>
                    Decision Brief
                  </p>
                  <h2 style={{ margin: 0, fontSize: "clamp(1.24rem,2vw,1.68rem)", color: palette.text }}>
                    What we are deciding and why it matters
                  </h2>
                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: palette.muted }}>
                    The page now leads with the decision statement and ownership details before the deeper review tools, so it reads like a proper decision record first.
                  </p>
                </div>
                <div style={{ display: "grid", gap: 8, minWidth: "min(100%, 220px)" }}>
                  <div style={{ ...innerCard, border: `1px solid ${palette.border}`, padding: "10px 12px" }}>
                    <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: palette.muted }}>Decision date</p>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: palette.text }}>{decisionDate}</p>
                  </div>
                  <div style={{ ...innerCard, border: `1px solid ${palette.border}`, padding: "10px 12px" }}>
                    <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: palette.muted }}>Owner</p>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: palette.text }}>{decisionMakerName}</p>
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10 }}>
                {decision.impact_assessment ? (
                  <div style={{ ...innerCard, border: `1px solid ${palette.border}` }}>
                    <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 700, color: palette.text }}>Impact Assessment</p>
                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: palette.muted }}>{decision.impact_assessment}</p>
                  </div>
                ) : null}
                {decision.tradeoffs ? (
                  <div style={{ ...innerCard, border: `1px solid ${palette.border}` }}>
                    <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 700, color: palette.text }}>Tradeoffs</p>
                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: palette.muted }}>
                      {Array.isArray(decision.tradeoffs) ? decision.tradeoffs.join(", ") : decision.tradeoffs}
                    </p>
                  </div>
                ) : null}
                {linkedConversation ? (
                  <div style={{ ...innerCard, border: `1px solid ${palette.border}` }}>
                    <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 700, color: palette.text }}>Source Conversation</p>
                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: palette.text }}>
                      {linkedConversation.title || `Conversation #${linkedConversation.id}`}
                    </p>
                    <p style={{ margin: "6px 0 0", fontSize: 12, lineHeight: 1.6, color: palette.muted }}>
                      This decision stays linked to its original discussion thread.
                    </p>
                  </div>
                ) : null}
              </div>
            </div>

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
              {["overview", "rationale", "code", "details", "outcome", "impact", "replay"].map((tab) => (
                <button
                  className="ui-btn-polish ui-focus-ring"
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    ...ui.secondaryButton,
                    padding: "8px 12px",
                    fontSize: 12,
                    textTransform: "capitalize",
                    background: activeTab === tab ? palette.accentSoft : palette.card,
                    border: activeTab === tab ? `1px solid ${palette.accent}` : ui.secondaryButton.border,
                    color: activeTab === tab ? palette.link : ui.secondaryButton.color,
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            {activeTab === "overview" && <TextBlock title="Overview" text={decision.description} palette={palette} darkMode={darkMode} />}
            {activeTab === "rationale" && <TextBlock title="Rationale" text={decision.rationale || "No rationale provided"} palette={palette} darkMode={darkMode} />}

            {activeTab === "code" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <h3 style={{ margin: 0, fontSize: 16, color: palette.text }}>Related Code</h3>
                  <button className="ui-btn-polish ui-focus-ring" onClick={() => setShowLinkPR((prev) => !prev)} style={ui.secondaryButton}>{showLinkPR ? "Cancel" : "Link PR"}</button>
                </div>

                {showLinkPR && (
                  <form onSubmit={handleLinkPR} style={{ ...innerCard, border: `1px solid ${palette.border}`, marginBottom: 8, display: "grid", gap: 8 }}>
                    <input type="url" value={prUrl} onChange={(event) => setPrUrl(event.target.value)} placeholder="https://github.com/org/repo/pull/123" style={ui.input} />
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <button className="ui-btn-polish ui-focus-ring" type="submit" disabled={!prUrl.trim() || linking} style={ui.primaryButton}>{linking ? "Linking..." : "Link"}</button>
                    </div>
                  </form>
                )}
                <DecisionEngineeringSection
                  timeline={githubTimeline}
                  loading={githubLoading}
                  palette={palette}
                />
              </div>
            )}

            {activeTab === "details" && (
              <div style={{ display: "grid", gap: 10 }}>
                {decision.context_reason && <TextBlock title="Context" text={decision.context_reason} palette={palette} darkMode={darkMode} />}

                {decision.if_this_fails && (
                  <div
                    style={{
                      ...innerCard,
                      border: `1px solid ${darkMode ? "rgba(238,146,153,0.42)" : "rgba(200,86,93,0.24)"}`,
                      background: darkMode ? "rgba(238,146,153,0.12)" : "rgba(200,86,93,0.08)",
                    }}
                  >
                    <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 8 }}>
                      <ExclamationTriangleIcon style={{ width: 16, height: 16, color: palette.danger, marginTop: 1 }} />
                      <div>
                        <p style={{ margin: 0, fontSize: 13, color: palette.danger, fontWeight: 700 }}>If This Fails</p>
                        <p style={{ margin: "4px 0 0", fontSize: 12, color: palette.text }}>{decision.if_this_fails}</p>
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
                <div style={{ ...innerCard, border: `1px solid ${palette.border}` }}>
                  <p style={{ margin: "0 0 4px", fontSize: 13, color: palette.text, fontWeight: 700 }}>Review status</p>
                  <p style={{ margin: 0, fontSize: 12, color: palette.muted }}>
                    {decision.review_completed_at
                      ? `Reviewed on ${new Date(decision.review_completed_at).toLocaleDateString()}`
                      : "No outcome review yet"}
                  </p>
                </div>
                <div style={{ ...innerCard, border: `1px solid ${palette.border}` }}>
                  <p style={{ margin: "0 0 4px", fontSize: 13, color: palette.text, fontWeight: 700 }}>Outcome reliability</p>
                  <p style={{ margin: 0, fontSize: 12, color: palette.muted }}>
                    {decision.outcome_reliability?.score ?? 0}% ({decision.outcome_reliability?.band || "low"})
                  </p>
                </div>
                {driftAlert && (
                  <div style={{ ...innerCard, border: `1px solid ${darkMode ? "rgba(238,146,153,0.42)" : "rgba(200,86,93,0.24)"}`, background: darkMode ? "rgba(238,146,153,0.12)" : "rgba(200,86,93,0.08)" }}>
                    <p style={{ margin: "0 0 4px", fontSize: 13, color: palette.danger, fontWeight: 700 }}>
                      Drift alert: {driftAlert.severity} ({driftAlert.drift_score})
                    </p>
                    <ul style={{ margin: 0, paddingLeft: 16, color: palette.text, fontSize: 12 }}>
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
                    <p style={{ margin: 0, fontSize: 12, color: palette.danger }}>{outcomeError}</p>
                  )}
                  {outcomeMessage && (
                    <p style={{ margin: 0, fontSize: 12, color: palette.success }}>{outcomeMessage}</p>
                  )}

                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                    <button
                      type="button"
                      className="ui-btn-polish ui-focus-ring"
                      onClick={runFollowUpOrchestrator}
                      style={ui.secondaryButton}
                      disabled={orchestrating || decision.was_successful !== false}
                    >
                      {orchestrating ? "Running..." : "Auto Create Follow-up Task"}
                    </button>
                    <button className="ui-btn-polish ui-focus-ring" type="submit" style={ui.primaryButton} disabled={outcomeSaving || decision.status !== "implemented"}>
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
                    <div style={{ ...innerCard, border: `1px solid ${palette.border}` }}>
                      <InfoRow label="Nodes" value={`${impactTrail.nodes.length}`} palette={palette} />
                      <InfoRow label="Edges" value={`${impactTrail.edges.length}`} palette={palette} />
                    </div>
                    <div style={{ display: "grid", gap: 6 }}>
                      {(impactTrail.edges || []).slice(0, 8).map((edge, idx) => (
                        <div key={idx} style={{ borderRadius: 14, border: `1px solid ${palette.border}`, padding: "10px 12px", fontSize: 12, color: palette.muted, background: palette.cardAlt }}>
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
                    <button className="ui-btn-polish ui-focus-ring" type="button" onClick={runReplaySimulation} style={ui.primaryButton} disabled={replayLoading}>
                      {replayLoading ? "Running..." : "Run Replay Simulation"}
                    </button>
                  </div>
                </div>

                {replayError && <p style={{ margin: 0, fontSize: 12, color: palette.danger }}>{replayError}</p>}
                {replayTaskMessage && <p style={{ margin: 0, fontSize: 12, color: palette.success }}>{replayTaskMessage}</p>}

                {replayResult && (
                  <div style={{ display: "grid", gap: 8 }}>
                    <div style={{ ...innerCard, border: `1px solid ${palette.border}` }}>
                      <p style={{ margin: "0 0 6px", fontSize: 13, color: palette.text, fontWeight: 700 }}>Forecast</p>
                      <InfoRow label="Failure risk" value={`${replayResult.forecast?.predicted_failure_risk_pct ?? 0}%`} palette={palette} />
                      <InfoRow label="Expected impact" value={`${replayResult.forecast?.expected_impact_score ?? 0}/100`} palette={palette} />
                      <InfoRow label="Confidence" value={`${replayResult.forecast?.confidence_pct ?? 0}%`} palette={palette} />
                      <InfoRow label="Sample size" value={`${replayResult.based_on?.sample_size ?? 0}`} palette={palette} />
                    </div>

                    <div style={{ ...innerCard, border: `1px solid ${palette.border}` }}>
                      <p style={{ margin: "0 0 6px", fontSize: 13, color: palette.text, fontWeight: 700 }}>Teams Most Affected</p>
                      <ul style={{ margin: 0, paddingLeft: 16, color: palette.muted, fontSize: 12 }}>
                        {(replayResult.teams_most_affected || []).map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>

                    <div style={{ ...innerCard, border: `1px solid ${palette.border}` }}>
                      <p style={{ margin: "0 0 6px", fontSize: 13, color: palette.text, fontWeight: 700 }}>Recommended Safeguards</p>
                      <ul style={{ margin: 0, paddingLeft: 16, color: palette.muted, fontSize: 12 }}>
                        {(replayResult.recommended_safeguards || []).map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                        <button
                          type="button"
                          className="ui-btn-polish ui-focus-ring"
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

          <aside style={{ display: "grid", gap: 12, alignContent: "start" }}>
            {decision.confidence && (
              <section className="ui-card-lift ui-smooth" style={{ ...sideCard, border: `1px solid ${palette.border}`, background: palette.card }}>
                <h3 style={{ margin: "0 0 8px", fontSize: 14, color: palette.text }}>Confidence</h3>
                <p style={{ margin: 0, fontSize: 30, fontWeight: 800, color: palette.text }}>{decision.confidence.score || 0}%</p>
                <div style={{ width: "100%", height: 8, borderRadius: 999, background: palette.progressTrack, overflow: "hidden", marginTop: 6 }}>
                  <div style={{ height: "100%", width: `${decision.confidence.score || 0}%`, background: `linear-gradient(90deg, ${palette.success}, ${palette.success})` }} />
                </div>
                {decision.confidence.factors?.length > 0 && (
                  <ul style={{ margin: "8px 0 0", paddingLeft: 16, color: palette.muted, fontSize: 11 }}>
                    {decision.confidence.factors.map((factor, index) => <li key={index} style={{ marginBottom: 4 }}>{factor}</li>)}
                  </ul>
                )}
              </section>
            )}

            <section className="ui-card-lift ui-smooth" style={{ ...sideCard, border: `1px solid ${palette.border}`, background: palette.card }}>
              <h3 style={{ margin: "0 0 8px", fontSize: 14, color: palette.text }}>Reliability</h3>
              <InfoRow label="Outcome reliability" value={`${decision.outcome_reliability?.score ?? 0}%`} palette={palette} />
              <InfoRow label="Band" value={(decision.outcome_reliability?.band || "low").toUpperCase()} palette={palette} />
            </section>

            <section className="ui-card-lift ui-smooth" style={{ ...sideCard, border: `1px solid ${palette.border}`, background: palette.card }}>
              <h3 style={{ margin: "0 0 8px", fontSize: 14, color: palette.text }}>Details</h3>
              <InfoRow label="Decided" value={decisionDate} palette={palette} />
              <InfoRow label="Deadline" value={decision.implementation_deadline ? new Date(decision.implementation_deadline).toLocaleDateString() : "-"} palette={palette} />
            </section>

            {linkedConversation && (
              <section className="ui-card-lift ui-smooth" style={{ ...sideCard, border: `1px solid ${palette.border}`, background: palette.card }}>
                <h3 style={{ margin: "0 0 8px", fontSize: 14, color: palette.text }}>Linked Context</h3>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: palette.text }}>
                  {linkedConversation.title || `Conversation #${linkedConversation.id}`}
                </p>
                <p style={{ margin: "6px 0 0", fontSize: 12, lineHeight: 1.6, color: palette.muted }}>
                  This decision traces back to a source conversation so the reasoning stays connected.
                </p>
              </section>
            )}

            <ContextPanel contentType="decisions.decision" objectId={id} refreshKey={contextRefreshKey} />
          </aside>
        </div>
      </div>
    </div>
  );
}

function Pill({ text, tone = "blue", palette }) {
  const style = tone === "amber"
    ? { border: `1px solid ${palette.warn}`, color: palette.warn, background: darkenableSoft(palette.warn) }
    : { border: `1px solid ${palette.accent}`, color: palette.link, background: palette.accentSoft };
  return <span style={{ ...style, fontSize: 11, fontWeight: 700, borderRadius: 999, padding: "5px 10px", textTransform: "capitalize" }}>{text}</span>;
}

function darkenableSoft(color) {
  const normalized = color.replace("#", "");
  if (normalized.length !== 6) return "rgba(168, 116, 57, 0.12)";
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, 0.12)`;
}

function TextBlock({ title, text, palette, darkMode }) {
  const content = text || "";
  const hasHtml = /<\/?[a-z][\s\S]*>/i.test(content);
  return (
    <div>
      <h3 style={{ margin: "0 0 8px", fontSize: 16, color: palette?.text || "var(--app-text)" }}>{title}</h3>
      <div style={{ color: palette?.muted || "var(--app-muted)", fontSize: 13, lineHeight: 1.6 }}>
        {hasHtml ? (
          <RichTextRenderer content={content} darkMode={darkMode} />
        ) : (
          content.split("\n\n").map((paragraph, index) => (
            <p key={index} style={{ margin: "0 0 10px" }}>{paragraph}</p>
          ))
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value, palette }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12, marginBottom: 6 }}>
      <span style={{ color: palette?.muted || "var(--app-muted)" }}>{label}</span>
      <span style={{ color: palette?.text || "var(--app-text)", fontWeight: 700 }}>{value}</span>
    </div>
  );
}

function DecisionEngineeringSection({ timeline, loading, palette }) {
  if (loading) {
    return (
      <div style={{ ...innerCard, border: `1px solid ${palette.border}`, color: palette.muted, fontSize: 12, textAlign: "center" }}>
        Loading engineering timeline...
      </div>
    );
  }

  if (!timeline?.repository?.configured) {
    return (
      <div style={{ ...innerCard, border: `1px dashed ${palette.border}`, color: palette.muted, fontSize: 12, display: "grid", gap: 6 }}>
        <span>GitHub is not configured for this workspace yet.</span>
        <span>Connect the repository in Integrations to unlock pull request, commit, and deployment timelines.</span>
      </div>
    );
  }

  const summary = timeline.summary || {};
  const linkedIssues = timeline.linked_issues || [];
  const pullRequests = timeline.pull_requests || [];
  const commits = timeline.commits || [];
  const deployments = timeline.deployments || [];
  const manualLinks = timeline.manual_links || [];

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 8 }}>
        <SummaryCard label="Status" value={(timeline.implementation_status || "not_started").replaceAll("_", " ")} palette={palette} />
        <SummaryCard label="Pull Requests" value={`${summary.decision_pull_requests || 0} direct / ${summary.issue_pull_requests || 0} issue`} palette={palette} />
        <SummaryCard label="Commits" value={`${summary.commits || 0}`} palette={palette} />
        <SummaryCard label="Deployments" value={`${summary.deployments || 0}`} palette={palette} />
      </div>

      <div style={{ ...innerCard, border: `1px solid ${palette.border}` }}>
        <p style={{ margin: "0 0 6px", fontSize: 13, color: palette.text, fontWeight: 700 }}>Repository Readiness</p>
        <InfoRow label="Repository" value={timeline.repository?.repo_slug || "-"} palette={palette} />
        <InfoRow label="Webhook" value={timeline.repository?.webhook_readiness?.label || "Not configured"} palette={palette} />
        <InfoRow label="Suggested branch" value={timeline.naming?.suggested_branch || "-"} palette={palette} />
        <InfoRow label="Suggested PR title" value={timeline.naming?.suggested_pr_title || "-"} palette={palette} />
      </div>

      {linkedIssues.length ? (
        <div style={{ ...innerCard, border: `1px solid ${palette.border}` }}>
          <p style={{ margin: "0 0 8px", fontSize: 13, color: palette.text, fontWeight: 700 }}>Linked Execution Work</p>
          <div style={{ display: "grid", gap: 8 }}>
            {linkedIssues.map((issue) => (
              <div key={issue.id} style={{ ...innerCard, border: `1px solid ${palette.border}`, background: palette.card }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: palette.text }}>{issue.key}: {issue.title}</p>
                    <p style={{ margin: "4px 0 0", fontSize: 11, color: palette.muted }}>
                      {[issue.project_name, issue.sprint_name, issue.branch_name || "No branch yet"].filter(Boolean).join(" | ")}
                    </p>
                  </div>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      borderRadius: 999,
                      padding: "6px 10px",
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: "capitalize",
                      background: palette.accentSoft,
                      color: palette.link,
                      border: `1px solid ${palette.accent}`,
                    }}
                  >
                    {issue.status?.replaceAll("_", " ")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <EngineeringList title="Pull Requests" items={pullRequests} palette={palette} emptyText="No pull requests linked yet." />
      <EngineeringList title="Commits" items={commits} palette={palette} emptyText="No commits linked yet." />
      <EngineeringList title="Deployments" items={deployments} palette={palette} emptyText="No deployments tracked yet." />

      {manualLinks.length ? (
        <EngineeringList title="Other Linked Evidence" items={manualLinks} palette={palette} emptyText="" />
      ) : null}
    </div>
  );
}

function SummaryCard({ label, value, palette }) {
  return (
    <div style={{ ...innerCard, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
      <p style={{ margin: 0, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: palette.muted, fontWeight: 700 }}>{label}</p>
      <p style={{ margin: "6px 0 0", fontSize: 14, color: palette.text, fontWeight: 700, textTransform: "capitalize" }}>{value}</p>
    </div>
  );
}

function EngineeringList({ title, items, palette, emptyText }) {
  return (
    <div style={{ ...innerCard, border: `1px solid ${palette.border}` }}>
      <p style={{ margin: "0 0 8px", fontSize: 13, color: palette.text, fontWeight: 700 }}>{title}</p>
      {items?.length ? (
        <div style={{ display: "grid", gap: 8 }}>
          {items.map((item, index) => {
            const href = item.url;
            const content = (
              <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 8 }}>
                <LinkIcon style={{ width: 16, height: 16, color: palette.muted, marginTop: 2 }} />
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: palette.text }}>
                    {item.title || item.environment || item.short_hash || item.type || "Linked item"}
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: 11, color: palette.muted }}>
                    {[
                      item.status,
                      item.subtitle,
                      item.author,
                      item.branch,
                      item.environment,
                      item.short_hash,
                      item.deployed_by,
                    ].filter(Boolean).join(" | ")}
                  </p>
                </div>
              </div>
            );

            if (!href) {
              return (
                <div key={`${title}-${index}`} style={{ ...innerCard, border: `1px solid ${palette.border}`, background: palette.card }}>
                  {content}
                </div>
              );
            }

            return (
              <a
                key={`${title}-${href}-${index}`}
                href={href}
                target="_blank"
                rel="noreferrer"
                style={{ ...innerCard, border: `1px solid ${palette.border}`, background: palette.card, textDecoration: "none" }}
              >
                {content}
              </a>
            );
          })}
        </div>
      ) : emptyText ? (
        <div style={{ ...innerCard, border: `1px dashed ${palette.border}`, color: palette.muted, fontSize: 12, textAlign: "center" }}>
          {emptyText}
        </div>
      ) : null}
    </div>
  );
}

const fieldLabel = { margin: 0, fontSize: 12, color: "var(--app-muted)", fontWeight: 700 };
const ambientLayer = { position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 };
const commandStrip = { position: "sticky", top: 72, zIndex: 1, marginBottom: 12, borderRadius: 24, padding: 12, display: "flex", gap: 8, flexWrap: "wrap" };
const commandPill = { display: "inline-flex", alignItems: "center", gap: 5, borderRadius: 999, padding: "8px 12px", background: "transparent", fontSize: 12, fontWeight: 700, cursor: "pointer" };
const toolbarMetaChip = (palette) => ({ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, padding: "8px 12px", border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text, fontSize: 12, fontWeight: 700 });
const heroMetrics = { marginTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 };
const metricChip = { borderRadius: 18, padding: "14px 14px 12px", boxShadow: "var(--ui-shadow-xs)" };
const metricLabel = { margin: 0, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700 };
const metricValue = { margin: "6px 0 0", fontSize: 20, fontWeight: 800 };
const mainGrid = { position: "relative", zIndex: 1, display: "grid" };
const panelCard = { borderRadius: 24, padding: "clamp(16px,2.2vw,22px)", boxShadow: "var(--ui-shadow-xs)" };
const innerCard = { borderRadius: 18, padding: 14, background: "var(--app-surface-alt)" };
const sideCard = { borderRadius: 22, padding: 16, boxShadow: "var(--ui-shadow-xs)" };

export default DecisionDetail;

