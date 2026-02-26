import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { useTheme } from "../utils/ThemeAndAccessibility";
import RichTextEditor from "../components/RichTextEditor";
import api from "../services/api";
import { useToast } from "../components/Toast";

const TYPE_OPTIONS = [
  { value: "question", label: "Question", helper: "Ask for input or unblock a decision." },
  { value: "discussion", label: "Discussion", helper: "Start a broad team conversation." },
  { value: "decision", label: "Decision", helper: "Document a decision proposal clearly." },
  { value: "blocker", label: "Blocker", helper: "Escalate something that is stuck." },
];

function CreateConversation() {
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const { addToast } = useToast();
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    post_type: "discussion",
    tags: "",
  });
  const [loading, setLoading] = useState(false);
  const [isNarrow, setIsNarrow] = useState(window.innerWidth < 1024);

  const palette = useMemo(
    () =>
      darkMode
        ? {
            page: "#100d0f",
            card: "#1a1417",
            cardAlt: "#241c20",
            border: "rgba(255,205,145,0.22)",
            text: "#f8efe4",
            muted: "#cbb29a",
            line: "rgba(255,230,200,0.12)",
            accent: "#e67c34",
            accentSoft: "rgba(230,124,52,0.16)",
            cool: "#3ab8a0",
          }
        : {
            page: "#fff8ef",
            card: "#fffdf9",
            cardAlt: "#fff4e8",
            border: "#efd8bf",
            text: "#2b1e15",
            muted: "#7e644f",
            line: "#f2e4d2",
            accent: "#c95d1d",
            accentSoft: "rgba(201,93,29,0.12)",
            cool: "#0f8a75",
          },
    [darkMode]
  );

  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth < 1024);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) {
      addToast("Please fill in all required fields", "error");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        tags: formData.tags.split(",").map((t) => t.trim()).filter(Boolean),
      };
      const response = await api.post("/api/conversations/", payload);
      addToast("Conversation created successfully", "success");
      navigate(`/conversations/${response.data.id}`);
    } catch (error) {
      const errorMsg =
        error.response?.data?.error ||
        error.response?.data?.detail ||
        "Failed to create conversation";
      addToast(errorMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ ...page, background: palette.page }}>
      <section
        style={{
          ...hero,
          border: `1px solid ${palette.border}`,
          background: `linear-gradient(140deg, ${palette.accentSoft}, rgba(58,184,160,0.14))`,
        }}
      >
        <button
          onClick={() => navigate("/conversations")}
          style={{ ...backButton, color: palette.muted, border: `1px solid ${palette.line}` }}
        >
          <ArrowLeftIcon style={{ width: 15, height: 15 }} />
          Back to Conversations
        </button>
        <p style={{ ...eyebrow, color: palette.muted }}>NEW</p>
        <h1 style={{ ...heroTitle, color: palette.text }}>Start a Conversation</h1>
        <p style={{ ...heroSubtitle, color: palette.muted }}>
          Share your thoughts, ask questions, or start a discussion.
        </p>
      </section>

      <form
        onSubmit={handleSubmit}
        style={{
          ...layout,
          gridTemplateColumns: isNarrow ? "minmax(0,1fr)" : "minmax(0,1fr) minmax(260px,340px)",
        }}
      >
        <section style={{ ...mainCard, background: palette.card, border: `1px solid ${palette.border}` }}>
          <div style={sectionHead}>
            <h2 style={{ ...sectionTitle, color: palette.text }}>Conversation Setup</h2>
            <p style={{ ...sectionSubtitle, color: palette.muted }}>Type, title, and context in one flow.</p>
          </div>

          <div style={field}>
            <label style={{ ...label, color: palette.muted }}>Type</label>
            <div style={typeGrid}>
              {TYPE_OPTIONS.map((type) => {
                const selected = formData.post_type === type.value;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, post_type: type.value }))}
                    style={{
                      ...typeCard,
                      border: selected ? `1px solid ${palette.accent}` : `1px solid ${palette.line}`,
                      background: selected ? palette.accentSoft : palette.cardAlt,
                      color: palette.text,
                    }}
                  >
                    <span style={typeLabel}>{type.label}</span>
                    <span style={{ ...typeHelper, color: palette.muted }}>{type.helper}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={field}>
            <label style={{ ...label, color: palette.muted }}>Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(event) => setFormData((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="What should the team understand first?"
              style={{ ...input, background: palette.cardAlt, border: `1px solid ${palette.line}`, color: palette.text }}
            />
          </div>

          <div style={field}>
            <label style={{ ...label, color: palette.muted }}>Description *</label>
            <RichTextEditor
              value={formData.content}
              onChange={(value) => setFormData((prev) => ({ ...prev, content: value }))}
              placeholder="Add context, constraints, and what input you need."
              darkMode={darkMode}
            />
          </div>

          <div style={field}>
            <label style={{ ...label, color: palette.muted }}>Tags</label>
            <input
              type="text"
              value={formData.tags}
              onChange={(event) => setFormData((prev) => ({ ...prev, tags: event.target.value }))}
              placeholder="frontend, auth, urgent"
              style={{ ...input, background: palette.cardAlt, border: `1px solid ${palette.line}`, color: palette.text }}
            />
            <p style={{ ...helper, color: palette.muted }}>Comma-separated tags improve findability.</p>
          </div>

          <div style={actions}>
            <button
              type="button"
              onClick={() => navigate("/conversations")}
              disabled={loading}
              style={{ ...secondaryBtn, border: `1px solid ${palette.line}`, color: palette.text }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{ ...primaryBtn, background: palette.accent, opacity: loading ? 0.65 : 1 }}
            >
              {loading ? "Creating..." : "Create Conversation"}
            </button>
          </div>
        </section>

        <aside style={{ ...sideCard, background: palette.card, border: `1px solid ${palette.border}` }}>
          <h3 style={{ ...sideTitle, color: palette.text }}>Posting Checklist</h3>
          <div style={checkList}>
            <CheckItem text="Title is concrete and specific" palette={palette} />
            <CheckItem text="Description includes context and desired outcome" palette={palette} />
            <CheckItem text="Type reflects intent (question, blocker, decision)" palette={palette} />
            <CheckItem text="Tags added for future discovery" palette={palette} />
          </div>
        </aside>
      </form>
    </div>
  );
}

