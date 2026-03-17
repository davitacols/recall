import React, { useId } from "react";

const tones = {
  warm: {
    shellStart: "#fffdf8",
    shellEnd: "#e9e2d6",
    shellStroke: "rgba(46, 38, 30, 0.12)",
    core: "#1f1a17",
    nodeA: "#2e63d0",
    nodeB: "#6e95e7",
    halo: "rgba(94, 143, 232, 0.18)",
    text: "#1f1a17",
  },
  dark: {
    shellStart: "#2b241f",
    shellEnd: "#15110f",
    shellStroke: "rgba(240, 230, 214, 0.14)",
    core: "#f5efe6",
    nodeA: "#9ab9ff",
    nodeB: "#d0deff",
    halo: "rgba(154, 185, 255, 0.2)",
    text: "var(--app-text, #f5efe6)",
  },
  light: {
    shellStart: "#31487a",
    shellEnd: "#18243f",
    shellStroke: "rgba(228, 236, 255, 0.22)",
    core: "#f7f4ee",
    nodeA: "#9bbaff",
    nodeB: "#d7e3ff",
    halo: "rgba(155, 186, 255, 0.24)",
    text: "#f7f4ee",
  },
};

function getSizeTokens(size) {
  if (size === "sm") return { mark: 22, text: 16, gap: 8 };
  if (size === "lg") return { mark: 34, text: 24, gap: 11 };
  return { mark: 28, text: 20, gap: 10 };
}

function BrandMark({ token, color, idBase }) {
  const gradientId = `${idBase}-grad`;
  const haloId = `${idBase}-halo`;

  return (
    <svg
      aria-hidden="true"
      width={token.mark}
      height={token.mark}
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0, display: "block" }}
    >
      <defs>
        <linearGradient id={gradientId} x1="6" y1="5" x2="35" y2="39" gradientUnits="userSpaceOnUse">
          <stop stopColor={color.shellStart} />
          <stop offset="1" stopColor={color.shellEnd} />
        </linearGradient>
        <radialGradient id={haloId} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(31 13) rotate(90) scale(20)">
          <stop stopColor={color.halo} />
          <stop offset="1" stopColor="transparent" />
        </radialGradient>
      </defs>

      <rect x="3" y="3" width="38" height="38" rx="13" fill={`url(#${gradientId})`} />
      <rect x="3" y="3" width="38" height="38" rx="13" stroke={color.shellStroke} />
      <circle cx="28" cy="18" r="14" fill={`url(#${haloId})`} />
      <path d="M14.5 10.5V33.5" stroke={color.core} strokeWidth="4.5" strokeLinecap="round" />
      <path d="M29.5 11.5L18.5 22L30.5 33" stroke={color.core} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17.8 22H24.2" stroke={color.nodeA} strokeWidth="3.2" strokeLinecap="round" />
      <circle cx="29.5" cy="11.5" r="3.3" fill={color.nodeA} />
      <circle cx="18.5" cy="22" r="3.3" fill={color.core} />
      <circle cx="30.5" cy="33" r="3.3" fill={color.nodeB} />
    </svg>
  );
}

export default function BrandLogo({
  size = "md",
  tone = "warm",
  showText = true,
  label = "Knoledgr",
  textWeight = 800,
  style,
  downloadUrl,
  downloadName,
  title,
}) {
  const color = tones[tone] || tones.warm;
  const token = getSizeTokens(size);
  const reactId = useId().replace(/:/g, "");
  const idBase = `knoledgr-${tone}-${size}-${reactId}`;
  const content = (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: token.gap,
        ...style,
      }}
    >
      <BrandMark token={token} color={color} idBase={idBase} />
      {showText ? (
        <span
          style={{
            fontSize: token.text,
            fontWeight: textWeight,
            lineHeight: 0.94,
            letterSpacing: "-0.045em",
            color: color.text,
            fontFamily:
              'var(--font-primary, "Sora"), var(--font-display, "Fraunces"), sans-serif',
          }}
        >
          {label}
        </span>
      ) : null}
    </span>
  );

  if (downloadUrl) {
    return (
      <a
        href={downloadUrl}
        download={downloadName}
        title={title || "Download brand logo"}
        style={{
          display: "inline-flex",
          textDecoration: "none",
          cursor: "pointer",
        }}
        aria-label={title || "Download brand logo"}
      >
        {content}
      </a>
    );
  }

  return content;
}
