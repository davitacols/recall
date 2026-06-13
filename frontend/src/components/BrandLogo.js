import React from "react";
import Wordmark from "./Wordmark";

const tones = {
  warm: { text: "#171513" },
  blue: { text: "#171513" },
  blueLight: { text: "#f8fafc" },
  dark: { text: "var(--app-text, #f5ede1)" },
  light: { text: "#f7f2e8" },
};

function getSizeTokens(size) {
  if (size === "sm") return { mark: 22, text: 15, gap: 7 };
  if (size === "lg") return { mark: 34, text: 24, gap: 11 };
  return { mark: 28, text: 19, gap: 9 };
}

export default function BrandLogo({
  size = "md",
  tone = "warm",
  showText = true,
  label = "Knoledgr",
  // textWeight retained for backward compat; ignored by Wordmark.
  // eslint-disable-next-line no-unused-vars
  textWeight,
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
        <Wordmark
          size={token.text}
          color={color.text}
          label={label}
          ariaLabel={label}
        />
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
