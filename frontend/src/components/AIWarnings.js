import React, { useEffect, useMemo, useState } from "react";
import { ExclamationTriangleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { aiButtonSecondary, aiCard, getAIPalette } from "./aiUi";

export default function AIWarnings({ type, title, description, keywords, darkMode }) {
  const palette = useMemo(() => getAIPalette(Boolean(darkMode)), [darkMode]);
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!title && !description) return;
    checkFailures();
  }, [type, title, description, keywords]);

  const checkFailures = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/knowledge/ai/check-failures/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ type, title, description, keywords }),
      });
      const data = await res.json();
      setWarnings(data.warnings || []);
    } catch (error) {
      console.error("Error:", error);
      setWarnings([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading || warnings.length === 0 || dismissed) return null;

  return (
    <div style={{ marginBottom: 12, display: "grid", gap: 8 }}>
      {warnings.map((warning, idx) => (
        <article key={idx} style={{ ...aiCard(palette), padding: 10, border: `1px solid ${severityBorder(warning.severity)}`, background: severityBg(warning.severity) }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 8, flex: 1 }}>
              <ExclamationTriangleIcon style={{ width: 16, height: 16, color: severityText(warning.severity), marginTop: 1 }} />
              <div>
                <p style={{ margin: "0 0 4px", fontSize: 13, color: severityText(warning.severity), fontWeight: 700 }}>{warningTitle(warning.type)}</p>
                <p style={{ margin: 0, fontSize: 12, color: severityText(warning.severity) }}>{warning.message}</p>

                {warning.items?.length > 0 && (
                  <div style={{ marginTop: 6, display: "grid", gap: 5 }}>
                    {warning.items.map((item, i) => (
                      <div key={i} style={{ borderRadius: 8, border: "1px solid rgba(120,120,120,0.35)", padding: 7, fontSize: 11, color: severityText(warning.severity) }}>
                        <p style={{ margin: 0, fontWeight: 700 }}>{item.title}</p>
                        <p style={{ margin: "2px 0 0" }}>Status: {item.status} • {item.date}</p>
                        {item.reason && <p style={{ margin: "2px 0 0" }}>Reason: {item.reason}</p>}
                      </div>
                    ))}
                  </div>
                )}

                {warning.success_rate !== undefined && (
                  <p style={{ margin: "6px 0 0", fontSize: 11, color: severityText(warning.severity), fontWeight: 700 }}>
                    Success Rate: {warning.success_rate}% ({warning.total} similar decisions)
                  </p>
                )}
              </div>
            </div>

            <button onClick={() => setDismissed(true)} style={{ ...aiButtonSecondary(palette), padding: "5px 6px" }}>
              <XMarkIcon style={{ width: 13, height: 13 }} />
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

function warningTitle(type) {
  if (type === "similar_failure") return "Similar Decisions Failed";
  if (type === "rapid_iteration") return "Rapid Iteration Detected";
  if (type === "low_success_rate") return "Low Success Rate";
  return "AI Warning";
}

function severityBg(level) {
  if (level === "high") return "rgba(239,68,68,0.08)";
  if (level === "medium") return "rgba(245,158,11,0.08)";
  return "rgba(59,130,246,0.08)";
}
function severityBorder(level) {
  if (level === "high") return "rgba(239,68,68,0.45)";
  if (level === "medium") return "rgba(245,158,11,0.45)";
  return "rgba(59,130,246,0.45)";
}
function severityText(level) {
  if (level === "high") return "#fca5a5";
  if (level === "medium") return "#fcd34d";
  return "#93c5fd";
}
