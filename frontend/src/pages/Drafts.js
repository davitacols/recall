import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ChatBubbleLeftIcon,
  PencilIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import api from "../services/api";
import { useToast } from "../components/Toast";
import {
  Button,
  EmptyState,
  IconButton,
  PageHeader,
  SectionMessage,
} from "../components/atlas";

function timeAgo(value) {
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

export default function Drafts() {
  const navigate = useNavigate();
  const toast = useToast?.() || { addToast: () => {} };
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    api.get("/api/conversations/?drafts=true")
      .then((res) => {
        if (!mounted) return;
        const list = Array.isArray(res.data?.results) ? res.data.results : Array.isArray(res.data) ? res.data : [];
        setDrafts(list);
      })
      .catch((err) => mounted && setError(err?.response?.data?.detail || err?.message || "Failed to load drafts"))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this draft?")) return;
    try {
      await api.delete(`/api/conversations/${id}/`);
      setDrafts((prev) => prev.filter((d) => d.id !== id));
      toast.addToast?.("Draft deleted", "success");
    } catch (_) {
      toast.addToast?.("Failed to delete draft", "error");
    }
  };

  return (
    <div style={{ padding: "0 32px 32px" }}>
      <PageHeader
        breadcrumb={[{ label: "Knoledgr", to: "/" }, { label: "Drafts" }]}
        title="Drafts"
        subtitle="Conversations and posts you haven't published yet."
        actions={
          <Button appearance="primary" onClick={() => navigate("/conversations/new")}>
            New conversation
          </Button>
        }
        style={{ padding: "24px 0 0", background: "transparent" }}
      />

      {error ? <SectionMessage tone="error" style={{ marginTop: 16 }}>{error}</SectionMessage> : null}

      {loading ? (
        <div style={{ marginTop: 16 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ height: 56, background: "var(--n20)", borderRadius: 4, marginBottom: 6 }} />
          ))}
        </div>
      ) : drafts.length === 0 ? (
        <EmptyState
          icon={<ChatBubbleLeftIcon style={{ width: "100%", height: "100%" }} />}
          title="No drafts"
          description="When you save a draft conversation, it'll appear here."
          primaryAction={<Button appearance="primary" onClick={() => navigate("/conversations/new")}>New conversation</Button>}
        />
      ) : (
        <ul style={list}>
          {drafts.map((d) => (
            <li key={d.id} style={listItem}>
              <Link to={`/conversations/${d.id}/edit`} style={rowLink}>
                <PencilIcon style={{ width: 16, height: 16, color: "var(--y400)", flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={titleText}>{d.title || "Untitled draft"}</p>
                  {d.content ? <p style={excerpt}>{stripHtml(d.content).slice(0, 160)}</p> : null}
                  <p style={meta}>Last edited {timeAgo(d.updated_at || d.created_at)}</p>
                </div>
                <IconButton
                  icon={<TrashIcon style={{ width: 14, height: 14 }} />}
                  label="Delete"
                  size={28}
                  onClick={(e) => { e.preventDefault(); handleDelete(d.id); }}
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const list = {
  listStyle: "none",
  margin: "16px 0 0",
  padding: 0,
  background: "var(--app-surface)",
  border: "1px solid var(--app-border)",
  borderRadius: 4,
  overflow: "hidden",
};

const listItem = { borderBottom: "1px solid var(--app-border-subtle)" };

const rowLink = {
  display: "flex",
  alignItems: "flex-start",
  gap: 12,
  padding: "12px 16px",
  textDecoration: "none",
  color: "inherit",
};

const titleText = { margin: 0, fontSize: 14, fontWeight: 600, color: "var(--app-link)" };
const excerpt = {
  margin: "4px 0 0",
  fontSize: 13,
  color: "var(--app-muted)",
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};
const meta = { margin: "6px 0 0", fontSize: 12, color: "var(--app-muted)" };
