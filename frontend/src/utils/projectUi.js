export function getProjectPalette(darkMode) {
  if (darkMode) {
    return {
      bg: "#0f0b0d",
      card: "#171215",
      cardAlt: "#1f181c",
      border: "rgba(255,225,193,0.14)",
      text: "#f4ece0",
      muted: "#baa892",
    };
  }

  return {
    bg: "#f6f1ea",
    card: "#fffaf3",
    cardAlt: "#ffffff",
    border: "#eadfce",
    text: "#231814",
    muted: "#7d6d5a",
  };
}

export function getProjectUi(palette) {
  return {
    container: {
      width: "min(1320px, 100%)",
      margin: "0 auto",
      padding: "clamp(12px,2.6vw,24px)",
    },
    primaryButton: {
      border: "none",
      borderRadius: 10,
      padding: "9px 12px",
      fontSize: 13,
      fontWeight: 700,
      cursor: "pointer",
      color: "#20140f",
      background: "linear-gradient(135deg,#ffd390,#ff9f62)",
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
    },
    secondaryButton: {
      border: "1px solid rgba(120,120,120,0.45)",
      borderRadius: 10,
      padding: "9px 12px",
      fontSize: 13,
      fontWeight: 700,
      cursor: "pointer",
      color: palette.muted,
      background: "transparent",
    },
    input: {
      width: "100%",
      borderRadius: 10,
      border: `1px solid ${palette.border}`,
      background: palette.cardAlt,
      color: palette.text,
      padding: "10px 12px",
      fontSize: 14,
      fontFamily: "inherit",
      outline: "none",
    },
    twoCol: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
      gap: 8,
    },
    responsiveSplit: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
      gap: 10,
    },
  };
}
