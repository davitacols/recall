import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette } from "../utils/projectUi";
import RichTextEditor from "../components/RichTextEditor";
import { WorkspaceHero } from "../components/WorkspaceChrome";
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

  const palette = useMemo(() => {
    const base = getProjectPalette(darkMode);
    return {
      page: base.bg,
      card: base.card,
      cardAlt: base.cardAlt,
      border: base.border,
      text: base.text,
      muted: base.muted,
      line: base.border,
      accent: base.accent,
      accentSoft: base.accentSoft,
      cool: base.success,
    };
  }, [darkMode]);

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
      <WorkspaceHero
        palette={palette}
        darkMode={darkMode}
        variant="memory"
        eyebrow="New conversation"
        title="Start a conversation"
        description="Capture the question, decision, or blocker clearly so the team can respond without extra back-and-forth."
        actions={
          <button
            onClick={() => navigate("/conversations")}
            style={{ ...backButton, color: palette.muted, border: `1px solid ${palette.line}` }}
          >
            <ArrowLeftIcon style={{ width: 15, height: 15 }} />
            Back to Conversations
          </button>
        }
        aside={
          !isNarrow ? (
            <div style={{ ...heroNote, border: `1px solid ${palette.line}`, background: palette.cardAlt }}>
              <p style={{ ...heroNoteLabel, color: palette.muted }}>Posting flow</p>
              <p style={{ ...heroNoteTitle, color: palette.text }}>Type, title, then context.</p>
              <p style={{ ...heroNoteBody, color: palette.muted }}>
                Keep the title specific, set the right thread type, and add enough background for someone to answer in one pass.
              </p>
            </div>
          ) : null
        }
      />

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
  width: "100%",
  padding: "clamp(8px, 1.4vw, 14px)",
  display: "grid",
  gap: 12,
};

const backButton = {
  width: "fit-content",
  borderRadius: 999,
  background: "transparent",
  padding: "8px 12px",
  fontSize: 12,
  fontWeight: 700,
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  cursor: "pointer",
};

const heroNote = {
  borderRadius: 14,
  padding: "12px 13px",
  display: "grid",
  gap: 4,
  alignContent: "start",
};

const heroNoteLabel = {
  margin: 0,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const heroNoteTitle = {
  margin: 0,
  fontSize: 14,
  fontWeight: 700,
  letterSpacing: "-0.02em",
};

const heroNoteBody = {
  margin: 0,
  fontSize: 12,
  lineHeight: 1.55,
};

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
  color: "var(--app-surface-alt)",
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
