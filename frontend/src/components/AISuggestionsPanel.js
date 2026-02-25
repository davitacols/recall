import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ExclamationTriangleIcon, LightBulbIcon } from "@heroicons/react/24/outline";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { aiCard, getAIPalette } from "./aiUi";
import api from "../services/api";

function AISuggestionsPanel({ decisionId, conversationId }) {
  const { darkMode } = useTheme();
  const palette = useMemo(() => getAIPalette(darkMode), [darkMode]);

  const [suggestions, setSuggestions] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSuggestions();
  }, [decisionId, conversationId]);

  const fetchSuggestions = async () => {
    try {
      const endpoint = decisionId ? `/api/decisions/${decisionId}/suggestions/` : `/api/conversations/${conversationId}/decision-suggestions/`;
      const response = await api.get(endpoint);
      setSuggestions(response.data);
    } catch (error) {
      console.error("Failed to fetch suggestions:", error);
      setSuggestions(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;
  if (!suggestions || (suggestions.similar?.length === 0 && suggestions.conflicts?.length === 0)) return null;

  return (
    <section style={{ ...aiCard(palette), marginBottom: 12, overflow: "hidden" }}>
      <header style={{ padding: 12, borderBottom: `1px solid ${palette.border}` }}>
        <h3 style={{ margin: 0, fontSize: 14, color: palette.text, display: "inline-flex", alignItems: "center", gap: 6 }}>
          <LightBulbIcon style={{ width: 15, height: 15, color: palette.warm }} /> AI Suggestions
        </h3>
      </header>

      <div style={{ padding: 12, display: "grid", gap: 10 }}>
        {suggestions.similar?.length > 0 && (
          <div>
            <h4 style={{ margin: "0 0 6px", fontSize: 12, color: palette.text }}>Similar decisions exist</h4>
            <div style={{ display: "grid", gap: 6 }}>
              {suggestions.similar.map((similar) => (
                <Link key={similar.id} to={`/decisions/${similar.id}`} style={{ textDecoration: "none", borderRadius: 9, border: `1px solid ${palette.border}`, background: palette.cardAlt, padding: 9 }}>
                  <p style={{ margin: 0, fontSize: 12, color: palette.text, fontWeight: 700 }}>{similar.title}</p>
                  <p style={{ margin: "3px 0 0", fontSize: 11, color: palette.muted }}>{Math.round((similar.similarity_score || 0) * 100)}% match • {similar.similarity_reason}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {suggestions.conflicts?.length > 0 && (
          <div>
            <h4 style={{ margin: "0 0 6px", fontSize: 12, color: palette.danger, display: "inline-flex", alignItems: "center", gap: 6 }}>
              <ExclamationTriangleIcon style={{ width: 14, height: 14 }} /> Potential conflicts
            </h4>
            <div style={{ display: "grid", gap: 6 }}>
              {suggestions.conflicts.map((conflict) => (
                <Link key={conflict.id} to={`/decisions/${conflict.id}`} style={{ textDecoration: "none", borderRadius: 9, border: "1px solid rgba(239,68,68,0.4)", background: "rgba(239,68,68,0.08)", padding: 9 }}>
                  <p style={{ margin: 0, fontSize: 12, color: "#fca5a5", fontWeight: 700 }}>{conflict.title}</p>
                  <p style={{ margin: "3px 0 0", fontSize: 11, color: "#fca5a5" }}>{conflict.conflict_reason}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default AISuggestionsPanel;
