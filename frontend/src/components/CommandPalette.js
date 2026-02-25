import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../utils/ThemeAndAccessibility";

export const CommandPalette = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const { darkMode } = useTheme();

  const commands = [
    { name: "New Issue", action: () => navigate("/issues/create"), icon: "➕" },
    { name: "Dashboard", action: () => navigate("/dashboard"), icon: "📊" },
    { name: "Issues", action: () => navigate("/issues"), icon: "📋" },
    { name: "Conversations", action: () => navigate("/conversations"), icon: "💬" },
    { name: "Sprints", action: () => navigate("/sprints"), icon: "🏃" },
    { name: "Settings", action: () => navigate("/settings"), icon: "⚙️" },
    { name: "Knowledge Base", action: () => navigate("/knowledge"), icon: "📚" },
  ];

  const filtered = commands.filter((cmd) => cmd.name.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.defaultPrevented) return;
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      if (modKey && e.key === "k") {
        if (document.querySelector('[data-unified-nav-search="true"]')) return;
        e.preventDefault();
        setIsOpen(true);
      }

      if (e.key === "Escape") {
        setIsOpen(false);
        setSearch("");
      }

      if (isOpen) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelected((s) => (filtered.length ? (s + 1) % filtered.length : 0));
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelected((s) => (filtered.length ? (s - 1 + filtered.length) % filtered.length : 0));
        }
        if (e.key === "Enter" && filtered[selected]) {
          e.preventDefault();
          filtered[selected].action();
          setIsOpen(false);
          setSearch("");
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filtered, selected, navigate]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  if (!isOpen) return null;

  const palette = darkMode
    ? { panel: "#1d171b", border: "rgba(255,225,193,0.14)", text: "#f4ece0", muted: "#baa892", hover: "rgba(255,255,255,0.06)", active: "rgba(255,173,105,0.18)" }
    : { panel: "#fffaf3", border: "#eadfce", text: "#231814", muted: "#7d6d5a", hover: "rgba(35,24,20,0.06)", active: "rgba(255,158,87,0.2)" };

  return (
    <div style={overlay} onClick={() => setIsOpen(false)}>
      <div style={{ ...panel, background: palette.panel, border: `1px solid ${palette.border}` }} onClick={(e) => e.stopPropagation()}>
        <div style={{ ...searchWrap, borderBottom: `1px solid ${palette.border}` }}>
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Type a command or search..."
            style={{ ...input, color: palette.text }}
          />
        </div>
        <div style={list}>
          {filtered.length === 0 ? (
            <div style={{ ...empty, color: palette.muted }}>No results found</div>
          ) : (
            filtered.map((cmd, i) => (
              <button
                key={cmd.name}
                onClick={() => {
                  cmd.action();
                  setIsOpen(false);
                  setSearch("");
                }}
                style={{
                  ...row,
                  background: i === selected ? palette.active : "transparent",
                  color: i === selected ? palette.text : palette.muted,
                }}
              >
                <span style={icon}>{cmd.icon}</span>
                <span style={label}>{cmd.name}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const overlay = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 120, zIndex: 120 };
const panel = { width: "min(720px, 92vw)", borderRadius: 12, overflow: "hidden", boxShadow: "0 18px 40px rgba(0,0,0,0.28)" };
const searchWrap = { padding: 12 };
const input = { width: "100%", border: "none", outline: "none", background: "transparent", fontSize: 16, fontFamily: "inherit" };
const list = { maxHeight: 380, overflowY: "auto" };
const row = { width: "100%", border: "none", background: "transparent", padding: "12px 14px", textAlign: "left", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontFamily: "inherit" };
const icon = { fontSize: 20 };
const label = { fontSize: 14, fontWeight: 600 };
const empty = { padding: 18, textAlign: "center", fontSize: 13 };
