import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookmarkIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { useTheme } from "../utils/ThemeAndAccessibility";
import api from "../services/api";
import {
  WorkspaceEmptyState,
  WorkspaceHero,
  WorkspacePanel,
} from "../components/WorkspaceChrome";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";

function normalizeBookmarks(payload) {
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload)) return payload;
  return [];
}

function toDisplayDate(value) {
  if (!value) return "Recently saved";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Recently saved";
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function Bookmarks() {
  const { darkMode } = useTheme();
  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchBookmarks = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await api.get("/api/conversations/bookmarks/");
        setBookmarks(normalizeBookmarks(response?.data));
      } catch (requestError) {
        console.error("Failed to fetch bookmarks:", requestError);
        setError("We could not load bookmarked conversations right now.");
      } finally {
        setLoading(false);
      }
    };

    fetchBookmarks();
  }, []);

  const notedBookmarks = bookmarks.filter((bookmark) => Boolean(bookmark.note)).length;
  const latestSaved = bookmarks[0]?.created_at || null;

  return (
    <div style={{ ...ui.container, display: "grid", gap: 14 }}>
      <WorkspaceHero
        palette={palette}
        darkMode={darkMode}
        eyebrow="Saved Conversations"
        title="Bookmarks"
        description="Keep important conversations close so decisions, discoveries, and unresolved threads stay one click away from the team that needs them."
        stats={[
          { label: "Saved", value: bookmarks.length, helper: "Bookmarked conversations ready for quick recall", tone: palette.info },
          { label: "With Notes", value: notedBookmarks, helper: "Bookmarks carrying extra personal context", tone: palette.accent },
          { label: "Latest Save", value: latestSaved ? toDisplayDate(latestSaved) : "--", helper: "Most recent bookmark activity", tone: palette.success },
        ]}
      />

      <WorkspacePanel
        palette={palette}
        eyebrow="Conversation Library"
        title="Bookmarked conversations"
        description="Each bookmark keeps the conversation title, type, and any saved note together so re-entry is fast."
      >
        {loading ? (
          <div style={{ display: "grid", gap: 12 }}>
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                style={{
                  minHeight: 124,
                  borderRadius: 18,
                  border: `1px solid ${palette.border}`,
                  background: palette.cardAlt,
                  opacity: 0.7,
                }}
              />
            ))}
          </div>
        ) : null}

        {!loading && error ? (
          <WorkspaceEmptyState
            palette={palette}
            title="Bookmarks are unavailable"
            description={error}
          />
        ) : null}

        {!loading && !error && bookmarks.length === 0 ? (
          <WorkspaceEmptyState
            palette={palette}
            title="No bookmarks yet"
            description="Save conversations for quick access later and they will appear here."
            action={
              <Link to="/conversations" className="ui-btn-polish ui-focus-ring" style={{ ...ui.primaryButton, textDecoration: "none" }}>
                Browse Conversations
              </Link>
            }
          />
        ) : null}

        {!loading && !error && bookmarks.length > 0 ? (
          <div style={{ display: "grid", gap: 12 }}>
            {bookmarks.map((bookmark) => (
              <Link
                key={bookmark.id}
                to={`/conversations/${bookmark.conversation_id}`}
                className="ui-card-lift ui-smooth ui-focus-ring"
                style={{
                  textDecoration: "none",
                  borderRadius: 20,
                  border: `1px solid ${palette.border}`,
                  background: palette.cardAlt,
                  padding: 16,
                  display: "grid",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 14,
                        background: palette.accentSoft,
                        color: palette.info,
                        display: "grid",
                        placeItems: "center",
                        flexShrink: 0,
                      }}
                    >
                      <BookmarkIcon style={{ width: 18, height: 18 }} />
                    </div>
                    <div style={{ display: "grid", gap: 6 }}>
                      <h3 style={{ margin: 0, fontSize: 17, lineHeight: 1.2, letterSpacing: "-0.03em", color: palette.text }}>
                        {bookmark.conversation_title || "Untitled conversation"}
                      </h3>
                      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: palette.muted }}>
                        {bookmark.note || "Open the conversation to review the saved context."}
                      </p>
                    </div>
                  </div>
                  <span
                    style={{
                      padding: "5px 10px",
                      borderRadius: 999,
                      border: `1px solid ${palette.border}`,
                      color: palette.muted,
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                    }}
                  >
                    {bookmark.conversation_type || "Conversation"}
                  </span>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: palette.muted }}>
                    <ClockIcon style={{ width: 14, height: 14 }} />
                    Saved {toDisplayDate(bookmark.created_at)}
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: palette.link }}>
                    <ChatBubbleLeftRightIcon style={{ width: 14, height: 14 }} />
                    Open conversation
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : null}
      </WorkspacePanel>
    </div>
  );
}
