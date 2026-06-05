import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRightIcon,
  ArrowUturnRightIcon,
  BoltIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ExclamationTriangleIcon,
  FireIcon,
  HandRaisedIcon,
  InboxIcon,
  LightBulbIcon,
  MagnifyingGlassIcon,
  MegaphoneIcon,
  PlusIcon,
  QuestionMarkCircleIcon,
  SparklesIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import api from "../services/api";
import { useToast } from "../components/Toast";
import { useAuth } from "../hooks/useAuth";
import {
  Avatar,
  Button,
  EmptyState,
  Lozenge,
  PageHeader,
  SectionMessage,
} from "../components/atlas";
import { useAgentContextHint } from "../components/AgentDock";
import "./Conversations.css";

const POST_TYPE_META = {
  discussion: { Icon: ChatBubbleLeftRightIcon, color: "#5E6AD2", soft: "rgba(94,106,210,0.13)", label: "Discussion" },
  question: { Icon: QuestionMarkCircleIcon, color: "#2FA4B8", soft: "rgba(47,164,184,0.14)", label: "Question" },
  proposal: { Icon: LightBulbIcon, color: "#8A63D2", soft: "rgba(138,99,210,0.14)", label: "Proposal" },
  decision: { Icon: CheckCircleIcon, color: "#2F9E6E", soft: "rgba(47,158,110,0.13)", label: "Decision" },
  update: { Icon: MegaphoneIcon, color: "#C8761E", soft: "rgba(200,118,30,0.14)", label: "Update" },
};

function postTypeMeta(t) {
  return POST_TYPE_META[String(t || "discussion").toLowerCase()] || POST_TYPE_META.discussion;
}

const EMOTIONAL_LABEL = {
  urgent: "Urgent",
  consensus: "Consensus",
  risky: "Risky",
  experimental: "Experimental",
};

function relativeTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  const sec = Math.max(1, Math.round((Date.now() - d.getTime()) / 1000));
  if (sec < 60) return `${sec}s`;
  const m = Math.round(sec / 60);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const days = Math.round(h / 24);
  if (days < 7) return `${days}d`;
  if (days < 30) return `${Math.round(days / 7)}w`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function stripHtml(value) {
  if (!value) return "";
  return String(value).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function daysSince(value) {
  const d = value ? new Date(value).getTime() : 0;
  if (!d) return Infinity;
  return (Date.now() - d) / 86400000;
}

// --- Bucketization ---------------------------------------------------------
// Conversations exist to become decisions. The list should make the pipeline
// visible at a glance — not flatten everything into a "most replies" forum.

const BUCKETS = [
  {
    id: "pinned",
    title: "Pinned",
    hint: "Workspace anchors — context the team keeps coming back to.",
    Icon: BoltIcon,
    tone: "indigo",
  },
  {
    id: "awaitingYou",
    title: "Awaiting you",
    hint: "Threads where you are owner or mentioned and progress is blocked on your input.",
    Icon: HandRaisedIcon,
    tone: "violet",
  },
  {
    id: "urgent",
    title: "Urgent / Crisis",
    hint: "Flagged urgent or crisis-tagged — these eat oxygen until resolved.",
    Icon: FireIcon,
    tone: "rose",
  },
  {
    id: "readyToDecide",
    title: "Ready to decide",
    hint: "Proposals with momentum and consensus. One click away from being a decision.",
    Icon: SparklesIcon,
    tone: "emerald",
  },
  {
    id: "needsFollowUp",
    title: "Needs follow-up",
    hint: "Open loops the author flagged — promises made, not yet kept.",
    Icon: ArrowUturnRightIcon,
    tone: "amber",
  },
  {
    id: "inProgress",
    title: "In progress",
    hint: "Active threads moving this week.",
    Icon: ChatBubbleLeftRightIcon,
    tone: "blue",
  },
  {
    id: "stalled",
    title: "Stalled",
    hint: "Open but quiet for over a week. Revisit or close.",
    Icon: ExclamationTriangleIcon,
    tone: "slate",
  },
  {
    id: "recentlyResolved",
    title: "Recently harvested",
    hint: "Resolved threads whose takeaways are now part of the workspace's memory.",
    Icon: CheckCircleIcon,
    tone: "teal",
  },
];

function isOpenConversation(c) {
  return !c.is_closed && c.status_label !== "resolved";
}

function ownedOrMentionedBy(c, userId) {
  if (!userId) return false;
  if (c.owner_id === userId) return true;
  if (Array.isArray(c.mentioned_user_ids) && c.mentioned_user_ids.includes(userId)) return true;
  // If the user is the author of an open question, treat as theirs to drive.
  if (c.author_id === userId && (c.post_type === "question" || c.post_type === "proposal") && isOpenConversation(c)) {
    return true;
  }
  return false;
}

function categorize(conversations, userId) {
  const buckets = Object.fromEntries(BUCKETS.map((b) => [b.id, []]));
  buckets.other = [];

  for (const c of conversations) {
    if (c.is_pinned) {
      buckets.pinned.push(c);
      continue;
    }
    if (isOpenConversation(c) && ownedOrMentionedBy(c, userId)) {
      buckets.awaitingYou.push(c);
      continue;
    }
    if (isOpenConversation(c) && (c.is_crisis || c.priority === "urgent" || c.emotional_context === "urgent")) {
      buckets.urgent.push(c);
      continue;
    }
    if (
      isOpenConversation(c) &&
      c.post_type === "proposal" &&
      (c.reply_count || 0) >= 3 &&
      (c.emotional_context === "consensus" || (c.reply_count || 0) >= 6)
    ) {
      buckets.readyToDecide.push(c);
      continue;
    }
    if (c.status_label === "needs_followup") {
      buckets.needsFollowUp.push(c);
      continue;
    }
    if (
      c.status_label === "in_progress" ||
      (isOpenConversation(c) && daysSince(c.updated_at || c.created_at) <= 3 && (c.reply_count || 0) > 0)
    ) {
      buckets.inProgress.push(c);
      continue;
    }
    if (isOpenConversation(c) && daysSince(c.updated_at || c.created_at) > 7) {
      buckets.stalled.push(c);
      continue;
    }
    if ((c.is_closed || c.status_label === "resolved") && daysSince(c.closed_at || c.updated_at) <= 14) {
      buckets.recentlyResolved.push(c);
      continue;
    }
    buckets.other.push(c);
  }

  // Within each bucket, sort by recency.
  for (const id of Object.keys(buckets)) {
    buckets[id].sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0));
  }
  return buckets;
}

// --- Components ------------------------------------------------------------

function PipelineKPI({ id, title, count, Icon, tone, active, onClick }) {
  return (
    <button
      type="button"
      className={`conv-kpi conv-kpi-${tone}${active ? " is-active" : ""}`}
      onClick={onClick}
      data-bucket={id}
    >
      <span className="conv-kpi-icon"><Icon /></span>
      <span className="conv-kpi-meta">
        <span className="conv-kpi-count">{count}</span>
        <span className="conv-kpi-title">{title}</span>
      </span>
    </button>
  );
}

function Row({ c, onDelete }) {
  const { Icon, color, soft, label } = postTypeMeta(c.post_type);
  const author = c.author || "Anonymous";
  const summary = stripHtml(c.key_takeaway || c.ai_summary || c.content || "");
  const isUrgent = c.is_crisis || c.priority === "urgent";
  const isClosed = c.is_closed || c.status_label === "resolved";
  return (
    <Link to={`/conversations/${c.id}`} className="conv-row" data-closed={isClosed ? "1" : "0"}>
      <span className="conv-row-type" style={{ background: soft, color }} title={label}>
        <Icon />
      </span>
      <div className="conv-row-main">
        <div className="conv-row-head">
          <span className="conv-row-title">{c.title || "Untitled"}</span>
          {isUrgent ? <Lozenge variant="removed">Urgent</Lozenge> : null}
          {c.emotional_context && c.emotional_context !== "urgent" ? (
            <span className={`conv-mood conv-mood-${c.emotional_context}`}>
              {EMOTIONAL_LABEL[c.emotional_context]}
            </span>
          ) : null}
          {c.status_label && c.status_label !== "open" ? (
            <Lozenge>{c.status_label.replace("_", " ")}</Lozenge>
          ) : null}
        </div>
        {summary ? <p className="conv-row-takeaway">{summary.slice(0, 180)}</p> : null}
        <div className="conv-row-meta">
          <span className="conv-row-author">
            <Avatar size="xs" name={author} />
            {author}
          </span>
          <span className="conv-row-dot" />
          <span>{relativeTime(c.updated_at || c.created_at)}</span>
          <span className="conv-row-dot" />
          <span>{c.reply_count || 0} {c.reply_count === 1 ? "reply" : "replies"}</span>
          {Array.isArray(c.ai_keywords) && c.ai_keywords.length ? (
            <>
              <span className="conv-row-dot" />
              <span className="conv-row-tags">
                {c.ai_keywords.slice(0, 3).map((k) => (
                  <span key={k} className="conv-row-tag">#{k}</span>
                ))}
              </span>
            </>
          ) : null}
        </div>
      </div>
      <span className="conv-row-trail">
        <ArrowRightIcon className="conv-row-go" />
        <button
          type="button"
          className="conv-row-del"
          aria-label="Delete conversation"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(c.id);
          }}
        >
          <TrashIcon />
        </button>
      </span>
    </Link>
  );
}

