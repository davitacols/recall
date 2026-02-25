import React, { useEffect, useMemo, useState } from "react";
import { ExclamationTriangleIcon, LightBulbIcon, ChartBarIcon, DocumentMagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { aiCard, getAIPalette } from "./aiUi";

export default function AdvancedAIInsights() {
  const { darkMode } = useTheme();
  const palette = useMemo(() => getAIPalette(darkMode), [darkMode]);

  const [bottlenecks, setBottlenecks] = useState([]);
  const [gaps, setGaps] = useState([]);
  const [patterns, setPatterns] = useState([]);
  const [successRates, setSuccessRates] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const [bottlenecksRes, gapsRes, patternsRes, ratesRes] = await Promise.all([
        fetch(`${process.env.REACT_APP_API_URL}/api/knowledge/ai/bottlenecks/`, { headers }),
        fetch(`${process.env.REACT_APP_API_URL}/api/knowledge/ai/knowledge-gaps/`, { headers }),
        fetch(`${process.env.REACT_APP_API_URL}/api/knowledge/ai/patterns/`, {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ type: "decision" }),
        }),
        fetch(`${process.env.REACT_APP_API_URL}/api/knowledge/ai/success-rates/`, { headers }),
      ]);

      const [bottlenecksData, gapsData, patternsData, ratesData] = await Promise.all([
        bottlenecksRes.json(),
        gapsRes.json(),
        patternsRes.json(),
        ratesRes.json(),
      ]);

      setBottlenecks(bottlenecksData.bottlenecks || []);
      setGaps(gapsData.gaps || []);
      setPatterns(patternsData.patterns || []);
      setSuccessRates(ratesData || null);
    } catch (error) {
      console.error("Error fetching insights:", error);
    } finally {
      setLoading(false);
    }
  };

  const hasInsights = bottlenecks.length > 0 || gaps.length > 0 || patterns.length > 0;

  if (loading) {
    return <div style={{ ...aiCard(palette), padding: 12, color: palette.muted, fontSize: 12 }}>Loading AI insights...</div>;
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {successRates?.overall?.decisions?.total > 0 && (
        <section style={{ ...aiCard(palette), padding: 10 }}>
          <h3 style={h3}><ChartBarIcon style={icon} /> Success Rates</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 8 }}>
            <Metric value={`${successRates.overall.decisions.rate}%`} label="Overall" />
            {Object.entries(successRates.by_impact || {}).map(([impact, data]) => data.total > 0 ? <Metric key={impact} value={`${Math.round(data.rate)}%`} label={`${impact} impact`} /> : null)}
          </div>
        </section>
      )}

      {bottlenecks.length > 0 && (
        <section style={{ ...aiCard(palette), padding: 10 }}>
          <h3 style={h3}><ExclamationTriangleIcon style={{ ...icon, color: palette.danger }} /> Bottlenecks</h3>
          <div style={{ display: "grid", gap: 6 }}>{bottlenecks.map((b, i) => <Notice key={i} text={b.message} level={b.severity} />)}</div>
        </section>
      )}

      {gaps.length > 0 && (
        <section style={{ ...aiCard(palette), padding: 10 }}>
          <h3 style={h3}><DocumentMagnifyingGlassIcon style={{ ...icon, color: palette.warm }} /> Knowledge Gaps</h3>
          <div style={{ display: "grid", gap: 6 }}>{gaps.map((g, i) => <Notice key={i} text={g.message} level={g.severity} />)}</div>
        </section>
      )}

      {patterns.length > 0 && (
        <section style={{ ...aiCard(palette), padding: 10 }}>
          <h3 style={h3}><LightBulbIcon style={{ ...icon, color: palette.accent }} /> Patterns</h3>
          <div style={{ display: "grid", gap: 6 }}>{patterns.map((p, i) => <div key={i} style={box}><p style={pText}>{p.message}</p></div>)}</div>
        </section>
      )}

      {!hasInsights && !successRates && <div style={{ ...aiCard(palette), padding: 12, textAlign: "center", color: palette.muted, fontSize: 12 }}>No insights available yet.</div>}
    </div>
  );
}

function Metric({ value, label }) {
  return (
    <div style={box}>
      <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#f4ece0" }}>{value}</p>
      <p style={{ margin: "2px 0 0", fontSize: 11, color: "#baa892", textTransform: "capitalize" }}>{label}</p>
    </div>
  );
}

function Notice({ text, level }) {
  const tone = level === "high" ? "rgba(239,68,68,0.12)" : level === "medium" ? "rgba(245,158,11,0.12)" : "rgba(59,130,246,0.12)";
  const border = level === "high" ? "1px solid rgba(239,68,68,0.4)" : level === "medium" ? "1px solid rgba(245,158,11,0.4)" : "1px solid rgba(59,130,246,0.4)";
  return <div style={{ ...box, background: tone, border }}><p style={pText}>{text}</p></div>;
}

const h3 = { margin: "0 0 8px", fontSize: 13, color: "#f4ece0", display: "inline-flex", alignItems: "center", gap: 6 };
const icon = { width: 14, height: 14, color: "#baa892" };
const box = { borderRadius: 9, border: "1px solid rgba(120,120,120,0.3)", background: "#1f181c", padding: 8 };
const pText = { margin: 0, fontSize: 12, color: "#d9cdbf", lineHeight: 1.45 };
