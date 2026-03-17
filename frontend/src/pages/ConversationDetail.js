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
import BrandedTechnicalIllustration from "../components/BrandedTechnicalIllustration";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";
import { WorkspaceHero, WorkspacePanel, WorkspaceToolbar } from "../components/WorkspaceChrome";

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
      <article className="ui-card-lift ui-smooth" style={{ ...replyCard, background: palette.panel, border: `1px solid ${palette.border}` }}>
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
                    event.target.parentElement.innerHTML = `<span style="color:var(--app-button-text);font-size:12px;font-weight:700;">${authorName
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
            <button className="ui-btn-polish ui-focus-ring" onClick={handleSave} style={primaryButton}>
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

  const palette = useMemo(() => {
    const basePalette = getProjectPalette(darkMode);
    return {
      ...basePalette,
      panel: basePalette.card,
      panelAlt: basePalette.cardAlt,
    };
  }, [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

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
      <div style={{ ...page, display: "grid", gap: 16 }}>
        <WorkspaceHero
          palette={palette}
          darkMode={darkMode}
          eyebrow="Conversation Composer"
          title={selectedType ? `Create ${formData.post_type.charAt(0).toUpperCase() + formData.post_type.slice(1)}` : "Create New Conversation"}
          description={selectedType ? "Shape the thread with a clearer title, context, and priority before it lands in the shared stream." : "Choose a conversation type to start from a stronger, more intentional template."}
          stats={[
            { label: "Route", value: "New thread", helper: "This page creates a fresh conversation record." },
            { label: "Priority", value: formData.priority || "medium", helper: "Current urgency setting." },
          ]}
          actions={
            <button className="ui-btn-polish ui-focus-ring" onClick={() => navigate("/conversations")} style={ui.secondaryButton}>
              <ArrowLeftIcon style={icon14} /> Back to Conversations
            </button>
          }
        />

        {!selectedType ? (
          <WorkspacePanel
            palette={palette}
            eyebrow="Thread Types"
            title="Choose the shape of the conversation"
            description="Each thread type now reads like a deliberate editorial choice instead of a plain utility card."
          >
            <div style={typeGrid}>
              {[
                { type: "update", label: "Update", desc: "Team announcements and status updates" },
                { type: "decision", label: "Decision", desc: "Formal decisions with rationale" },
                { type: "question", label: "Question", desc: "Questions seeking answers" },
                { type: "proposal", label: "Proposal", desc: "Proposals for discussion" },
              ].map(({ type, label, desc }) => (
                <button
                  key={type}
                  className="ui-card-lift ui-smooth"
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
          </WorkspacePanel>
        ) : (
          <>
            <WorkspaceToolbar palette={palette}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span style={{ ...heroChip, border: `1px solid ${palette.border}`, color: palette.text, background: palette.panelAlt }}>{formData.post_type}</span>
                <span style={{ ...heroChip, border: `1px solid ${palette.border}`, color: palette.text, background: palette.panelAlt }}>{formData.priority}</span>
              </div>
            </WorkspaceToolbar>
            <WorkspacePanel
              palette={palette}
              eyebrow="Composer"
              title={`Create ${formData.post_type.charAt(0).toUpperCase() + formData.post_type.slice(1)}`}
              description="Write the thread with enough context that the team can react, reply, or convert it into a decision later."
            >
              <div style={formStack}>
                <label style={label}>Title</label>
                <input
                  value={formData.title}
                  onChange={(event) => setFormData({ ...formData, title: event.target.value })}
                  style={{ ...ui.input, background: palette.panelAlt, color: palette.text }}
                />
                <label style={label}>Content</label>
                <textarea
                  value={formData.content}
                  onChange={(event) => setFormData({ ...formData, content: event.target.value })}
                  rows={8}
                  style={{ ...ui.input, background: palette.panelAlt, color: palette.text, resize: "vertical" }}
                />
                <label style={label}>Priority</label>
                <select
                  value={formData.priority}
                  onChange={(event) => setFormData({ ...formData, priority: event.target.value })}
                  style={{ ...ui.input, background: palette.panelAlt, color: palette.text }}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
                <div style={buttonRow}>
                  <button onClick={handleCreateConversation} style={ui.primaryButton}>
                    {creating ? "Creating..." : "Create Conversation"}
                  </button>
                  <button onClick={() => setSelectedType(null)} style={ui.secondaryButton}>
                    Cancel
                  </button>
                </div>
              </div>
            </WorkspacePanel>
          </>
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
  const replyCount = replies.length;
  const reactionTotal = (reactions.reactions || []).reduce((acc, row) => acc + (row.count || 0), 0);
  const conversationType = (conversation.post_type || "discussion").replace("_", " ");
  const createdLabel = new Date(conversation.created_at).toLocaleDateString();
  const updatedLabel = conversation.updated_at
    ? new Date(conversation.updated_at).toLocaleDateString()
    : createdLabel;

  return (
    <div style={{ ...page, position: "relative", fontFamily: "'Sora', 'Space Grotesk', 'Segoe UI', sans-serif" }}>
      <div style={{ ...ambientLayer, background: darkMode ? "radial-gradient(circle at 7% 4%, rgba(59,130,246,0.2), transparent 34%), radial-gradient(circle at 90% 8%, rgba(16,185,129,0.16), transparent 30%)" : "radial-gradient(circle at 7% 4%, rgba(59,130,246,0.14), transparent 34%), radial-gradient(circle at 90% 8%, var(--app-success-soft), transparent 30%)" }} />
      <WorkspaceHero
        palette={palette}
        darkMode={darkMode}
        eyebrow={`Conversation Thread #${id}`}
        title={conversation.title}
        description="Track discussion context, reactions, and decisions from one structured workspace."
        stats={[
          { label: "Replies", value: `${replyCount}`, helper: "Responses attached to the thread." },
          { label: "Reactions", value: `${reactionTotal}`, helper: "Signals from the team." },
          { label: "Updated", value: updatedLabel, helper: "Most recent visible activity." },
        ]}
        aside={!isNarrow ? <BrandedTechnicalIllustration darkMode={darkMode} compact /> : null}
        actions={
          <>
            <Link className="ui-btn-polish ui-focus-ring" to="/conversations" style={{ ...ui.secondaryButton, textDecoration: "none" }}>
              <ArrowLeftIcon style={icon14} /> All Conversations
            </Link>
            <button className="ui-btn-polish ui-focus-ring" onClick={() => navigate("/decisions")} style={ui.secondaryButton}>
              Decision Hub
            </button>
            <button className="ui-btn-polish ui-focus-ring" onClick={fetchConversation} style={ui.secondaryButton}>
              Refresh
            </button>
          </>
        }
      />

      <WorkspaceToolbar palette={palette}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span style={{ ...heroChip, border: `1px solid ${palette.border}`, color: palette.text, background: palette.panelAlt }}>{conversationType}</span>
          <span style={{ ...heroChip, border: `1px solid ${palette.border}`, color: palette.text, background: palette.panelAlt }}>{replyCount} replies</span>
          <span style={{ ...heroChip, border: `1px solid ${palette.border}`, color: palette.text, background: palette.panelAlt }}>{reactionTotal} reactions</span>
        </div>
      </WorkspaceToolbar>

      <div className="ui-enter" style={{ ...grid, gridTemplateColumns: isNarrow ? "minmax(0,1fr)" : "minmax(0,1fr) 360px", "--ui-delay": "110ms" }}>
        <div>
          <section className="ui-enter ui-card-lift ui-smooth" style={{ ...card, background: "linear-gradient(135deg,var(--app-surface-alt),var(--app-surface))", border: `1px solid ${palette.border}`, "--ui-delay": "140ms" }}>
            {isEditingPost ? (
              <input
                value={editTitle}
                onChange={(event) => setEditTitle(event.target.value)}
                style={{ ...titleInput, color: palette.text, borderBottom: `1px solid ${palette.border}` }}
              />
            ) : (
              <h1 style={{ ...titleMain, color: palette.text }}>{conversation.title}</h1>
            )}
            <div style={heroSignals}>
              <span style={{ ...signalChip, border: `1px solid ${palette.border}`, color: palette.text, background: palette.panelAlt }}>{conversationType}</span>
              <span style={{ ...signalChip, border: `1px solid ${palette.border}`, color: palette.text, background: palette.panelAlt }}>{replyCount} replies</span>
              <span style={{ ...signalChip, border: `1px solid ${palette.border}`, color: palette.text, background: palette.panelAlt }}>{reactionTotal} reactions</span>
            </div>
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
                  Created {createdLabel}
                </p>
              </div>
            </div>

            <div style={actionRow}>
              <QuickLink sourceType="conversations.conversation" sourceId={id} />
              <button
                className="ui-btn-polish ui-focus-ring"
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
                  <button className="ui-btn-polish ui-focus-ring" onClick={() => setIsEditingPost((value) => !value)} style={smallOutlineButton}>
                    {isEditingPost ? "Cancel" : "Edit"}
                  </button>
                  <button className="ui-btn-polish ui-focus-ring" onClick={handleDeletePost} style={smallDangerButton}>
                    {deletingPost ? "Deleting..." : "Delete"}
                  </button>
                </>
              )}
            </div>
          </section>

          <section className="ui-enter ui-card-lift ui-smooth" style={{ ...card, background: palette.panel, border: `1px solid ${palette.border}`, "--ui-delay": "180ms" }}>
            {!isEditingPost && (
              <div style={sectionLabelRow}>
                <p style={{ ...sectionLabel, color: palette.muted }}>Conversation Content</p>
              </div>
            )}
            {isEditingPost ? (
              <>
                <textarea
                  value={editContent}
                  onChange={(event) => setEditContent(event.target.value)}
                  rows={10}
                  style={{ ...textareaInput, border: `1px solid ${palette.border}`, color: palette.text }}
                />
                <button className="ui-btn-polish ui-focus-ring" onClick={handleEditPost} style={primaryButton}>
                  {savingPost ? "Saving..." : "Save Changes"}
                </button>
              </>
            ) : (
              <RichTextRenderer content={conversation.content} darkMode={darkMode} />
            )}
          </section>

          <section className="ui-enter ui-card-lift ui-smooth" style={{ ...card, background: palette.panel, border: `1px solid ${palette.border}`, "--ui-delay": "220ms" }}>
            <div style={sectionLabelRow}>
              <p style={{ ...sectionLabel, color: palette.muted }}>Team Signal</p>
            </div>
            <div style={reactionRow}>
              {[
                { type: "agree", icon: HandThumbUpIcon, label: "Agree" },
                { type: "unsure", icon: QuestionMarkCircleIcon, label: "Unsure" },
                { type: "concern", icon: ExclamationTriangleIcon, label: "Concern" },
              ].map(({ type, icon: Icon, label }) => (
                <button
                  className="ui-btn-polish ui-focus-ring"
                  key={type}
                  onClick={() => handleReaction(type)}
                  style={{
                    ...reactionButton,
                    background: reactions.user_reaction === type ? "var(--app-info)" : palette.panelAlt,
                    color: reactions.user_reaction === type ? "var(--app-surface-alt)" : palette.text,
                    border: `1px solid ${palette.border}`,
                  }}
                >
                  <Icon style={icon14} />
                  {label} ({reactions.reactions.find((reaction) => reaction.reaction_type === type)?.count || 0})
                </button>
              ))}
            </div>
          </section>

          <section className="ui-enter ui-card-lift ui-smooth" style={{ ...card, background: palette.panel, border: `1px solid ${palette.border}`, "--ui-delay": "260ms" }}>
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
                <button className="ui-btn-polish ui-focus-ring" type="submit" disabled={submitting || !newReply.trim()} style={primaryButton}>
                  {submitting ? "Posting..." : "Reply"}
                </button>
              </form>
            </div>
          </section>
        </div>

        <div style={isNarrow ? railStackMobile : railStack}>
          <section className="ui-enter ui-card-lift ui-smooth" style={{ ...sideCard, background: palette.panel, border: `1px solid ${palette.border}`, "--ui-delay": "200ms" }}>
            <h2 style={{ ...h2, color: palette.text, marginBottom: 14 }}>Thread Snapshot</h2>
            <div style={snapshotGrid}>
              <div style={{ ...snapshotItem, border: `1px solid ${palette.border}`, background: palette.panelAlt }}>
                <p style={{ ...snapshotLabel, color: palette.muted }}>Type</p>
                <p style={{ ...snapshotValue, color: palette.text }}>{conversationType}</p>
              </div>
              <div style={{ ...snapshotItem, border: `1px solid ${palette.border}`, background: palette.panelAlt }}>
                <p style={{ ...snapshotLabel, color: palette.muted }}>Replies</p>
                <p style={{ ...snapshotValue, color: palette.text }}>{replyCount}</p>
              </div>
              <div style={{ ...snapshotItem, border: `1px solid ${palette.border}`, background: palette.panelAlt }}>
                <p style={{ ...snapshotLabel, color: palette.muted }}>Reactions</p>
                <p style={{ ...snapshotValue, color: palette.text }}>{reactionTotal}</p>
              </div>
              <div style={{ ...snapshotItem, border: `1px solid ${palette.border}`, background: palette.panelAlt }}>
                <p style={{ ...snapshotLabel, color: palette.muted }}>Updated</p>
                <p style={{ ...snapshotValue, color: palette.text }}>{updatedLabel}</p>
              </div>
            </div>
          </section>

          <section className="ui-enter ui-card-lift ui-smooth" style={{ ...sideCard, background: palette.panel, border: `1px solid ${palette.border}`, "--ui-delay": "220ms" }}>
            <AIAssistant content={conversation?.content} contentType="conversation" />
          </section>

          <section className="ui-enter ui-card-lift ui-smooth" style={{ ...sideCard, background: palette.panel, border: `1px solid ${palette.border}`, "--ui-delay": "240ms" }}>
            <ContextPanel contentType="conversations.conversation" objectId={id} />
          </section>
        </div>
      </div>

      <AIResultsPanel results={aiResults} onClose={() => setAiResults(null)} />
    </div>
  );
}

