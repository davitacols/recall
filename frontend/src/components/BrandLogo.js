import React from "react";

const tones = {
  warm: { text: "#171513" },
  blue: { text: "#171513" },
  blueLight: { text: "#f8fafc" },
  dark: { text: "var(--app-text, #f5ede1)" },
  light: { text: "#f7f2e8" },
};

function getSizeTokens(size) {
  if (size === "sm") return { mark: 22, text: 16, gap: 8 };
  if (size === "lg") return { mark: 34, text: 24, gap: 11 };
  return { mark: 28, text: 20, gap: 10 };
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
  const invertMark = tone === "blueLight" || tone === "dark" || tone === "light";
  const content = (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: token.gap,
        minWidth: 0,
        ...style,
      }}
    >
      <img
        src="/logo/logo-mark.png"
        alt={showText ? "" : label}
        aria-hidden={showText ? "true" : undefined}
        width={token.mark}
        height={token.mark}
        style={{
          width: token.mark,
          height: token.mark,
          display: "block",
          flexShrink: 0,
          objectFit: "contain",
          filter: invertMark ? "brightness(0) invert(1)" : "none",
        }}
      />
      {showText ? (
        <span
          style={{
            fontSize: token.text,
            fontWeight: textWeight,
            lineHeight: 0.94,
            color: color.text,
            fontFamily: '"League Spartan", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            whiteSpace: "nowrap",
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
