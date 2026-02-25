import React, { useMemo, useState } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { aiButtonSecondary, aiCard, getAIPalette } from "./aiUi";

function AISummaryPanel({ conversation, onExplainSimply, loadingExplanation, simpleExplanation }) {
  const { darkMode } = useTheme();
  const palette = useMemo(() => getAIPalette(darkMode), [darkMode]);
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!conversation.ai_summary && !conversation.ai_action_items?.length) return null;

  return (
    <section style={{ ...aiCard(palette), marginBottom: 12, overflow: "hidden", position: "sticky", top: 12 }}>
      <button onClick={() => setIsCollapsed((v) => !v)} style={{ width: "100%", border: "none", background: "transparent", padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
        <h2 style={{ margin: 0, fontSize: 16, color: palette.text }}>Summary</h2>
        {isCollapsed ? <ChevronDownIcon style={{ width: 16, height: 16, color: palette.muted }} /> : <ChevronUpIcon style={{ width: 16, height: 16, color: palette.muted }} />}
      </button>

      {!isCollapsed && (
        <div style={{ padding: 12, borderTop: `1px solid ${palette.border}` }}>
          {conversation.ai_summary && <Block title="AI Summary"><p style={p}>{conversation.ai_summary}</p></Block>}

          {conversation.post_type === "decision" && conversation.decision_outcome && (
            <Block title="Decision"><p style={p}>{conversation.decision_outcome}</p></Block>
          )}

          {conversation.ai_action_items?.length > 0 && (
            <Block title="Action Items">
              <ul style={{ margin: 0, paddingLeft: 16, color: "#d9cdbf", fontSize: 12 }}>
                {conversation.ai_action_items.map((item, idx) => <li key={idx} style={{ marginBottom: 4 }}>{item.title}</li>)}
              </ul>
            </Block>
          )}

          {conversation.confidence_level && (
            <Block title="Confidence">
              <div style={{ display: "grid", gap: 5 }}>
                <div style={{ width: "100%", height: 8, borderRadius: 999, background: "rgba(120,120,120,0.25)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${conversation.confidence_level}%`, background: "linear-gradient(90deg,#10b981,#34d399)" }} />
                </div>
                <span style={{ fontSize: 11, color: palette.muted }}>{conversation.confidence_level}%</span>
              </div>
            </Block>
          )}

          <button onClick={onExplainSimply} disabled={loadingExplanation} style={{ ...aiButtonSecondary(palette), width: "100%", justifyContent: "center" }}>
            {loadingExplanation ? "Generating..." : "Explain simply"}
          </button>

          {simpleExplanation && (
            <div style={{ marginTop: 8, borderRadius: 8, border: `1px solid ${palette.border}`, background: palette.cardAlt, padding: 8 }}>
              <p style={{ margin: "0 0 4px", fontSize: 11, color: palette.muted, fontWeight: 700 }}>Summary generated</p>
              <p style={{ margin: 0, fontSize: 12, color: "#d9cdbf", lineHeight: 1.45 }}>{simpleExplanation}</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function Block({ title, children }) {
  return (
    <section style={{ marginBottom: 8 }}>
      <p style={{ margin: "0 0 5px", fontSize: 11, color: "#baa892", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>{title}</p>
      {children}
    </section>
  );
}

const p = { margin: 0, fontSize: 12, color: "#d9cdbf", lineHeight: 1.5 };

export default AISummaryPanel;
