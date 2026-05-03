import React from "react";

const tones = {
  warm: { text: "#171513" },
  blue: { text: "#171513" },
  blueLight: { text: "#f8fafc" },
  dark: { text: "var(--app-text, #f5ede1)" },
  light: { text: "#f7f2e8" },
};

function getSizeTokens(size) {
  if (size === "sm") return { mark: 22, text: 16, gap: 8, wordmarkWidth: 118 };
  if (size === "lg") return { mark: 34, text: 24, gap: 11, wordmarkWidth: 176 };
  return { mark: 28, text: 20, gap: 10, wordmarkWidth: 148 };
}

function getWordmarkSrc(tone) {
  if (tone === "blueLight") return "/brand/knoledgr-brandlogo-blue-light.svg";
  if (tone === "blue") return "/brand/knoledgr-brandlogo-blue.svg";
  return tone === "light" ? "/brand/knoledgr-brandlogo-light.svg" : "/brand/knoledgr-brandlogo.svg";
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
  const useWordmarkAsset = showText && label === "Knoledgr" && tone !== "dark";
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
      {useWordmarkAsset ? (
        <img
          src={getWordmarkSrc(tone)}
          alt={label}
          width={token.wordmarkWidth}
          style={{
            width: token.wordmarkWidth,
            height: "auto",
            display: "block",
            flexShrink: 0,
            maxWidth: "100%",
          }}
        />
      ) : (
        <>
          <img
            src="/brand/knoledgr-brandmark.svg"
            alt={showText ? "" : label}
            aria-hidden={showText ? "true" : undefined}
            width={token.mark}
            height={token.mark}
            style={{
              width: token.mark,
              height: token.mark,
              display: "block",
              flexShrink: 0,
            }}
          />
          {showText ? (
            <span
              style={{
                fontSize: token.text,
                fontWeight: textWeight,
                lineHeight: 0.94,
                letterSpacing: "-0.055em",
                color: color.text,
                fontFamily: '"League Spartan", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                whiteSpace: "nowrap",
              }}
            >
              {label}
            </span>
          ) : null}
        </>
      )}
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
