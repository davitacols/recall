import React from "react";

export default function BrandedTechnicalIllustration({ darkMode, compact = false }) {
  const a = darkMode ? "#6bb6e8" : "#3f93c9";
  const b = darkMode ? "#46c2a9" : "#1ca394";
  const c = darkMode ? "#ffb476" : "#d9692e";
  const panel = darkMode ? "rgba(10,16,23,0.62)" : "rgba(255,255,255,0.76)";
  const stroke = darkMode ? "rgba(150,196,225,0.28)" : "rgba(83,126,157,0.28)";

  return (
    <div style={{ ...wrap, minHeight: compact ? 170 : 212 }}>
      <style>{`
        @keyframes btiFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes btiPulse { 0%,100%{opacity:.46} 50%{opacity:.85} }
        @keyframes btiDash { from { stroke-dashoffset: 120; } to { stroke-dashoffset: 0; } }
      `}</style>
      <svg viewBox="0 0 360 220" width="100%" height="100%" aria-hidden="true">
        <defs>
          <linearGradient id="btiGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={a} />
            <stop offset="100%" stopColor={b} />
          </linearGradient>
        </defs>
        <rect x="18" y="18" width="324" height="184" rx="16" fill={panel} stroke={stroke} />
        <g style={{ animation: "btiFloat 5.2s ease-in-out infinite" }}>
          <rect x="38" y="42" width="116" height="74" rx="11" fill="url(#btiGrad)" opacity="0.2" />
          <rect x="50" y="56" width="84" height="8" rx="4" fill={c} />
          <rect x="50" y="71" width="66" height="6" rx="3" fill={a} opacity="0.8" />
          <rect x="50" y="83" width="72" height="6" rx="3" fill={b} opacity="0.72" />
        </g>
        <g style={{ animation: "btiFloat 6s ease-in-out infinite" }}>
          <rect x="198" y="36" width="126" height="84" rx="11" fill="url(#btiGrad)" opacity="0.18" />
          <circle cx="220" cy="73" r="8" fill={c} />
          <rect x="236" y="66" width="70" height="7" rx="3.5" fill={a} />
          <rect x="236" y="79" width="56" height="6" rx="3" fill={b} />
          <rect x="236" y="91" width="40" height="6" rx="3" fill={a} opacity="0.75" />
        </g>
        <path
          d="M76 140 C116 164, 164 110, 214 136 S294 154, 324 126"
          fill="none"
          stroke="url(#btiGrad)"
          strokeWidth="3"
          strokeDasharray="7 7"
          style={{ animation: "btiDash 3s linear infinite" }}
        />
        <g style={{ animation: "btiPulse 3.1s ease-in-out infinite" }}>
          <circle cx="76" cy="140" r="6" fill={a} />
          <circle cx="214" cy="136" r="6" fill={b} />
          <circle cx="324" cy="126" r="6" fill={c} />
        </g>
        <rect x="54" y="170" width="252" height="12" rx="6" fill={darkMode ? "rgba(148,163,184,0.24)" : "rgba(120,120,120,0.18)"} />
        <rect x="54" y="170" width="164" height="12" rx="6" fill="url(#btiGrad)" />
      </svg>
    </div>
  );
}

const wrap = {
  width: "100%",
  maxWidth: 360,
  border: "1px solid var(--app-border)",
  background: "var(--app-surface-alt)",
  overflow: "hidden",
};

