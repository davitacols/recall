import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ClockIcon,
  DocumentDuplicateIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useTheme } from "../utils/ThemeAndAccessibility";
import api from "../services/api";
import {
  WorkspaceEmptyState,
  WorkspaceHero,
  WorkspacePanel,
} from "../components/WorkspaceChrome";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";

function normalizeDrafts(payload) {
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload)) return payload;
  return [];
}

function toDisplayDateTime(value) {
  if (!value) return "Recently saved";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Recently saved";
  return parsed.toLocaleString();
}

export default function Drafts() {
  const { darkMode } = useTheme();
  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDrafts();
  }, []);

  const fetchDrafts = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/api/conversations/?drafts=true");
      setDrafts(normalizeDrafts(response?.data));
    } catch (requestError) {
      console.error("Failed to fetch drafts:", requestError);
      setError("We could not load unfinished conversations right now.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this draft?")) return;
    try {
      await api.delete(`/api/conversations/${id}/`);
      fetchDrafts();
    } catch (requestError) {
      console.error("Failed to delete draft:", requestError);
    }
  };

  const typedDrafts = drafts.reduce((accumulator, draft) => {
    const key = draft.post_type || "unknown";
    return {
      ...accumulator,
      [key]: (accumulator[key] || 0) + 1,
    };
  }, {});

  return (
    <div style={{ ...ui.container, display: "grid", gap: 14 }}>
      <WorkspaceHero
        palette={palette}
        darkMode={darkMode}
        eyebrow="Unfinished Work"
        title="Drafts"
        description="Resume unfinished conversations without losing the original context, writing progress, or the moment the team paused."
        stats={[
          { label: "Drafts", value: drafts.length, helper: "Unfinished conversations waiting for completion", tone: palette.info },
          { label: "Types", value: Object.keys(typedDrafts).length || 0, helper: "Different conversation formats in progress", tone: palette.accent },
          { label: "Latest Save", value: drafts[0]?.draft_saved_at ? toDisplayDateTime(drafts[0].draft_saved_at) : "--", helper: "Most recent draft activity", tone: palette.success },
        ]}
      />

      <WorkspacePanel
        palette={palette}
        eyebrow="Resume Queue"
        title="Draft conversations"
        description="Each draft card keeps the working title, saved content preview, type, and resume action together."
      >
        {loading ? (
          <div style={{ display: "grid", gap: 12 }}>
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                style={{
                  minHeight: 138,
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
            title="Drafts are unavailable"
            description={error}
          />
        ) : null}

        {!loading && !error && drafts.length === 0 ? (
          <WorkspaceEmptyState
            palette={palette}
            title="No drafts"
            description="Your unfinished conversations will appear here so you can pick them back up later."
            action={
              <Link to="/conversations/new" className="ui-btn-polish ui-focus-ring" style={{ ...ui.primaryButton, textDecoration: "none" }}>
                Start a Conversation
              </Link>
            }
          />
        ) : null}

        {!loading && !error && drafts.length > 0 ? (
          <div style={{ display: "grid", gap: 12 }}>
            {drafts.map((draft) => (
              <article
                key={draft.id}
                className="ui-card-lift ui-smooth"
                style={{
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
                      <DocumentDuplicateIcon style={{ width: 18, height: 18 }} />
                    </div>
                    <div style={{ display: "grid", gap: 6 }}>
                      <h3 style={{ margin: 0, fontSize: 17, lineHeight: 1.2, letterSpacing: "-0.03em", color: palette.text }}>
                        {draft.title || "Untitled draft"}
                      </h3>
                      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: palette.muted }}>
                        {draft.content
                          ? `${String(draft.content).slice(0, 180)}${String(draft.content).length > 180 ? "..." : ""}`
                          : "Resume this draft to continue writing and finalize the conversation."}
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
                    {draft.post_type || "Draft"}
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: palette.muted }}>
                    <ClockIcon style={{ width: 14, height: 14 }} />
                    Last saved {toDisplayDateTime(draft.draft_saved_at || draft.updated_at || draft.created_at)}
                  </span>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Link
                      to={`/conversations/${draft.id}`}
                      className="ui-btn-polish ui-focus-ring"
                      style={{
                        ...ui.primaryButton,
                        textDecoration: "none",
                      }}
                    >
                      <PencilSquareIcon style={{ width: 15, height: 15 }} />
                      Resume
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(draft.id)}
                      className="ui-btn-polish ui-focus-ring"
                      style={{
                        border: `1px solid ${palette.danger}`,
                        background: `${palette.danger}16`,
                        color: palette.danger,
                        borderRadius: 14,
                        padding: "10px 14px",
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <TrashIcon style={{ width: 15, height: 15 }} />
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </WorkspacePanel>
    </div>
  );
}
