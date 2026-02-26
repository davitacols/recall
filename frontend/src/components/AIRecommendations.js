import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChatBubbleLeftIcon, DocumentTextIcon, LightBulbIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { getAIPalette, aiCard } from "./aiUi";

export default function AIRecommendations({ darkMode }) {
  const palette = useMemo(() => getAIPalette(Boolean(darkMode)), [darkMode]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/knowledge/ai/recommendations/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setRecommendations(data.recommendations || []);
    } catch (error) {
      console.error("Error:", error);
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading || recommendations.length === 0) return null;

  return (
    <section style={{ ...aiCard(palette), padding: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <SparklesIcon style={{ width: 16, height: 16, color: palette.warm }} />
        <h3 style={{ margin: 0, fontSize: 14, color: palette.text }}>AI Recommendations</h3>
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        {recommendations.slice(0, 5).map((item, idx) => {
          const Icon = getIcon(item.type);
          return (
            <Link key={idx} to={getLink(item)} style={{ borderRadius: 9, border: `1px solid ${palette.border}`, background: palette.cardAlt, padding: 9, textDecoration: "none", display: "grid", gridTemplateColumns: "auto 1fr", gap: 8 }}>
              <Icon style={{ width: 14, height: 14, color: palette.muted, marginTop: 1 }} />
              <div>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: palette.text }}>{item.title}</p>
                <p style={{ margin: "3px 0 0", fontSize: 11, color: palette.muted }}>{item.reason}</p>
                {item.source_breakdown?.length > 0 && (
                  <p style={{ margin: "3px 0 0", fontSize: 10, color: palette.muted }}>
                    {item.source_breakdown
                      .slice(0, 2)
                      .map((s) => `${s.source}: ${Number(s.score).toFixed(2)}`)
                      .join(" | ")}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function getIcon(type) {
  if (type === "conversation") return ChatBubbleLeftIcon;
  if (type === "decision") return LightBulbIcon;
  return DocumentTextIcon;
}

function getLink(item) {
  if (item.type === "conversation") return `/conversations/${item.id}`;
  if (item.type === "decision") return `/decisions/${item.id}`;
  if (item.type === "meeting") return `/business/meetings/${item.id}`;
  if (item.type === "document") return `/business/documents/${item.id}`;
  if (item.type === "task") return "/business/tasks";
  if (item.type === "goal") return `/business/goals/${item.id}`;
  if (item.type === "project") return `/projects/${item.id}`;
  if (item.type === "issue") return `/issues/${item.id}`;
  return "#";
}
