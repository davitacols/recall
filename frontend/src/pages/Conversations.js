import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ChatBubbleLeftIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  EyeIcon,
  LightBulbIcon,
  MagnifyingGlassIcon,
  MegaphoneIcon,
  PlusIcon,
  QuestionMarkCircleIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import api from "../services/api";
import { useToast } from "../components/Toast";
import {
  Avatar,
  Button,
  EmptyState,
  Lozenge,
  PageHeader,
  SectionMessage,
  Tabs,
} from "../components/atlas";
import "./Conversations.css";

function typeMeta(postType) {
  const t = String(postType || "discussion").toLowerCase();
  const map = {
    discussion: { Icon: ChatBubbleLeftRightIcon, color: "#5E6AD2", soft: "rgba(94,106,210,0.12)" },
    question: { Icon: QuestionMarkCircleIcon, color: "#2FA4B8", soft: "rgba(47,164,184,0.13)" },
    proposal: { Icon: LightBulbIcon, color: "#8A63D2", soft: "rgba(138,99,210,0.13)" },
    decision: { Icon: CheckCircleIcon, color: "#2F9E6E", soft: "rgba(47,158,110,0.13)" },
    update: { Icon: MegaphoneIcon, color: "#C8761E", soft: "rgba(200,118,30,0.13)" },
  };
  return map[t] || { Icon: ChatBubbleLeftIcon, color: "#5E6AD2", soft: "rgba(94,106,210,0.12)" };
}

const TYPE_TABS = [
  { id: "all", label: "All" },
  { id: "discussion", label: "Discussion" },
  { id: "question", label: "Question" },
  { id: "decision", label: "Decision" },
  { id: "update", label: "Update" },
];

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  const sec = Math.max(1, Math.round((Date.now() - d.getTime()) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const m = Math.round(sec / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function stripHtml(value) {
  if (!value) return "";
  return String(value).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export default function Conversations() {
  const navigate = useNavigate();
  const toast = useToast?.() || { addToast: () => {} };
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("recent");

  useEffect(() => {
    let mounted = true;
    api.get("/api/conversations/")
      .then((res) => {
        if (!mounted) return;
        const list = Array.isArray(res.data?.results) ? res.data.results : Array.isArray(res.data) ? res.data : [];
        setConversations(list.filter((c) => c && c.id));
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err?.response?.data?.detail || err?.message || "Failed to load conversations");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  const handleDelete = async (id, e) => {
    e?.stopPropagation();
    if (!window.confirm("Delete this conversation?")) return;
    try {
      await api.delete(`/api/conversations/${id}/`);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      toast.addToast?.("Conversation deleted", "success");
    } catch (err) {
      toast.addToast?.("Failed to delete conversation", "error");
    }
  };

  const visible = useMemo(() => {
    let list = conversations;
    if (tab !== "all") list = list.filter((c) => (c.post_type || c.type || "").toLowerCase() === tab);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((c) => {
        const hay = `${c.title || ""} ${c.content || ""} ${c.summary || ""}`.toLowerCase();
        return hay.includes(q);
      });
    }
    if (sort === "recent") {
      list = [...list].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    } else if (sort === "replies") {
      list = [...list].sort((a, b) => (b.reply_count || 0) - (a.reply_count || 0));
    } else if (sort === "views") {
      list = [...list].sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
    }
    return list;
  }, [conversations, tab, search, sort]);

  const tabs = TYPE_TABS.map((t) => ({
    id: t.id,
    label: t.label,
    count: t.id === "all" ? conversations.length : conversations.filter((c) => (c.post_type || c.type || "").toLowerCase() === t.id).length,
  }));

  return (
    <div style={{ padding: "0 32px 32px" }}>
      <PageHeader
        breadcrumb={[{ label: "Knoledgr", to: "/" }, { label: "Conversations" }]}
        title="Conversations"
        subtitle="Capture ongoing discussions and the rationale behind team work."
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

      <div style={{ marginTop: 16 }}>
        <Tabs tabs={tabs} value={tab} onChange={setTab} />
      </div>

      <div className="conv-toolbar">
        <div className="conv-search">
          <MagnifyingGlassIcon />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations"
            className="atlas-input"
          />
        </div>
        <span style={{ flex: 1 }} />
        <span className="conv-sort-label">Sort</span>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="atlas-input conv-sort">
          <option value="recent">Most recent</option>
          <option value="replies">Most replies</option>
          <option value="views">Most views</option>
        </select>
      </div>

      {error ? <SectionMessage tone="error" style={{ marginBottom: 16 }}>{error}</SectionMessage> : null}

      {loading ? (
        <SkeletonList />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<ChatBubbleLeftIcon style={{ width: "100%", height: "100%" }} />}
          title="No conversations yet"
          description="Start a thread to capture context, decisions, or open questions."
          primaryAction={<Button appearance="primary" onClick={() => navigate("/conversations/new")}>New conversation</Button>}
        />
      ) : (
        <div className="conv-list">
          {visible.map((c) => {
            const author = c.author_name || c.created_by_name || c.user_name || "Anonymous";
            const { Icon, color, soft } = typeMeta(c.post_type || c.type);
            return (
              <Link key={c.id} to={`/conversations/${c.id}`} className="conv-card">
                <span className="conv-type" style={{ background: soft, color }}>
                  <Icon />
                </span>
                <div className="conv-body">
                  <div className="conv-title-row">
                    <span className="conv-title">{c.title || "Untitled"}</span>
                    {c.post_type ? (
                      <span className="conv-type-tag" style={{ background: soft, color }}>{c.post_type}</span>
                    ) : null}
                    {c.is_resolved ? <Lozenge status="done">Resolved</Lozenge> : null}
                  </div>
                  {c.summary || c.content ? (
                    <p className="conv-excerpt">{stripHtml(c.summary || c.content).slice(0, 220)}</p>
                  ) : null}
                  <div className="conv-foot">
                    <span className="conv-author">
                      <Avatar size="xs" name={author} />
                      {author}
                    </span>
                    <span className="conv-dot" />
                    <span>{formatDate(c.created_at)}</span>
                    <span className="conv-stats">
                      {typeof c.reply_count === "number" ? (
                        <span className="conv-stat"><ChatBubbleLeftIcon />{c.reply_count}</span>
                      ) : null}
                      {typeof c.view_count === "number" ? (
                        <span className="conv-stat"><EyeIcon />{c.view_count}</span>
                      ) : null}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="conv-del"
                  aria-label="Delete"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(c.id, e); }}
                >
                  <TrashIcon />
                </button>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SkeletonList() {
  return (
    <div className="conv-skel">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="conv-skel-card" />
      ))}
    </div>
  );
}
