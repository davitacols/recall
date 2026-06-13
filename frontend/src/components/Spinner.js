import React from "react";
import "./Spinner.css";

/**
 * <Spinner /> — calm hairline arc on a faint track.
 *
 * Anthropic-register loading indicator. Inherits color from currentColor.
 * Sizes scale stroke proportionally. `prefers-reduced-motion` slows the
 * animation to 3s instead of stopping it (still indicates work, doesn't
 * cause vertigo).
 *
 * Usage:
 *   <Spinner />                               // 16px, inline
 *   <Spinner size={20} />
 *   <Spinner label="Saving…" />               // inline label
 *   <Spinner block label="Loading…" />        // centered panel layout
 *   <button>{loading ? <Spinner size={14} /> : null} Save</button>
 */
export default function Spinner({
  size = 16,
  label,
  block = false,
  color = "currentColor",
  strokeWidth,
  trackOpacity = 0.16,
  className = "",
  style,
}) {
  const sw = strokeWidth || Math.max(1.5, Math.round((size / 8) * 10) / 10);
  const r = (size - sw) / 2;
  const c = size / 2;
  const circumference = 2 * Math.PI * r;
  // visible arc is ~22% of the full circle — long enough to read as motion,
  // short enough to feel light and modern.
  const arcLength = circumference * 0.22;

  const rootClass = `kn-spinner${block ? " kn-spinner--block" : ""}${className ? ` ${className}` : ""}`;

  return (
    <span className={rootClass} role="status" aria-live="polite" style={style}>
      <svg
        className="kn-spinner__svg"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
        focusable="false"
      >
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke={color}
          strokeOpacity={trackOpacity}
          strokeWidth={sw}
        />
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeDashoffset={0}
        />
      </svg>
      {label ? <span className="kn-spinner__label">{label}</span> : null}
      <span className="kn-spinner__sr">{label || "Loading"}</span>
    </span>
  );
}
