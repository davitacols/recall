import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRightIcon,
  ArrowPathIcon,
  CalendarIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
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
import { getProjectPalette, getProjectUi } from "../utils/projectUi";
import { WorkspaceHero, WorkspaceToolbar } from "../components/WorkspaceChrome";
import { buildAskRecallPath } from "../utils/askRecall";
import { createPlainTextPreview, hasMeaningfulText } from "../utils/textPreview";

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
    () => getProjectPalette(darkMode),
    [darkMode]
  );
  const ui = useMemo(() => getProjectUi(palette), [palette]);
  const preparedConversations = useMemo(
    () =>
      conversations.map((conversation) => {
        const replies = conversation.reply_count || 0;
        const views = conversation.view_count || 0;
        const summary = createPlainTextPreview(
          conversation.content || conversation.description || conversation.question,
          "Open the thread to add more context and make the reasoning easier to recover later.",
          180
        );
        const createdDate = conversation.created_at ? new Date(conversation.created_at) : null;
        const createdLabel = createdDate
          ? createdDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })
          : "Recently";
        const needsFollowUp = replies === 0 || !hasMeaningfulText(conversation.content || conversation.description);
        const momentumLabel =
          replies >= 5 ? "High discussion" : replies >= 2 ? "Active discussion" : replies === 1 ? "Early response" : "Needs response";
        return {
          ...conversation,
          summary,
          replies,
          views,
          createdLabel,
          needsFollowUp,
          momentumLabel,
        };
      }),
    [conversations]
  );

  const typeCounts = useMemo(() => {
    const counts = { all: preparedConversations.length };
    preparedConversations.forEach((item) => {
      const key = item.post_type || "discussion";
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [preparedConversations]);

  const thisWeekCount = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return preparedConversations.filter((conversation) => new Date(conversation.created_at) > weekAgo).length;
  }, [preparedConversations]);

  const averageReplies = preparedConversations.length
    ? Math.round(
        preparedConversations.reduce((total, conversation) => total + (conversation.reply_count || 0), 0) /
          preparedConversations.length
      )
    : 0;
  const latestConversation = preparedConversations[0] || null;
  const followUpCount = preparedConversations.filter((conversation) => conversation.needsFollowUp).length;
  const documentedThreads = preparedConversations.filter((conversation) =>
    hasMeaningfulText(conversation.content || conversation.description)
  ).length;
  const conversationsAskRecallQuestion = latestConversation
    ? "Which conversations need response, a stronger summary, or conversion into a decision right now?"
    : "What discussion should we capture first so important workspace context does not get lost?";

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
    let result = [...preparedConversations];
    if (searchQuery) {
      result = result.filter(
        (conversation) =>
          (conversation.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (conversation.content || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (conversation.summary || "").toLowerCase().includes(searchQuery.toLowerCase())
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
  const needsFollowUpItems = filteredConversations.filter((conversation) => conversation.needsFollowUp);
  const stableThreads = filteredConversations.filter((conversation) => !conversation.needsFollowUp);

  if (loading) return <ListSkeleton count={6} />;

  return (
    <div style={page}>
      <WorkspaceHero
        palette={palette}
        darkMode={darkMode}
        variant="memory"
        eyebrow="Workspace Memory"
        title="Conversations"
        description="Scan which threads need response, which ones already have enough signal, and move discussion into decisions or execution without losing context."
        stats={[
          { label: "Threads", value: preparedConversations.length, helper: "Visible discussion records." },
          { label: "Needs follow-up", value: followUpCount, helper: "Threads missing response or context." },
          { label: "Documented", value: documentedThreads, helper: "Threads with written context in place." },
          { label: "This week", value: thisWeekCount, helper: "New conversations added recently." },
        ]}
        aside={
          <div
            style={{
              ...spotlightCard,
              border: `1px solid ${palette.border}`,
              background: palette.card,
            }}
          >
            <p style={{ ...spotlightEyebrow, color: palette.muted }}>Latest thread</p>
            <h3 style={{ margin: 0, fontSize: 18, lineHeight: 1.08, color: palette.text }}>
              {latestConversation?.title || "No conversations yet"}
            </h3>
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.55, color: palette.muted }}>
              {latestConversation?.summary || "Start a thread to capture questions, decisions, blockers, and discussion context."}
            </p>
            {latestConversation ? (
              <div style={spotlightMeta}>
                <span style={{ ...spotlightChip, border: `1px solid ${palette.border}`, background: palette.panelAlt, color: palette.text }}>
                  <ClockIcon style={icon14} /> {latestConversation.createdLabel}
                </span>
                <span style={{ ...spotlightChip, border: `1px solid ${palette.border}`, background: palette.panelAlt, color: palette.text }}>
                  {latestConversation.momentumLabel}
                </span>
              </div>
            ) : null}
          </div>
        }
        actions={
          <>
            <button className="ui-btn-polish ui-focus-ring" onClick={loadConversations} style={ui.secondaryButton}>
              <ArrowPathIcon style={icon14} /> Refresh
            </button>
            <button
              className="ui-btn-polish ui-focus-ring"
              onClick={() => navigate(buildAskRecallPath(conversationsAskRecallQuestion))}
              style={ui.secondaryButton}
            >
              <SparklesIcon style={icon14} /> Ask Recall
            </button>
            <button className="ui-btn-polish ui-focus-ring" onClick={() => navigate("/conversations/new")} style={ui.primaryButton}>
              <PlusIcon style={icon14} /> New Conversation
            </button>
          </>
        }
      />

      <WorkspaceToolbar palette={palette} darkMode={darkMode} variant="memory">
        <div style={toolbarLayout}>
          <div style={toolbarIntro}>
            <p style={{ ...toolbarEyebrow, color: palette.muted }}>Thread List</p>
            <h2 style={{ ...toolbarTitle, color: palette.text }}>Keep the next response visible</h2>
            <p style={{ ...toolbarCopy, color: palette.muted }}>
              Threads with no reply or weak context surface first, while the rest of the discussion atlas stays easy to scan and route onward.
            </p>
          </div>
          <div style={toolbarChipRail}>
            <span style={{ ...toolbarChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
              {averageReplies} avg replies
            </span>
            <span style={{ ...toolbarChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
              {filteredConversations.length} visible
            </span>
            <span style={{ ...toolbarChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
              {typeCounts[filterType] || 0} in current type
            </span>
          </div>
        </div>
      </WorkspaceToolbar>

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
                background: palette.card,
              }}
            >
              <span style={{ ...featureIconWrap, background: palette.cardAlt }}>
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

      <section className="ui-enter" style={{ ...filterShell, border: `1px solid ${palette.border}`, background: palette.card }}>
        <div style={{ ...searchWrap, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
          <MagnifyingGlassIcon style={{ ...icon16, color: palette.muted }} />
          <input
            type="text"
            placeholder="Search threads"
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
                background: filterType === type ? palette.cardAlt : palette.card,
              }}
            >
              {type} ({typeCounts[type] || 0})
            </button>
          ))}
        </div>
        <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} style={{ ...sortSelect, border: `1px solid ${palette.border}`, color: palette.text, background: palette.cardAlt }}>
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
        <div style={{ display: "grid", gap: 14 }}>
          {needsFollowUpItems.length ? (
            <ConversationSection
              title="Needs response"
              description="These threads either lack replies or still need stronger written context."
              items={needsFollowUpItems}
              navigate={navigate}
              palette={palette}
              isMobile={isMobile}
              deleteConversation={deleteConversation}
            />
          ) : null}

          <ConversationSection
            title={needsFollowUpItems.length ? "Conversation atlas" : "All conversations"}
            description={
              needsFollowUpItems.length
                ? "The rest of the discussion workspace already has enough signal to route into decisions, tasks, or deeper review."
                : "Use the conversation atlas to move from thread to decision, execution, and context recovery."
            }
            items={needsFollowUpItems.length ? stableThreads : filteredConversations}
            navigate={navigate}
            palette={palette}
            isMobile={isMobile}
            deleteConversation={deleteConversation}
          />
        </div>
      )}
    </div>
  );
}