function CheckItem({ text, palette }) {
  return (
    <div style={checkItem}>
      <span style={{ ...dot, background: palette.cool }} />
      <span style={{ fontSize: 13, color: palette.muted }}>{text}</span>
    </div>
  );
}

const page = {
  maxWidth: 1240,
  margin: "0 auto",
  padding: "clamp(14px, 2.8vw, 26px)",
  display: "grid",
  gap: 12,
};

const hero = {
  borderRadius: 18,
  padding: "clamp(16px, 2.4vw, 24px)",
  display: "grid",
  gap: 8,
};

const backButton = {
  width: "fit-content",
  borderRadius: 999,
  background: "transparent",
  padding: "7px 11px",
  fontSize: 12,
  fontWeight: 700,
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  cursor: "pointer",
};

const eyebrow = { margin: 0, fontSize: 11, letterSpacing: "0.14em", fontWeight: 700 };
const heroTitle = { margin: 0, fontSize: "clamp(1.45rem, 3.4vw, 2.4rem)", lineHeight: 1.05, letterSpacing: "-0.02em" };
const heroSubtitle = { margin: 0, fontSize: 14, lineHeight: 1.5 };

const layout = {
  display: "grid",
  gridTemplateColumns: "minmax(0,1fr) minmax(260px,340px)",
  gap: 12,
};

const mainCard = {
  borderRadius: 16,
  padding: "clamp(14px, 2.3vw, 22px)",
  display: "grid",
  gap: 14,
};

const sideCard = {
  borderRadius: 16,
  padding: "16px 14px",
  alignSelf: "start",
};

const sectionHead = { display: "grid", gap: 4 };
const sectionTitle = { margin: 0, fontSize: 18 };
const sectionSubtitle = { margin: 0, fontSize: 13 };
const field = { display: "grid", gap: 7 };
const label = { margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" };
const helper = { margin: 0, fontSize: 12 };

const typeGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
  gap: 8,
};

const typeCard = {
  borderRadius: 12,
  padding: "11px 10px",
  textAlign: "left",
  cursor: "pointer",
  display: "grid",
  gap: 5,
};

const typeLabel = { fontSize: 13, fontWeight: 800, letterSpacing: "0.02em" };
const typeHelper = { fontSize: 11, lineHeight: 1.35 };

const input = {
  width: "100%",
  borderRadius: 10,
  padding: "12px 13px",
  fontSize: 14,
  outline: "none",
};

const actions = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 8,
  flexWrap: "wrap",
};

const secondaryBtn = {
  borderRadius: 10,
  background: "transparent",
  padding: "10px 13px",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};

const primaryBtn = {
  border: "none",
  borderRadius: 10,
  color: "#fff",
  padding: "10px 13px",
  fontSize: 13,
  fontWeight: 800,
  cursor: "pointer",
};

const sideTitle = { margin: "0 0 10px", fontSize: 13, textTransform: "uppercase", letterSpacing: "0.08em" };
const checkList = { display: "grid", gap: 8 };
const checkItem = { display: "grid", gridTemplateColumns: "10px 1fr", gap: 8, alignItems: "start" };
const dot = { width: 7, height: 7, borderRadius: 999, marginTop: 6 };

export default CreateConversation;
