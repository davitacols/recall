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
const SERVICE_FLOW = [
  {
    title: "Submit Request",
    detail: "Provide title, description, request type, priority, and optional due date.",
  },
  {
    title: "AI Triage",
    detail: "Analyze with AI to get risk, confidence, suggested request type, and handling actions.",
  },
  {
    title: "Queue & Assignment",
    detail: "The request enters the Service Desk queue with status, priority, and assignee visibility.",
  },
  {
    title: "Resolution & Tracking",
    detail: "Teams update progress, close requests, and maintain an auditable service timeline.",
  },
];
const CHATBOT_SUGGESTIONS = [
  "Email access blocked for onboarding users. What should we do first?",
  "Production bug impacting checkout. Help me triage this incident.",
  "A user requests role change and system permissions update.",
];

export default function ServiceDesk() {
  const { darkMode } = useTheme();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [queue, setQueue] = useState([]);
  const [aiGuide, setAiGuide] = useState(null);
  const [summary, setSummary] = useState({
    total_requests: 0,
    open_requests: 0,
    unassigned: 0,
    overdue: 0,
  });
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

  const palette = useMemo(() => {
    const base = getProjectPalette(darkMode);
    return {
      ...base,
      page: base.bg,
      panel: base.card,
      panelAlt: base.cardAlt,
      accent: base.accent,
      accentSoft: base.accentSoft,
      bad: base.danger,
    };
  }, [darkMode]);

  const cards = useMemo(
    () => [
      { label: "Total", value: summary.total_requests },
      { label: "Open", value: summary.open_requests },
      { label: "Unassigned", value: summary.unassigned },
      { label: "Overdue", value: summary.overdue },
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
    nextActions: Array.isArray(payload?.recommended_interventions)
      ? payload.recommended_interventions.slice(0, 4)
      : [],
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
    const actionLines = (guide.nextActions || [])
      .map((a, idx) => `${idx + 1}. ${a.title || a}`)
      .join("\n");
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

    const userMessage = { id: `u-${Date.now()}`, role: "user", text: cleaned };
    setChatMessages((prev) => [...prev, userMessage]);
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
      setChatMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: "assistant", text: guide.answer, guide, prompt: cleaned },
      ]);
    } catch (err) {
      setChatError(err?.response?.data?.error || "Helpdesk AI is temporarily unavailable.");
    } finally {
      setChatLoading(false);
    }
  };

  const applyAiGuidance = () => {
    applyGuidanceToForm(aiGuide, form.title || form.description);
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
      await api.post("/api/agile/service-desk/requests/", {
        ...form,
        ai_triage: aiTriagePayload,
      });
      setForm({
        title: "",
        description: "",
        request_type: "general",
        priority: "medium",
        due_date: "",
      });
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
    <div style={{ display: "grid", gap: 14 }}>
      <section style={hero}>
        <div>
          <h1 style={{ margin: 0, fontSize: 23, color: palette.text }}>Service Desk</h1>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: palette.muted }}>
            Centralized intake and queue management for incidents, requests, and support operations.
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: palette.muted }}>
            Need help? Email <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: palette.accent }}>{SUPPORT_EMAIL}</a>.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ ...input, ...themedInput(palette) }}>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
            <option value="all">All</option>
          </select>
          <button onClick={() => setMineOnly((v) => !v)} style={mineOnly ? themedBtnActive(palette) : themedBtnGhost(palette)}>
            {mineOnly ? "Showing Mine" : "Show Mine"}
          </button>
          <button onClick={fetchData} style={themedBtnPrimary(palette)}>Refresh</button>
        </div>
      </section>

      <section style={statsGrid}>
        {cards.map((card) => (
          <article key={card.label} style={cardStyle}>
            <p style={{ margin: 0, color: palette.muted, fontSize: 12 }}>{card.label}</p>
            <p style={{ margin: "4px 0 0", fontWeight: 700, fontSize: 20, color: palette.text }}>{card.value || 0}</p>
          </article>
        ))}
      </section>

      <section style={panel}>
        <h2 style={{ margin: "0 0 8px", fontSize: 16, color: palette.text }}>How Service Desk Works</h2>
        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))" }}>
          {SERVICE_FLOW.map((step, idx) => (
            <article key={step.title} style={{ border: `1px solid ${palette.border}`, borderRadius: 10, padding: 10, background: palette.panelAlt }}>
              <p style={{ margin: 0, color: palette.accent, fontSize: 11, fontWeight: 700, letterSpacing: "0.04em" }}>
                STEP {idx + 1}
              </p>
              <p style={{ margin: "4px 0 0", color: palette.text, fontWeight: 700, fontSize: 14 }}>{step.title}</p>
              <p style={{ margin: "4px 0 0", color: palette.muted, fontSize: 12 }}>{step.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section style={panel}>
        <h2 style={{ margin: "0 0 6px", fontSize: 16, color: palette.text }}>Recall Helpdesk AI</h2>
        <p style={{ margin: "0 0 10px", color: palette.muted, fontSize: 12 }}>
          Chat with the assistant for triage guidance, then apply the response directly to the request form.
        </p>
        <div style={{ border: `1px solid ${palette.border}`, borderRadius: 10, background: palette.panelAlt, padding: 10 }}>
          <div style={{ display: "grid", gap: 8, maxHeight: 260, overflowY: "auto", paddingRight: 2 }}>
            {chatMessages.map((message) => (
              <div
                key={message.id}
                style={{
                  justifySelf: message.role === "user" ? "end" : "start",
                  maxWidth: "92%",
                  border: `1px solid ${palette.border}`,
                  background: message.role === "user" ? palette.accentSoft : palette.panel,
                  color: palette.text,
                  borderRadius: 10,
                  padding: "8px 10px",
                }}
              >
                <p style={{ margin: 0, fontSize: 13, whiteSpace: "pre-wrap" }}>{message.text}</p>
                {message.guide ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: palette.muted }}>
                      Risk: {message.guide.riskStatus} | Confidence: {message.guide.confidence}%
                    </span>
                    <button
                      type="button"
                      onClick={() => applyGuidanceToForm(message.guide, message.prompt || "")}
                      style={{ ...themedBtnGhost(palette), padding: "5px 8px", fontSize: 11 }}
                    >
                      Apply to Request
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
            {chatLoading ? (
              <p style={{ ...muted, color: palette.muted, fontSize: 12 }}>Recall Helpdesk AI is thinking...</p>
            ) : null}
            <div ref={chatEndRef} />
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
            {CHATBOT_SUGGESTIONS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => submitChatPrompt(prompt)}
                style={{ ...themedBtnGhost(palette), padding: "6px 9px", fontSize: 11 }}
                disabled={chatLoading}
              >
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
            <textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Describe the support issue and ask Recall Helpdesk AI..."
              style={{ ...input, ...themedInput(palette), minHeight: 72, resize: "vertical" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              {chatError ? <span style={{ color: palette.bad, fontSize: 12 }}>{chatError}</span> : <span style={{ color: palette.muted, fontSize: 12 }}>Responses are organization-aware and support-focused.</span>}
              <button type="submit" style={themedBtnPrimary(palette)} disabled={chatLoading || !chatInput.trim()}>
                {chatLoading ? "Sending..." : "Send to Recall AI"}
              </button>
            </div>
          </form>
        </div>
      </section>

      <section style={panel}>
        <h2 style={{ margin: "0 0 8px", fontSize: 16, color: palette.text }}>Create Request</h2>
        <form onSubmit={submitRequest} style={{ display: "grid", gap: 8 }}>
          <input
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="Request title"
            style={{ ...input, ...themedInput(palette) }}
            required
          />
          <textarea
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Describe the request"
            style={{ ...input, ...themedInput(palette), minHeight: 84, resize: "vertical" }}
          />
          <div style={twoCol}>
            <select
              value={form.request_type}
              onChange={(e) => setForm((prev) => ({ ...prev, request_type: e.target.value }))}
              style={{ ...input, ...themedInput(palette) }}
            >
              {REQUEST_TYPES.map((type) => (
                <option key={type.key} value={type.key}>{type.name}</option>
              ))}
            </select>
            <select
              value={form.priority}
              onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))}
              style={{ ...input, ...themedInput(palette) }}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="highest">Highest</option>
            </select>
          </div>
          <input
            type="date"
            value={form.due_date}
            onChange={(e) => setForm((prev) => ({ ...prev, due_date: e.target.value }))}
            style={{ ...input, ...themedInput(palette) }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={analyzeWithAI} style={themedBtnGhost(palette)} disabled={analyzing || !form.title.trim()}>
                {analyzing ? "Analyzing..." : "Analyze with AI"}
              </button>
              <button type="button" onClick={applyAiGuidance} style={themedBtnActive(palette)} disabled={!aiGuide}>
                Apply AI Guidance
              </button>
            </div>
            <button type="submit" style={themedBtnPrimary(palette)} disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </form>
      </section>

      {(aiGuide || aiError) && (
        <section style={panel}>
          <h2 style={{ margin: "0 0 8px", fontSize: 16, color: palette.text }}>AI Support Guide</h2>
          {aiError ? (
            <p style={{ ...muted, color: palette.bad }}>{aiError}</p>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              <p style={{ margin: 0, color: palette.muted, fontSize: 13 }}>{aiGuide?.answer}</p>
              <p style={{ margin: 0, color: palette.muted, fontSize: 12 }}>
                Risk: <strong style={{ color: palette.text }}>{aiGuide?.riskStatus}</strong> | Confidence:{" "}
                <strong style={{ color: palette.text }}>{aiGuide?.confidence}%</strong> | Suggested type:{" "}
                <strong style={{ color: palette.text }}>{inferRequestType(aiGuide)}</strong> | Suggested priority:{" "}
                <strong style={{ color: palette.text }}>{inferPriority(aiGuide)}</strong>
              </p>
              {Array.isArray(aiGuide?.nextActions) && aiGuide.nextActions.length > 0 && (
                <div style={{ display: "grid", gap: 6 }}>
                  {aiGuide.nextActions.slice(0, 4).map((action, idx) => (
                    <div key={idx} style={{ border: `1px solid ${palette.border}`, borderRadius: 8, padding: 8, color: palette.text }}>
                      {(action.title || action)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      <section style={panel}>
        <h2 style={{ margin: "0 0 8px", fontSize: 16, color: palette.text }}>Queue</h2>
        {loading ? (
          <p style={{ ...muted, color: palette.muted }}>Loading queue...</p>
        ) : queue.length === 0 ? (
          <p style={{ ...muted, color: palette.muted }}>No requests found for this filter.</p>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {queue.map((item) => (
              <article key={item.id} style={{ ...queueRow, border: `1px solid ${palette.border}`, background: palette.panelAlt }}>
                <div style={{ minWidth: 0 }}>
                  <Link to={`/issues/${item.id}`} style={{ color: palette.text, fontWeight: 700, textDecoration: "none" }}>
                    {item.key} - {item.title}
                  </Link>
                  <p style={{ margin: "4px 0 0", color: palette.muted, fontSize: 12 }}>
                    {item.project} | {item.status} | {item.priority} | {item.assignee || "Unassigned"}
                  </p>
                  {item.ai_triage ? (
                    <p style={{ margin: "4px 0 0", color: palette.muted, fontSize: 11 }}>
                      AI: {item.ai_triage.risk_status} risk, {item.ai_triage.confidence}% confidence
                    </p>
                  ) : null}
                </div>
                <span style={{ color: palette.muted, fontSize: 12 }}>
                  {new Date(item.updated_at).toLocaleString()}
                </span>
              </article>
            ))}
          </div>
        )}
      </section>

      {error ? <p style={{ ...muted, color: palette.bad }}>{error}</p> : null}
    </div>
  );
}

const hero = {
  border: "none",
  borderRadius: 0,
  background: "transparent",
  padding: 0,
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 10,
  flexWrap: "wrap",
};

const panel = {
  border: "none",
  borderRadius: 0,
  background: "transparent",
  padding: 0,
};

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))",
  gap: 8,
};

const cardStyle = {
  border: "none",
  borderRadius: 0,
  background: "transparent",
  padding: 12,
};

const queueRow = {
  border: "1px solid transparent",
  borderRadius: 10,
  padding: 10,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
};

const input = {
  width: "100%",
  border: "1px solid transparent",
  borderRadius: 8,
  padding: "10px 12px",
  fontSize: 14,
  outline: "none",
};

const twoCol = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
  gap: 8,
};

const muted = {
  margin: 0,
  color: "inherit",
  fontSize: 13,
};

const themedInput = (palette) => ({
  border: `1px solid ${palette.border}`,
  background: palette.panelAlt,
  color: palette.text,
});

const themedBtnPrimary = (palette) => ({
  border: `1px solid ${palette.accent}`,
  borderRadius: 8,
  background: palette.accent,
  color: palette.buttonText,
  padding: "9px 14px",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
});

const themedBtnGhost = (palette) => ({
  border: `1px solid ${palette.border}`,
  borderRadius: 8,
  background: palette.panelAlt,
  color: palette.text,
  padding: "9px 14px",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
});

const themedBtnActive = (palette) => ({
  ...themedBtnGhost(palette),
  border: `1px solid ${palette.accent}`,
  boxShadow: `inset 0 0 0 1px ${palette.accentSoft}`,
});
