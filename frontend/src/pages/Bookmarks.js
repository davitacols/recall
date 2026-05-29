import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookmarkIcon,
  ChatBubbleLeftIcon,
} from "@heroicons/react/24/outline";
import api from "../services/api";
import {
  Avatar,
  Button,
  EmptyState,
  Lozenge,
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

export default function Bookmarks() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    api.get("/api/conversations/bookmarks/")
      .then((res) => {
        if (!mounted) return;
        const list = Array.isArray(res.data?.results) ? res.data.results : Array.isArray(res.data) ? res.data : [];
        setItems(list);
      })
      .catch((err) => mounted && setError(err?.response?.data?.detail || err?.message || "Failed to load bookmarks"))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  return (
    <div style={{ padding: "0 32px 32px" }}>
      <PageHeader
        breadcrumb={[{ label: "Knoledgr", to: "/" }, { label: "Bookmarks" }]}
        title="Bookmarks"
        subtitle="Conversations and pages you've saved for later."
        style={{ padding: "24px 0 0", background: "transparent" }}
      />

      {error ? <SectionMessage tone="error" style={{ marginTop: 16 }}>{error}</SectionMessage> : null}

      {loading ? (
        <div style={{ marginTop: 16 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ height: 56, background: "var(--n20)", borderRadius: 4, marginBottom: 6 }} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<BookmarkIcon style={{ width: "100%", height: "100%" }} />}
          title="No bookmarks yet"
          description="Save a conversation or page to find it again quickly."
        />
      ) : (
        <ul style={list}>
          {items.map((b) => (
            <li key={b.id} style={listItem}>
              <Link to={`/conversations/${b.id}`} style={rowLink}>
                <Avatar size="md" name={b.author_name || b.created_by_name || "User"} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={titleText}>{b.title || "Untitled"}</span>
                    {b.post_type ? <Lozenge>{b.post_type}</Lozenge> : null}
                  </div>
                  {b.summary || b.content ? (
                    <p style={excerpt}>{stripHtml(b.summary || b.content).slice(0, 180)}</p>
                  ) : null}
                  <p style={meta}>
                    {b.author_name || "Anonymous"} · saved {timeAgo(b.bookmarked_at || b.created_at)}
                  </p>
                </div>
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

const titleText = { fontSize: 14, fontWeight: 600, color: "var(--app-link)" };
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
