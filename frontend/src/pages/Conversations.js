import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowPathIcon,
  CalendarIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentListIcon,
  DocumentCheckIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  SparklesIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useTheme } from "../utils/ThemeAndAccessibility";
import api from "../services/api";
import { useToast } from "../components/Toast";
import { getAvatarUrl } from "../utils/avatarUtils";
import { ListSkeleton } from "../components/Skeleton";
import { NoData, NoResults } from "../components/EmptyState";

function Conversations() {
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const { addToast, confirm } = useToast();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [conversations, setConversations] = useState([]);
  const [filteredConversations, setFilteredConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [sortBy, setSortBy] = useState("recent");

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [conversations, searchQuery, filterType, sortBy]);

  const palette = useMemo(
    () =>
      darkMode
        ? {
            panel: "var(--app-surface)",
            panelAlt: "var(--app-surface-alt)",
            border: "var(--app-border)",
            text: "var(--app-text)",
            muted: "var(--app-muted)",
            accent: "#34d399",
            accentSoft: "rgba(52,211,153,0.16)",
          }
        : {
            panel: "var(--app-surface)",
            panelAlt: "var(--app-surface-alt)",
            border: "var(--app-border)",
            text: "var(--app-text)",
            muted: "var(--app-muted)",
            accent: "var(--app-accent)",
            accentSoft: "rgba(59,130,246,0.1)",
          },
    [darkMode]
  );

  const typeCounts = useMemo(() => {
    const counts = { all: conversations.length };
    conversations.forEach((item) => {
      const key = item.post_type || "discussion";
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [conversations]);

  const thisWeekCount = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return conversations.filter((conversation) => new Date(conversation.created_at) > weekAgo).length;
  }, [conversations]);

  const averageReplies = conversations.length
    ? Math.round(
        conversations.reduce((total, conversation) => total + (conversation.reply_count || 0), 0) /
          conversations.length
      )
    : 0;

  const linkedFeatures = [
    { label: "Knowledge Search", to: "/knowledge", icon: MagnifyingGlassIcon, helper: "Find prior context before posting" },
    { label: "Decision Hub", to: "/decisions", icon: DocumentCheckIcon, helper: "Convert threads into clear decisions" },
    { label: "Task Board", to: "/business/tasks", icon: ClipboardDocumentListIcon, helper: "Push outcomes into execution" },
    { label: "Meetings", to: "/business/meetings", icon: CalendarIcon, helper: "Attach discussion to meeting cadence" },
    { label: "Drafts", to: "/drafts", icon: ChatBubbleLeftRightIcon, helper: "Resume unfinished discussions" },
  ];

  const loadConversations = async () => {
    try {
      const response = await api.get("/api/conversations/");
      const allConversations = response.data.results || response.data || [];
      const validConversations = Array.isArray(allConversations)
        ? allConversations.filter((conversation) => conversation && conversation.id)
        : [];
      setConversations(validConversations);
    } catch (error) {
      console.error("Failed to load conversations:", error);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const deleteConversation = async (id, event) => {
    event.stopPropagation();
    confirm("Delete this conversation?", async () => {
      try {
        await api.delete(`/api/conversations/${id}/`);
        setConversations(conversations.filter((conversation) => conversation.id !== id));
        addToast("Conversation deleted", "success");
      } catch (error) {
        addToast("Failed to delete conversation", "error");
      }
    });
  };

  const applyFiltersAndSort = () => {
    let result = [...conversations];
    if (searchQuery) {
      result = result.filter(
        (conversation) =>
          (conversation.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (conversation.content || "").toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (filterType !== "all") {
      result = result.filter((conversation) => conversation.post_type === filterType);
    }
    if (sortBy === "recent") {
      result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sortBy === "replies") {
      result.sort((a, b) => (b.reply_count || 0) - (a.reply_count || 0));
    } else if (sortBy === "views") {
      result.sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
    }
    setFilteredConversations(result);
  };

  if (loading) return <ListSkeleton count={6} />;

  return (
    <div style={page}>
      <section
        className="ui-enter"
        style={{
          ...hero,
          border: `1px solid ${palette.border}`,
          background: `linear-gradient(150deg, ${palette.accentSoft}, ${palette.panelAlt})`,
        }}
      >
        <div>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", color: palette.muted }}>
            CONVERSATION OPERATIONS
          </p>
          <h1 style={{ margin: "7px 0 8px", color: palette.text, fontSize: "clamp(1.2rem,2vw,1.75rem)" }}>
            Discussion Control Center
          </h1>
          <p style={{ margin: 0, color: palette.muted, fontSize: 14, lineHeight: 1.5 }}>
            Redefined flow for capturing discussions, linking features, and pushing context into decisions and execution.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: isMobile ? "start" : "end" }}>
          <button className="ui-btn-polish ui-focus-ring" onClick={loadConversations} style={secondaryAction}>
            <ArrowPathIcon style={icon14} />
            Refresh
          </button>
          <button className="ui-btn-polish ui-focus-ring" onClick={() => navigate("/conversations/new")} style={primaryAction}>
            <PlusIcon style={icon14} />
            New Conversation
          </button>
        </div>
      </section>

      <section className="ui-enter" style={{ ...featureRail, gridTemplateColumns: isMobile ? "1fr" : featureRail.gridTemplateColumns }}>
        {linkedFeatures.map((feature) => {
          const Icon = feature.icon;
          return (
            <Link
              key={feature.label}
              to={feature.to}
              className="ui-card-lift ui-smooth"
              style={{
                ...featureCard,
                border: `1px solid ${palette.border}`,
                background: palette.panel,
              }}
            >
              <span style={{ ...featureIconWrap, background: palette.panelAlt }}>
                <Icon style={icon16} />
              </span>
              <div>
                <p style={{ margin: 0, color: palette.text, fontSize: 13, fontWeight: 700 }}>{feature.label}</p>
                <p style={{ margin: "4px 0 0", color: palette.muted, fontSize: 12 }}>{feature.helper}</p>
              </div>
            </Link>
          );
        })}
      </section>

      <section className="ui-enter" style={{ ...statsGrid, gridTemplateColumns: isMobile ? "repeat(2,minmax(0,1fr))" : statsGrid.gridTemplateColumns }}>
        <StatCard label="Total Threads" value={conversations.length} palette={palette} />
        <StatCard label="This Week" value={thisWeekCount} palette={palette} />
        <StatCard label="Avg Replies" value={averageReplies} palette={palette} />
        <StatCard label="Visible" value={filteredConversations.length} palette={palette} />
      </section>

      <section className="ui-enter" style={{ ...filterShell, border: `1px solid ${palette.border}`, background: palette.panel }}>
        <div style={{ ...searchWrap, border: `1px solid ${palette.border}`, background: palette.panelAlt }}>
          <MagnifyingGlassIcon style={{ ...icon16, color: palette.muted }} />
          <input
            type="text"
            placeholder="Search conversations"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            style={{ ...searchInput, color: palette.text }}
          />
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["all", "question", "discussion", "decision", "blocker"].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setFilterType(type)}
              className="ui-btn-polish ui-focus-ring"
              style={{
                ...typeChip,
                border: `1px solid ${palette.border}`,
                color: filterType === type ? palette.text : palette.muted,
                background: filterType === type ? palette.panelAlt : "transparent",
              }}
            >
              {type} ({typeCounts[type] || 0})
            </button>
          ))}
        </div>
        <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} style={{ ...sortSelect, border: `1px solid ${palette.border}`, color: palette.text, background: palette.panelAlt }}>
          <option value="recent">Sort: Most Recent</option>
          <option value="replies">Sort: Most Replies</option>
          <option value="views">Sort: Most Views</option>
        </select>
      </section>

      {filteredConversations.length === 0 ? (
        searchQuery ? (
          <NoResults searchTerm={searchQuery} onClear={() => setSearchQuery("")} />
        ) : (
          <NoData type="conversations" onCreate={() => navigate("/conversations/new")} />
        )
      ) : (
        <section className="ui-enter" style={listWrap}>
          {filteredConversations.map((conversation) => (
            <article
              key={conversation.id}
              className="ui-card-lift ui-smooth"
              onClick={() => navigate(`/conversations/${conversation.id}`)}
              style={{ ...conversationCard, gridTemplateColumns: isMobile ? "1fr" : conversationCard.gridTemplateColumns, border: `1px solid ${palette.border}`, background: palette.panel }}
            >
              <div>
                <div style={cardTopRow}>
                  <span style={{ ...typeBadge, border: `1px solid ${palette.border}`, color: palette.text }}>
                    {conversation.post_type || "discussion"}
                  </span>
                  {conversation.is_closed ? <span style={{ ...typeBadge, border: `1px solid ${palette.border}`, color: palette.muted }}>Closed</span> : null}
                </div>
                <h3 style={{ margin: "8px 0 6px", color: palette.text, fontSize: 16 }}>
                  {conversation.title || conversation.question || "Untitled"}
                </h3>
                <p style={{ margin: 0, color: palette.muted, fontSize: 13, lineHeight: 1.45, display: "-webkit-box", overflow: "hidden", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                  {conversation.content || conversation.description || "No description"}
                </p>
                <div style={{ ...metaRow, color: palette.muted }}>
                  <span>{new Date(conversation.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                  <span>{conversation.reply_count || 0} replies</span>
                  <span>{conversation.view_count || 0} views</span>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      navigate(`/decisions/new?conversation_id=${conversation.id}`);
                    }}
                    className="ui-btn-polish ui-focus-ring"
                    style={linkFeatureButton}
                  >
                    <DocumentCheckIcon style={icon14} />
                    Link Decision
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      navigate(`/business/tasks?conversation_id=${conversation.id}`);
                    }}
                    className="ui-btn-polish ui-focus-ring"
                    style={linkFeatureButton}
                  >
                    <ClipboardDocumentListIcon style={icon14} />
                    Link Task
                  </button>
                </div>
              </div>

              <div style={{ ...sideRail, flexDirection: isMobile ? "row" : "column" }}>
                <div style={authorAvatarWrap}>
                  {(() => {
                    const avatarUrl = getAvatarUrl(conversation.author_avatar || conversation.author?.avatar);
                    const initial = (conversation.author || conversation.author_name || "U").charAt(0).toUpperCase();
                    return avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={conversation.author || "Author"}
                        style={authorAvatarImage}
                        onError={(event) => {
                          event.target.style.display = "none";
                          event.target.parentElement.innerHTML = `<span style="color:var(--app-button-text);font-size:13px;font-weight:700;">${initial}</span>`;
                        }}
                      />
                    ) : (
                      <span style={avatarInitial}>{initial}</span>
                    );
                  })()}
                </div>
                <p style={{ margin: 0, fontSize: 11, color: palette.muted, maxWidth: 88, textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {conversation.author || conversation.author_name || "Unknown"}
                </p>
                <button className="ui-btn-polish ui-focus-ring" onClick={(event) => deleteConversation(conversation.id, event)} style={deleteButton}>
                  <TrashIcon style={icon14} />
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value, palette }) {
  return (
    <article style={{ ...statCard, border: `1px solid ${palette.border}`, background: palette.panel }}>
      <p style={{ margin: 0, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.07em", color: palette.muted }}>{label}</p>
      <p style={{ margin: "6px 0 0", fontSize: 26, fontWeight: 800, color: palette.text }}>{value}</p>
    </article>
  );
}

const page = {
  width: "100%",
  display: "grid",
  gap: 12,
};

const hero = {
  borderRadius: 16,
  padding: "clamp(16px,2.8vw,24px)",
  display: "grid",
  gap: 10,
};

const primaryAction = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  border: "none",
  borderRadius: 10,
  padding: "10px 13px",
  background: "var(--app-gradient-primary)",
  color: "var(--app-button-text)",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryAction = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  borderRadius: 10,
  border: "1px solid var(--app-border)",
  padding: "10px 13px",
  background: "transparent",
  color: "var(--app-text)",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};

const featureRail = {
  display: "grid",
  gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
  gap: 8,
};

const featureCard = {
  borderRadius: 12,
  textDecoration: "none",
  padding: 10,
  display: "grid",
  gridTemplateColumns: "auto minmax(0, 1fr)",
  gap: 8,
  alignItems: "start",
};

const featureIconWrap = {
  width: 28,
  height: 28,
  borderRadius: 8,
  display: "grid",
  placeItems: "center",
  color: "var(--app-text)",
};

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 8,
};

const statCard = {
  borderRadius: 12,
  padding: "11px 12px",
};

const filterShell = {
  borderRadius: 12,
  padding: 10,
  display: "grid",
  gap: 10,
};

const searchWrap = {
  borderRadius: 10,
  padding: "8px 10px",
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const searchInput = {
  border: "none",
  background: "transparent",
  width: "100%",
  fontSize: 13,
  outline: "none",
};

const typeChip = {
  borderRadius: 999,
  padding: "6px 10px",
  fontSize: 12,
  fontWeight: 700,
  textTransform: "capitalize",
  cursor: "pointer",
};

const sortSelect = {
  borderRadius: 10,
  padding: "9px 10px",
  fontSize: 13,
  outline: "none",
  width: "fit-content",
};

const listWrap = {
  display: "grid",
  gap: 8,
};

const conversationCard = {
  borderRadius: 12,
  padding: 12,
  display: "grid",
  gridTemplateColumns: "minmax(0,1fr) auto",
  gap: 12,
  cursor: "pointer",
};

const cardTopRow = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  flexWrap: "wrap",
};

const typeBadge = {
  borderRadius: 999,
  padding: "3px 8px",
  fontSize: 11,
  fontWeight: 700,
  textTransform: "capitalize",
};

const metaRow = {
  marginTop: 10,
  display: "flex",
  gap: 14,
  fontSize: 12,
  flexWrap: "wrap",
};

const linkFeatureButton = {
  borderRadius: 9,
  border: "1px solid var(--app-border)",
  padding: "6px 9px",
  fontSize: 12,
  fontWeight: 700,
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  background: "transparent",
  color: "var(--app-text)",
  cursor: "pointer",
};

const sideRail = {
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const authorAvatarWrap = {
  width: 36,
  height: 36,
  borderRadius: 10,
  overflow: "hidden",
  background: "var(--app-gradient-accent)",
  display: "grid",
  placeItems: "center",
};

const authorAvatarImage = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
};

const avatarInitial = {
  color: "var(--app-button-text)",
  fontSize: 13,
  fontWeight: 700,
};

const deleteButton = {
  width: 28,
  height: 28,
  borderRadius: 8,
  border: "1px solid var(--app-danger-border)",
  background: "transparent",
  color: "var(--app-danger)",
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
};

const icon16 = { width: 16, height: 16 };
const icon14 = { width: 14, height: 14 };

export default Conversations;
