export function getAIPalette(darkMode) {
  if (darkMode) {
    return {
      bg: "#0f0b0d",
      card: "#171215",
      cardAlt: "#1f181c",
      border: "rgba(255,225,193,0.14)",
      text: "#f4ece0",
      muted: "#baa892",
      accent: "#93c5fd",
      warm: "#fcd34d",
      danger: "#fca5a5",
    };
  }

  return {
    bg: "#f6f1ea",
    card: "#fffaf3",
    cardAlt: "#ffffff",
    border: "#eadfce",
    text: "#231814",
    muted: "#7d6d5a",
    accent: "#2563eb",
    warm: "#b45309",
    danger: "#b91c1c",
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
    color: "#20140f",
    background: "linear-gradient(135deg,#ffd390,#ff9f62)",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  };
}

export function aiButtonSecondary(palette) {
  return {
    border: "1px solid rgba(120,120,120,0.45)",
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
