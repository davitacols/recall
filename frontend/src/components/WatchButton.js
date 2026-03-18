import React, { useEffect, useMemo, useState } from "react";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import api from "../services/api";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette } from "../utils/projectUi";

function WatchButton({ issueId, isWatching: initialWatching, onToggle }) {
  const { darkMode } = useTheme();
  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const [isWatching, setIsWatching] = useState(Boolean(initialWatching));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setIsWatching(Boolean(initialWatching));
  }, [initialWatching]);

  const toggleWatch = async () => {
    setLoading(true);
    try {
      if (isWatching) {
        await api.delete(`/api/agile/issues/${issueId}/unwatch/`);
        setIsWatching(false);
        onToggle?.(false);
      } else {
        await api.post(`/api/agile/issues/${issueId}/watch/`);
        setIsWatching(true);
        onToggle?.(true);
      }
    } catch (error) {
      console.error("Failed to toggle watch:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      className="ui-btn-polish ui-focus-ring"
      onClick={toggleWatch}
      disabled={loading}
      style={{
        borderRadius: 999,
        padding: "10px 14px",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        fontSize: 12,
        fontWeight: 800,
        border: `1px solid ${isWatching ? "transparent" : palette.border}`,
        background: isWatching ? palette.ctaGradient : palette.card,
        color: isWatching ? palette.buttonText : palette.text,
        cursor: loading ? "wait" : "pointer",
        opacity: loading ? 0.7 : 1,
        boxShadow: "var(--ui-shadow-sm)",
      }}
    >
      {isWatching ? <EyeIcon style={icon14} /> : <EyeSlashIcon style={icon14} />}
      {loading ? "Updating..." : isWatching ? "Watching" : "Watch"}
    </button>
  );
}

const icon14 = { width: 14, height: 14 };

export default WatchButton;
