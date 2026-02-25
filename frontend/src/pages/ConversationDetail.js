import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeftIcon,
  ChatBubbleLeftIcon,
  ExclamationTriangleIcon,
  HandThumbUpIcon,
  QuestionMarkCircleIcon,
} from "@heroicons/react/24/outline";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { useToast } from "../components/Toast";
import { AIEnhancementButton, AIResultsPanel } from "../components/AIEnhancements";
import api from "../services/api";
import MentionTagInput from "../components/MentionTagInput";
import RichTextRenderer from "../components/RichTextRenderer";
import { FavoriteButton, ExportButton, UndoRedoButtons } from "../components/QuickWinFeatures";
import { getAvatarUrl } from "../utils/avatarUtils";
import AIAssistant from "../components/AIAssistant";
import ContextPanel from "../components/ContextPanel";
import QuickLink from "../components/QuickLink";

const ReplyItem = ({ reply, depth = 0, onEdit, onDelete, currentUserId, palette, darkMode }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(reply.content);

  const authorName =
    typeof reply.author === "string" ? reply.author : reply.author?.username || "Unknown";
  const avatarUrl = getAvatarUrl(reply.author?.avatar || reply.author_avatar);

  const handleSave = async () => {
    await onEdit(reply.id, editContent);
    setIsEditing(false);
  };

  return (
    <div style={{ marginLeft: depth > 0 ? 24 : 0 }}>
      <article style={{ ...replyCard, background: palette.panel, border: `1px solid ${palette.border}` }}>
        <div style={replyHeader}>
          <div style={replyAuthorWrap}>
            <div style={avatarSmall}>
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={authorName}
                  style={avatarImage}
                  onError={(event) => {
                    event.target.style.display = "none";
                    event.target.parentElement.innerHTML = `<span style="color:#20140f;font-size:12px;font-weight:700;">${authorName
                      .charAt(0)
                      .toUpperCase()}</span>`;
                  }}
                />
              ) : (
                <span style={avatarSmallInitial}>{authorName.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div>
              <p style={{ ...authorNameStyle, color: palette.text }}>{authorName}</p>
              <p style={{ ...metaText, color: palette.muted }}>
                {new Date(reply.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          {reply.author_id === currentUserId && (
            <div style={replyActionRow}>
              <button onClick={() => setIsEditing((value) => !value)} style={inlineAction}>
                {isEditing ? "Cancel" : "Edit"}
              </button>
              <button onClick={() => onDelete(reply.id)} style={inlineActionDanger}>
                Delete
              </button>
            </div>
          )}
        </div>

        {isEditing ? (
          <div>
            <textarea
              value={editContent}
              onChange={(event) => setEditContent(event.target.value)}
              rows={3}
              style={{ ...textareaInput, border: `1px solid ${palette.border}`, color: palette.text }}
            />
            <button onClick={handleSave} style={primaryButton}>
              Save
            </button>
          </div>
        ) : (
          <RichTextRenderer content={reply.content} darkMode={darkMode} />
        )}
      </article>

      {reply.children?.map((child) => (
        <ReplyItem
          key={child.id}
          reply={child}
          depth={depth + 1}
          onEdit={onEdit}
          onDelete={onDelete}
          currentUserId={currentUserId}
          palette={palette}
          darkMode={darkMode}
        />
      ))}
    </div>
  );
};

function ConversationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const { addToast } = useToast();

  const [conversation, setConversation] = useState(null);
  const [replies, setReplies] = useState([]);
  const [newReply, setNewReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [currentUserId, setCurrentUserId] = useState(null);
  const [reactions, setReactions] = useState({ reactions: [], user_reaction: null });
  const [savingPost, setSavingPost] = useState(false);
  const [deletingPost, setDeletingPost] = useState(false);
  const [reactionLoading, setReactionLoading] = useState(false);
  const [selectedType, setSelectedType] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    post_type: "",
    priority: "medium",
  });
  const [creating, setCreating] = useState(false);
  const [converting, setConverting] = useState(false);
  const [aiResults, setAiResults] = useState(null);
  const [isNarrow, setIsNarrow] = useState(window.innerWidth < 1080);

  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth < 1080);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const localUser = JSON.parse(localStorage.getItem("user") || "{}");
    setCurrentUserId(localUser.id);
    if (id !== "new") {
      fetchConversation();
      fetchReplies();
      fetchReactions();
    } else {
      setLoading(false);
    }
  }, [id]);

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

  const fetchConversation = async () => {
    try {
      const response = await api.get(`/api/recall/conversations/${id}/`);
      setConversation(response.data);
      setEditTitle(response.data.title);
      setEditContent(response.data.content);
    } catch (error) {
      console.error("Failed to fetch conversation:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReplies = async () => {
    try {
      const response = await api.get(`/api/recall/conversations/${id}/replies/`);
      setReplies(response.data);
    } catch (error) {
      console.error("Failed to fetch replies:", error);
    }
  };

  const fetchReactions = async () => {
    try {
      const response = await api.get(`/api/recall/conversations/${id}/reactions/`);
      setReactions(response.data);
    } catch (error) {
      console.error("Failed to fetch reactions:", error);
    }
  };

  const handleEditPost = async () => {
    setSavingPost(true);
    try {
      await api.put(`/api/recall/conversations/${id}/`, { title: editTitle, content: editContent });
      setIsEditingPost(false);
      fetchConversation();
    } catch (error) {
      console.error("Failed to update:", error);
    } finally {
      setSavingPost(false);
    }
  };

  const handleDeletePost = async () => {
    setDeletingPost(true);
    try {
      await api.delete(`/api/recall/conversations/${id}/`);
      addToast("Conversation deleted successfully", "success");
      window.location.href = "/conversations";
    } catch (error) {
      console.error("Failed to delete:", error);
      addToast("Failed to delete conversation", "error");
      setDeletingPost(false);
    }
  };

  const handleEditReply = async (replyId, content) => {
    try {
      await api.put(`/api/recall/conversations/replies/${replyId}/`, { content });
      fetchReplies();
    } catch (error) {
      console.error("Failed to update reply:", error);
    }
  };

  const handleDeleteReply = async (replyId) => {
    try {
      await api.delete(`/api/recall/conversations/replies/${replyId}/`);
      addToast("Reply deleted successfully", "success");
      fetchReplies();
    } catch (error) {
      console.error("Failed to delete reply:", error);
      addToast("Failed to delete reply", "error");
    }
  };

  const handleSubmitReply = async (event) => {
    event.preventDefault();
    if (!newReply.trim()) return;
    setSubmitting(true);
    try {
      await api.post(`/api/recall/conversations/${id}/replies/`, { content: newReply });
      setNewReply("");
      fetchReplies();
    } catch (error) {
      console.error("Failed to submit reply:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReaction = async (type) => {
    if (reactionLoading) return;
    const wasSelected = reactions.user_reaction === type;
    const newReactions = reactions.reactions.map((reaction) => {
      if (reaction.reaction_type === type) {
        return { ...reaction, count: wasSelected ? reaction.count - 1 : reaction.count + 1 };
      }
      if (reaction.reaction_type === reactions.user_reaction) {
        return { ...reaction, count: reaction.count - 1 };
      }
      return reaction;
    });

    setReactions({ reactions: newReactions, user_reaction: wasSelected ? null : type });
    setReactionLoading(true);

    try {
      if (wasSelected) {
        await api.delete(`/api/recall/conversations/${id}/reactions/remove/`);
      } else {
        await api.post(`/api/recall/conversations/${id}/reactions/add/`, { reaction_type: type });
      }
      fetchReactions();
    } catch (error) {
      console.error("Failed to update reaction:", error);
      fetchReactions();
    } finally {
      setReactionLoading(false);
    }
  };

  const handleCreateConversation = async () => {
    if (!formData.title.trim() || !formData.content.trim() || !formData.post_type) {
      alert("Please fill in all fields");
      return;
    }
    setCreating(true);
    try {
      const response = await api.post("/api/recall/conversations/", formData);
      navigate(`/conversations/${response.data.id}`);
    } catch (error) {
      console.error("Failed to create conversation:", error);
      alert("Failed to create conversation");
    } finally {
      setCreating(false);
    }
  };

  const handleConvertToDecision = async () => {
    setConverting(true);
    try {
      const response = await api.post("/api/decisions/", {
        title: conversation.title,
        description: conversation.content,
        status: "proposed",
        context: `Converted from conversation #${id}`,
        conversation_id: id,
      });
      addToast("Successfully converted to decision", "success");
      navigate(`/decisions/${response.data.id}`);
    } catch (error) {
      console.error("Failed to convert to decision:", error);
      addToast("Failed to convert to decision", "error");
    } finally {
      setConverting(false);
    }
  };

  const buildReplyTree = (items) => {
    const map = {};
    const roots = [];
    items.forEach((reply) => {
      map[reply.id] = { ...reply, children: [] };
    });
    items.forEach((reply) => {
      if (reply.parent_reply && map[reply.parent_reply]) {
        map[reply.parent_reply].children.push(map[reply.id]);
      } else {
        roots.push(map[reply.id]);
      }
    });
    return roots;
  };

  if (id === "new") {
    return (
      <div style={page}>
        <Link to="/conversations" style={{ ...backLink, color: palette.muted }}>
          <ArrowLeftIcon style={icon14} /> Back to Conversations
        </Link>
        {!selectedType ? (
          <section>
            <h1 style={{ ...h1, color: palette.text }}>Create New Conversation</h1>
            <p style={{ ...sub, color: palette.muted }}>Choose a conversation type to start.</p>
            <div style={typeGrid}>
              {[
                { type: "update", label: "Update", desc: "Team announcements and status updates" },
                { type: "decision", label: "Decision", desc: "Formal decisions with rationale" },
                { type: "question", label: "Question", desc: "Questions seeking answers" },
                { type: "proposal", label: "Proposal", desc: "Proposals for discussion" },
              ].map(({ type, label, desc }) => (
                <button
                  key={type}
                  onClick={() => {
                    setSelectedType(type);
                    setFormData({ ...formData, post_type: type });
                  }}
                  style={{ ...typeCard, background: palette.panel, border: `1px solid ${palette.border}`, color: palette.text }}
                >
                  <p style={typeLabel}>{label}</p>
                  <p style={{ ...sub, margin: 0, color: palette.muted }}>{desc}</p>
                </button>
              ))}
            </div>
          </section>
        ) : (
          <section style={{ ...formCard, background: palette.panel, border: `1px solid ${palette.border}` }}>
            <h1 style={{ ...h1, color: palette.text }}>
              Create {formData.post_type.charAt(0).toUpperCase() + formData.post_type.slice(1)}
            </h1>
            <div style={formStack}>
              <label style={label}>Title</label>
              <input
                value={formData.title}
                onChange={(event) => setFormData({ ...formData, title: event.target.value })}
                style={{ ...textInput, background: palette.panelAlt, border: `1px solid ${palette.border}`, color: palette.text }}
              />
              <label style={label}>Content</label>
              <textarea
                value={formData.content}
                onChange={(event) => setFormData({ ...formData, content: event.target.value })}
                rows={8}
                style={{ ...textareaInput, background: palette.panelAlt, border: `1px solid ${palette.border}`, color: palette.text }}
              />
              <label style={label}>Priority</label>
              <select
                value={formData.priority}
                onChange={(event) => setFormData({ ...formData, priority: event.target.value })}
                style={{ ...textInput, background: palette.panelAlt, border: `1px solid ${palette.border}`, color: palette.text }}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
              <div style={buttonRow}>
                <button onClick={handleCreateConversation} style={primaryButton}>
                  {creating ? "Creating..." : "Create Conversation"}
                </button>
                <button onClick={() => setSelectedType(null)} style={secondaryButton}>
                  Cancel
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div style={loadingWrap}>
        <div style={spinner} />
      </div>
    );
  }

  if (!conversation) {
    return (
      <div style={loadingWrap}>
        <p style={{ color: palette.muted }}>Conversation not found.</p>
      </div>
    );
  }

  const authorName =
    typeof conversation.author === "string"
      ? conversation.author
      : conversation.author?.username || "Unknown";

  return (
    <div style={page}>
      <Link to="/conversations" style={{ ...backLink, color: palette.muted }}>
        <ArrowLeftIcon style={icon14} /> Back
      </Link>

      <div style={{ ...grid, gridTemplateColumns: isNarrow ? "minmax(0,1fr)" : "minmax(0,1fr) 360px" }}>
        <div>
          <section style={{ ...card, background: palette.panel, border: `1px solid ${palette.border}` }}>
            {isEditingPost ? (
              <input
                value={editTitle}
                onChange={(event) => setEditTitle(event.target.value)}
                style={{ ...titleInput, color: palette.text, borderBottom: `1px solid ${palette.border}` }}
              />
            ) : (
              <h1 style={{ ...titleMain, color: palette.text }}>{conversation.title}</h1>
            )}
            <div style={authorRow}>
              <div style={avatarWrap}>
                {getAvatarUrl(conversation.author_avatar || conversation.author?.avatar) ? (
                  <img
                    src={getAvatarUrl(conversation.author_avatar || conversation.author?.avatar)}
                    alt={authorName}
                    style={avatarImage}
                  />
                ) : (
                  <span style={avatarInitial}>{authorName.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div>
                <p style={{ ...authorNameStyle, color: palette.text }}>{authorName}</p>
                <p style={{ ...metaText, color: palette.muted }}>
                  {new Date(conversation.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div style={actionRow}>
              <QuickLink sourceType="conversations.conversation" sourceId={id} />
              <button
                onClick={handleConvertToDecision}
                disabled={converting || savingPost || deletingPost}
                style={ghostSuccessButton}
              >
                {converting ? "Converting..." : "Convert"}
              </button>
              <AIEnhancementButton
                content={conversation?.content}
                title={conversation?.title}
                type="conversation"
                onResult={(feature, data) => setAiResults(data)}
              />
              <FavoriteButton conversationId={id} />
              <ExportButton conversationId={id} type="conversation" />
              <UndoRedoButtons />
              {conversation.author_id === currentUserId && (
                <>
                  <button onClick={() => setIsEditingPost((value) => !value)} style={smallOutlineButton}>
                    {isEditingPost ? "Cancel" : "Edit"}
                  </button>
                  <button onClick={handleDeletePost} style={smallDangerButton}>
                    {deletingPost ? "Deleting..." : "Delete"}
                  </button>
                </>
              )}
            </div>
          </section>

          <AIAssistant content={conversation?.content} contentType="conversation" />

          <section style={{ ...card, background: palette.panel, border: `1px solid ${palette.border}` }}>
            {isEditingPost ? (
              <>
                <textarea
                  value={editContent}
                  onChange={(event) => setEditContent(event.target.value)}
                  rows={10}
                  style={{ ...textareaInput, border: `1px solid ${palette.border}`, color: palette.text }}
                />
                <button onClick={handleEditPost} style={primaryButton}>
                  {savingPost ? "Saving..." : "Save Changes"}
                </button>
              </>
            ) : (
              <RichTextRenderer content={conversation.content} darkMode={darkMode} />
            )}
          </section>

          <section style={{ ...card, background: palette.panel, border: `1px solid ${palette.border}` }}>
            <div style={reactionRow}>
              {[
                { type: "agree", icon: HandThumbUpIcon, label: "Agree" },
                { type: "unsure", icon: QuestionMarkCircleIcon, label: "Unsure" },
                { type: "concern", icon: ExclamationTriangleIcon, label: "Concern" },
              ].map(({ type, icon: Icon, label }) => (
                <button
                  key={type}
                  onClick={() => handleReaction(type)}
                  style={{
                    ...reactionButton,
                    background: reactions.user_reaction === type ? "#3b82f6" : palette.panelAlt,
                    color: reactions.user_reaction === type ? "#fff" : palette.text,
                    border: `1px solid ${palette.border}`,
                  }}
                >
                  <Icon style={icon14} />
                  {label} ({reactions.reactions.find((reaction) => reaction.reaction_type === type)?.count || 0})
                </button>
              ))}
            </div>
          </section>

          <section style={{ ...card, background: palette.panel, border: `1px solid ${palette.border}` }}>
            <h2 style={{ ...h2, color: palette.text }}>
              <ChatBubbleLeftIcon style={icon18} /> Replies ({replies.length})
            </h2>

            {replies.length === 0 ? (
              <div style={{ ...emptyState, border: `1px solid ${palette.border}`, color: palette.muted }}>
                No replies yet. Be the first to comment.
              </div>
            ) : (
              <div style={replyList}>
                {buildReplyTree(replies).map((reply) => (
                  <ReplyItem
                    key={reply.id}
                    reply={reply}
                    onEdit={handleEditReply}
                    onDelete={handleDeleteReply}
                    currentUserId={currentUserId}
                    palette={palette}
                    darkMode={darkMode}
                  />
                ))}
              </div>
            )}

            <div style={{ ...composer, border: `1px solid ${palette.border}`, background: palette.panelAlt }}>
              <p style={{ ...metaText, marginBottom: 8, color: palette.text }}>Add a comment</p>
              <form onSubmit={handleSubmitReply}>
                <MentionTagInput
                  value={newReply}
                  onChange={(event) => setNewReply(event.target.value)}
                  placeholder="Share your thoughts..."
                  rows={4}
                  darkMode={darkMode}
                />
                <button type="submit" disabled={submitting || !newReply.trim()} style={primaryButton}>
                  {submitting ? "Posting..." : "Reply"}
                </button>
              </form>
            </div>
          </section>
        </div>

        <div>
          <ContextPanel contentType="conversations.conversation" objectId={id} />
        </div>
      </div>

      <AIResultsPanel results={aiResults} onClose={() => setAiResults(null)} />
    </div>
  );
}

const page = { maxWidth: 1280, margin: "0 auto" };
const grid = { display: "grid", gap: 12 };
const loadingWrap = { minHeight: 320, display: "grid", placeItems: "center" };
const spinner = {
  width: 28,
  height: 28,
  border: "2px solid rgba(120,120,120,0.35)",
  borderTopColor: "#3b82f6",
  borderRadius: "50%",
  animation: "spin 1s linear infinite",
};
const backLink = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  textDecoration: "none",
  fontSize: 13,
  fontWeight: 700,
  marginBottom: 10,
};
const h1 = { margin: "0 0 8px", fontSize: "clamp(1.7rem, 3.5vw, 2.2rem)" };
const h2 = { margin: "0 0 10px", fontSize: 16, display: "flex", alignItems: "center", gap: 7 };
const sub = { margin: "0 0 12px", fontSize: 14 };
const card = { borderRadius: 14, padding: 14, marginBottom: 10 };
const typeGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10 };
const typeCard = { borderRadius: 14, padding: 16, textAlign: "left", cursor: "pointer" };
const typeLabel = { margin: "0 0 6px", fontSize: 16, fontWeight: 700 };
const formCard = { borderRadius: 14, padding: 16 };
const formStack = { display: "grid", gap: 10 };
const label = { fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" };
const textInput = { borderRadius: 10, padding: "10px 12px", fontSize: 14, outline: "none", width: "100%" };
const textareaInput = { ...textInput, resize: "vertical" };
const buttonRow = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 };
const primaryButton = {
  marginTop: 10,
  border: "none",
  borderRadius: 10,
  background: "linear-gradient(135deg, #ffd390, #ff9f62)",
  color: "#20140f",
  padding: "10px 14px",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};
const secondaryButton = {
  ...primaryButton,
  background: "transparent",
  color: "#7d6d5a",
  border: "1px solid rgba(120,120,120,0.45)",
};
const titleMain = { margin: "0 0 10px", fontSize: "clamp(1.3rem,2.8vw,1.8rem)" };
const titleInput = { width: "100%", border: "none", background: "transparent", fontSize: 22, fontWeight: 700, marginBottom: 10, paddingBottom: 8, outline: "none" };
const authorRow = { display: "flex", alignItems: "center", gap: 8 };
const avatarWrap = { width: 34, height: 34, borderRadius: 10, overflow: "hidden", background: "linear-gradient(135deg,#ffcb8b,#ff935d)", display: "grid", placeItems: "center" };
const avatarSmall = { width: 28, height: 28, borderRadius: 8, overflow: "hidden", background: "linear-gradient(135deg,#ffcb8b,#ff935d)", display: "grid", placeItems: "center" };
const avatarImage = { width: "100%", height: "100%", objectFit: "cover" };
const avatarInitial = { color: "#20140f", fontSize: 13, fontWeight: 700 };
const avatarSmallInitial = { color: "#20140f", fontSize: 12, fontWeight: 700 };
const authorNameStyle = { margin: 0, fontSize: 13, fontWeight: 700 };
const metaText = { margin: "2px 0 0", fontSize: 11 };
const actionRow = { display: "flex", alignItems: "center", gap: 6, marginTop: 10, flexWrap: "wrap" };
const ghostSuccessButton = { border: "1px solid rgba(16,185,129,0.45)", borderRadius: 8, background: "rgba(16,185,129,0.08)", color: "#10b981", fontSize: 12, padding: "6px 10px", cursor: "pointer" };
const smallOutlineButton = { border: "1px solid rgba(120,120,120,0.45)", borderRadius: 8, background: "transparent", color: "#94a3b8", fontSize: 12, padding: "6px 10px", cursor: "pointer" };
const smallDangerButton = { border: "1px solid rgba(239,68,68,0.5)", borderRadius: 8, background: "rgba(239,68,68,0.1)", color: "#ef4444", fontSize: 12, padding: "6px 10px", cursor: "pointer" };
const reactionRow = { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" };
const reactionButton = { display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 10, padding: "7px 11px", fontSize: 12, fontWeight: 700, cursor: "pointer" };
const emptyState = { borderRadius: 10, padding: "24px 14px", textAlign: "center", fontSize: 13, marginBottom: 10 };
const replyList = { display: "grid", gap: 8, marginBottom: 10 };
const composer = { borderRadius: 10, padding: 12 };
const replyCard = { borderRadius: 10, padding: 10, marginBottom: 8 };
const replyHeader = { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 8 };
const replyAuthorWrap = { display: "flex", alignItems: "center", gap: 8 };
const replyActionRow = { display: "flex", gap: 6 };
const inlineAction = { border: "none", background: "transparent", color: "#94a3b8", fontSize: 11, fontWeight: 700, cursor: "pointer" };
const inlineActionDanger = { ...inlineAction, color: "#ef4444" };
const icon18 = { width: 18, height: 18 };
const icon14 = { width: 14, height: 14 };

export default ConversationDetail;
