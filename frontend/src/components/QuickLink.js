import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircleIcon,
  LinkIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import api from "../services/api";
import { useTheme } from "../utils/ThemeAndAccessibility";

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

export default function QuickLink({ sourceType, sourceId, onLinked }) {
  const { darkMode } = useTheme();
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

  const activeTargetOption = useMemo(
    () => TARGET_OPTIONS.find((option) => option.value === targetType) || TARGET_OPTIONS[0],
    [targetType]
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
        const response = await api.get("/api/knowledge/search-all/", { params: { q: trimmedQuery } });
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

  const resolvedTargetId = selectedTarget?.id || (/^\d+$/.test(query.trim()) ? Number(query.trim()) : null);

  const panelBg = darkMode ? "rgba(24, 20, 17, 0.98)" : "rgba(255, 252, 248, 0.98)";
  const cardBg = darkMode ? "rgba(35, 30, 26, 0.92)" : "rgba(248, 244, 238, 0.92)";
  const inputBg = darkMode ? "rgba(44, 36, 32, 0.96)" : "#ffffff";
  const borderColor = darkMode ? "rgba(120, 113, 108, 0.3)" : "rgba(148, 163, 184, 0.22)";
  const textPrimary = darkMode ? "var(--app-text)" : "var(--app-text)";
  const textSecondary = darkMode ? "var(--app-muted)" : "#5b6474";
  const accent = darkMode ? "#f6c97d" : "#3157c8";

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

  return (
    <>
      <button
        className="ui-btn-polish ui-focus-ring"
        onClick={() => setShowModal(true)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          minHeight: 40,
          padding: "0 14px",
          borderRadius: 999,
          border: `1px solid ${borderColor}`,
          background: cardBg,
          color: textPrimary,
          fontSize: 13,
          fontWeight: 700,
          cursor: "pointer",
          boxShadow: "var(--ui-shadow-xs)",
        }}
      >
        <LinkIcon style={{ width: 14, height: 14, color: accent }} />
        Link to...
      </button>

      {showModal ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.48)",
            backdropFilter: "blur(8px)",
            display: "grid",
            placeItems: "center",
            padding: 20,
            zIndex: 120,
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              width: "min(760px, 100%)",
              borderRadius: 28,
              border: `1px solid ${borderColor}`,
              background: panelBg,
              boxShadow: "0 26px 80px rgba(15, 23, 42, 0.26)",
              display: "grid",
              gap: 16,
              padding: 20,
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
              <div style={{ display: "grid", gap: 6 }}>
                <p style={{ margin: 0, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: textSecondary, fontWeight: 700 }}>
                  Link Record
                </p>
                <h3 style={{ margin: 0, fontSize: 22, lineHeight: 1.05, color: textPrimary }}>
                  Connect this item to another record
                </h3>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: textSecondary, maxWidth: 560 }}>
                  Search by title or paste a numeric ID. New links show up in the context rail and knowledge graph immediately.
                </p>
              </div>
              <button
                className="ui-focus-ring"
                onClick={() => setShowModal(false)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 36,
                  height: 36,
                  borderRadius: 999,
                  border: `1px solid ${borderColor}`,
                  background: cardBg,
                  color: textSecondary,
                  cursor: "pointer",
                }}
              >
                <XMarkIcon style={{ width: 18, height: 18 }} />
              </button>
            </div>

            <div style={{ display: "grid", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                <div style={{ display: "grid", gap: 6 }}>
                  <label style={{ margin: 0, fontSize: 12, color: textSecondary, fontWeight: 700 }}>Target type</label>
                  <select
                    value={targetType}
                    onChange={(event) => setTargetType(event.target.value)}
                    style={{
                      width: "100%",
                      minHeight: 42,
                      padding: "0 12px",
                      borderRadius: 14,
                      border: `1px solid ${borderColor}`,
                      background: inputBg,
                      color: textPrimary,
                      fontSize: 14,
                    }}
                  >
                    {TARGET_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p style={{ margin: 0, fontSize: 12, color: textSecondary, lineHeight: 1.5 }}>
                    {activeTargetOption.helper}
                  </p>
                </div>

                <div style={{ display: "grid", gap: 6 }}>
                  <label style={{ margin: 0, fontSize: 12, color: textSecondary, fontWeight: 700 }}>Relationship</label>
                  <select
                    value={linkType}
                    onChange={(event) => setLinkType(event.target.value)}
                    style={{
                      width: "100%",
                      minHeight: 42,
                      padding: "0 12px",
                      borderRadius: 14,
                      border: `1px solid ${borderColor}`,
                      background: inputBg,
                      color: textPrimary,
                      fontSize: 14,
                    }}
                  >
                    {LINK_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                <label style={{ margin: 0, fontSize: 12, color: textSecondary, fontWeight: 700 }}>
                  Search for a {activeTargetOption.label.toLowerCase()}
                </label>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    minHeight: 46,
                    borderRadius: 16,
                    border: `1px solid ${borderColor}`,
                    background: inputBg,
                    padding: "0 14px",
                  }}
                >
                  <MagnifyingGlassIcon style={{ width: 18, height: 18, color: textSecondary }} />
                  <input
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
                      color: textPrimary,
                      fontSize: 14,
                    }}
                  />
                </div>
              </div>

              {selectedTarget ? (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    alignItems: "center",
                    borderRadius: 18,
                    border: `1px solid ${darkMode ? "rgba(110, 231, 183, 0.24)" : "rgba(16, 185, 129, 0.2)"}`,
                    background: darkMode ? "rgba(16, 185, 129, 0.12)" : "rgba(236, 253, 245, 0.9)",
                    padding: "12px 14px",
                  }}
                >
                  <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
                    <CheckCircleIcon style={{ width: 18, height: 18, color: darkMode ? "#6ee7b7" : "#059669", flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: textPrimary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {selectedTarget.title}
                      </p>
                      <p style={{ margin: "2px 0 0", fontSize: 12, color: textSecondary }}>
                        {activeTargetOption.label} #{selectedTarget.id}
                      </p>
                    </div>
                  </div>
                  <button
                    className="ui-focus-ring"
                    onClick={() => setSelectedTarget(null)}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: textSecondary,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Clear
                  </button>
                </div>
              ) : null}

              <div
                style={{
                  borderRadius: 20,
                  border: `1px solid ${borderColor}`,
                  background: cardBg,
                  minHeight: 220,
                  maxHeight: 320,
                  overflowY: "auto",
                }}
              >
                {query.trim().length < 2 ? (
                  <div style={{ padding: 18, color: textSecondary, fontSize: 13, lineHeight: 1.6 }}>
                    Type at least 2 characters to search, or enter a numeric ID like <strong>42</strong> and link directly.
                  </div>
                ) : searching ? (
                  <div style={{ padding: 18, color: textSecondary, fontSize: 13 }}>
                    Searching {activeTargetOption.label.toLowerCase()}s...
                  </div>
                ) : results.length === 0 ? (
                  <div style={{ padding: 18, color: textSecondary, fontSize: 13, lineHeight: 1.6 }}>
                    No matching {activeTargetOption.label.toLowerCase()} records found. You can still paste a numeric ID into the search box and link it directly.
                  </div>
                ) : (
                  results.map((item) => {
                    const selected = Number(selectedTarget?.id) === Number(item.id);
                    return (
                      <button
                        key={`${item.type}-${item.id}`}
                        className="ui-focus-ring"
                        onClick={() => {
                          setSelectedTarget(item);
                          setError("");
                        }}
                        style={{
                          width: "100%",
                          border: "none",
                          borderBottom: `1px solid ${borderColor}`,
                          background: selected
                            ? (darkMode ? "rgba(246, 201, 125, 0.12)" : "rgba(49, 87, 200, 0.08)")
                            : "transparent",
                          color: textPrimary,
                          textAlign: "left",
                          padding: "14px 16px",
                          cursor: "pointer",
                          display: "grid",
                          gap: 6,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                          <span style={{ fontSize: 14, fontWeight: 700 }}>{item.title}</span>
                          <span
                            style={{
                              flexShrink: 0,
                              borderRadius: 999,
                              border: `1px solid ${borderColor}`,
                              padding: "4px 8px",
                              fontSize: 10,
                              fontWeight: 700,
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                              color: textSecondary,
                            }}
                          >
                            {item.type}
                          </span>
                        </div>
                        <span style={{ fontSize: 12, color: textSecondary, lineHeight: 1.5 }}>
                          {item.excerpt || `${activeTargetOption.label} #${item.id}`}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>

              {error ? (
                <p style={{ margin: 0, fontSize: 12, color: "#dc2626" }}>
                  {error}
                </p>
              ) : null}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
              <button
                className="ui-btn-polish ui-focus-ring"
                onClick={() => setShowModal(false)}
                style={{
                  minHeight: 42,
                  padding: "0 16px",
                  borderRadius: 999,
                  border: `1px solid ${borderColor}`,
                  background: cardBg,
                  color: textSecondary,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                className="ui-btn-polish ui-focus-ring"
                onClick={createLink}
                disabled={submitting || !resolvedTargetId}
                style={{
                  minHeight: 42,
                  padding: "0 16px",
                  borderRadius: 999,
                  border: "none",
                  background: "linear-gradient(135deg, #3157c8, #5e86f2)",
                  color: "#f8fafc",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: submitting || !resolvedTargetId ? "not-allowed" : "pointer",
                  opacity: submitting || !resolvedTargetId ? 0.65 : 1,
                }}
              >
                {submitting ? "Linking..." : "Create Link"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
