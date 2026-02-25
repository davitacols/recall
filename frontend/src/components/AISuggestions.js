import React, { useEffect, useMemo, useState } from "react";
import { ClockIcon, SparklesIcon, TagIcon, UserIcon } from "@heroicons/react/24/outline";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { aiButtonSecondary, aiCard, getAIPalette } from "./aiUi";
import api from "../services/api";

export const AISuggestions = ({ title, description, projectId, onApply }) => {
  const { darkMode } = useTheme();
  const palette = useMemo(() => getAIPalette(darkMode), [darkMode]);

  const [suggestions, setSuggestions] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!(title && title.length > 10)) return;
    const timer = setTimeout(fetchSuggestions, 700);
    return () => clearTimeout(timer);
  }, [title, description, projectId]);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const response = await api.post("/api/agile/ml/analyze-issue/", { title, description, project_id: projectId });
      setSuggestions(response.data);
    } catch (error) {
      console.error("Failed to fetch AI suggestions:", error);
      setSuggestions(null);
    } finally {
      setLoading(false);
    }
  };

  if (!suggestions && !loading) return null;

  return (
    <section style={{ ...aiCard(palette), padding: 10 }}>
      <h3 style={{ margin: "0 0 8px", fontSize: 13, color: palette.text, display: "inline-flex", alignItems: "center", gap: 6 }}>
        <SparklesIcon style={{ width: 14, height: 14, color: palette.warm }} /> AI Suggestions
      </h3>

      {loading ? (
        <p style={{ margin: 0, fontSize: 12, color: palette.muted }}>Analyzing issue context...</p>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {suggestions?.suggested_assignee && (
            <Block icon={UserIcon} title="Suggested Assignee">
              <p style={p}>{suggestions.suggested_assignee.name}</p>
              <p style={sub}>{Math.round(suggestions.suggested_assignee.confidence * 100)}% match • {suggestions.suggested_assignee.reason}</p>
              <button onClick={() => onApply?.("assignee", suggestions.suggested_assignee.user_id)} style={aiButtonSecondary(palette)}>Apply</button>
            </Block>
          )}

          {suggestions?.tags?.length > 0 && (
            <Block icon={TagIcon} title="Suggested Tags">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {suggestions.tags.map((tag, i) => (
                  <button key={i} onClick={() => onApply?.("tag", tag)} style={{ border: "1px solid rgba(52,211,153,0.45)", color: "#6ee7b7", background: "rgba(52,211,153,0.12)", borderRadius: 999, padding: "3px 8px", fontSize: 11, cursor: "pointer" }}>
                    {tag}
                  </button>
                ))}
              </div>
            </Block>
          )}

          {suggestions?.estimated_points && (
            <Block icon={ClockIcon} title="Estimated Story Points">
              <p style={{ ...p, fontSize: 20, fontWeight: 800 }}>{suggestions.estimated_points}</p>
              <button onClick={() => onApply?.("points", suggestions.estimated_points)} style={aiButtonSecondary(palette)}>Apply</button>
            </Block>
          )}
        </div>
      )}
    </section>
  );
};

export const SprintPrediction = ({ sprintId }) => {
  const { darkMode } = useTheme();
  const palette = useMemo(() => getAIPalette(darkMode), [darkMode]);

  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPrediction();
  }, [sprintId]);

  const fetchPrediction = async () => {
    try {
      const response = await api.get(`/api/agile/ml/predict-sprint/${sprintId}/`);
      setPrediction(response.data);
    } catch (error) {
      console.error("Failed to fetch prediction:", error);
      setPrediction(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ ...aiCard(palette), padding: 10, fontSize: 12, color: palette.muted }}>Loading prediction...</div>;
  if (!prediction) return null;

  return (
    <section style={{ ...aiCard(palette), padding: 12 }}>
      <h3 style={{ margin: "0 0 8px", fontSize: 13, color: palette.text, display: "inline-flex", alignItems: "center", gap: 6 }}>
        <SparklesIcon style={{ width: 14, height: 14, color: palette.warm }} /> AI Sprint Prediction
      </h3>

      <p style={{ margin: 0, fontSize: 12, color: palette.muted }}>Recommendation: {prediction.recommendation}</p>
      <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div style={metric}><p style={metricValue}>{prediction.probability}%</p><p style={metricLabel}>Completion</p></div>
        <div style={metric}><p style={metricValue}>{prediction.completed}/{prediction.total}</p><p style={metricLabel}>Done</p></div>
      </div>
      <div style={{ marginTop: 8, width: "100%", height: 8, borderRadius: 999, background: "rgba(120,120,120,0.25)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${prediction.probability}%`, background: prediction.at_risk ? "#ef4444" : "#10b981" }} />
      </div>
    </section>
  );
};

function Block({ icon: Icon, title, children }) {
  return (
    <div style={{ borderRadius: 9, border: "1px solid rgba(120,120,120,0.3)", background: "#1f181c", padding: 8 }}>
      <p style={{ margin: "0 0 6px", fontSize: 12, color: "#f4ece0", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6 }}>
        <Icon style={{ width: 13, height: 13, color: "#baa892" }} /> {title}
      </p>
      {children}
    </div>
  );
}

const p = { margin: "0 0 4px", fontSize: 12, color: "#d9cdbf" };
const sub = { margin: "0 0 6px", fontSize: 11, color: "#baa892" };
const metric = { borderRadius: 8, border: "1px solid rgba(120,120,120,0.3)", background: "#1f181c", padding: 8 };
const metricValue = { margin: 0, fontSize: 18, fontWeight: 800, color: "#f4ece0" };
const metricLabel = { margin: "2px 0 0", fontSize: 11, color: "#baa892" };
