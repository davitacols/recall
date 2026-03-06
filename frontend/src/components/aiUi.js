export function getAIPalette(darkMode) {
  if (darkMode) {
    return {
      bg: "#0b1014",
      card: "rgba(16, 24, 31, 0.82)",
      cardAlt: "#111b23",
      border: "rgba(174, 210, 234, 0.2)",
      text: "#e8f0f6",
      muted: "#9fb2c3",
      accent: "#5aaee7",
      warm: "#d6aa57",
      danger: "#f99aa2",
    };
  }

  return {
    bg: "#e9f1f7",
    card: "rgba(255, 255, 255, 0.82)",
    cardAlt: "#f8fcff",
    border: "rgba(83, 126, 157, 0.24)",
    text: "#0e2434",
    muted: "#4a6578",
    accent: "#2f80b8",
    warm: "#9b6c2f",
    danger: "#c4434a",
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
