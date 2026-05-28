import React from "react";
import { lozengeVariants, statusToLozenge } from "../../utils/designTokens";

/**
 * Lozenge — Atlassian-style status pill.
 * Variants: default | inprogress | success | removed | moved | new | info
 * Or pass `status="In Progress"` and it'll map automatically.
 */
export default function Lozenge({
  children,
  variant,
  status,
  bold = false,
  style,
  className = "",
  ...rest
}) {
  const key = variant || statusToLozenge(status);
  const v = lozengeVariants[key] || lozengeVariants.default;
  const palette = bold
    ? { bg: v.text, text: "#FFFFFF" }
    : { bg: v.bg, text: v.text };
  return (
    <span
      className={`atlas-lozenge ${className}`}
      style={{
        background: palette.bg,
        color: palette.text,
        ...style,
      }}
      {...rest}
    >
      {children || status}
    </span>
  );
}
