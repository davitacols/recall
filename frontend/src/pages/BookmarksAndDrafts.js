import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookmarkIcon,
  ClockIcon,
  DocumentTextIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";
import { useTheme } from "../utils/ThemeAndAccessibility";
import api from "../services/api";
import {
  WorkspaceEmptyState,
  WorkspaceHero,
  WorkspacePanel,
  WorkspaceToolbar,
} from "../components/WorkspaceChrome";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";

function normalizeItems(payload) {
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload)) return payload;
  return [];
}

function getItemPreview(item) {
  const raw =
    item?.description ||
    item?.summary ||
    item?.excerpt ||
    item?.content ||
    item?.notes ||
    "";
  if (!raw) return "Open this item to continue where your team left off.";
  const text = String(raw);
  return text.length > 160 ? `${text.slice(0, 160)}...` : text;
}

function getItemHref(item) {
  return item?.url || item?.href || item?.path || "/";
}

function formatDate(value) {
  if (!value) return "Recently updated";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Recently updated";
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function BookmarksAndDrafts() {
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  const [tab, setTab] = useState("bookmarks");
  const [bookmarks, setBookmarks] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError("");
      try {
        const [bookmarkResponse, draftResponse] = await Promise.all([
          api.get("/api/bookmarks/").catch(() => ({ data: [] })),
          api.get("/api/drafts/").catch(() => ({ data: [] })),
        ]);
        setBookmarks(normalizeItems(bookmarkResponse?.data));
        setDrafts(normalizeItems(draftResponse?.data));
      } catch (requestError) {
        console.error("Failed to load bookmarks and drafts:", requestError);
        setError("We could not load your saved items right now.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const items = tab === "bookmarks" ? bookmarks : drafts;
  const stats = [
    {
      label: "Bookmarks",
      value: bookmarks.length,
      helper: "Pinned records your team returns to often",
      tone: palette.info,
    },
    {
      label: "Drafts",
      value: drafts.length,
      helper: "In-progress writing waiting for a final pass",
      tone: palette.accent,
    },
    {
      label: "Active View",
      value: tab === "bookmarks" ? "Saved" : "Drafting",
      helper: tab === "bookmarks" ? "Review your stored context" : "Pick up unfinished work",
      tone: tab === "bookmarks" ? palette.success : palette.warn,
    },
  ];

  const tabButton = (value) => ({
    ...ui.secondaryButton,
    padding: "9px 12px",
    borderColor: tab === value ? palette.info : palette.border,
    background: tab === value ? palette.accentSoft : palette.cardAlt,
    color: tab === value ? palette.text : palette.muted,
  });

  const openItem = (item) => {
    const href = getItemHref(item);
    if (/^https?:\/\//i.test(href)) {
      window.open(href, "_blank", "noopener,noreferrer");
      return;
    }
    navigate(href);
  };

  return (
    <div style={{ ...ui.container, display: "grid", gap: 14 }}>
      <WorkspaceHero
        palette={palette}
        darkMode={darkMode}
        eyebrow="Personal Queue"
        title="Bookmarks and Drafts"
        description="Keep close the records worth revisiting and the unfinished thinking that still needs a decision, update, or handoff."
        stats={stats}
        aside={
          <div
            style={{
              minWidth: 220,
              borderRadius: 20,
              border: `1px solid ${palette.border}`,
              background: palette.cardAlt,
              padding: 14,
              display: "grid",
              gap: 8,
            }}
          >
            <p style={{ margin: 0, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 800, color: palette.muted }}>
              Focus Tip
            </p>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: palette.text }}>
              Review drafts before meetings and keep bookmarks for decisions, documents, or conversations that still shape current work.
            </p>
          </div>
        }
      />

      <WorkspaceToolbar palette={palette}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" onClick={() => setTab("bookmarks")} className="ui-btn-polish ui-focus-ring" style={tabButton("bookmarks")}>
            <BookmarkIcon style={{ width: 16, height: 16 }} />
            Bookmarks ({bookmarks.length})
          </button>
          <button type="button" onClick={() => setTab("drafts")} className="ui-btn-polish ui-focus-ring" style={tabButton("drafts")}>
            <PencilSquareIcon style={{ width: 16, height: 16 }} />
            Drafts ({drafts.length})
          </button>
        </div>
        <p style={{ margin: 0, fontSize: 12, color: palette.muted }}>
          {tab === "bookmarks"
            ? "Saved records stay one click away for quick context recovery."
            : "Drafts help you resume unfinished content without losing the surrounding why."}
        </p>
      </WorkspaceToolbar>

      <WorkspacePanel
        palette={palette}
        eyebrow={tab === "bookmarks" ? "Saved Context" : "In Progress"}
        title={tab === "bookmarks" ? "Bookmarked records" : "Draft workspace"}
        description={
          tab === "bookmarks"
            ? "Pinned decisions, documents, or links your team is likely to revisit."
            : "Drafts captured across the workspace so writing and planning do not disappear."
        }
      >
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                style={{
                  minHeight: 144,
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
            title="Saved items are temporarily unavailable"
            description={error}
          />
        ) : null}

        {!loading && !error && items.length === 0 ? (
          <WorkspaceEmptyState
            palette={palette}
            title={tab === "bookmarks" ? "No bookmarks yet" : "No drafts yet"}
            description={
              tab === "bookmarks"
                ? "Save records you want to revisit later and they will appear here."
                : "Draft notes, decisions, or writeups will collect here until they are finalized."
            }
          />
        ) : null}

        {!loading && !error && items.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
            {items.map((item, index) => {
              const isBookmark = tab === "bookmarks";
              const Icon = isBookmark ? BookmarkIcon : DocumentTextIcon;
              return (
                <button
                  key={item.id || `${tab}-${index}`}
                  type="button"
                  onClick={() => openItem(item)}
                  className="ui-card-lift ui-smooth ui-focus-ring"
                  style={{
                    textAlign: "left",
                    border: `1px solid ${palette.border}`,
                    borderRadius: 20,
                    padding: 16,
                    background: palette.cardAlt,
                    display: "grid",
                    gap: 12,
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
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
                      <Icon style={{ width: 19, height: 19 }} />
                    </div>
                    <span
                      style={{
                        padding: "5px 10px",
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: palette.muted,
                        border: `1px solid ${palette.border}`,
                      }}
                    >
                      {isBookmark ? "Bookmarked" : "Draft"}
                    </span>
                  </div>

                  <div style={{ display: "grid", gap: 6 }}>
                    <h3 style={{ margin: 0, fontSize: 17, lineHeight: 1.2, letterSpacing: "-0.03em", color: palette.text }}>
                      {item.title || item.name || "Untitled item"}
                    </h3>
                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: palette.muted }}>
                      {getItemPreview(item)}
                    </p>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: palette.muted }}>
                      <ClockIcon style={{ width: 14, height: 14 }} />
                      {formatDate(item.updated_at || item.created_at)}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: palette.link }}>
                      Open item
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : null}
      </WorkspacePanel>
    </div>
  );
}
