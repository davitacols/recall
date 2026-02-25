import React, { useMemo, useState } from "react";
import { SparklesIcon } from "@heroicons/react/24/outline";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { aiButtonPrimary, aiButtonSecondary, aiCard, aiInput, getAIPalette } from "./aiUi";

export default function AIAssistant({ content, contentType = "conversation", onApply }) {
  const { darkMode } = useTheme();
  const palette = useMemo(() => getAIPalette(darkMode), [darkMode]);

  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [actionItems, setActionItems] = useState([]);
  const [tags, setTags] = useState([]);
  const [showPanel, setShowPanel] = useState(false);

  if (!content) return null;

  const postAI = async (path, body) => {
    const token = localStorage.getItem("token");
    const res = await fetch(`${process.env.REACT_APP_API_URL}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    return res.json();
  };

  const runAll = async () => {
    setLoading(true);
    try {
      const [summaryData, suggestionsData, actionData, tagData] = await Promise.all([
        postAI("/api/organizations/ai/summary/", { content, content_type: contentType }).catch(() => ({})),
        postAI("/api/organizations/ai/suggestions/", { content, content_type: contentType }).catch(() => ({})),
        postAI("/api/organizations/ai/actions/", { content }).catch(() => ({})),
        postAI("/api/organizations/ai/tags/", { content }).catch(() => ({})),
      ]);

      setSummary(summaryData.summary || "");
      setSuggestions(suggestionsData.suggestions || []);
      setActionItems(actionData.action_items || []);
      setTags(tagData.tags || []);
      setShowPanel(true);

      if (onApply) {
        onApply({ summary: summaryData.summary, suggestions: suggestionsData.suggestions, actionItems: actionData.action_items, tags: tagData.tags });
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginBottom: 12 }}>
      <button onClick={runAll} disabled={loading} style={{ ...aiButtonPrimary(), opacity: loading ? 0.7 : 1 }}>
        <SparklesIcon style={{ width: 14, height: 14 }} /> {loading ? "Analyzing..." : "AI Insights"}
      </button>

      {showPanel && (
        <section style={{ ...aiCard(palette), marginTop: 10, overflow: "hidden" }}>
          {summary && <Section title="Summary" palette={palette}><p style={p}>{summary}</p></Section>}

          {suggestions.length > 0 && (
            <Section title="Related Topics" palette={palette}>
              <ul style={list}>
                {suggestions.map((item, i) => (
                  <li key={i} style={li}><span style={dot}>•</span><span>{item}</span></li>
                ))}
              </ul>
            </Section>
          )}

          {actionItems.length > 0 && (
            <Section title="Action Items" palette={palette}>
              <ul style={list}>
                {actionItems.map((item, i) => (
                  <li key={i} style={li}><span style={dot}>•</span><span>{item}</span></li>
                ))}
              </ul>
            </Section>
          )}

          {tags.length > 0 && (
            <Section title="Suggested Tags" palette={palette} noBorder>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {tags.map((tag, i) => (
                  <span key={i} style={{ border: `1px solid ${palette.border}`, borderRadius: 999, padding: "3px 8px", fontSize: 11, color: palette.muted }}>
                    #{tag}
                  </span>
                ))}
              </div>
            </Section>
          )}

          <div style={{ padding: 10, borderTop: `1px solid ${palette.border}` }}>
            <button onClick={() => setShowPanel(false)} style={aiButtonSecondary(palette)}>Close</button>
          </div>
        </section>
      )}
    </div>
  );
}

function Section({ title, children, palette, noBorder = false }) {
  return (
    <div style={{ padding: 10, borderBottom: noBorder ? "none" : `1px solid ${palette.border}` }}>
      <h3 style={{ margin: "0 0 8px", fontSize: 11, color: palette.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>{title}</h3>
      {children}
    </div>
  );
}

const p = { margin: 0, fontSize: 13, color: "#d9cdbf", lineHeight: 1.5 };
const list = { margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 6 };
const li = { display: "grid", gridTemplateColumns: "10px 1fr", gap: 6, fontSize: 12, color: "#d9cdbf" };
const dot = { color: "#baa892" };
