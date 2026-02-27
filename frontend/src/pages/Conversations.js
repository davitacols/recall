import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MagnifyingGlassIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
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
            panel: "#171215",
            panelAlt: "#1f181c",
            border: "rgba(255,225,193,0.14)",
            text: "#f4ece0",
            muted: "#baa892",
            accent: "#ffaf72",
          }
        : {
            panel: "#fffaf3",
            panelAlt: "#ffffff",
            border: "#eadfce",
            text: "#231814",
            muted: "#7d6d5a",
            accent: "#d9692e",
          },
    [darkMode]
  );

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

  if (loading) {
    return <ListSkeleton count={5} />;
  }

  const thisWeekCount = conversations.filter((conversation) => {
    const date = new Date(conversation.created_at);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return date > weekAgo;
  }).length;

  const averageReplies = conversations.length
    ? Math.round(
        conversations.reduce(
          (total, conversation) => total + (conversation.reply_count || 0),
          0
        ) / conversations.length
      )
    : 0;

  return (
    <div style={page}>
      <section
        style={{
          ...hero,
          border: `1px solid ${palette.border}`,
          background: `linear-gradient(150deg, ${
            darkMode ? "rgba(255,167,97,0.18)" : "rgba(255,196,146,0.45)"
          }, ${darkMode ? "rgba(74,194,171,0.15)" : "rgba(150,240,220,0.42)"})`,
        }}
      >
        <div>
          <p style={{ ...eyebrow, color: palette.muted }}>COLLABORATION THREADS</p>
          <h1 style={{ ...title, color: palette.text }}>Conversations</h1>
          <p style={{ ...subtitle, color: palette.muted }}>
            Capture questions, updates, blockers, and decisions with full context.
          </p>
        </div>
        <button
          onClick={() => navigate("/conversations/new")}
          style={newConversationButton}
        >
          <PlusIcon style={icon16} />
          New Conversation
        </button>
      </section>

      <section style={{ ...filterBar, gridTemplateColumns: isMobile ? "minmax(0, 1fr)" : filterBar.gridTemplateColumns }}>
        <div style={searchWrap}>
          <MagnifyingGlassIcon style={{ ...icon16, color: palette.muted }} />
          <input
            type="text"
            placeholder="Search conversations"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            style={{ ...searchInput, background: palette.panel, border: `1px solid ${palette.border}`, color: palette.text }}
          />
        </div>

        <select
          value={filterType}
          onChange={(event) => setFilterType(event.target.value)}
          style={{ ...selectInput, width: isMobile ? "100%" : "auto", background: palette.panel, border: `1px solid ${palette.border}`, color: palette.text }}
        >
          <option value="all">All Types</option>
          <option value="question">Questions</option>
          <option value="discussion">Discussions</option>
          <option value="decision">Decisions</option>
          <option value="blocker">Blockers</option>
        </select>

        <select
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value)}
          style={{ ...selectInput, width: isMobile ? "100%" : "auto", background: palette.panel, border: `1px solid ${palette.border}`, color: palette.text }}
        >
          <option value="recent">Most Recent</option>
          <option value="replies">Most Replies</option>
          <option value="views">Most Views</option>
        </select>
      </section>

      {conversations.length > 0 && (
        <section style={statsGrid}>
          <StatCard label="Total" value={conversations.length} palette={palette} />
          <StatCard label="This Week" value={thisWeekCount} palette={palette} />
          <StatCard label="Avg Replies" value={averageReplies} palette={palette} />
        </section>
      )}

      {filteredConversations.length === 0 ? (
        searchQuery ? (
          <NoResults searchTerm={searchQuery} onClear={() => setSearchQuery("")} />
        ) : (
          <NoData type="conversations" onCreate={() => navigate("/conversations/new")} />
        )
      ) : (
        <section style={listWrap}>
          {filteredConversations.map((conversation) => (
            <article
              key={conversation.id}
              onClick={() => navigate(`/conversations/${conversation.id}`)}
              style={{ ...listCard, gridTemplateColumns: isMobile ? "minmax(0, 1fr)" : listCard.gridTemplateColumns, background: palette.panelAlt, border: `1px solid ${palette.border}` }}
            >
              <div style={cardMain}>
                <div style={tagRow}>
                  <span style={{ ...typeTag, border: `1px solid ${palette.border}`, color: palette.text }}>
                    {conversation.post_type || "discussion"}
                  </span>
                  {conversation.is_closed && (
                    <span style={{ ...typeTag, border: `1px solid ${palette.border}`, color: palette.muted }}>
                      Closed
                    </span>
                  )}
                </div>

                <h3 style={{ ...cardTitle, color: palette.text }}>
                  {conversation.title || conversation.question || "Untitled"}
                </h3>
                <p style={{ ...cardExcerpt, color: palette.muted }}>
                  {conversation.content || conversation.description || "No description"}
                </p>

                <div style={{ ...metaRow, flexWrap: "wrap", color: palette.muted }}>
                  <span>
                    {new Date(conversation.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <span>{conversation.reply_count || 0} replies</span>
                  <span>{conversation.view_count || 0} views</span>
                </div>
              </div>

              <div style={{ ...cardSide, gridAutoFlow: isMobile ? "column" : "row", justifyContent: isMobile ? "space-between" : "start", alignContent: isMobile ? "center" : "start", justifyItems: isMobile ? "stretch" : "center", minWidth: isMobile ? 0 : cardSide.minWidth }}>
                <div style={authorAvatarWrap}>
                  {(() => {
                    const avatarUrl = getAvatarUrl(
                      conversation.author_avatar || conversation.author?.avatar
                    );
                    const initial = (
                      conversation.author || conversation.author_name || "U"
                    )
                      .charAt(0)
                      .toUpperCase();

                    return avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={conversation.author || "Author"}
                        style={authorAvatarImage}
                        onError={(event) => {
                          event.target.style.display = "none";
                          event.target.parentElement.innerHTML = `<span style="color:#20140f;font-size:13px;font-weight:700;">${initial}</span>`;
                        }}
                      />
                    ) : (
                      <span style={avatarInitial}>{initial}</span>
                    );
                  })()}
                </div>

                <p style={{ ...authorName, color: palette.muted }}>
                  {conversation.author || conversation.author_name || "Unknown"}
                </p>

                <button
                  onClick={(event) => deleteConversation(conversation.id, event)}
                  style={deleteButton}
                >
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
    <article style={{ ...statCard, background: palette.panel, border: `1px solid ${palette.border}` }}>
      <p style={{ ...statLabel, color: palette.muted }}>{label}</p>
      <p style={{ ...statValue, color: palette.text }}>{value}</p>
    </article>
  );
}

const page = {
  maxWidth: 1280,
  margin: "0 auto",
  display: "grid",
  gap: 12,
};

const hero = {
  borderRadius: 18,
  padding: "clamp(18px, 3vw, 28px)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  gap: 14,
  flexWrap: "wrap",
};

const eyebrow = {
  margin: 0,
  fontSize: 11,
  letterSpacing: "0.14em",
};

const title = {
  margin: "7px 0 6px",
  fontSize: "clamp(1.5rem, 3vw, 2.2rem)",
  letterSpacing: "-0.02em",
};

const subtitle = {
  margin: 0,
  fontSize: 14,
  lineHeight: 1.5,
};

const newConversationButton = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  border: "none",
  background: "linear-gradient(135deg, #ffd390, #ff9f62)",
  color: "#20140f",
  borderRadius: 10,
  padding: "10px 14px",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};

const filterBar = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto auto",
  gap: 8,
};

const searchWrap = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  paddingLeft: 10,
};

const searchInput = {
  width: "100%",
  borderRadius: 10,
  padding: "10px 12px 10px 0",
  border: "none",
  fontSize: 13,
  outline: "none",
};

const selectInput = {
  borderRadius: 10,
  padding: "10px 11px",
  fontSize: 13,
  outline: "none",
  cursor: "pointer",
};

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: 8,
};

