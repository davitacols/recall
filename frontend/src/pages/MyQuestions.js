import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";
import BrandedTechnicalIllustration from "../components/BrandedTechnicalIllustration";
import api from "../services/api";

function MyQuestions() {
  const { user } = useAuth();
  const { darkMode } = useTheme();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  useEffect(() => {
    fetchMyQuestions();
  }, []);

  const fetchMyQuestions = async () => {
    try {
      const response = await api.get("/api/conversations/?post_type=question");
      const myQuestions = (response.data.results || response.data).filter((q) => q.author_id === user?.id);
      setQuestions(myQuestions);
    } catch (error) {
      console.error("Failed to fetch questions:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredQuestions = questions.filter((q) => {
    if (filter === "all") return true;
    if (filter === "answered") return q.reply_count > 0;
    if (filter === "unanswered") return q.reply_count === 0;
    return true;
  });

  if (loading) {
    return (
      <div style={{ ...ui.container, display: "grid", placeItems: "center", minHeight: 360 }}>
        <div style={{ width: 24, height: 24, borderRadius: "50%", border: `2px solid ${palette.border}`, borderTopColor: palette.accent }} />
      </div>
    );
  }

  const answered = questions.filter((q) => q.reply_count > 0).length;
  const unanswered = questions.filter((q) => q.reply_count === 0).length;

  return (
    <div style={{ ...ui.container, display: "grid", gap: 12, fontFamily: "'Sora', 'Space Grotesk', 'Segoe UI', sans-serif" }}>
      <section
        style={{
          border: `1px solid ${palette.border}`,
          borderRadius: 16,
          padding: "clamp(16px,2.4vw,24px)",
          background: `linear-gradient(140deg, ${palette.accentSoft}, ${darkMode ? "rgba(31,143,102,0.12)" : "rgba(187,247,208,0.42)"})`,
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) auto",
          alignItems: "end",
          gap: 12,
        }}
      >
        <div style={{ display: "grid", gap: 6 }}>
          <p style={{ margin: 0, fontSize: 11, letterSpacing: "0.12em", fontWeight: 700, color: palette.muted }}>KNOWLEDGE GAPS</p>
          <h1 style={{ margin: 0, fontSize: "clamp(1.12rem,2.1vw,1.58rem)", color: palette.text }}>My Questions</h1>
          <p style={{ margin: 0, fontSize: 13, color: palette.muted }}>Questions you have asked and their answer coverage.</p>
        </div>
        <BrandedTechnicalIllustration darkMode={darkMode} compact />
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10 }}>
        <StatCard label="Total Questions" value={questions.length} palette={palette} />
        <StatCard label="Answered" value={answered} palette={palette} tone={palette.success} />
        <StatCard label="Unanswered" value={unanswered} palette={palette} tone={palette.warn} />
      </section>

      <section style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {["all", "answered", "unanswered"].map((status) => {
          const selected = filter === status;
          return (
            <button
              key={status}
              onClick={() => setFilter(status)}
              style={{
                border: `1px solid ${selected ? palette.accent : palette.border}`,
                borderRadius: 999,
                background: selected ? palette.accentSoft : palette.cardAlt,
                color: palette.text,
                fontSize: 12,
                fontWeight: 700,
                textTransform: "capitalize",
                padding: "8px 12px",
                cursor: "pointer",
              }}
            >
              {status}
            </button>
          );
        })}
      </section>

      {filteredQuestions.length === 0 ? (
        <section style={{ textAlign: "center", padding: "40px 20px", border: `1px solid ${palette.border}`, borderRadius: 14, background: palette.card }}>
          <h3 style={{ marginTop: 0, marginBottom: 6, fontSize: 20, color: palette.text }}>No questions yet</h3>
          <p style={{ marginTop: 0, marginBottom: 14, fontSize: 14, color: palette.muted }}>
            Ask questions to get clarity from your team.
          </p>
          <a href="/conversations" style={{ ...ui.primaryButton, textDecoration: "none", display: "inline-flex" }}>
            Ask a question
          </a>
        </section>
      ) : (
        <section style={{ display: "grid", gap: 10 }}>
          {filteredQuestions.map((question) => (
            <Link
              key={question.id}
              to={`/conversations/${question.id}`}
              style={{
                border: `1px solid ${palette.border}`,
                borderRadius: 12,
                padding: 14,
                textDecoration: "none",
                background: palette.card,
                color: palette.text,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ padding: "3px 9px", borderRadius: 999, fontSize: 11, fontWeight: 700, textTransform: "uppercase", background: palette.accentSoft, color: palette.text }}>
                    Question
                  </span>
                  {question.reply_count > 0 ? (
                    <span style={{ fontSize: 12, color: palette.success, fontWeight: 700 }}>
                      {`✓ ${question.reply_count} ${question.reply_count === 1 ? "answer" : "answers"}`}
                    </span>
                  ) : (
                    <span style={{ fontSize: 12, color: palette.muted, fontWeight: 600 }}>No answers yet</span>
                  )}
                </div>
                <span style={{ fontSize: 12, color: palette.muted }}>
                  {new Date(question.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </div>
              <h3 style={{ margin: "0 0 6px", fontSize: 18, color: palette.text }}>{question.title || "Untitled question"}</h3>
              {question.ai_summary ? (
                <div style={{ background: palette.cardAlt, borderLeft: `2px solid ${palette.accent}`, padding: 10 }}>
                  <p style={{ margin: 0, fontSize: 13, color: palette.muted }}>{question.ai_summary}</p>
                </div>
              ) : null}
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value, palette, tone }) {
  return (
    <article style={{ border: `1px solid ${palette.border}`, borderRadius: 12, padding: 12, background: palette.card }}>
      <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", color: palette.muted, textTransform: "uppercase" }}>{label}</p>
      <p style={{ margin: "4px 0 0", fontSize: 28, fontWeight: 800, color: tone || palette.text }}>{value}</p>
    </article>
  );
}

export default MyQuestions;
