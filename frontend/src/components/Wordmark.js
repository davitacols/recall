import React from "react";

/**
 * Knoledgr wordmark — set in League Spartan to stay in sync with the
 * rest of the app. Weight 600, tight tracking. The earlier wordmark
 * used weight 800 which read as "poster" — 600 gives Anthropic-like
 * calm authority while staying in the same type family.
 */
export default function Wordmark({
  size = 18,
  color = "currentColor",
  label = "Knoledgr",
  weight = 600,
  letterSpacing = "-0.03em",
  ariaLabel,
  style,
}) {
  return (
    <span
      role="img"
      aria-label={ariaLabel || label}
      style={{
        display: "inline-block",
        fontFamily:
          '"League Spartan", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
        fontWeight: weight,
        fontSize: size,
        lineHeight: 0.94,
        letterSpacing,
        color,
        whiteSpace: "nowrap",
        WebkitFontSmoothing: "antialiased",
        ...style,
      }}
    >
      {label}
    </span>
  );
}
