import React from "react";
import { colors } from "../../utils/designTokens";

const tones = {
  default:  { bg: "var(--n40)",  text: "var(--n700)" },
  primary:  { bg: "var(--b400)", text: "#FFFFFF" },
  added:    { bg: "var(--g50)",  text: "var(--g500)" },
  removed:  { bg: "var(--r50)",  text: "var(--r500)" },
  important:{ bg: "var(--r400)", text: "#FFFFFF" },
};

/**
 * Badge — round/pill count indicator. Use for unread counts, nav item counts, etc.
 */
export default function Badge({ children, tone = "default", max = 99, style, ...rest }) {
  const palette = tones[tone] || tones.default;
  const display =
    typeof children === "number" && children > max ? `${max}+` : children;
  return (
    <span
      className="atlas-badge"
      style={{ background: palette.bg, color: palette.text, ...style }}
      {...rest}
    >
      {display}
    </span>
  );
}
