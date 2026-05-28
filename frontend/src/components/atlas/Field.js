import React from "react";

/**
 * Field — label + input wrapper.
 * <Field label="Title" isRequired><input className="atlas-input" /></Field>
 */
export default function Field({
  label,
  helpText,
  errorText,
  isRequired = false,
  children,
  style,
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, ...style }}>
      {label ? (
        <label
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--app-muted)",
            letterSpacing: 0,
          }}
        >
          {label}
          {isRequired ? <span style={{ color: "var(--r400)", marginLeft: 2 }}>*</span> : null}
        </label>
      ) : null}
      {children}
      {errorText ? (
        <span style={{ fontSize: 12, color: "var(--r500)" }}>{errorText}</span>
      ) : helpText ? (
        <span style={{ fontSize: 12, color: "var(--app-muted)" }}>{helpText}</span>
      ) : null}
    </div>
  );
}