function Bucket({ bucket, items, defaultOpen, onDelete }) {
  const [open, setOpen] = useState(defaultOpen);
  if (!items.length) return null;
  const { Icon, tone } = bucket;
  return (
    <section className={`conv-bucket conv-bucket-${tone}`}>
      <button type="button" className="conv-bucket-head" onClick={() => setOpen((v) => !v)}>
        <span className="conv-bucket-marker"><Icon /></span>
        <span className="conv-bucket-titles">
          <span className="conv-bucket-title">{bucket.title}</span>
          <span className="conv-bucket-hint">{bucket.hint}</span>
        </span>
        <span className="conv-bucket-count">{items.length}</span>
        {open ? <ChevronUpIcon className="conv-bucket-chev" /> : <ChevronDownIcon className="conv-bucket-chev" />}
      </button>
      {open ? (
        <div className="conv-bucket-list">
          {items.map((c) => (
            <Row key={c.id} c={c} onDelete={onDelete} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

// --- Page ------------------------------------------------------------------

export default function Conversations() {
  const navigate = useNavigate();
  const toast = useToast?.() || { addToast: () => {} };
  const { user } = useAuth() || {};
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activeBucket, setActiveBucket] = useState(null); // null = show pipeline, otherwise flat list

  useAgentContextHint({
    kind: "conversations",
    label: activeBucket
      ? `Conversations · ${BUCKETS.find((b) => b.id === activeBucket)?.title || activeBucket}`
      : search.trim()
      ? `Conversations · "${search.trim()}"`
      : "Conversations · Pipeline",
    goalPrefix: activeBucket === "awaitingYou"
      ? "Triage threads waiting on me — what should I respond to first and what's the right outcome? "
      : activeBucket === "readyToDecide"
      ? "These threads look ready to become decisions. Draft a decision summary from each one. "
      : activeBucket === "stalled"
      ? "Look at these stalled threads and recommend a next move for each — close, ping owner, or convert to decision. "
      : search.trim()
      ? `Find conversations about "${search.trim()}" and surface what was decided or is still open. `
      : "Look across the conversation pipeline and tell me what needs attention this week. ",
    profile_slug: "general",
  });

  useEffect(() => {
    let mounted = true;
    api.get("/api/conversations/")
      .then((res) => {
        if (!mounted) return;
        const list = Array.isArray(res.data?.results)
          ? res.data.results
          : Array.isArray(res.data)
          ? res.data
          : [];
        setConversations(list.filter((c) => c && c.id));
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err?.response?.data?.detail || err?.message || "Failed to load conversations");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this conversation?")) return;
    try {
      await api.delete(`/api/conversations/${id}/`);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      toast.addToast?.("Conversation deleted", "success");
    } catch (err) {
      toast.addToast?.("Failed to delete conversation", "error");
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => {
      const hay = `${c.title || ""} ${c.ai_summary || ""} ${c.key_takeaway || ""} ${c.content || ""} ${(c.ai_keywords || []).join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }, [conversations, search]);

  const buckets = useMemo(() => categorize(filtered, user?.id), [filtered, user?.id]);

  const kpis = useMemo(() => BUCKETS.map((b) => ({
    ...b,
    count: (buckets[b.id] || []).length,
  })), [buckets]);

  // Anything that didn't land in a curated bucket — we still want to render it
  // (otherwise old threads silently disappear). Group it as a fallback section.
  const otherItems = buckets.other || [];

  const visibleBuckets = BUCKETS.filter((b) => (buckets[b.id] || []).length > 0);
  const hasAnything = filtered.length > 0;

  return (
    <div className="conv-page" style={{ padding: "0 32px 32px" }}>
      <PageHeader
        breadcrumb={[{ label: "Knoledgr", to: "/" }, { label: "Conversations" }]}
        title="Conversations"
        subtitle="The team's open loops — questions, proposals, and updates on the path to decisions."
        actions={
          <Button
            appearance="primary"
            iconBefore={<PlusIcon style={{ width: 14, height: 14 }} />}
            onClick={() => navigate("/conversations/new")}
          >
            New conversation
          </Button>
        }
        style={{ padding: "24px 0 0", background: "transparent" }}
      />

      <div className="conv-toolbar">
        <div className="conv-search">
          <MagnifyingGlassIcon />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search titles, summaries, and keywords"
            className="atlas-input"
            aria-label="Search conversations"
          />
        </div>
        {activeBucket ? (
          <button type="button" className="conv-clear" onClick={() => setActiveBucket(null)}>
            Show pipeline
          </button>
        ) : null}
      </div>

      {error ? <SectionMessage tone="error" style={{ marginBottom: 16 }}>{error}</SectionMessage> : null}

      {loading ? (
        <SkeletonPipeline />
      ) : !hasAnything ? (
        <EmptyState
          icon={<InboxIcon style={{ width: "100%", height: "100%" }} />}
          title={search.trim() ? "Nothing matches that search" : "No conversations yet"}
          description={
            search.trim()
              ? "Try a different term, or clear the search to see the whole pipeline."
              : "Capture an open question, a proposal, or a decision rationale. Conversations are where the team thinks out loud."
          }
          primaryAction={
            search.trim() ? (
              <Button onClick={() => setSearch("")}>Clear search</Button>
            ) : (
              <Button appearance="primary" onClick={() => navigate("/conversations/new")}>
                New conversation
              </Button>
            )
          }
        />
      ) : (
        <>
          <div className="conv-kpis">
            {kpis.map((k) => (
              <PipelineKPI
                key={k.id}
                {...k}
                active={activeBucket === k.id}
                onClick={() => setActiveBucket((prev) => (prev === k.id ? null : k.id))}
              />
            ))}
          </div>

          {activeBucket ? (
            <div className="conv-flat">
              {(buckets[activeBucket] || []).length === 0 ? (
                <p className="conv-flat-empty">No conversations in this bucket right now.</p>
              ) : (
                (buckets[activeBucket] || []).map((c) => (
                  <Row key={c.id} c={c} onDelete={handleDelete} />
                ))
              )}
            </div>
          ) : (
            <div className="conv-pipeline">
              {visibleBuckets.map((b, i) => (
                <Bucket
                  key={b.id}
                  bucket={b}
                  items={buckets[b.id]}
                  defaultOpen={i < 2 || b.id === "awaitingYou" || b.id === "readyToDecide"}
                  onDelete={handleDelete}
                />
              ))}
              {otherItems.length ? (
                <Bucket
                  bucket={{
                    id: "other",
                    title: "Other recent",
                    hint: "Background threads — not blocked on you and not yet harvested.",
                    Icon: ChatBubbleLeftRightIcon,
                    tone: "slate",
                  }}
                  items={otherItems}
                  defaultOpen={false}
                  onDelete={handleDelete}
                />
              ) : null}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SkeletonPipeline() {
  return (
    <div className="conv-skel">
      <div className="conv-skel-kpis">
        {[0, 1, 2, 3, 4].map((i) => <div key={i} className="conv-skel-kpi" />)}
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="conv-skel-bucket">
          <div className="conv-skel-bucket-head" />
          <div className="conv-skel-row" />
          <div className="conv-skel-row" />
        </div>
      ))}
    </div>
  );
}
