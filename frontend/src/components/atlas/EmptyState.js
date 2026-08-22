import React from "react";

/**
 * EmptyState — Atlassian-style empty state with icon, headline, description, action.
 */
export default function EmptyState({ icon, title, description, primaryAction, secondaryAction, style, children }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "48px 24px",
        // 480 is right for icon + a sentence + a button. Supplementary content
        // needs room to breathe, so widen only when there is some — existing
        // callers pass no children and are unaffected.
        maxWidth: children ? 760 : 480,
        margin: "0 auto",
        ...style,
      }}
    >
      {icon ? (
        <div style={{ width: 64, height: 64, color: "var(--n70)", marginBottom: 16 }}>
          {icon}
        </div>
      ) : null}
      {title ? (
        <h3 style={{ fontSize: 20, fontWeight: 500, color: "var(--app-text)", margin: 0 }}>
          {title}
        </h3>
      ) : null}
      {description ? (
        <p style={{ marginTop: 8, fontSize: 14, color: "var(--app-muted)", lineHeight: 1.4286 }}>
          {description}
        </p>
      ) : null}
      {(primaryAction || secondaryAction) ? (
        <div style={{ marginTop: 16, display: "flex", gap: 8, justifyContent: "center" }}>
          {primaryAction}
          {secondaryAction}
        </div>
      ) : null}
      {children ? <div style={{ marginTop: 32, width: "100%" }}>{children}</div> : null}
    </div>
  );
}