const page = { width: "100%" };
const ambientLayer = { position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 };
const masthead = { position: "relative", zIndex: 1, borderRadius: 16, padding: "14px 16px", marginBottom: 12 };
const mastheadTopRow = { display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" };
const backPill = { display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", borderRadius: 999, padding: "8px 12px", fontSize: 12, fontWeight: 700 };
const commandStrip = { display: "flex", gap: 8, flexWrap: "wrap" };
const commandPill = { borderRadius: 999, padding: "7px 11px", fontSize: 12, fontWeight: 700, background: "transparent", cursor: "pointer" };
const eyebrow = { margin: "10px 0 0", fontSize: 11, letterSpacing: "0.13em", fontWeight: 700 };
const mastheadTitle = { margin: "7px 0 6px", fontSize: "clamp(1.16rem,2vw,1.68rem)", lineHeight: 1.15 };
const mastheadSub = { margin: 0, fontSize: 14, lineHeight: 1.45, maxWidth: 760 };
const grid = { position: "relative", zIndex: 1, display: "grid", gap: 12 };
const loadingWrap = { minHeight: 320, display: "grid", placeItems: "center" };
const spinner = {
  width: 28,
  height: 28,
  border: "2px solid var(--app-border-strong)",
  borderTopColor: "var(--app-info)",
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
const h1 = { margin: "0 0 8px", fontSize: "clamp(1.18rem,2.05vw,1.72rem)" };
const h2 = { margin: "0 0 10px", fontSize: 16, display: "flex", alignItems: "center", gap: 7 };
const sub = { margin: "0 0 12px", fontSize: 14 };
const card = { borderRadius: 14, padding: 16, marginBottom: 12 };
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
  background: "var(--app-gradient-primary)",
  color: "var(--app-button-text)",
  padding: "10px 14px",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};
const secondaryButton = {
  ...primaryButton,
  background: "transparent",
  color: "var(--app-muted)",
  border: "1px solid var(--app-border-strong)",
};
const titleMain = { margin: "0 0 10px", fontSize: "clamp(1.3rem,2.8vw,1.8rem)" };
const heroSignals = { display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 8 };
const signalChip = { borderRadius: 999, padding: "4px 9px", fontSize: 11, fontWeight: 700, textTransform: "capitalize" };
const heroChip = { display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, padding: "8px 12px", fontSize: 12, fontWeight: 700, textTransform: "capitalize" };
const titleInput = { width: "100%", border: "none", background: "transparent", fontSize: 22, fontWeight: 700, marginBottom: 10, paddingBottom: 8, outline: "none" };
const authorRow = { display: "flex", alignItems: "center", gap: 8 };
const avatarWrap = { width: 34, height: 34, borderRadius: 10, overflow: "hidden", background: "linear-gradient(135deg,#ffcb8b,#ff935d)", display: "grid", placeItems: "center" };
const avatarSmall = { width: 28, height: 28, borderRadius: 8, overflow: "hidden", background: "linear-gradient(135deg,#ffcb8b,#ff935d)", display: "grid", placeItems: "center" };
const avatarImage = { width: "100%", height: "100%", objectFit: "cover" };
const avatarInitial = { color: "var(--app-button-text)", fontSize: 13, fontWeight: 700 };
const avatarSmallInitial = { color: "var(--app-button-text)", fontSize: 12, fontWeight: 700 };
const authorNameStyle = { margin: 0, fontSize: 13, fontWeight: 700 };
const metaText = { margin: "2px 0 0", fontSize: 11 };
const actionRow = { display: "flex", alignItems: "center", gap: 6, marginTop: 10, flexWrap: "wrap" };
const ghostSuccessButton = { border: "1px solid var(--app-success-border)", borderRadius: 8, background: "var(--app-success-soft)", color: "var(--app-success)", fontSize: 12, padding: "6px 10px", cursor: "pointer" };
const smallOutlineButton = { border: "1px solid var(--app-border-strong)", borderRadius: 8, background: "transparent", color: "#94a3b8", fontSize: 12, padding: "6px 10px", cursor: "pointer" };
const smallDangerButton = { border: "1px solid rgba(239,68,68,0.5)", borderRadius: 8, background: "rgba(239,68,68,0.1)", color: "var(--app-danger)", fontSize: 12, padding: "6px 10px", cursor: "pointer" };
const sectionLabelRow = { marginBottom: 8 };
const sectionLabel = { margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.13em", textTransform: "uppercase" };
const reactionRow = { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" };
const reactionButton = { display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 10, padding: "7px 11px", fontSize: 12, fontWeight: 700, cursor: "pointer" };
const emptyState = { borderRadius: 10, padding: "24px 14px", textAlign: "center", fontSize: 13, marginBottom: 10 };
const replyList = { display: "grid", gap: 8, marginBottom: 10 };
const composer = { borderRadius: 10, padding: 12 };
const railStack = { display: "grid", gap: 12, alignContent: "start", position: "sticky", top: 12 };
const railStackMobile = { display: "grid", gap: 12, alignContent: "start" };
const sideCard = { borderRadius: 14, padding: 14 };
const snapshotGrid = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 };
const snapshotItem = { borderRadius: 10, padding: "9px 10px" };
const snapshotLabel = { margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase" };
const snapshotValue = { margin: "5px 0 0", fontSize: 13, fontWeight: 700, textTransform: "capitalize" };
const replyCard = { borderRadius: 10, padding: 10, marginBottom: 8 };
const replyHeader = { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 8 };
const replyAuthorWrap = { display: "flex", alignItems: "center", gap: 8 };
const replyActionRow = { display: "flex", gap: 6 };
const inlineAction = { border: "none", background: "transparent", color: "#94a3b8", fontSize: 11, fontWeight: 700, cursor: "pointer" };
const inlineActionDanger = { ...inlineAction, color: "var(--app-danger)" };
const icon18 = { width: 18, height: 18 };
const icon14 = { width: 14, height: 14 };

export default ConversationDetail;
