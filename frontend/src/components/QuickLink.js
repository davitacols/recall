import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  CheckCircleIcon,
  LinkIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import api from "../services/api";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";

const TARGET_OPTIONS = [
  {
    value: "conversations.conversation",
    label: "Conversation",
    searchType: "conversation",
    helper: "Connect this record to its upstream discussion and source context.",
  },
  {
    value: "decisions.decision",
    label: "Decision",
    searchType: "decision",
    helper: "Tie related decisions together so the reasoning trail stays intact.",
  },
  {
    value: "business.task",
    label: "Task",
    searchType: "task",
    helper: "Attach downstream execution work directly to this record.",
  },
  {
    value: "business.document",
    label: "Document",
    searchType: "document",
    helper: "Link specs, runbooks, and reference material to this record.",
  },
];

const LINK_TYPE_OPTIONS = [
  { value: "relates_to", label: "Relates to" },
  { value: "implements", label: "Implements" },
  { value: "blocks", label: "Blocks" },
  { value: "references", label: "References" },
  { value: "supersedes", label: "Supersedes" },
  { value: "derived_from", label: "Derived from" },
];

const RESULT_TYPE_TO_TARGET_TYPE = {
  conversation: "conversations.conversation",
  decision: "decisions.decision",
  task: "business.task",
  document: "business.document",
};

function getDefaultTargetType(sourceType) {
  if (sourceType === "decisions.decision") return "business.task";
  if (sourceType === "conversations.conversation") return "decisions.decision";
  return "conversations.conversation";
}

function getDefaultLinkType(sourceType, targetType) {
  if (sourceType === "decisions.decision" && targetType === "business.task") return "implements";
  if (sourceType === "decisions.decision" && targetType === "business.document") return "references";
  if (sourceType === "conversations.conversation" && targetType === "decisions.decision") return "derived_from";
  return "relates_to";
}

function getContextCacheKey(contentType, objectId) {
  return `context_${contentType}_${objectId}`;
}

function getRecordOption(value) {
  return TARGET_OPTIONS.find((option) => option.value === value) || null;
}

