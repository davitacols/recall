import React, { useMemo, useState } from "react";
import { SparklesIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { aiButtonPrimary, aiButtonSecondary, aiCard, getAIPalette } from "./aiUi";

export default function AISummaryButton({ content, darkMode }) {
  const palette = useMemo(() => getAIPalette(Boolean(darkMode)), [darkMode]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  const generateSummary = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/knowledge/ai/summarize-v2/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content, type: "text" }),
      });
      const data = await res.json();
      setSummary(data);
      setShow(true);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button onClick={generateSummary} disabled={loading} style={{ ...aiButtonPrimary(), opacity: loading ? 0.7 : 1 }}>
        <SparklesIcon style={{ width: 14, height: 14 }} /> {loading ? "Generating..." : "AI Summary"}
      </button>

      {show && summary && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "grid", placeItems: "center", zIndex: 120, padding: 16 }} onClick={() => setShow(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...aiCard(palette), width: "min(640px,100%)", maxHeight: "80vh", overflow: "auto", padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <h3 style={{ margin: 0, fontSize: 16, color: palette.text, display: "inline-flex", alignItems: "center", gap: 6 }}><SparklesIcon style={{ width: 16, height: 16, color: palette.warm }} /> AI Summary</h3>
              <button onClick={() => setShow(false)} style={{ ...aiButtonSecondary(palette), padding: "6px 8px" }}><XMarkIcon style={{ width: 13, height: 13 }} /></button>
            </div>

            <Block title="Summary"><p style={p}>{summary.summary}</p></Block>

            {summary.key_points?.length > 0 && (
              <Block title="Key Points">
                <ul style={{ margin: 0, paddingLeft: 18, color: "#d9cdbf", fontSize: 12 }}>
                  {summary.key_points.map((point, idx) => <li key={idx} style={{ marginBottom: 4 }}>{point}</li>)}
                </ul>
              </Block>
            )}

            <p style={{ margin: "10px 0 0", fontSize: 11, color: palette.muted }}>{summary.word_count || 0} words • {summary.reading_time || 0} min read</p>
          </div>
        </div>
      )}
    </>
  );
}

function Block({ title, children }) {
  return (
    <section style={{ borderRadius: 9, border: "1px solid rgba(120,120,120,0.3)", background: "#1f181c", padding: 8, marginBottom: 8 }}>
      <p style={{ margin: "0 0 6px", fontSize: 11, color: "#baa892", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>{title}</p>
      {children}
    </section>
  );
}

const p = { margin: 0, fontSize: 13, color: "#d9cdbf", lineHeight: 1.5 };
