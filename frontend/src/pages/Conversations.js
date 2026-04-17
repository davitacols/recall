import { useEffect, useMemo, useState } from "react";
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
            <p style={{ ...toolbarEyebrow, color: palette.muted }}>Thread Control</p>
            <h2 style={{ ...toolbarTitle, color: palette.text }}>Keep the next response and next route visible</h2>
            <p style={{ ...toolbarCopy, color: palette.muted }}>
              Triage the live discussion first, then use the routing deck to move useful threads into decisions, tasks, meetings, or longer-term context.
            </p>
          </div>

          <div style={{ ...conversationCommandGrid, gridTemplateColumns: isMobile ? "1fr" : conversationCommandGrid.gridTemplateColumns }}>
            <article
              style={{
                ...commandCard,
                border: `1px solid ${palette.border}`,
                background: palette.card,
              }}
            >
              <div style={commandCardHead}>
                <div style={{ display: "grid", gap: 4 }}>
                  <p style={{ ...toolbarEyebrow, color: palette.muted, margin: 0 }}>Filter threads</p>
                  <h3 style={{ ...commandCardTitle, color: palette.text }}>Shape the conversation queue</h3>
                </div>
                <div style={toolbarChipRail}>
                  <span style={{ ...toolbarChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                    {filteredConversations.length} visible
                  </span>
                  <span style={{ ...toolbarChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                    {typeCounts[filterType] || 0} in current type
                  </span>
                </div>
              </div>

              <div style={{ ...searchWrap, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
                <MagnifyingGlassIcon style={{ ...icon16, color: palette.muted }} />
                <input
                  type="text"
                  placeholder="Search titles, summaries, or thread content"
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
                      border: `1px solid ${filterType === type ? palette.accent : palette.border}`,
                      color: filterType === type ? palette.accent : palette.text,
                      background: filterType === type ? palette.accentSoft : palette.card,
                    }}
                  >
                    {type} ({typeCounts[type] || 0})
                  </button>
                ))}
              </div>

              <div style={{ ...searchRail, gridTemplateColumns: isMobile ? "1fr" : "auto auto minmax(0, 1fr)" }}>
                <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} style={{ ...sortSelect, border: `1px solid ${palette.border}`, color: palette.text, background: palette.cardAlt, width: isMobile ? "100%" : "fit-content" }}>
                  <option value="recent">Sort: Most Recent</option>
                  <option value="replies">Sort: Most Replies</option>
                  <option value="views">Sort: Most Views</option>
                </select>
                <button
                  className="ui-btn-polish ui-focus-ring"
                  onClick={() => {
                    setSearchQuery("");
                    setFilterType("all");
                    setSortBy("recent");
                  }}
                  style={threadSecondaryButton(palette)}
                >
                  Reset view
                </button>
                <div style={toolbarChipRail}>
                  <span style={{ ...toolbarChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                    {averageReplies} avg replies
                  </span>
                  <span style={{ ...toolbarChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                    {followUpCount} need response
                  </span>
                </div>
              </div>
            </article>

            <article
              style={{
                ...commandCard,
                border: `1px solid ${palette.border}`,
                background: palette.card,
              }}
            >
              <div style={commandCardHead}>
                <div style={{ display: "grid", gap: 4 }}>
                  <p style={{ ...toolbarEyebrow, color: palette.muted, margin: 0 }}>Route discussion</p>
                  <h3 style={{ ...commandCardTitle, color: palette.text }}>Push good threads into the next system</h3>
                </div>
                <div style={toolbarChipRail}>
                  <span style={{ ...toolbarChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                    {documentedThreads} documented
                  </span>
                  <span style={{ ...toolbarChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                    {thisWeekCount} this week
                  </span>
                </div>
              </div>

              <section style={{ ...statsGrid, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
                <StatCard label="Threads" value={conversations.length} palette={palette} />
                <StatCard label="Needs response" value={followUpCount} palette={palette} />
                <StatCard label="Documented" value={documentedThreads} palette={palette} />
                <StatCard label="Avg replies" value={averageReplies} palette={palette} />
              </section>

              <section style={{ ...featureRail, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
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
                        background: palette.cardAlt,
                      }}
                    >
                      <span style={{ ...featureIconWrap, background: palette.card }}>
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
            </article>
          </div>
        </div>
      </WorkspaceToolbar>

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
            <div style={{ display: "grid", gap: 12, minWidth: 0 }}>
              <div style={cardTopRow}>
                <span style={{ ...typeBadge, border: `1px solid ${palette.border}`, color: palette.text, background: palette.cardAlt }}>
                  {conversation.post_type || "discussion"}
                </span>
                <span style={{ ...typeBadge, border: `1px solid ${conversation.needsFollowUp ? palette.accent : palette.border}`, color: conversation.needsFollowUp ? palette.link : palette.muted, background: conversation.needsFollowUp ? palette.accentSoft : palette.cardAlt }}>
                  {conversation.momentumLabel}
                </span>
                {conversation.is_closed ? <span style={{ ...typeBadge, border: `1px solid ${palette.border}`, color: palette.muted, background: palette.cardAlt }}>Closed</span> : null}
                <span style={{ ...threadMetaChip, border: `1px solid ${palette.border}`, color: palette.muted, background: palette.cardAlt }}>
                  <ClockIcon style={icon14} /> {conversation.createdLabel}
                </span>
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                <h3 style={{ margin: 0, color: palette.text, fontSize: 16, lineHeight: 1.18 }}>
                  {conversation.title || conversation.question || "Untitled"}
                </h3>
                <p style={{ ...conversationSummary, color: palette.muted }}>{conversation.summary}</p>
              </div>

              <div style={threadMetricRail}>
                <ThreadMetricPill label="Replies" value={conversation.replies} palette={palette} />
                <ThreadMetricPill label="Views" value={conversation.views} palette={palette} />
                <AuthorPill conversation={conversation} palette={palette} />
              </div>
            </div>

            <div style={{ ...actionStack, gridTemplateColumns: isMobile ? "repeat(2, minmax(0, 1fr))" : "1fr" }}>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  navigate(`/conversations/${conversation.id}`);
                }}
                className="ui-btn-polish ui-focus-ring"
                style={threadPrimaryButton(palette)}
              >
                Open thread <ArrowRightIcon style={icon14} />
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  navigate(`/decision-proposals?conversation_id=${conversation.id}`);
                }}
                className="ui-btn-polish ui-focus-ring"
                style={threadSecondaryButton(palette)}
              >
                <DocumentCheckIcon style={icon14} />
                Decision queue
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  navigate(`/business/tasks?conversation_id=${conversation.id}`);
                }}
                className="ui-btn-polish ui-focus-ring"
                style={threadSecondaryButton(palette)}
              >
                <ClipboardDocumentListIcon style={icon14} />
                Task board
              </button>
              <button className="ui-btn-polish ui-focus-ring" onClick={(event) => deleteConversation(conversation.id, event)} style={threadDangerButton(palette)}>
                <TrashIcon style={icon14} />
                Delete
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

function ThreadMetricPill({ label, value, palette }) {
  return (
    <div style={{ ...threadMetaChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
      <span style={{ color: palette.muted }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function AuthorPill({ conversation, palette }) {
  const avatarUrl = getAvatarUrl(conversation.author_avatar || conversation.author?.avatar);
  const initial = (conversation.author || conversation.author_name || "U").charAt(0).toUpperCase();

  return (
    <div style={{ ...authorPill, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
      <span style={authorAvatarWrap}>
        {avatarUrl ? (
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
        )}
      </span>
      <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {conversation.author || conversation.author_name || "Unknown"}
      </span>
    </div>
  );
}

function threadPrimaryButton(palette) {
  return {
    borderRadius: 10,
    border: "none",
    padding: "8px 11px",
    fontSize: 12,
    fontWeight: 700,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    background: palette.accent,
    color: palette.accentText,
    cursor: "pointer",
    minHeight: 38,
  };
}

function threadSecondaryButton(palette) {
  return {
    borderRadius: 10,
    border: `1px solid ${palette.border}`,
    padding: "8px 11px",
    fontSize: 12,
    fontWeight: 700,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    background: palette.cardAlt,
    color: palette.text,
    cursor: "pointer",
    minHeight: 38,
  };
}

function threadDangerButton() {
  return {
    borderRadius: 10,
    border: `1px solid var(--app-danger-border)`,
    padding: "8px 11px",
    fontSize: 12,
    fontWeight: 700,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    background: "transparent",
    color: "var(--app-danger)",
    cursor: "pointer",
    minHeight: 38,
  };
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

const conversationCommandGrid = {
  display: "grid",
  gridTemplateColumns: "minmax(0,1.02fr) minmax(300px,0.98fr)",
  gap: 14,
};

const commandCard = {
  borderRadius: 18,
  padding: 14,
  display: "grid",
  gap: 12,
  alignContent: "start",
};

const commandCardHead = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "start",
  flexWrap: "wrap",
};

const commandCardTitle = {
  margin: 0,
  fontSize: 18,
  lineHeight: 1.08,
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

const searchRail = {
  display: "grid",
  gap: 10,
  alignItems: "center",
};

const listWrap = {
  display: "grid",
  gap: 10,
};

const conversationCard = {
  borderRadius: 16,
  padding: 14,
  display: "grid",
  gridTemplateColumns: "minmax(0,1fr) 220px",
  gap: 14,
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
  padding: "4px 9px",
  fontSize: 11,
  fontWeight: 700,
  textTransform: "capitalize",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
};

const threadMetaChip = {
  borderRadius: 999,
  padding: "4px 9px",
  fontSize: 11,
  fontWeight: 700,
  display: "flex",
  alignItems: "center",
  gap: 6,
  flexWrap: "wrap",
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

const threadMetricRail = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  alignItems: "center",
};

const actionStack = {
  display: "grid",
  gap: 8,
  alignContent: "start",
};

const authorPill = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "4px 8px 4px 4px",
  borderRadius: 999,
  minWidth: 0,
  maxWidth: 180,
  fontSize: 11,
  fontWeight: 700,
  color: "var(--app-text)",
};

const authorAvatarWrap = {
  width: 26,
  height: 26,
  borderRadius: 999,
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
  fontSize: 11,
  fontWeight: 700,
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

const icon16 = { width: 16, height: 16 };
const icon14 = { width: 14, height: 14 };

export default Conversations;
