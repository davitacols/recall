import React, { useEffect, useMemo, useRef, useState } from "react";
import { SparklesIcon, PaperAirplaneIcon, XMarkIcon, LightBulbIcon } from "@heroicons/react/24/outline";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { aiButtonPrimary, aiButtonSecondary, aiCard, aiInput, getAIPalette } from "./aiUi";
import api from "../services/api";

export const AIAssistant = () => {
  const { darkMode } = useTheme();
  const palette = useMemo(() => getAIPalette(darkMode), [darkMode]);

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const suggestions = [
    "What issues are blocking our sprint?",
    "Summarize recent decisions",
    "Show me high priority bugs",
    "Create a retrospective report",
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await api.post("/api/agile/ai/chat/", { message: input });
      setMessages((prev) => [...prev, { role: "assistant", content: response.data.response, actions: response.data.actions }]);
    } catch (error) {
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button onClick={() => setIsOpen((v) => !v)} style={{ position: "fixed", bottom: 20, right: 20, width: 52, height: 52, borderRadius: 999, border: "none", background: "linear-gradient(135deg,#ffd390,#ff9f62)", color: "#20140f", display: "grid", placeItems: "center", cursor: "pointer", zIndex: 9999 }}>
        {isOpen ? <XMarkIcon style={{ width: 20, height: 20 }} /> : <SparklesIcon style={{ width: 20, height: 20 }} />}
      </button>

      {isOpen && (
        <div style={{ ...aiCard(palette), position: "fixed", right: 20, bottom: 82, width: 360, height: 500, display: "grid", gridTemplateRows: "auto 1fr auto", zIndex: 9999 }}>
          <header style={{ padding: 10, borderBottom: `1px solid ${palette.border}`, display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ width: 28, height: 28, borderRadius: 999, background: "linear-gradient(135deg,#ffd390,#ff9f62)", display: "grid", placeItems: "center" }}><SparklesIcon style={{ width: 14, height: 14, color: "#20140f" }} /></div>
            <div>
              <p style={{ margin: 0, fontSize: 13, color: palette.text, fontWeight: 700 }}>AI Assistant</p>
              <p style={{ margin: 0, fontSize: 11, color: palette.muted }}>Chat and quick actions</p>
            </div>
          </header>

          <div style={{ overflowY: "auto", padding: 10, display: "grid", gap: 8 }}>
            {messages.length === 0 && (
              <div style={{ textAlign: "center", padding: "14px 6px" }}>
                <LightBulbIcon style={{ width: 26, height: 26, color: palette.muted, margin: "0 auto 8px" }} />
                <p style={{ margin: "0 0 8px", fontSize: 12, color: palette.muted }}>Try asking:</p>
                <div style={{ display: "grid", gap: 6 }}>
                  {suggestions.map((s, i) => (
                    <button key={i} onClick={() => setInput(s)} style={{ ...aiButtonSecondary(palette), justifyContent: "flex-start", fontSize: 11 }}>{s}</button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{ maxWidth: "84%", borderRadius: 12, padding: "8px 10px", background: msg.role === "user" ? "linear-gradient(135deg,#ffd390,#ff9f62)" : palette.cardAlt, color: msg.role === "user" ? "#20140f" : palette.text, fontSize: 12 }}>
                  <p style={{ margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.4 }}>{msg.content}</p>
                  {msg.actions?.length > 0 && (
                    <div style={{ display: "grid", gap: 5, marginTop: 6 }}>
                      {msg.actions.map((a, j) => (
                        <button key={j} onClick={() => (window.location.href = a.url)} style={{ ...aiButtonSecondary(palette), justifyContent: "flex-start", fontSize: 11 }}>{a.label}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && <p style={{ margin: 0, fontSize: 12, color: palette.muted }}>AI is thinking...</p>}
            <div ref={messagesEndRef} />
          </div>

          <footer style={{ padding: 10, borderTop: `1px solid ${palette.border}`, display: "grid", gridTemplateColumns: "1fr auto", gap: 6 }}>
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} placeholder="Ask me anything..." style={aiInput(palette)} />
            <button onClick={handleSend} disabled={!input.trim() || loading} style={{ ...aiButtonPrimary(), padding: "8px 10px", opacity: !input.trim() || loading ? 0.6 : 1 }}>
              <PaperAirplaneIcon style={{ width: 14, height: 14 }} />
            </button>
          </footer>
        </div>
      )}
    </>
  );
};

export const SmartSuggestions = ({ context, onApply }) => {
  const { darkMode } = useTheme();
  const palette = useMemo(() => getAIPalette(darkMode), [darkMode]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSuggestions();
  }, [context]);

  const loadSuggestions = async () => {
    try {
      const response = await api.post("/api/agile/ai/suggestions/", { context });
      setSuggestions(response.data.suggestions || []);
    } catch (error) {
      console.error("Failed to load suggestions:", error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading || suggestions.length === 0) return null;

  return (
    <section style={{ ...aiCard(palette), padding: 10 }}>
      <h4 style={{ margin: "0 0 8px", fontSize: 13, color: palette.text, display: "inline-flex", alignItems: "center", gap: 6 }}><SparklesIcon style={{ width: 14, height: 14, color: palette.warm }} /> AI Suggestions</h4>
      <div style={{ display: "grid", gap: 6 }}>
        {suggestions.map((suggestion, i) => (
          <div key={i} style={{ borderRadius: 8, border: `1px solid ${palette.border}`, padding: 8, display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "start" }}>
            <div>
              <p style={{ margin: 0, fontSize: 12, color: palette.text, fontWeight: 700 }}>{suggestion.title}</p>
              <p style={{ margin: "3px 0 0", fontSize: 11, color: palette.muted }}>{suggestion.reason}</p>
            </div>
            <button onClick={() => onApply?.(suggestion)} style={aiButtonSecondary(palette)}>Apply</button>
          </div>
        ))}
      </div>
    </section>
  );
};

export const AutoCategorize = ({ text, onCategorize }) => {
  const { darkMode } = useTheme();
  const palette = useMemo(() => getAIPalette(darkMode), [darkMode]);
  const [categories, setCategories] = useState(null);

  useEffect(() => {
    if (!(text && text.length > 20)) return;
    const timer = setTimeout(categorize, 800);
    return () => clearTimeout(timer);
  }, [text]);

  const categorize = async () => {
    try {
      const response = await api.post("/api/agile/ai/categorize/", { text });
      setCategories(response.data);
      onCategorize?.(response.data);
    } catch (error) {
      console.error("Failed to categorize:", error);
      setCategories(null);
    }
  };

  if (!categories) return null;

  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", fontSize: 11, color: palette.muted }}>
      <SparklesIcon style={{ width: 13, height: 13, color: palette.warm }} />
      <span>AI detected:</span>
      {categories.priority && <span style={pill}>{categories.priority} priority</span>}
      {categories.type && <span style={pill}>{categories.type}</span>}
      {categories.labels?.map((label, i) => <span key={i} style={pill}>{label}</span>)}
    </div>
  );
};

const pill = { border: "1px solid rgba(120,120,120,0.35)", borderRadius: 999, padding: "2px 7px", color: "#d9cdbf" };
