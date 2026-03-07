export function getAIPalette(_darkMode) {
  return {
    bg: "var(--ui-bg)",
    card: "var(--ui-panel)",
    cardAlt: "var(--ui-panel-alt)",
    border: "var(--ui-border)",
    text: "var(--ui-text)",
    muted: "var(--ui-muted)",
    accent: "var(--ui-accent)",
    warm: "var(--ui-warn)",
    danger: "var(--app-danger)",
  };
}

export function aiCard(palette) {
  return {
    borderRadius: 12,
    border: `1px solid ${palette.border}`,
    background: palette.card,
  };
}

export function aiButtonPrimary() {
  return {
    border: "none",
    borderRadius: 10,
    padding: "8px 12px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    color: "#eef8ff",
    background: "linear-gradient(135deg,#2f80b8,#65aede)",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  };
}

export function aiButtonSecondary(palette) {
  return {
    border: `1px solid ${palette.border}`,
    borderRadius: 10,
    padding: "8px 12px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    color: palette.muted,
    background: "transparent",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  };
}

export function aiInput(palette) {
  return {
    width: "100%",
    borderRadius: 10,
    border: `1px solid ${palette.border}`,
    background: palette.cardAlt,
    color: palette.text,
    padding: "9px 12px",
    fontSize: 13,
    fontFamily: "inherit",
    outline: "none",
  };
}