const statCard = {
  borderRadius: 12,
  padding: "12px 14px",
};

const statLabel = {
  margin: 0,
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.07em",
  fontWeight: 700,
};

const statValue = {
  margin: "6px 0 0",
  fontSize: 28,
  lineHeight: 1,
  fontWeight: 800,
};

const listWrap = {
  display: "grid",
  gap: 8,
};

const listCard = {
  borderRadius: 12,
  padding: 14,
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: 12,
  cursor: "pointer",
};

const cardMain = {
  minWidth: 0,
};

const tagRow = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  marginBottom: 10,
};

const typeTag = {
  textTransform: "capitalize",
  borderRadius: 999,
  padding: "3px 8px",
  fontSize: 11,
  fontWeight: 700,
};

const cardTitle = {
  margin: "0 0 6px",
  fontSize: 15,
  fontWeight: 700,
  overflow: "hidden",
  textOverflow: "ellipsis",
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
};

const cardExcerpt = {
  margin: "0 0 10px",
  fontSize: 13,
  lineHeight: 1.45,
  overflow: "hidden",
  textOverflow: "ellipsis",
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
};

const metaRow = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  fontSize: 12,
};

const cardSide = {
  display: "grid",
  justifyItems: "center",
  alignContent: "start",
  gap: 7,
  minWidth: 56,
};

const authorAvatarWrap = {
  width: 36,
  height: 36,
  borderRadius: 10,
  overflow: "hidden",
  background: "linear-gradient(135deg, #ffcc8b, #ff955e)",
  display: "grid",
  placeItems: "center",
};

const authorAvatarImage = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
};

const avatarInitial = {
  color: "#20140f",
  fontSize: 13,
  fontWeight: 700,
};

const authorName = {
  margin: 0,
  fontSize: 11,
  textAlign: "center",
  maxWidth: 80,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const deleteButton = {
  width: 28,
  height: 28,
  borderRadius: 8,
  border: "1px solid rgba(239,68,68,0.45)",
  background: "transparent",
  color: "#ef4444",
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
};

const icon16 = { width: 16, height: 16 };
const icon14 = { width: 14, height: 14 };

export default Conversations;
