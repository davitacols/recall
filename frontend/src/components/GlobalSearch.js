import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import api from "../services/api";
import { useTheme } from "../utils/ThemeAndAccessibility";

export const GlobalSearch = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const { darkMode } = useTheme();

  const palette = useMemo(
    () =>
      darkMode
        ? {
            panel: "#1d171b",
            border: "rgba(255,225,193,0.14)",
            text: "#f4ece0",
            muted: "#baa892",
            hover: "rgba(255,255,255,0.06)",
            active: "rgba(255,173,105,0.18)",
          }
        : {
            panel: "#fffaf3",
            border: "#eadfce",
            text: "#231814",
            muted: "#7d6d5a",
            hover: "rgba(35,24,20,0.06)",
            active: "rgba(255,158,87,0.2)",
          },
    [darkMode]
  );

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await api.get("/api/organizations/search/", { params: { q: query } });
        setResults((response.data || []).slice(0, 12));
      } catch (error) {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 260);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (!results.length) return;
        setSelected((s) => (s + 1) % results.length);
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (!results.length) return;
        setSelected((s) => (s - 1 + results.length) % results.length);
      }
      if (e.key === "Enter" && results[selected]) {
        e.preventDefault();
        onPick(results[selected]);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, results, selected, onClose]);

  const onPick = (item) => {
    const url =
      item.url ||
      (item.type === "conversation" ? `/conversations/${item.id}` :
      item.type === "decision" ? `/decisions/${item.id}` :
      item.type === "project" ? `/projects/${item.id}` :
      item.type === "issue" ? `/issues/${item.id}` :
      item.type === "goal" ? `/business/goals/${item.id}` :
      item.type === "document" ? `/business/documents/${item.id}` : "/");
    navigate(url);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={overlay} onClick={onClose}>
      <div style={{ ...panel, background: palette.panel, border: `1px solid ${palette.border}` }} onClick={(e) => e.stopPropagation()}>
        <div style={{ ...searchWrap, borderBottom: `1px solid ${palette.border}` }}>
          <MagnifyingGlassIcon style={{ width: 18, height: 18, color: palette.muted }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(0);
            }}
            placeholder="Search conversations, decisions, projects..."
            style={{ ...input, color: palette.text }}
          />
        </div>

        <div style={list}>
          {loading ? (
            <div style={{ ...state, color: palette.muted }}>Searching...</div>
          ) : query.trim().length < 2 ? (
            <div style={{ ...state, color: palette.muted }}>Type at least 2 characters</div>
          ) : results.length === 0 ? (
            <div style={{ ...state, color: palette.muted }}>No results found</div>
          ) : (
            results.map((item, index) => (
              <button
                key={`${item.type}-${item.id}-${index}`}
                onClick={() => onPick(item)}
                onMouseEnter={() => setSelected(index)}
                style={{
                  ...row,
                  background: index === selected ? palette.active : "transparent",
                  color: index === selected ? palette.text : palette.muted,
                  borderBottom: `1px solid ${palette.border}`,
                }}
              >
                <span style={typePill}>{item.type || "item"}</span>
                <span style={title}>{item.title || item.name || "Untitled"}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const overlay = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 120, zIndex: 120 };
const panel = { width: "min(820px, 94vw)", borderRadius: 12, overflow: "hidden", boxShadow: "0 18px 40px rgba(0,0,0,0.28)" };
const searchWrap = { display: "flex", alignItems: "center", gap: 10, padding: "12px 14px" };
const input = { width: "100%", border: "none", outline: "none", background: "transparent", fontSize: 15, fontFamily: "inherit" };
const list = { maxHeight: 420, overflowY: "auto" };
const row = { width: "100%", border: "none", textAlign: "left", padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontFamily: "inherit" };
const typePill = { borderRadius: 999, padding: "2px 8px", fontSize: 10, textTransform: "uppercase", border: "1px solid rgba(120,120,120,0.35)", fontWeight: 700, flexShrink: 0 };
const title = { fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
const state = { textAlign: "center", padding: "18px 12px", fontSize: 13 };
