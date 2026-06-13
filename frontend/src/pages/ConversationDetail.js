import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
  ChatBubbleLeftIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  HandThumbUpIcon,
  LightBulbIcon,
  MegaphoneIcon,
  PencilSquareIcon,
  QuestionMarkCircleIcon,
  SparklesIcon,
  StarIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarSolidIcon } from "@heroicons/react/24/solid";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { useToast } from "../components/Toast";
import api from "../services/api";
import MentionTagInput from "../components/MentionTagInput";
import RichTextRenderer from "../components/RichTextRenderer";
import { getAvatarUrl } from "../utils/avatarUtils";
import AIAssistant from "../components/AIAssistant";
import ContextPanel from "../components/ContextPanel";
import QuickLink from "../components/QuickLink";
import { buildAskRecallPath } from "../utils/askRecall";
import { useAgentContextHint } from "../components/AgentDock";
import "./ConversationDetail.css";

const REACTIONS = [
  { type: "agree", Icon: HandThumbUpIcon, label: "Agree" },
  { type: "unsure", Icon: QuestionMarkCircleIcon, label: "Unsure" },
  { type: "concern", Icon: ExclamationTriangleIcon, label: "Concern" },
];

function typeMeta(postType) {
  const t = String(postType || "discussion").toLowerCase().replace(/\s+/g, "_");
  const map = {
    discussion: { Icon: ChatBubbleLeftRightIcon },
    question: { Icon: QuestionMarkCircleIcon },
    proposal: { Icon: LightBulbIcon },
    decision: { Icon: CheckCircleIcon },
    update: { Icon: MegaphoneIcon },
  };
  return map[t] || { Icon: ChatBubbleLeftRightIcon };
}

function initial(name) {
  return String(name || "U").trim().charAt(0).toUpperCase();
}

