import React from "react";

/**
 * Atlas Button — Atlassian-style.
 * appearance: primary | default | subtle | danger | link
 * size:       sm | md | lg
 */
export default function Button({
  children,
  appearance = "default",
  size = "md",
  iconBefore,
  iconAfter,
  isLoading = false,
  isDisabled = false,
  type = "button",
  className = "",
  fullWidth = false,
  style,
  ...rest
}) {
  if (appearance === "link") {
    return (
      <button
        type={type}
        disabled={isDisabled || isLoading}
        className={className}
        style={{
          background: "transparent",
          border: "none",
          color: "var(--app-link)",
          fontWeight: 500,
          fontSize: 14,
          padding: "0",
          cursor: isDisabled ? "not-allowed" : "pointer",
          textDecoration: "none",
          ...style,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.textDecoration = "underline";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.textDecoration = "none";
        }}
        {...rest}
      >
        {children}
      </button>
    );
  }

  const sizeClass = size === "sm" ? "atlas-btn--sm" : size === "lg" ? "atlas-btn--lg" : "";

  return (
    <button
      type={type}
      disabled={isDisabled || isLoading}
      className={`atlas-btn atlas-btn--${appearance} ${sizeClass} ${className}`}
      style={{
        width: fullWidth ? "100%" : undefined,
        opacity: isLoading ? 0.7 : undefined,
        ...style,
      }}
      {...rest}
    >
      {iconBefore ? <span style={{ display: "inline-flex" }}>{iconBefore}</span> : null}
      {children}
      {iconAfter ? <span style={{ display: "inline-flex" }}>{iconAfter}</span> : null}
    </button>
  );
}
