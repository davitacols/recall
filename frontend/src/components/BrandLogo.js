import React, { useId } from "react";

const tones = {
  warm: {
    shellStart: "#f6fbff",
    shellEnd: "#d9ebff",
    shellStroke: "rgba(31, 70, 114, 0.16)",
    core: "#11263f",
    nodeA: "#2977ff",
    nodeB: "#43d4ff",
    halo: "rgba(67, 212, 255, 0.2)",
    text: "#13263d",
  },
  dark: {
    shellStart: "#17304a",
    shellEnd: "#0c1726",
    shellStroke: "rgba(123, 198, 255, 0.22)",
    core: "#eef6ff",
    nodeA: "#63bfff",
    nodeB: "#52e7ff",
    halo: "rgba(82, 231, 255, 0.22)",
    text: "var(--app-text, #edf4ff)",
  },
  light: {
    shellStart: "#1d3652",
    shellEnd: "#091321",
    shellStroke: "rgba(160, 221, 255, 0.26)",
    core: "#f7fbff",
    nodeA: "#7ac5ff",
    nodeB: "#5af0ff",
    halo: "rgba(90, 240, 255, 0.24)",
    text: "#f4f9ff",
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
              'var(--font-display, "Space Grotesk"), var(--font-primary, "Segoe UI"), sans-serif',
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
