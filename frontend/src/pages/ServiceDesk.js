import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette } from "../utils/projectUi";

const REQUEST_TYPES = [
  { key: "access", name: "Access Request" },
  { key: "bug", name: "Bug Report" },
  { key: "incident", name: "Incident" },
  { key: "service", name: "Service Request" },
  { key: "change", name: "Change Request" },
  { key: "general", name: "General Support" },
];

const SUPPORT_EMAIL = "support@knoledgr.com";
const CHATBOT_SUGGESTIONS = [
  "Email access blocked for onboarding users. What should we do first?",
  "Production bug impacting checkout. Help me triage this incident.",
  "A user requests role change and system permissions update.",
];

export default function ServiceDesk() {
  const { darkMode } = useTheme();
  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [queue, setQueue] = useState([]);
  const [aiGuide, setAiGuide] = useState(null);
  const [summary, setSummary] = useState({ total_requests: 0, open_requests: 0, unassigned: 0, overdue: 0 });
  const [mineOnly, setMineOnly] = useState(false);
  const [statusFilter, setStatusFilter] = useState("open");
  const [form, setForm] = useState({
    title: "",
    description: "",
    request_type: "general",
    priority: "medium",
    due_date: "",
  });
  const [error, setError] = useState("");
  const [aiError, setAiError] = useState("");

  const [chatMessages, setChatMessages] = useState([
    {
      id: "welcome",
      role: "assistant",
      text: "I am Recall Helpdesk AI. Describe the issue, and I will suggest triage, risk, and next actions.",
      guide: null,
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");
  const chatEndRef = useRef(null);

  const cards = useMemo(
    () => [
      { label: "Total", value: summary.total_requests || 0 },
      { label: "Open", value: summary.open_requests || 0 },
      { label: "Unassigned", value: summary.unassigned || 0 },
      { label: "Overdue", value: summary.overdue || 0 },
    ],
    [summary]
  );

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/api/agile/service-desk/", {
        params: {
          status: statusFilter,
          mine: mineOnly ? 1 : 0,
        },
      });
      setQueue(Array.isArray(response.data?.queue) ? response.data.queue : []);
      setSummary(response.data?.summary || {});
    } catch (err) {
      setError(err?.response?.data?.error || "Unable to load service desk.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter, mineOnly]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chatMessages, chatLoading]);

  const inferRequestType = (guide) => {
    const text = `${guide?.answer || ""} ${form.title || ""} ${form.description || ""}`.toLowerCase();
    if (text.includes("access") || text.includes("permission")) return "access";
    if (text.includes("incident") || text.includes("outage") || text.includes("sev")) return "incident";
    if (text.includes("bug") || text.includes("error") || text.includes("exception")) return "bug";
    if (text.includes("change") || text.includes("rollout") || text.includes("migration")) return "change";
    if (text.includes("service") || text.includes("request")) return "service";
    return "general";
  };

  const inferPriority = (guide) => {
    const status = guide?.riskStatus;
    const confidence = Number(guide?.confidence || 0);
    if (status === "critical") return "highest";
    if (status === "watch") return confidence >= 75 ? "high" : "medium";
    return confidence >= 80 ? "medium" : "low";
  };

  const mapCopilotResponse = (payload) => ({
    answer: payload?.answer || "No AI guidance generated.",
    confidence: payload?.confidence || 0,
    riskStatus: payload?.risk_status || "watch",
    nextActions: Array.isArray(payload?.recommended_interventions) ? payload.recommended_interventions.slice(0, 4) : [],
  });

  const getSupportGuidance = async (prompt) => {
    try {
      const response = await api.post("/api/knowledge/ai/copilot/", {
        query: prompt,
        execute: false,
        max_actions: 4,
      });
      return mapCopilotResponse(response.data);
    } catch (err) {
      try {
        const missionRes = await api.get("/api/knowledge/ai/mission-control/");
        return {
          answer: "AI copilot fallback guidance generated from mission control and recommendations.",
          confidence: 62,
          riskStatus: missionRes?.data?.north_star?.status || "watch",
          nextActions: (missionRes?.data?.autonomous_actions || []).slice(0, 4),
        };
      } catch (_fallbackErr) {
        throw err;
      }
    }
  };

  const analyzeWithAI = async () => {
    if (!form.title.trim()) return;
    setAnalyzing(true);
    setAiError("");
    try {
      const prompt = `Support request triage.\nTitle: ${form.title}\nDescription: ${form.description}\nRequest type: ${form.request_type}\nPriority: ${form.priority}\nProvide triage risk and top handling actions.`;
      setAiGuide(await getSupportGuidance(prompt));
    } catch (err) {
      setAiError(err?.response?.data?.error || "Unable to generate AI guidance.");
    } finally {
      setAnalyzing(false);
    }
  };

  const applyGuidanceToForm = (guide, userPrompt = "") => {
    if (!guide) return;
    const suggestedType = inferRequestType(guide);
    const suggestedPriority = inferPriority(guide);
    const actionLines = (guide.nextActions || []).map((a, idx) => `${idx + 1}. ${a.title || a}`).join("\n");
    const baseDescription = userPrompt || form.description || "";
    setForm((prev) => ({
      ...prev,
      title: prev.title || userPrompt.slice(0, 120),
      request_type: suggestedType,
      priority: suggestedPriority,
      description: `${baseDescription}${baseDescription ? "\n\n" : ""}AI triage notes:\n${guide.answer}${actionLines ? `\n\nSuggested actions:\n${actionLines}` : ""}`,
    }));
    setAiGuide(guide);
  };

  const submitChatPrompt = async (promptText) => {
    const cleaned = promptText.trim();
    if (!cleaned || chatLoading) return;

    setChatMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", text: cleaned }]);
    setChatInput("");
    setChatLoading(true);
    setChatError("");

    try {
      const prompt = [
        "You are Recall Helpdesk AI for enterprise service operations.",
        "Respond with practical triage guidance for this support request.",
        `User issue: ${cleaned}`,
        `Existing request type: ${form.request_type}`,
        `Existing priority: ${form.priority}`,
      ].join("\n");
      const guide = await getSupportGuidance(prompt);
      setChatMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: "assistant", text: guide.answer, guide, prompt: cleaned }]);
    } catch (err) {
      setChatError(err?.response?.data?.error || "Helpdesk AI is temporarily unavailable.");
    } finally {
      setChatLoading(false);
    }
  };

  const submitRequest = async (event) => {
    event.preventDefault();
    if (!form.title.trim()) return;
    setSubmitting(true);
    setError("");

    try {
      const aiTriagePayload = aiGuide
        ? {
            answer: aiGuide.answer,
            confidence: aiGuide.confidence,
            risk_status: aiGuide.riskStatus,
            suggested_request_type: inferRequestType(aiGuide),
            suggested_priority: inferPriority(aiGuide),
            next_actions: (aiGuide.nextActions || []).map((action) => ({
              title: action?.title || action,
              reason: action?.reason || "",
              confidence: action?.confidence ?? null,
              impact: action?.impact ?? null,
            })),
          }
        : null;

      await api.post("/api/agile/service-desk/requests/", { ...form, ai_triage: aiTriagePayload });
      setForm({ title: "", description: "", request_type: "general", priority: "medium", due_date: "" });
      setAiGuide(null);
      setAiError("");
      fetchData();
    } catch (err) {
      setError(err?.response?.data?.error || "Unable to submit request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <section style={{ ...panel(palette), padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 10, flexWrap: "wrap" }}>
          <div>
            <p style={{ margin: 0, fontSize: 11, color: palette.muted, letterSpacing: "0.08em", fontWeight: 700 }}>SERVICE DESK</p>
            <h1 style={{ margin: "6px 0 0", fontSize: "clamp(1.2rem,2.4vw,1.7rem)", color: palette.text }}>Operations Intake + Triage</h1>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: palette.muted }}>
              Handle incidents, access requests, and service operations in one queue. Support: <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: palette.accent }}>{SUPPORT_EMAIL}</a>
            </p>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={inputStyle(palette)}>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
              <option value="all">All</option>
            </select>
            <button onClick={() => setMineOnly((v) => !v)} style={mineOnly ? buttonFilled(palette) : buttonGhost(palette)}>
              {mineOnly ? "Showing Mine" : "Show Mine"}
            </button>
            <button onClick={fetchData} style={buttonFilled(palette)}>Refresh</button>
          </div>
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 8 }}>
        {cards.map((card) => (
          <div key={card.label} style={{ ...panel(palette), padding: 10 }}>
            <p style={{ margin: 0, fontSize: 11, color: palette.muted }}>{card.label}</p>
            <p style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 800, color: palette.text }}>{card.value}</p>
          </div>
        ))}
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "minmax(0,1.25fr) minmax(0,1fr)", gap: 10 }}>
        <div style={{ display: "grid", gap: 10 }}>
          <article style={{ ...panel(palette), padding: 12 }}>
            <h2 style={{ margin: 0, fontSize: 15, color: palette.text }}>Queue</h2>
            <p style={{ margin: "4px 0 10px", fontSize: 12, color: palette.muted }}>Live service requests with AI triage context.</p>

            {loading ? (
              <p style={{ margin: 0, fontSize: 12, color: palette.muted }}>Loading queue...</p>
            ) : queue.length === 0 ? (
              <p style={{ margin: 0, fontSize: 12, color: palette.muted }}>No requests found for this filter.</p>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {queue.map((item) => (
                  <article key={item.id} style={{ border: `1px solid ${palette.border}`, borderRadius: 10, background: palette.cardAlt, padding: 10, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ minWidth: 0 }}>
                      <Link to={`/issues/${item.id}`} style={{ color: palette.text, fontWeight: 700, textDecoration: "none" }}>
                        {item.key} - {item.title}
                      </Link>
                      <p style={{ margin: "4px 0 0", fontSize: 12, color: palette.muted }}>
                        {item.project} | {item.status} | {item.priority} | {item.assignee || "Unassigned"}
                      </p>
                      {item.ai_triage ? (
                        <p style={{ margin: "4px 0 0", fontSize: 11, color: palette.muted }}>
                          AI: {item.ai_triage.risk_status} risk, {item.ai_triage.confidence}% confidence
                        </p>
                      ) : null}
                    </div>
                    <span style={{ fontSize: 11, color: palette.muted }}>{new Date(item.updated_at).toLocaleString()}</span>
                  </article>
                ))}
              </div>
            )}
          </article>

          <article style={{ ...panel(palette), padding: 12 }}>
            <h2 style={{ margin: 0, fontSize: 15, color: palette.text }}>Recall Helpdesk AI</h2>
            <p style={{ margin: "4px 0 10px", fontSize: 12, color: palette.muted }}>Chat for triage guidance and apply directly to request draft.</p>

            <div style={{ border: `1px solid ${palette.border}`, borderRadius: 10, background: palette.cardAlt, padding: 10 }}>
              <div style={{ display: "grid", gap: 8, maxHeight: 220, overflowY: "auto", paddingRight: 2 }}>
                {chatMessages.map((message) => (
                  <div key={message.id} style={{ justifySelf: message.role === "user" ? "end" : "start", maxWidth: "92%", border: `1px solid ${palette.border}`, background: message.role === "user" ? palette.accentSoft : palette.card, borderRadius: 10, padding: "8px 10px", color: palette.text }}>
                    <p style={{ margin: 0, fontSize: 12, whiteSpace: "pre-wrap" }}>{message.text}</p>
                    {message.guide ? (
                      <div style={{ display: "flex", gap: 6, marginTop: 6, alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{ fontSize: 11, color: palette.muted }}>Risk: {message.guide.riskStatus} | Confidence: {message.guide.confidence}%</span>
                        <button type="button" onClick={() => applyGuidanceToForm(message.guide, message.prompt || "")} style={{ ...buttonGhost(palette), padding: "4px 8px", fontSize: 11 }}>Apply</button>
                      </div>
                    ) : null}
                  </div>
                ))}
                {chatLoading ? <p style={{ margin: 0, fontSize: 12, color: palette.muted }}>Recall Helpdesk AI is thinking...</p> : null}
                <div ref={chatEndRef} />
              </div>

              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                {CHATBOT_SUGGESTIONS.map((prompt) => (
                  <button key={prompt} type="button" onClick={() => submitChatPrompt(prompt)} style={{ ...buttonGhost(palette), padding: "5px 8px", fontSize: 11 }} disabled={chatLoading}>
                    {prompt}
                  </button>
                ))}
              </div>

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  submitChatPrompt(chatInput);
                }}
                style={{ display: "grid", gap: 8, marginTop: 10 }}
              >
                <textarea value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Describe the support issue and ask Recall Helpdesk AI..." style={{ ...inputStyle(palette), minHeight: 72, resize: "vertical" }} />
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  {chatError ? <span style={{ fontSize: 12, color: palette.danger }}>{chatError}</span> : <span style={{ fontSize: 12, color: palette.muted }}>Organization-aware support guidance.</span>}
                  <button type="submit" style={buttonFilled(palette)} disabled={chatLoading || !chatInput.trim()}>
                    {chatLoading ? "Sending..." : "Send to Recall AI"}
                  </button>
                </div>
              </form>
            </div>
          </article>
        </div>

        <aside style={{ ...panel(palette), padding: 12, alignSelf: "start", position: "sticky", top: 86 }}>
          <h2 style={{ margin: 0, fontSize: 15, color: palette.text }}>Create Request</h2>
          <p style={{ margin: "4px 0 10px", fontSize: 12, color: palette.muted }}>Submit a ticket with optional AI triage attached.</p>

          <form onSubmit={submitRequest} style={{ display: "grid", gap: 8 }}>
            <input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="Request title" style={inputStyle(palette)} required />
            <textarea value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} placeholder="Describe the request" style={{ ...inputStyle(palette), minHeight: 88, resize: "vertical" }} />

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
              <select value={form.request_type} onChange={(e) => setForm((prev) => ({ ...prev, request_type: e.target.value }))} style={inputStyle(palette)}>
                {REQUEST_TYPES.map((type) => (
                  <option key={type.key} value={type.key}>{type.name}</option>
                ))}
              </select>
              <select value={form.priority} onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))} style={inputStyle(palette)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="highest">Highest</option>
              </select>
            </div>

            <input type="date" value={form.due_date} onChange={(e) => setForm((prev) => ({ ...prev, due_date: e.target.value }))} style={inputStyle(palette)} />

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" onClick={analyzeWithAI} style={buttonGhost(palette)} disabled={analyzing || !form.title.trim()}>
                {analyzing ? "Analyzing..." : "Analyze with AI"}
              </button>
              <button type="button" onClick={() => applyGuidanceToForm(aiGuide, form.title || form.description)} style={buttonGhost(palette)} disabled={!aiGuide}>
                Apply Guidance
              </button>
              <button type="submit" style={buttonFilled(palette)} disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </form>

          {(aiGuide || aiError) && (
            <div style={{ marginTop: 10, borderTop: `1px solid ${palette.border}`, paddingTop: 10, display: "grid", gap: 6 }}>
              <h3 style={{ margin: 0, fontSize: 13, color: palette.text }}>AI Support Guide</h3>
              {aiError ? (
                <p style={{ margin: 0, fontSize: 12, color: palette.danger }}>{aiError}</p>
              ) : (
                <>
                  <p style={{ margin: 0, fontSize: 12, color: palette.muted }}>{aiGuide?.answer}</p>
                  <p style={{ margin: 0, fontSize: 11, color: palette.muted }}>
                    Risk: <strong style={{ color: palette.text }}>{aiGuide?.riskStatus}</strong> | Confidence: <strong style={{ color: palette.text }}>{aiGuide?.confidence}%</strong> | Type: <strong style={{ color: palette.text }}>{inferRequestType(aiGuide)}</strong> | Priority: <strong style={{ color: palette.text }}>{inferPriority(aiGuide)}</strong>
                  </p>
                </>
              )}
            </div>
          )}
        </aside>
      </section>

      {error ? <p style={{ margin: 0, color: palette.danger, fontSize: 12 }}>{error}</p> : null}
    </div>
  );
}

function panel(palette) {
  return {
    border: `1px solid ${palette.border}`,
    borderRadius: 12,
    background: palette.card,
  };
}

function inputStyle(palette) {
  return {
    width: "100%",
    border: `1px solid ${palette.border}`,
    borderRadius: 9,
    padding: "9px 11px",
    fontSize: 13,
    outline: "none",
    background: palette.cardAlt,
    color: palette.text,
  };
}

function buttonFilled(palette) {
  return {
    border: "none",
    borderRadius: 9,
    background: palette.ctaGradient,
    color: palette.buttonText,
    padding: "8px 12px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  };
}

function buttonGhost(palette) {
  return {
    border: `1px solid ${palette.border}`,
    borderRadius: 9,
    background: palette.cardAlt,
    color: palette.text,
    padding: "8px 12px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  };
}
