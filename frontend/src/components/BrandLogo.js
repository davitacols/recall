import React from "react";

const tones = {
  warm: {
    markBg: "linear-gradient(170deg, #efd8bf, #e4c2a0)",
    markStroke: "rgba(74, 50, 34, 0.2)",
    glyph: "#1f1712",
    text: "inherit",
  },
  dark: {
    markBg: "linear-gradient(170deg, #ecd3b8, #ddb994)",
    markStroke: "rgba(18, 12, 9, 0.28)",
    glyph: "#1a130e",
    text: "var(--app-text)",
  },
  light: {
    markBg: "linear-gradient(170deg, #f2ddc7, #e5c4a5)",
    markStroke: "rgba(84, 52, 31, 0.22)",
    glyph: "#24170f",
    text: "#1d1a18",
  },
};

function getSizeTokens(size) {
  if (size === "sm") return { mark: 18, text: 16, radius: 4, gap: 8 };
  if (size === "lg") return { mark: 26, text: 20, radius: 6, gap: 10 };
  return { mark: 22, text: 18, radius: 5, gap: 9 };
}

export default function BrandLogo({
  size = "md",
  tone = "warm",
  showText = true,
  label = "Knoledgr",
  textWeight = 800,
  style,
}) {
  const color = tones[tone] || tones.warm;
  const token = getSizeTokens(size);
  const strokeWidth = Math.max(1.5, Math.round(token.mark * 0.08));
  const beamWidth = Math.max(2, Math.round(token.mark * 0.14));
  const curveHeight = Math.max(6, Math.round(token.mark * 0.36));

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: token.gap,
        ...style,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: token.mark,
          height: token.mark,
          borderRadius: token.radius,
          background: color.markBg,
          border: `${strokeWidth / 2}px solid ${color.markStroke}`,
          display: "inline-block",
          position: "relative",
          boxShadow: "0 1px 2px rgba(0,0,0,0.12)",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: "absolute",
            left: Math.max(4, Math.round(token.mark * 0.22)),
            top: Math.max(3, Math.round(token.mark * 0.12)),
            bottom: Math.max(3, Math.round(token.mark * 0.12)),
            width: beamWidth,
            background: color.glyph,
            borderRadius: 2,
          }}
        />
        <span
          style={{
            position: "absolute",
            left: Math.max(7, Math.round(token.mark * 0.39)),
            top: Math.round(token.mark * 0.3),
            width: Math.max(7, Math.round(token.mark * 0.35)),
            height: curveHeight,
            borderRight: `${beamWidth}px solid ${color.glyph}`,
            borderTop: `${beamWidth}px solid ${color.glyph}`,
            borderRadius: Math.max(4, Math.round(token.mark * 0.24)),
            transform: "skewY(-8deg)",
            transformOrigin: "left top",
          }}
        />
      </span>
      {showText ? (
        <span
          style={{
            fontSize: token.text,
            fontWeight: textWeight,
            lineHeight: 1,
            letterSpacing: "-0.02em",
            color: color.text,
          }}
        >
          {label}
        </span>
      ) : null}
    </span>
  );
}