function ConversationSection({ title, description, items, navigate, palette, isMobile, deleteConversation }) {
  if (!items.length) {
    return null;
  }

  return (
    <section style={{ display: "grid", gap: 10 }}>
      <div style={sectionIntro}>
        <div>
          <p style={{ ...toolbarEyebrow, color: palette.muted, margin: 0 }}>Conversation Section</p>
          <h2 style={{ ...sectionTitle, color: palette.text }}>{title}</h2>
        </div>
        <p style={{ ...sectionCopy, color: palette.muted }}>{description}</p>
      </div>

      <section className="ui-enter" style={listWrap}>
        {items.map((conversation) => (
          <article
            key={conversation.id}
            className="ui-card-lift ui-smooth"
            onClick={() => navigate(`/conversations/${conversation.id}`)}
            style={{
              ...conversationCard,
              gridTemplateColumns: isMobile ? "1fr" : conversationCard.gridTemplateColumns,
              border: `1px solid ${palette.border}`,
              background: palette.card,
            }}
          >
            <div style={{ display: "grid", gap: 10 }}>
              <div style={cardTopRow}>
                <span style={{ ...typeBadge, border: `1px solid ${palette.border}`, color: palette.text }}>
                  {conversation.post_type || "discussion"}
                </span>
                <span style={{ ...typeBadge, border: `1px solid ${conversation.needsFollowUp ? palette.accent : palette.border}`, color: conversation.needsFollowUp ? palette.link : palette.muted, background: conversation.needsFollowUp ? palette.accentSoft : palette.cardAlt }}>
                  {conversation.momentumLabel}
                </span>
                {conversation.is_closed ? <span style={{ ...typeBadge, border: `1px solid ${palette.border}`, color: palette.muted, background: palette.cardAlt }}>Closed</span> : null}
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                <h3 style={{ margin: 0, color: palette.text, fontSize: 16, lineHeight: 1.18 }}>
                  {conversation.title || conversation.question || "Untitled"}
                </h3>
                <p style={{ ...conversationSummary, color: palette.muted }}>{conversation.summary}</p>
              </div>

              <div style={threadMetrics}>
                <div style={{ ...metricTile, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
                  <p style={{ ...metricLabel, color: palette.muted }}>Updated</p>
                  <p style={{ ...metricValue, color: palette.text }}>{conversation.createdLabel}</p>
                </div>
                <div style={{ ...metricTile, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
                  <p style={{ ...metricLabel, color: palette.muted }}>Replies</p>
                  <p style={{ ...metricValue, color: palette.text }}>{conversation.replies}</p>
                </div>
                <div style={{ ...metricTile, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
                  <p style={{ ...metricLabel, color: palette.muted }}>Views</p>
                  <p style={{ ...metricValue, color: palette.text }}>{conversation.views}</p>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
                <span style={{ ...openThreadLink, color: palette.accent }}>
                  Open thread <ArrowRightIcon style={icon14} />
                </span>
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
    </section>
  );
}

function StatCard({ label, value, palette }) {
  return (
    <article style={{ ...statCard, border: `1px solid ${palette.border}`, background: palette.card }}>
      <p style={{ margin: 0, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.07em", color: palette.muted }}>{label}</p>
      <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 700, color: palette.text }}>{value}</p>
    </article>
  );
}

const page = {
  width: "100%",
  display: "grid",
  gap: 12,
};

const featureRail = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 8,
};

const featureCard = {
  borderRadius: 14,
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
  borderRadius: 14,
  padding: "11px 12px",
};

const filterShell = {
  borderRadius: 16,
  padding: 10,
  display: "grid",
  gap: 8,
};

const searchWrap = {
  borderRadius: 8,
  padding: "7px 9px",
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
  padding: "5px 9px",
  fontSize: 11,
  fontWeight: 700,
  textTransform: "capitalize",
  cursor: "pointer",
};

const sortSelect = {
  borderRadius: 8,
  padding: "8px 9px",
  fontSize: 12,
  outline: "none",
  width: "fit-content",
};

const listWrap = {
  display: "grid",
  gap: 10,
};

const conversationCard = {
  borderRadius: 14,
  padding: 14,
  display: "grid",
  gridTemplateColumns: "minmax(0,1fr) 72px",
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
  borderRadius: 8,
  border: "1px solid var(--app-border)",
  padding: "5px 8px",
  fontSize: 11,
  fontWeight: 700,
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  background: "var(--ui-panel-alt)",
  color: "var(--app-text)",
  cursor: "pointer",
};

const conversationSummary = {
  margin: 0,
  fontSize: 12,
  lineHeight: 1.55,
  display: "-webkit-box",
  overflow: "hidden",
  WebkitLineClamp: 3,
  WebkitBoxOrient: "vertical",
};

const threadMetrics = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))",
  gap: 8,
};

const metricTile = {
  borderRadius: 12,
  padding: "8px 10px",
  display: "grid",
  gap: 3,
};

const metricLabel = {
  margin: 0,
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const metricValue = {
  margin: 0,
  fontSize: 13,
  fontWeight: 700,
  lineHeight: 1.4,
};

const sideRail = {
  display: "flex",
  alignItems: "center",
  gap: 6,
};

const authorAvatarWrap = {
  width: 32,
  height: 32,
  borderRadius: 8,
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

const toolbarLayout = {
  display: "grid",
  gap: 10,
};

const toolbarIntro = {
  display: "grid",
  gap: 4,
};

const toolbarEyebrow = {
  margin: 0,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const toolbarTitle = {
  margin: 0,
  fontSize: 20,
  lineHeight: 1.08,
};

const toolbarCopy = {
  margin: 0,
  fontSize: 12,
  lineHeight: 1.55,
  maxWidth: 720,
};

const toolbarChipRail = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const toolbarChip = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  borderRadius: 999,
  padding: "6px 10px",
  fontSize: 11,
  fontWeight: 700,
};

const spotlightCard = {
  minWidth: 240,
  borderRadius: 16,
  padding: 14,
  display: "grid",
  gap: 8,
};

const spotlightEyebrow = {
  margin: 0,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const spotlightMeta = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const spotlightChip = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  borderRadius: 999,
  padding: "6px 10px",
  fontSize: 11,
  fontWeight: 700,
};

const sectionIntro = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "end",
  flexWrap: "wrap",
};

const sectionTitle = {
  margin: "4px 0 0",
  fontSize: 20,
  lineHeight: 1.08,
};

const sectionCopy = {
  margin: 0,
  fontSize: 12,
  lineHeight: 1.55,
  maxWidth: 620,
};

const openThreadLink = {
  marginLeft: "auto",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontSize: 12,
  fontWeight: 700,
};

const icon16 = { width: 16, height: 16 };
const icon14 = { width: 14, height: 14 };

export default Conversations;
