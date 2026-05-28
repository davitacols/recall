import React from "react";

const sizes = {
  xs:    { px: 16, font: 8 },
  small: { px: 24, font: 10 },
  sm:    { px: 24, font: 10 },
  md:    { px: 32, font: 12 },
  lg:    { px: 40, font: 14 },
  xl:    { px: 96, font: 32 },
};

function hashColor(seed) {
  const palettes = [
    ["#0052CC", "#FFFFFF"],
    ["#00875A", "#FFFFFF"],
    ["#DE350B", "#FFFFFF"],
    ["#5243AA", "#FFFFFF"],
    ["#00A3BF", "#FFFFFF"],
    ["#FF8B00", "#FFFFFF"],
    ["#172B4D", "#FFFFFF"],
    ["#6554C0", "#FFFFFF"],
  ];
  let h = 0;
  const str = String(seed || "");
  for (let i = 0; i < str.length; i += 1) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return palettes[h % palettes.length];
}

/**
 * Atlas Avatar — square (Atlassian style) with rounded corners, optional online dot.
 */
export default function Avatar({
  src,
  name = "",
  size = "md",
  presence,
  style,
  className = "",
}) {
  const s = sizes[size] || sizes.md;
  const [bg, fg] = hashColor(name);
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");

  return (
    <span
      className={className}
      style={{
        position: "relative",
        width: s.px,
        height: s.px,
        flexShrink: 0,
        display: "inline-block",
        ...style,
      }}
    >
      <span
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "50%",
          overflow: "hidden",
          display: "grid",
          placeItems: "center",
          background: src ? "var(--n30)" : bg,
          color: fg,
          fontSize: s.font,
          fontWeight: 700,
          letterSpacing: "0.02em",
          lineHeight: 1,
        }}
      >
        {src ? (
          <img src={src} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          initials || "?"
        )}
      </span>
      {presence ? (
        <span
          style={{
            position: "absolute",
            right: -2,
            bottom: -2,
            width: Math.max(8, s.px * 0.28),
            height: Math.max(8, s.px * 0.28),
            borderRadius: "50%",
            background:
              presence === "online"
                ? "var(--g400)"
                : presence === "busy"
                ? "var(--r400)"
                : "var(--n50)",
            border: "2px solid var(--app-surface)",
          }}
        />
      ) : null}
    </span>
  );
}