export default function QuickLink({ sourceType, sourceId, onLinked }) {
  const { darkMode } = useTheme();
  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);
  const searchInputRef = useRef(null);
  const [showModal, setShowModal] = useState(false);
  const [targetType, setTargetType] = useState(() => getDefaultTargetType(sourceType));
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [linkType, setLinkType] = useState(() => getDefaultLinkType(sourceType, getDefaultTargetType(sourceType)));
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const sourceOption = useMemo(
    () =>
      getRecordOption(sourceType) || {
        value: sourceType,
        label: "Record",
        helper: "This source record can be connected to other knowledge items.",
      },
    [sourceType]
  );
  const activeTargetOption = useMemo(
    () => getRecordOption(targetType) || TARGET_OPTIONS[0],
    [targetType]
  );
  const activeLinkOption = useMemo(
    () => LINK_TYPE_OPTIONS.find((option) => option.value === linkType) || LINK_TYPE_OPTIONS[0],
    [linkType]
  );

  useEffect(() => {
    if (!showModal) return undefined;

    const nextTargetType = getDefaultTargetType(sourceType);
    setTargetType(nextTargetType);
    setLinkType(getDefaultLinkType(sourceType, nextTargetType));
    setQuery("");
    setResults([]);
    setSelectedTarget(null);
    setError("");

    const timer = window.setTimeout(() => searchInputRef.current?.focus(), 10);
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setShowModal(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showModal, sourceType]);

  useEffect(() => {
    if (!showModal) return undefined;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [showModal]);

  useEffect(() => {
    if (!showModal) return;
    setSelectedTarget(null);
    setResults([]);
    setError("");
    setLinkType(getDefaultLinkType(sourceType, targetType));
  }, [showModal, sourceType, targetType]);

  useEffect(() => {
    if (!showModal) return undefined;

    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) {
      setResults([]);
      setSearching(false);
      return undefined;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const response = await api.get("/api/knowledge/search-all/", {
          params: { q: trimmedQuery },
        });
        if (cancelled) return;

        const filtered = (response.data?.results || []).filter((item) => {
          const mappedType = RESULT_TYPE_TO_TARGET_TYPE[item.type];
          if (mappedType !== targetType) return false;
          if (mappedType === sourceType && Number(item.id) === Number(sourceId)) return false;
          return true;
        });

        setResults(filtered);
      } catch (searchError) {
        if (!cancelled) {
          setResults([]);
          setError("Unable to search records right now.");
        }
      } finally {
        if (!cancelled) {
          setSearching(false);
        }
      }
    }, 260);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, showModal, sourceId, sourceType, targetType]);

  const directIdCandidate = /^\d+$/.test(query.trim()) ? Number(query.trim()) : null;
  const resolvedTargetId = selectedTarget?.id || directIdCandidate;
  const previewTargetLabel = selectedTarget?.title
    ? `${selectedTarget.title} (#${selectedTarget.id})`
    : resolvedTargetId
      ? `${activeTargetOption.label} #${resolvedTargetId}`
      : `Choose a ${activeTargetOption.label.toLowerCase()}`;
  const previewSentence = resolvedTargetId
    ? `${sourceOption.label} #${sourceId} will be marked as "${activeLinkOption.label.toLowerCase()}" with ${previewTargetLabel}.`
    : `Select a ${activeTargetOption.label.toLowerCase()} to create the link.`;

  const createLink = async () => {
    if (!resolvedTargetId) {
      setError(`Choose a ${activeTargetOption.label.toLowerCase()} or enter its numeric ID.`);
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const response = await api.post("/api/knowledge/link/", {
        source_type: sourceType,
        source_id: Number(sourceId),
        target_type: targetType,
        target_id: Number(resolvedTargetId),
        link_type: linkType,
      });

      sessionStorage.removeItem(getContextCacheKey(sourceType, sourceId));
      sessionStorage.removeItem(getContextCacheKey(targetType, resolvedTargetId));

      onLinked?.(response.data);
      setShowModal(false);
    } catch (linkError) {
      setError(linkError?.response?.data?.error || "Failed to create link.");
    } finally {
      setSubmitting(false);
    }
  };

  const overlayBg = darkMode ? "rgba(5, 7, 11, 0.66)" : "rgba(15, 23, 42, 0.22)";
  const shellBg = darkMode
    ? "linear-gradient(180deg, rgba(20, 17, 15, 0.98), rgba(16, 13, 12, 0.96))"
    : "linear-gradient(180deg, rgba(255, 252, 248, 0.99), rgba(248, 243, 236, 0.98))";
  const panelBg = darkMode
    ? "linear-gradient(180deg, rgba(30, 25, 22, 0.95), rgba(24, 20, 18, 0.92))"
    : "linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(245, 239, 230, 0.92))";
  const insetBg = darkMode
    ? "linear-gradient(180deg, rgba(39, 33, 29, 0.96), rgba(31, 26, 23, 0.92))"
    : "linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(241, 233, 221, 0.94))";

  return (
    <>
      <button
        className="ui-btn-polish ui-focus-ring"
        onClick={() => setShowModal(true)}
        style={triggerButtonStyle(palette, darkMode)}
      >
        <span style={triggerIconWrap(palette)}>
          <LinkIcon style={{ width: 14, height: 14 }} />
        </span>
        Link record
      </button>

      {showModal && typeof document !== "undefined"
        ? createPortal(
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: overlayBg,
                backdropFilter: "blur(10px)",
                display: "grid",
                placeItems: "center",
                padding: 18,
                zIndex: 1600,
              }}
              onClick={() => setShowModal(false)}
            >
              <div
                className="ui-card-lift ui-smooth"
                style={{
                  width: "min(980px, 100%)",
                  maxHeight: "min(90vh, 920px)",
                  borderRadius: 32,
                  border: `1px solid ${palette.border}`,
                  background: shellBg,
                  boxShadow: darkMode
                    ? "0 32px 100px rgba(0, 0, 0, 0.45)"
                    : "0 28px 72px rgba(33, 25, 19, 0.18)",
                  display: "grid",
                  gridTemplateRows: "auto minmax(0, 1fr) auto",
                  overflow: "hidden",
                  fontFamily:
                    'var(--font-primary, "League Spartan"), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
                onClick={(event) => event.stopPropagation()}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 16,
                    alignItems: "flex-start",
                    padding: "22px 22px 18px",
                    borderBottom: `1px solid ${palette.border}`,
                  }}
                >
                  <div style={{ display: "grid", gap: 10, minWidth: 0 }}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <span style={metaPillStyle(palette, insetBg)}>
                        Source {sourceOption.label}
                      </span>
                      <span style={metaPillStyle(palette, insetBg)}>
                        Target {activeTargetOption.label}
                      </span>
                      <span style={metaPillStyle(palette, insetBg)}>
                        {activeLinkOption.label}
                      </span>
                    </div>
                    <div style={{ display: "grid", gap: 6 }}>
                      <p style={sectionEyebrow(palette)}>Link Record</p>
                      <h3
                        style={{
                          margin: 0,
                          fontSize: "clamp(1.3rem, 2.1vw, 1.75rem)",
                          lineHeight: 1.04,
                          color: palette.text,
                        }}
                      >
                        Connect this {sourceOption.label.toLowerCase()} to another record with clear context
                      </h3>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 13,
                          lineHeight: 1.65,
                          color: palette.muted,
                          maxWidth: 620,
                        }}
                      >
                        Search by title, pick the relationship, or paste a numeric ID when you already know the exact target. New links appear in the context rail and knowledge graph immediately.
                      </p>
                    </div>
                  </div>

                  <button
                    className="ui-focus-ring"
                    onClick={() => setShowModal(false)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 40,
                      height: 40,
                      borderRadius: 999,
                      border: `1px solid ${palette.border}`,
                      background: panelBg,
                      color: palette.muted,
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    <XMarkIcon style={{ width: 18, height: 18 }} />
                  </button>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                    gap: 16,
                    padding: 20,
                    overflow: "auto",
                  }}
                >
                  <section
                    style={{
                      display: "grid",
                      gap: 16,
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        borderRadius: 24,
                        border: `1px solid ${palette.border}`,
                        background: panelBg,
                        padding: 16,
                        display: "grid",
                        gap: 12,
                      }}
                    >
                      <div style={{ display: "grid", gap: 4 }}>
                        <p style={sectionEyebrow(palette)}>Choose Target</p>
                        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: palette.muted }}>
                          Pick the kind of record you want to connect, then search for the exact item.
                        </p>
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                          gap: 10,
                        }}
                      >
                        {TARGET_OPTIONS.map((option) => {
                          const active = option.value === targetType;
                          return (
                            <button
                              key={option.value}
                              className="ui-focus-ring"
                              onClick={() => setTargetType(option.value)}
                              style={targetOptionButtonStyle(palette, darkMode, active)}
                            >
                              <span style={{ fontSize: 14, fontWeight: 700, color: active ? palette.link : palette.text }}>
                                {option.label}
                              </span>
                              <span style={{ fontSize: 12, lineHeight: 1.55, color: palette.muted }}>
                                {option.helper}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div
                      style={{
                        borderRadius: 24,
                        border: `1px solid ${palette.border}`,
                        background: panelBg,
                        padding: 16,
                        display: "grid",
                        gap: 12,
                        minWidth: 0,
                      }}
                    >
                      <div style={{ display: "grid", gap: 4 }}>
                        <label htmlFor="quick-link-search" style={fieldLabel(palette)}>
                          Search for a {activeTargetOption.label.toLowerCase()}
                        </label>
                        <p style={{ margin: 0, fontSize: 12, lineHeight: 1.55, color: palette.muted }}>
                          Search titles and excerpts, or type a numeric ID if you already know the exact record.
                        </p>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          minHeight: 52,
                          borderRadius: 18,
                          border: `1px solid ${palette.border}`,
                          background: insetBg,
                          padding: "0 14px",
                        }}
                      >
                        <MagnifyingGlassIcon style={{ width: 18, height: 18, color: palette.muted, flexShrink: 0 }} />
                        <input
                          id="quick-link-search"
                          ref={searchInputRef}
                          value={query}
                          onChange={(event) => {
                            setQuery(event.target.value);
                            setError("");
                          }}
                          placeholder={`Search ${activeTargetOption.label.toLowerCase()} titles or enter an ID`}
                          style={{
                            width: "100%",
                            border: "none",
                            outline: "none",
                            background: "transparent",
                            color: palette.text,
                            fontSize: 14,
                            fontFamily: "inherit",
                          }}
                        />
                      </div>

                      <div
                        style={{
                          borderRadius: 22,
                          border: `1px solid ${palette.border}`,
                          background: insetBg,
                          minHeight: 280,
                          maxHeight: 380,
                          overflowY: "auto",
                        }}
                      >
                        {query.trim().length < 2 ? (
                          <div style={emptyStateStyle(palette)}>
                            Type at least 2 characters to search. If you already know the ID, enter it directly and create the link from the footer.
                          </div>
                        ) : searching ? (
                          <div style={emptyStateStyle(palette)}>
                            Searching {activeTargetOption.label.toLowerCase()} records...
                          </div>
                        ) : results.length === 0 ? (
                          <div style={emptyStateStyle(palette)}>
                            No matching {activeTargetOption.label.toLowerCase()} records found. You can still use a numeric ID from the search box to create the link directly.
                          </div>
                        ) : (
                          results.map((item, index) => {
                            const selected = Number(selectedTarget?.id) === Number(item.id);
                            const isLast = index === results.length - 1;
                            return (
                              <button
                                key={`${item.type}-${item.id}`}
                                className="ui-focus-ring"
                                onClick={() => {
                                  setSelectedTarget(item);
                                  setError("");
                                }}
                                style={resultButtonStyle(palette, darkMode, selected, isLast)}
                              >
                                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                                  <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
                                    <span
                                      style={{
                                        fontSize: 14,
                                        fontWeight: 700,
                                        color: palette.text,
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                      }}
                                    >
                                      {item.title}
                                    </span>
                                    <span style={{ fontSize: 12, lineHeight: 1.55, color: palette.muted }}>
                                      {item.excerpt || `${activeTargetOption.label} #${item.id}`}
                                    </span>
                                  </div>
                                  <div style={{ display: "grid", gap: 6, justifyItems: "end", flexShrink: 0 }}>
                                    <span style={resultBadgeStyle(palette, insetBg)}>
                                      #{item.id}
                                    </span>
                                    {selected ? (
                                      <span style={{ fontSize: 11, fontWeight: 700, color: palette.link }}>
                                        Selected
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </section>

                  <aside
                    style={{
                      display: "grid",
                      gap: 16,
                      alignContent: "start",
                      minWidth: 0,
                    }}
                  >
                    <section
                      style={{
                        borderRadius: 24,
                        border: `1px solid ${palette.border}`,
                        background: panelBg,
                        padding: 16,
                        display: "grid",
                        gap: 14,
                      }}
                    >
                      <div style={{ display: "grid", gap: 4 }}>
                        <p style={sectionEyebrow(palette)}>Link Setup</p>
                        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: palette.muted }}>
                          Review the source, set the relationship, and confirm the target before saving the link.
                        </p>
                      </div>

                      <div style={summaryCardStyle(palette, insetBg)}>
                        <p style={fieldLabel(palette)}>Source record</p>
                        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: palette.text }}>
                          {sourceOption.label} #{sourceId}
                        </p>
                        <p style={{ margin: 0, fontSize: 12, lineHeight: 1.55, color: palette.muted }}>
                          {sourceOption.helper}
                        </p>
                      </div>

                      <div style={{ display: "grid", gap: 8 }}>
                        <label htmlFor="quick-link-relationship" style={fieldLabel(palette)}>
                          Relationship
                        </label>
                        <select
                          id="quick-link-relationship"
                          value={linkType}
                          onChange={(event) => setLinkType(event.target.value)}
                          style={ui.input}
                        >
                          {LINK_TYPE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div
                        style={{
                          ...summaryCardStyle(
                            palette,
                            selectedTarget || directIdCandidate
                              ? darkMode
                                ? "rgba(41, 59, 98, 0.4)"
                                : "rgba(46, 99, 208, 0.08)"
                              : insetBg
                          ),
                          border: `1px solid ${selectedTarget || directIdCandidate ? palette.accent : palette.border}`,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                          <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
                            <p style={fieldLabel(palette)}>Target preview</p>
                            <p
                              style={{
                                margin: 0,
                                fontSize: 15,
                                fontWeight: 700,
                                color: palette.text,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {previewTargetLabel}
                            </p>
                            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.55, color: palette.muted }}>
                              {selectedTarget
                                ? "Selected from search results."
                                : directIdCandidate
                                  ? "Using direct numeric ID input."
                                  : `No ${activeTargetOption.label.toLowerCase()} selected yet.`}
                            </p>
                          </div>
                          {selectedTarget ? (
                            <CheckCircleIcon style={{ width: 18, height: 18, color: palette.success, flexShrink: 0 }} />
                          ) : null}
                        </div>

                        {selectedTarget ? (
                          <button
                            className="ui-focus-ring"
                            onClick={() => setSelectedTarget(null)}
                            style={{
                              border: "none",
                              background: "transparent",
                              color: palette.link,
                              fontSize: 12,
                              fontWeight: 700,
                              padding: 0,
                              cursor: "pointer",
                              justifySelf: "start",
                            }}
                          >
                            Clear selection
                          </button>
                        ) : null}
                      </div>

                      <div style={summaryCardStyle(palette, insetBg)}>
                        <p style={fieldLabel(palette)}>Link preview</p>
                        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: palette.text }}>
                          {previewSentence}
                        </p>
                      </div>
                    </section>
                  </aside>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    alignItems: "center",
                    flexWrap: "wrap",
                    padding: "16px 20px 20px",
                    borderTop: `1px solid ${palette.border}`,
                    background: darkMode ? "rgba(18, 15, 13, 0.72)" : "rgba(255, 252, 248, 0.78)",
                  }}
                >
                  <div style={{ minHeight: 18 }}>
                    {error ? (
                      <p style={{ margin: 0, fontSize: 12, color: palette.danger }}>
                        {error}
                      </p>
                    ) : (
                      <p style={{ margin: 0, fontSize: 12, color: palette.muted }}>
                        Links update the context rail and graph immediately after creation.
                      </p>
                    )}
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
                    <button
                      className="ui-btn-polish ui-focus-ring"
                      onClick={() => setShowModal(false)}
                      style={ui.secondaryButton}
                    >
                      Cancel
                    </button>
                    <button
                      className="ui-btn-polish ui-focus-ring"
                      onClick={createLink}
                      disabled={submitting || !resolvedTargetId}
                      style={{
                        ...ui.primaryButton,
                        cursor: submitting || !resolvedTargetId ? "not-allowed" : "pointer",
                        opacity: submitting || !resolvedTargetId ? 0.62 : 1,
                      }}
                    >
                      {submitting ? "Linking..." : "Create Link"}
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}

function triggerButtonStyle(palette, darkMode) {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    minHeight: 40,
    padding: "0 14px",
    borderRadius: 999,
    border: `1px solid ${palette.border}`,
    background: darkMode
      ? "linear-gradient(180deg, rgba(35, 30, 26, 0.94), rgba(29, 24, 21, 0.9))"
      : "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(241,233,221,0.94))",
    color: palette.text,
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "var(--ui-shadow-xs)",
  };
}

function triggerIconWrap(palette) {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 22,
    height: 22,
    borderRadius: 999,
    background: palette.accentSoft,
    color: palette.link,
    flexShrink: 0,
  };
}

function sectionEyebrow(palette) {
  return {
    margin: 0,
    fontSize: 11,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: palette.muted,
    fontWeight: 700,
  };
}

function fieldLabel(palette) {
  return {
    margin: 0,
    fontSize: 12,
    color: palette.muted,
    fontWeight: 700,
  };
}

function metaPillStyle(palette, background) {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    padding: "8px 12px",
    border: `1px solid ${palette.border}`,
    background,
    color: palette.text,
    fontSize: 12,
    fontWeight: 700,
  };
}

