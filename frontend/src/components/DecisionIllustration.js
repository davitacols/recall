import React, { useMemo } from "react";

function hashString(value) {
  const input = String(value || "decision");
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0);
}

function pickPalette(seed, darkMode) {
  const palettes = darkMode
    ? [
        ["#64b1e1", "#4fc4b6"],
        ["#f59e0b", "#f97316"],
        ["#8b5cf6", "#3b82f6"],
        ["#22c55e", "#06b6d4"],
      ]
    : [
        ["#3f93c9", "#1ca394"],
        ["#d97706", "#ea580c"],
        ["#7c3aed", "#2563eb"],
        ["#16a34a", "#0891b2"],
      ];
  return palettes[seed % palettes.length];
}

function statusColor(status, darkMode) {
  const map = {
    proposed: darkMode ? "#f59e0b" : "#b45309",
    under_review: darkMode ? "#60a5fa" : "#1d4ed8",
    approved: darkMode ? "#34d399" : "#047857",
    implemented: darkMode ? "#c084fc" : "#7e22ce",
  };
  return map[status] || (darkMode ? "#93c5fd" : "#2563eb");
}

export default function DecisionIllustration({ decision, size = 78, darkMode = true }) {
  const seed = useMemo(
    () => hashString(`${decision?.id || "x"}-${decision?.title || ""}-${decision?.status || ""}`),
    [decision]
  );
  const [colorA, colorB] = useMemo(() => pickPalette(seed, darkMode), [seed, darkMode]);
  const status = statusColor(decision?.status, darkMode);
  const impact = decision?.impact_level || "medium";
  const impactWidth = impact === "critical" ? 76 : impact === "high" ? 64 : impact === "medium" ? 52 : 40;
  const gradientId = `decision-illus-${seed}`;

  return (
    <div
      aria-label={`Decision illustration for ${decision?.title || "decision"}`}
      style={{
        width: size,
        height: size,
        borderRadius: 12,
        border: "1px solid var(--app-border-strong)",
        overflow: "hidden",
        background: "var(--app-surface-alt)",
        flexShrink: 0,
      }}
    >
      <svg viewBox="0 0 84 84" width="100%" height="100%" role="img" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={colorA} />
            <stop offset="100%" stopColor={colorB} />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="84" height="84" fill={`url(#${gradientId})`} opacity="0.2" />
        <rect x="8" y="10" width="68" height="48" rx="8" fill={darkMode ? "rgba(15,20,28,0.7)" : "rgba(255,255,255,0.78)"} />
        <line x1="22" y1="30" x2="42" y2="22" stroke={status} strokeWidth="2.5" />
        <line x1="42" y1="22" x2="62" y2="36" stroke={status} strokeWidth="2.5" />
        <line x1="42" y1="22" x2="50" y2="45" stroke={status} strokeWidth="2.5" opacity="0.8" />
        <circle cx="22" cy="30" r="4.2" fill={status} />
        <circle cx="42" cy="22" r="4.2" fill={status} />
        <circle cx="62" cy="36" r="4.2" fill={status} />
        <circle cx="50" cy="45" r="4.2" fill={status} />
        <rect x="10" y="65" width="64" height="7" rx="3.5" fill={darkMode ? "rgba(148,163,184,0.25)" : "rgba(120,120,120,0.2)"} />
        <rect x="10" y="65" width={impactWidth} height="7" rx="3.5" fill={status} />
      </svg>
    </div>
  );
}

