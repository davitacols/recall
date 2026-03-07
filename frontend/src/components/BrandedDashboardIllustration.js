import React from "react";

export default function BrandedDashboardIllustration({ darkMode, compact = false }) {
  const gradA = darkMode ? "#64b1e1" : "#3f93c9";
  const gradB = darkMode ? "#4fc4b6" : "#1ca394";
  const accent = darkMode ? "#ffb476" : "#d9692e";
  const panel = darkMode ? "rgba(9,14,20,0.62)" : "rgba(255,255,255,0.76)";
  const stroke = darkMode ? "rgba(148,198,233,0.28)" : "rgba(83,126,157,0.3)";
  const glow = darkMode ? "rgba(100,177,225,0.35)" : "rgba(63,147,201,0.24)";

  return (
    <div style={{ ...wrap, minHeight: compact ? 184 : 230 }}>
      <style>{`
        @keyframes bdiFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes bdiPulse {
          0%, 100% { opacity: 0.42; transform: scale(1); }
          50% { opacity: 0.78; transform: scale(1.05); }
        }
        @keyframes bdiSweep {
          0% { stroke-dashoffset: 120; }
          100% { stroke-dashoffset: 0; }
        }
      `}</style>

      <svg viewBox="0 0 360 220" width="100%" height="100%" aria-hidden="true">
        <defs>
          <linearGradient id="bdiGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={gradA} />
            <stop offset="100%" stopColor={gradB} />
          </linearGradient>
          <radialGradient id="bdiAura" cx="0.5" cy="0.5" r="0.6">
            <stop offset="0%" stopColor={glow} />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>

        <rect x="0" y="0" width="360" height="220" fill="url(#bdiAura)" />
        <rect x="18" y="20" width="324" height="182" rx="16" fill={panel} stroke={stroke} />

        <g style={{ animation: "bdiFloat 5.4s ease-in-out infinite" }}>
          <rect x="42" y="48" width="94" height="58" rx="10" fill="url(#bdiGradient)" opacity="0.24" />
          <rect x="52" y="60" width="72" height="8" rx="4" fill={accent} opacity="0.8" />
          <rect x="52" y="74" width="52" height="6" rx="3" fill={gradA} opacity="0.7" />
          <rect x="52" y="86" width="60" height="6" rx="3" fill={gradB} opacity="0.66" />
        </g>

        <g style={{ animation: "bdiFloat 6.3s ease-in-out infinite", transformOrigin: "265px 92px" }}>
          <rect x="210" y="42" width="108" height="74" rx="10" fill="url(#bdiGradient)" opacity="0.2" />
          <circle cx="230" cy="78" r="8" fill={accent} opacity="0.9" />
          <rect x="246" y="70" width="56" height="7" rx="3.5" fill={gradA} />
          <rect x="246" y="82" width="44" height="6" rx="3" fill={gradB} opacity="0.75" />
        </g>

        <path
          d="M88 118 C130 138, 160 98, 206 124 S286 140, 318 114"
          fill="none"
          stroke="url(#bdiGradient)"
          strokeWidth="3"
          strokeDasharray="6 7"
          style={{ animation: "bdiSweep 3.2s linear infinite" }}
        />

        <g style={{ animation: "bdiPulse 3.1s ease-in-out infinite" }}>
          <circle cx="88" cy="118" r="6.2" fill={gradA} />
          <circle cx="206" cy="124" r="6.2" fill={gradB} />
          <circle cx="318" cy="114" r="6.2" fill={accent} />
        </g>

        <g style={{ animation: "bdiFloat 4.9s ease-in-out infinite" }}>
          <rect x="58" y="146" width="244" height="12" rx="6" fill={darkMode ? "rgba(148,163,184,0.26)" : "rgba(120,120,120,0.18)"} />
          <rect x="58" y="146" width="162" height="12" rx="6" fill="url(#bdiGradient)" />
        </g>
      </svg>
    </div>
  );
}

const wrap = {
  width: "100%",
  maxWidth: 360,
  minHeight: 210,
  border: "1px solid var(--app-border)",
  background: "var(--app-surface-alt)",
  overflow: "hidden",
};