function targetOptionButtonStyle(palette, darkMode, active) {
  return {
    border: `1px solid ${active ? palette.accent : palette.border}`,
    borderRadius: 18,
    background: active
      ? palette.accentSoft
      : darkMode
        ? "rgba(39, 33, 29, 0.96)"
        : "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(241,233,221,0.94))",
    padding: "14px 14px 12px",
    textAlign: "left",
    display: "grid",
    gap: 6,
    cursor: "pointer",
    boxShadow: active ? "var(--ui-shadow-xs)" : "none",
  };
}

function summaryCardStyle(palette, background) {
  return {
    borderRadius: 18,
    border: `1px solid ${palette.border}`,
    background,
    padding: "13px 14px",
    display: "grid",
    gap: 6,
  };
}

function emptyStateStyle(palette) {
  return {
    padding: 18,
    color: palette.muted,
    fontSize: 13,
    lineHeight: 1.65,
  };
}

function resultButtonStyle(palette, darkMode, selected, isLast) {
  return {
    width: "100%",
    border: "none",
    borderBottom: isLast ? "none" : `1px solid ${palette.border}`,
    background: selected
      ? palette.accentSoft
      : darkMode
        ? "transparent"
        : "rgba(255,255,255,0.38)",
    color: palette.text,
    textAlign: "left",
    padding: "14px 16px",
    cursor: "pointer",
    display: "grid",
    gap: 8,
  };
}

function resultBadgeStyle(palette, background) {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    border: `1px solid ${palette.border}`,
    background,
    padding: "4px 8px",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.08em",
    color: palette.muted,
  };
}
