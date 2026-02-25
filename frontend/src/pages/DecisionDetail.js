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

  const fetchDecision = async () => {
    try {
      const res = await api.get(`/api/decisions/${id}/`);
      setDecision(res.data);
    } catch (error) {
      console.error("Failed to fetch decision:", error);
      setDecision(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDecision();
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
              {["overview", "rationale", "code", "details"].map((tab) => (
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

export default DecisionDetail;
