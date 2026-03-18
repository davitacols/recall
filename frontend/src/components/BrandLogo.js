import React from "react";

const tones = {
  warm: { text: "#171513" },
  dark: { text: "var(--app-text, #f5ede1)" },
  light: { text: "#f7f2e8" },
};

const mark = {
  shell: "#172233",
  shellStroke: "rgba(246, 236, 219, 0.18)",
  core: "#f7efe4",
  nodeA: "#7eb7ff",
  nodeB: "#d9a25e",
  orbitA: "rgba(126, 183, 255, 0.22)",
  orbitB: "rgba(217, 162, 94, 0.2)",
  haloCool: "rgba(126, 183, 255, 0.14)",
  haloWarm: "rgba(217, 162, 94, 0.12)",
};

function getSizeTokens(size) {
  if (size === "sm") return { mark: 22, text: 16, gap: 8 };
  if (size === "lg") return { mark: 34, text: 24, gap: 11 };
  return { mark: 28, text: 20, gap: 10 };
}

function BrandMark({ token }) {
  return (
    <svg
      aria-hidden="true"
      width={token.mark}
      height={token.mark}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0, display: "block" }}
    >
      <rect x="4" y="4" width="40" height="40" rx="15" fill={mark.shell} />
      <rect x="4" y="4" width="40" height="40" rx="15" stroke={mark.shellStroke} />
      <circle cx="34" cy="14" r="11" fill={mark.haloCool} />
      <circle cx="16" cy="36" r="11" fill={mark.haloWarm} />
      <path d="M12.5 17.2C17.1 12.7 22.5 11.6 30.2 13.8" stroke={mark.orbitA} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M20.8 24C25.6 25.9 29.1 29.5 31.5 34.9" stroke={mark.orbitB} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M16.5 12.5V35.5" stroke={mark.core} strokeWidth="4.6" strokeLinecap="round" />
      <path d="M30.5 13.5L20.8 24L31.5 35" stroke={mark.core} strokeWidth="4.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20.8 24H26" stroke={mark.nodeA} strokeWidth="3.3" strokeLinecap="round" />
      <circle cx="30.5" cy="13.5" r="3.4" fill={mark.nodeA} />
      <circle cx="20.8" cy="24" r="3.4" fill={mark.core} />
      <circle cx="31.5" cy="35" r="3.4" fill={mark.nodeB} />
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
  const content = (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: token.gap,
        ...style,
      }}
    >
      <BrandMark token={token} />
      {showText ? (
        <span
          style={{
            fontSize: token.text,
            fontWeight: textWeight,
            lineHeight: 0.94,
            letterSpacing: "-0.055em",
            color: color.text,
            fontFamily: '"Space Grotesk", "Manrope", "Segoe UI", sans-serif',
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
        title={title || "Download Knoledgr logo"}
        style={{
          display: "inline-flex",
          textDecoration: "none",
          cursor: "pointer",
        }}
        aria-label={title || "Download Knoledgr logo"}
      >
        {content}
      </a>
    );
  }

  return content;
}
