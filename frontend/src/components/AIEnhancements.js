import React, { useMemo, useState } from "react";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { useToast } from "./Toast";
import {
  ArrowPathIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentListIcon,
  FaceSmileIcon,
  LightBulbIcon,
  PencilSquareIcon,
  SparklesIcon,
  TagIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { aiButtonPrimary, aiButtonSecondary, aiCard, getAIPalette } from "./aiUi";

export function AIEnhancementButton({ content, title, type = "conversation", onResult, documentId }) {
  const { darkMode } = useTheme();
  const palette = useMemo(() => getAIPalette(darkMode), [darkMode]);
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const processAI = async (feature) => {
    setLoading(true);
    setShowMenu(false);

    try {
      const token = localStorage.getItem("token");
      let finalContent = content;

      if (type === "document" && documentId) {
        try {
          const extractRes = await fetch(`${process.env.REACT_APP_API_URL}/api/business/documents/${documentId}/extract-text/`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (extractRes.ok) {
            const extractData = await extractRes.json();
            if (extractData.text && extractData.text.trim()) finalContent = extractData.text;
          }
        } catch (e) {
          console.error("PDF extraction failed:", e);
        }
      }

      const endpoint = feature === "batch" ? "/api/organizations/ai/batch/" : `/api/organizations/ai/${feature}/`;

      const res = await fetch(`${process.env.REACT_APP_API_URL}${endpoint}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: finalContent, title, content_type: type }),
      });

      const data = await res.json();

      if (res.ok) {
        onResult?.(feature, { ...data, feature });
        success(`AI ${feature} completed`);
      } else {
        error(data.error || "AI processing failed");
      }
    } catch (err) {
      error("Failed to process with AI");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setShowMenu((prev) => !prev)} disabled={loading} style={{ ...aiButtonPrimary(), opacity: loading ? 0.7 : 1 }}>
        {loading ? <ArrowPathIcon style={{ width: 14, height: 14 }} className="animate-spin" /> : <SparklesIcon style={{ width: 14, height: 14 }} />}
        AI Actions
      </button>

      {showMenu && (
        <div style={{ ...aiCard(palette), position: "absolute", top: "calc(100% + 6px)", right: 0, width: 210, zIndex: 30, padding: 6 }}>
          <MenuAction label="Draft Summary" icon={PencilSquareIcon} onClick={() => processAI("summarize")} />
          <MenuAction label="Generate Tags" icon={TagIcon} onClick={() => processAI("tags")} />
          <MenuAction label="Read Tone" icon={FaceSmileIcon} onClick={() => processAI("sentiment")} />
          <MenuAction label="Suggest Next Moves" icon={LightBulbIcon} onClick={() => processAI("suggestions")} />
          <hr style={{ border: 0, borderTop: `1px solid ${palette.border}`, margin: "6px 0" }} />
          <MenuAction label="Run Full Pass" icon={SparklesIcon} onClick={() => processAI("batch")} strong />
        </div>
      )}
    </div>
  );
}

function MenuAction({ label, icon: Icon, onClick, strong = false }) {
  return (
    <button onClick={onClick} style={{ width: "100%", border: "none", background: "transparent", borderRadius: 8, padding: "8px 10px", display: "flex", gap: 8, alignItems: "center", cursor: "pointer", color: "var(--ui-text)", fontWeight: strong ? 700 : 500, fontSize: 12 }}>
      <Icon style={{ width: 14, height: 14 }} /> {label}
    </button>
  );
}

export function AIResultsPanel({
  results,
  onClose,
  onApplySummary,
  onApplyTags,
  onAppendActions,
  askHref,
}) {
  const { darkMode } = useTheme();
  const palette = useMemo(() => getAIPalette(darkMode), [darkMode]);

  const [position, setPosition] = React.useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 });

  const handleMouseDown = (e) => {
    if (e.target.closest("button") || e.target.closest(".content-area")) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  React.useEffect(() => {
    if (!isDragging) return;
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  if (!results) return null;

  const hasSummary = Boolean(results.summary);
  const hasTags = Array.isArray(results.tags) && results.tags.length > 0;
  const hasActions = Array.isArray(results.actions) && results.actions.length > 0;
  const canApply = hasSummary || hasTags || hasActions || askHref;

  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--app-overlay)", display: "grid", placeItems: "center", zIndex: 120, padding: 16 }}>
      <div style={{ ...aiCard(palette), width: "min(780px,100%)", maxHeight: "80vh", overflow: "hidden", transform: `translate(${position.x}px, ${position.y}px)` }}>
        <div onMouseDown={handleMouseDown} style={{ padding: 14, borderBottom: `1px solid ${palette.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", cursor: isDragging ? "grabbing" : "grab" }}>
          <h2 style={{ margin: 0, fontSize: 18, color: palette.text, display: "inline-flex", alignItems: "center", gap: 8 }}><SparklesIcon style={{ width: 18, height: 18 }} /> AI Workspace Actions</h2>
          <button onClick={onClose} style={{ ...aiButtonSecondary(palette), padding: "6px 8px" }}><XMarkIcon style={{ width: 14, height: 14 }} /></button>
        </div>

        <div className="content-area" style={{ padding: 14, overflowY: "auto", maxHeight: "calc(80vh - 120px)", display: "grid", gap: 10 }}>
          {results.summary && <Block title="Summary" body={<p style={p}>{results.summary}</p>} />}
          {results.tags?.length > 0 && <Block title="Tags" body={<TagList tags={results.tags} />} />}
          {results.sentiment && <Block title="Sentiment" body={<Sentiment results={results} />} />}
          {results.suggestions?.length > 0 && <Block title="Suggestions" body={<List items={results.suggestions} />} />}
          {results.actions?.length > 0 && <Block title="Actions" body={<List items={results.actions} checked />} />}
          {canApply ? (
            <section style={{ borderRadius: 10, border: `1px solid ${palette.border}`, background: palette.cardAlt, padding: 10 }}>
              <h3 style={{ margin: "0 0 8px", fontSize: 13, color: palette.text }}>Use This</h3>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {hasSummary && onApplySummary ? (
                  <button onClick={() => onApplySummary(results.summary)} style={aiButtonSecondary(palette)}>
                    <PencilSquareIcon style={{ width: 14, height: 14 }} /> Use summary
                  </button>
                ) : null}
                {hasTags && onApplyTags ? (
                  <button onClick={() => onApplyTags(results.tags)} style={aiButtonSecondary(palette)}>
                    <TagIcon style={{ width: 14, height: 14 }} /> Apply tags
                  </button>
                ) : null}
                {hasActions && onAppendActions ? (
                  <button onClick={() => onAppendActions(results.actions)} style={aiButtonSecondary(palette)}>
                    <ClipboardDocumentListIcon style={{ width: 14, height: 14 }} /> Append actions
                  </button>
                ) : null}
                {askHref ? (
                  <a href={askHref} style={{ ...aiButtonSecondary(palette), textDecoration: "none" }}>
                    <ChatBubbleLeftRightIcon style={{ width: 14, height: 14 }} /> Continue in Ask Recall
                  </a>
                ) : null}
              </div>
            </section>
          ) : null}
        </div>

        <div style={{ padding: 12, borderTop: `1px solid ${palette.border}`, display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={aiButtonSecondary(palette)}>Close</button>
        </div>
      </div>
    </div>
  );
}

function Block({ title, body }) {
  return (
    <section style={{ borderRadius: 10, border: "1px solid var(--app-border-strong)", background: "var(--app-surface-alt)", padding: 10 }}>
      <h3 style={{ margin: "0 0 6px", fontSize: 13, color: "var(--app-text)" }}>{title}</h3>
      {body}
    </section>
  );
}

function TagList({ tags }) {
  return <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{tags.map((tag, i) => <span key={i} style={{ border: "1px solid rgba(52,211,153,0.4)", color: "#6ee7b7", borderRadius: 999, padding: "3px 8px", fontSize: 11 }}>#{tag}</span>)}</div>;
}

function Sentiment({ results }) {
  return (
    <div style={{ display: "grid", gap: 4, fontSize: 12, color: "var(--ui-text)" }}>
      <p style={{ margin: 0 }}><b>Sentiment:</b> {results.sentiment}</p>
      {results.confidence !== undefined && <p style={{ margin: 0 }}><b>Confidence:</b> {(results.confidence * 100).toFixed(0)}%</p>}
      {results.tone && <p style={{ margin: 0 }}><b>Tone:</b> {results.tone}</p>}
      {results.key_emotions?.length > 0 && <p style={{ margin: 0 }}><b>Emotions:</b> {results.key_emotions.join(", ")}</p>}
    </div>
  );
}

function List({ items, checked = false }) {
  return (
    <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 6 }}>
      {items.map((item, i) => (
        <li key={i} style={{ display: "grid", gridTemplateColumns: "12px 1fr", gap: 6, fontSize: 12, color: "var(--ui-text)" }}>
          <span style={{ color: checked ? "var(--ui-accent)" : "var(--app-warning)" }}>-</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

const p = { margin: 0, fontSize: 13, color: "var(--ui-text)", lineHeight: 1.5 };

export function QuickAIButton({ itemType, itemId, onComplete }) {
  const { darkMode } = useTheme();
  const palette = useMemo(() => getAIPalette(darkMode), [darkMode]);
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);

  const processItem = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/organizations/ai/${itemType}/${itemId}/process/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        success("AI processing complete");
        onComplete?.(data);
      } else {
        error(data.error || "AI processing failed");
      }
    } catch (err) {
      error("Failed to process with AI");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={processItem} disabled={loading} style={{ ...aiButtonSecondary(palette), opacity: loading ? 0.7 : 1 }}>
      {loading ? <ArrowPathIcon style={{ width: 14, height: 14 }} className="animate-spin" /> : <SparklesIcon style={{ width: 14, height: 14 }} />}
      AI Process
    </button>
  );
}