function ReplyItem({ reply, depth = 0, onEdit, onDelete, currentUserId, darkMode }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(reply.content);

  const authorName = typeof reply.author === "string" ? reply.author : reply.author?.username || "Unknown";
  const avatarUrl = getAvatarUrl(reply.author?.avatar || reply.author_avatar);
  const isOwner = Number(reply.author?.id || reply.author_id) === Number(currentUserId);

  const save = async () => {
    await onEdit(reply.id, editContent);
    setIsEditing(false);
  };

  return (
    <div className="cd-reply">
      <div className="cd-reply-inner">
        <div className="cd-reply-head">
          <div className="cd-reply-author">
            <span className="cd-reply-avatar">
              {avatarUrl ? <img src={avatarUrl} alt={authorName} /> : initial(authorName)}
            </span>
            <div>
              <div className="cd-reply-name">{authorName}</div>
              <div className="cd-reply-date">{new Date(reply.created_at).toLocaleDateString()}</div>
            </div>
          </div>
          {isOwner ? (
            <div className="cd-reply-actions">
              <button type="button" className="cd-reply-act" onClick={() => setIsEditing((v) => !v)}>
                {isEditing ? "Cancel" : "Edit"}
              </button>
              <button type="button" className="cd-reply-act danger" onClick={() => onDelete(reply.id)}>
                Delete
              </button>
            </div>
          ) : null}
        </div>

        {isEditing ? (
          <>
            <textarea
              className="cd-edit-area"
              style={{ minHeight: 90 }}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={3}
            />
            <div className="cd-edit-actions">
              <button type="button" className="cd-btn cd-btn-primary" onClick={save}>Save</button>
            </div>
          </>
        ) : (
          <div className="cd-reply-body">
            <RichTextRenderer content={reply.content} darkMode={darkMode} />
          </div>
        )}
      </div>

      {reply.children?.length ? (
        <div className="cd-reply-children">
          {reply.children.map((child) => (
            <ReplyItem
              key={child.id}
              reply={child}
              depth={depth + 1}
              onEdit={onEdit}
              onDelete={onDelete}
              currentUserId={currentUserId}
              darkMode={darkMode}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function ConversationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const { addToast } = useToast();

  const [conversation, setConversation] = useState(null);
  const [replies, setReplies] = useState([]);

  // Frame the agent dock around this conversation thread.
  useAgentContextHint(
    conversation
      ? {
          kind: "conversation",
          label: `Conversation · ${conversation.title || `#${id}`}`,
          goalPrefix: `Conversation "${conversation.title || `#${id}`}" — summarize the thread and pull out follow-ups, decisions, or open questions. `,
          profile_slug: "general",
        }
      : null
  );
  const [reactions, setReactions] = useState({ reactions: [], user_reaction: null });
  const [newReply, setNewReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  const [isEditingPost, setIsEditingPost] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [savingPost, setSavingPost] = useState(false);
  const [deletingPost, setDeletingPost] = useState(false);
  const [reactionLoading, setReactionLoading] = useState(false);
  const [converting, setConverting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [bookmark, setBookmark] = useState({ on: false, id: null, loading: false });

  useEffect(() => {
    const localUser = JSON.parse(localStorage.getItem("user") || "{}");
    setCurrentUserId(localUser.id);
    fetchConversation();
    fetchReplies();
    fetchReactions();
    fetchBookmark();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchConversation = async () => {
    try {
      const res = await api.get(`/api/recall/conversations/${id}/`);
      setConversation(res.data);
      setEditTitle(res.data.title || "");
      setEditContent(res.data.content || "");
    } catch (e) {
      console.error("Failed to fetch conversation:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchReplies = async () => {
    try {
      const res = await api.get(`/api/recall/conversations/${id}/replies/`);
      setReplies(Array.isArray(res.data) ? res.data : res.data?.results || []);
    } catch (e) {
      console.error("Failed to fetch replies:", e);
    }
  };

  const fetchReactions = async () => {
    try {
      const res = await api.get(`/api/recall/conversations/${id}/reactions/`);
      setReactions(res.data || { reactions: [], user_reaction: null });
    } catch (e) {
      console.error("Failed to fetch reactions:", e);
    }
  };

  const fetchBookmark = async () => {
    try {
      const res = await api.get("/api/recall/bookmarks/");
      const list = Array.isArray(res.data) ? res.data : res.data?.results || [];
      const match = list.find((b) => Number(b.conversation?.id) === Number(id));
      setBookmark({ on: Boolean(match), id: match?.id || null, loading: false });
    } catch (e) {
      setBookmark((p) => ({ ...p, loading: false }));
    }
  };

  const buildReplyTree = (items) => {
    const map = {};
    const roots = [];
    items.forEach((r) => { map[r.id] = { ...r, children: [] }; });
    items.forEach((r) => {
      if (r.parent_reply && map[r.parent_reply]) map[r.parent_reply].children.push(map[r.id]);
      else roots.push(map[r.id]);
    });
    return roots;
  };

  const handleSubmitReply = async (e) => {
    e.preventDefault();
    if (!newReply.trim()) return;
    setSubmitting(true);
    try {
      await api.post(`/api/recall/conversations/${id}/replies/`, { content: newReply });
      setNewReply("");
      fetchReplies();
    } catch (err) {
      console.error("Failed to submit reply:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditReply = async (replyId, content) => {
    try {
      await api.put(`/api/recall/conversations/replies/${replyId}/`, { content });
      fetchReplies();
    } catch (e) {
      console.error("Failed to update reply:", e);
    }
  };

  const handleDeleteReply = async (replyId) => {
    try {
      await api.delete(`/api/recall/conversations/replies/${replyId}/`);
      addToast("Reply deleted", "success");
      fetchReplies();
    } catch (e) {
      addToast("Failed to delete reply", "error");
    }
  };

  const handleReaction = async (type) => {
    if (reactionLoading) return;
    const wasSelected = reactions.user_reaction === type;
    const next = (reactions.reactions || []).map((r) => {
      if (r.reaction_type === type) return { ...r, count: wasSelected ? r.count - 1 : r.count + 1 };
      if (r.reaction_type === reactions.user_reaction) return { ...r, count: r.count - 1 };
      return r;
    });
    setReactions({ reactions: next, user_reaction: wasSelected ? null : type });
    setReactionLoading(true);
    try {
      if (wasSelected) await api.delete(`/api/recall/conversations/${id}/reactions/remove/`);
      else await api.post(`/api/recall/conversations/${id}/reactions/add/`, { reaction_type: type });
      fetchReactions();
    } catch (e) {
      fetchReactions();
    } finally {
      setReactionLoading(false);
    }
  };

  const handleToggleBookmark = async () => {
    setBookmark((p) => ({ ...p, loading: true }));
    try {
      if (bookmark.on && bookmark.id) {
        await api.delete(`/api/recall/bookmarks/${bookmark.id}/`);
        setBookmark({ on: false, id: null, loading: false });
        addToast("Removed from favorites", "success");
      } else {
        const res = await api.post(`/api/recall/conversations/${id}/bookmark/`, { note: "" });
        setBookmark({ on: true, id: res.data?.id || null, loading: false });
        addToast("Added to favorites", "success");
      }
    } catch (e) {
      addToast("Failed to update favorites", "error");
      setBookmark((p) => ({ ...p, loading: false }));
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await api.get("/api/recall/export/conversation-pdf/", { params: { id }, responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `conversation_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      addToast("Conversation exported", "success");
    } catch (e) {
      addToast("Failed to export conversation", "error");
    } finally {
      setExporting(false);
    }
  };

  const handleEditPost = async () => {
    setSavingPost(true);
    try {
      await api.put(`/api/recall/conversations/${id}/`, { title: editTitle, content: editContent });
      setIsEditingPost(false);
      fetchConversation();
    } catch (e) {
      console.error("Failed to update:", e);
    } finally {
      setSavingPost(false);
    }
  };

  const handleDeletePost = async () => {
    if (!window.confirm("Delete this conversation? This cannot be undone.")) return;
    setDeletingPost(true);
    try {
      await api.delete(`/api/recall/conversations/${id}/`);
      addToast("Conversation deleted", "success");
      navigate("/conversations");
    } catch (e) {
      addToast("Failed to delete conversation", "error");
      setDeletingPost(false);
    }
  };

  const handleConvertToDecision = async () => {
    setConverting(true);
    try {
      const res = await api.post("/api/decisions/", {
        title: conversation.title,
        description: conversation.content,
        status: "proposed",
        context: `Converted from conversation #${id}`,
        conversation_id: id,
      });
      addToast("Converted to decision", "success");
      navigate(`/decisions/${res.data.id}`);
    } catch (e) {
      addToast("Failed to convert to decision", "error");
    } finally {
      setConverting(false);
    }
  };

  const handleApplyAI = ({ kind, summary, actionItems }) => {
    const base = conversation?.content || "";
    const block =
      kind === "summary" && summary
        ? `\n\nAI summary:\n${summary}`
        : kind === "actions" && Array.isArray(actionItems) && actionItems.length
          ? `\n\nAI suggested next actions:\n${actionItems.map((i) => `- ${i}`).join("\n")}`
          : "";
    if (!block) return;
    setEditTitle(conversation?.title || "");
    setEditContent(`${base}${block}`);
    setIsEditingPost(true);
    addToast("AI draft added to the editor", "success");
  };

  if (loading) {
    return <div className="cd"><div className="cd-loading"><div className="cd-spinner" /></div></div>;
  }

  if (!conversation) {
    return (
      <div className="cd">
        <Link to="/conversations" className="cd-back"><ArrowLeftIcon /> All conversations</Link>
        <div className="cd-card">
          <h1 className="cd-title" style={{ fontSize: 20 }}>Conversation not found</h1>
          <p style={{ color: "var(--app-muted)", marginTop: 8 }}>
            The thread may have been deleted or is no longer available.
          </p>
        </div>
      </div>
    );
  }

  const authorName = typeof conversation.author === "string" ? conversation.author : conversation.author?.username || "Unknown";
  const avatarUrl = getAvatarUrl(conversation.author_avatar || conversation.author?.avatar);
  const replyCount = replies.length;
  const reactionTotal = (reactions.reactions || []).reduce((a, r) => a + (r.count || 0), 0);
  const type = (conversation.post_type || "discussion").replace("_", " ");
  const { Icon: TypeIcon } = typeMeta(conversation.post_type);
  const createdLabel = new Date(conversation.created_at).toLocaleDateString();
  const updatedLabel = conversation.updated_at ? new Date(conversation.updated_at).toLocaleDateString() : createdLabel;
  const isOwner = Number(conversation.author?.id || conversation.author_id) === Number(currentUserId);
  const askQuestion = `For the conversation titled "${conversation.title || "Untitled conversation"}", what needs a response, decision, or follow-up next?`;

  return (
    <div className="cd">
      <Link to="/conversations" className="cd-back"><ArrowLeftIcon /> All conversations</Link>

      <header className="cd-head">
        <div className="cd-head-meta">
          <span className="cd-type-badge">
            <TypeIcon /> {type}
          </span>
          <span style={{ fontSize: 12.5, color: "var(--app-muted)" }}>
            {replyCount} {replyCount === 1 ? "reply" : "replies"} · {reactionTotal} reactions
          </span>
        </div>

        {isEditingPost ? (
          <input className="cd-title-input" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
        ) : (
          <h1 className="cd-title">{conversation.title}</h1>
        )}

        <div className="cd-byline">
          <span className="cd-avatar">
            {avatarUrl ? <img src={avatarUrl} alt={authorName} /> : initial(authorName)}
          </span>
          <div>
            <div className="cd-byline-name">{authorName}</div>
            <div className="cd-byline-meta">Created {createdLabel} · Updated {updatedLabel}</div>
          </div>
        </div>

        <div className="cd-actions">
          <button type="button" className="cd-btn cd-btn-primary" onClick={() => navigate(buildAskRecallPath(askQuestion))}>
            <SparklesIcon /> Ask Recall
          </button>
          <button type="button" className="cd-btn" onClick={handleConvertToDecision} disabled={converting}>
            {converting ? <ArrowPathIcon style={{ animation: "cd-spin 1s linear infinite" }} /> : <CheckCircleIcon />}
            Convert to decision
          </button>
          <button type="button" className={`cd-btn ${bookmark.on ? "is-on" : ""}`} onClick={handleToggleBookmark} disabled={bookmark.loading}>
            {bookmark.on ? <StarSolidIcon /> : <StarIcon />}
            {bookmark.on ? "Favorited" : "Favorite"}
          </button>
          <button type="button" className="cd-btn" onClick={handleExport} disabled={exporting}>
            <ArrowDownTrayIcon /> {exporting ? "Exporting…" : "Export"}
          </button>
          {isOwner ? (
            isEditingPost ? (
              <>
                <button type="button" className="cd-btn cd-btn-primary" onClick={handleEditPost} disabled={savingPost}>
                  {savingPost ? "Saving…" : "Save changes"}
                </button>
                <button type="button" className="cd-btn" onClick={() => { setIsEditingPost(false); setEditTitle(conversation.title || ""); setEditContent(conversation.content || ""); }}>
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button type="button" className="cd-btn" onClick={() => setIsEditingPost(true)}>
                  <PencilSquareIcon /> Edit
                </button>
                <button type="button" className="cd-btn cd-btn-danger" onClick={handleDeletePost} disabled={deletingPost}>
                  <TrashIcon /> Delete
                </button>
              </>
            )
          ) : null}
        </div>
      </header>

      <div className="cd-layout">
        <div className="cd-main">
          {/* Original post */}
          <section className="cd-card">
            {isEditingPost ? (
              <textarea className="cd-edit-area" value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={10} />
            ) : (
              <div className="cd-content">
                <RichTextRenderer content={conversation.content} darkMode={darkMode} />
              </div>
            )}

            <div className="cd-reactions">
              {REACTIONS.map(({ type: rt, Icon, label }) => {
                const count = (reactions.reactions || []).find((r) => r.reaction_type === rt)?.count || 0;
                const on = reactions.user_reaction === rt;
                return (
                  <button
                    key={rt}
                    type="button"
                    className={`cd-react ${rt} ${on ? "is-on" : ""}`}
                    onClick={() => handleReaction(rt)}
                    disabled={reactionLoading}
                  >
                    <Icon /> {label} <span className="cd-react-count">{count}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Replies */}
          <section className="cd-card">
            <h2 className="cd-replies-head"><ChatBubbleLeftIcon /> Replies ({replyCount})</h2>

            {replyCount === 0 ? (
              <div className="cd-replies-empty">No replies yet. Be the first to respond.</div>
            ) : (
              buildReplyTree(replies).map((reply) => (
                <ReplyItem
                  key={reply.id}
                  reply={reply}
                  onEdit={handleEditReply}
                  onDelete={handleDeleteReply}
                  currentUserId={currentUserId}
                  darkMode={darkMode}
                />
              ))
            )}

            <div className="cd-composer">
              <p className="cd-composer-label">Add a reply</p>
              <form onSubmit={handleSubmitReply}>
                <MentionTagInput
                  value={newReply}
                  onChange={(e) => setNewReply(e.target.value)}
                  placeholder="Share your thoughts…"
                  rows={4}
                  darkMode={darkMode}
                />
                <div className="cd-edit-actions">
                  <button type="submit" className="cd-btn cd-btn-primary" disabled={submitting || !newReply.trim()}>
                    {submitting ? "Posting…" : "Reply"}
                  </button>
                </div>
              </form>
            </div>
          </section>
        </div>

        {/* Right rail */}
        <aside className="cd-rail">
          <div className="cd-rail-card">
            <p className="cd-rail-title">Details</p>
            <div className="cd-details">
              <div>
                <div className="cd-detail-label">Type</div>
                <div className="cd-detail-value">{type}</div>
              </div>
              <div>
                <div className="cd-detail-label">Author</div>
                <div className="cd-detail-value" style={{ textTransform: "none" }}>{authorName}</div>
              </div>
              <div>
                <div className="cd-detail-label">Replies</div>
                <div className="cd-detail-value">{replyCount}</div>
              </div>
              <div>
                <div className="cd-detail-label">Reactions</div>
                <div className="cd-detail-value">{reactionTotal}</div>
              </div>
              <div>
                <div className="cd-detail-label">Created</div>
                <div className="cd-detail-value" style={{ textTransform: "none" }}>{createdLabel}</div>
              </div>
              <div>
                <div className="cd-detail-label">Updated</div>
                <div className="cd-detail-value" style={{ textTransform: "none" }}>{updatedLabel}</div>
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <QuickLink sourceType="conversations.conversation" sourceId={id} />
            </div>
          </div>

          <div className="cd-rail-card">
            <AIAssistant content={conversation?.content} contentType="conversation" onApply={handleApplyAI} />
          </div>

          <div className="cd-rail-card">
            <ContextPanel contentType="conversations.conversation" objectId={id} />
          </div>
        </aside>
      </div>
    </div>
  );
}
