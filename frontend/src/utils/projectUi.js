export function getProjectPalette(darkMode) {
  if (darkMode) {
    return {
      bg: "#0f0b0d",
      card: "#171215",
      cardAlt: "#1f181c",
      border: "rgba(255,225,193,0.14)",
      text: "#f4ece0",
      muted: "#baa892",
      accent: "#ffb476",
      accentSoft: "rgba(255,180,118,0.22)",
      buttonText: "#20140f",
      ctaGradient: "linear-gradient(135deg,#ffd390,#ff9f62)",
      success: "#66d5ab",
      warn: "#f59e0b",
      danger: "#ef4444",
      info: "#60a5fa",
      link: "#93c5fd",
      progressTrack: "rgba(120,120,120,0.25)",
    };
  }

  return {
    bg: "#f6f1ea",
    card: "#fffaf3",
    cardAlt: "#ffffff",
    border: "#eadfce",
    text: "#231814",
    muted: "#7d6d5a",
    accent: "#d9692e",
    accentSoft: "rgba(217,105,46,0.2)",
    buttonText: "#20140f",
    ctaGradient: "linear-gradient(135deg,#ffd390,#ff9f62)",
    success: "#1f8f66",
    warn: "#a16207",
    danger: "#b91c1c",
    info: "#2563eb",
    link: "#1d4ed8",
    progressTrack: "rgba(120,120,120,0.2)",
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
      borderRadius: 0,
      padding: "9px 12px",
      fontSize: 13,
      fontWeight: 700,
      cursor: "pointer",
      color: palette.buttonText,
      background: palette.ctaGradient,
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
    },
    secondaryButton: {
      border: `1px solid ${palette.border}`,
      borderRadius: 0,
      padding: "9px 12px",
      fontSize: 13,
      fontWeight: 700,
      cursor: "pointer",
      color: palette.muted,
      background: "transparent",
    },
    input: {
      width: "100%",
      borderRadius: 0,
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

export function getUnifiedNavPalette(darkMode) {
  if (darkMode) {
    return {
      navBg: "linear-gradient(180deg, rgba(10,17,24,0.94), rgba(9,14,20,0.96))",
      border: "rgba(148, 198, 233, 0.18)",
      text: "#e7f0f7",
      muted: "#9db1c1",
      hover: "rgba(130, 181, 215, 0.11)",
      active: "rgba(100, 177, 225, 0.16)",
      searchBg: "rgba(16, 27, 36, 0.8)",
      panelAlt: "rgba(255,255,255,0.04)",
      accentA: "#64b1e1",
      accentB: "#4fc4b6",
      activeBorder: "rgba(125, 193, 235, 0.5)",
      shadow: "0 20px 44px rgba(2,8,16,0.34)",
      searchFocusBorder: "#ffab69",
      track: "rgba(148,163,184,0.22)",
      kbdBg: "rgba(255,255,255,0.03)",
      dropdownShadow: "0 18px 40px rgba(0,0,0,0.22)",
    };
  }

  return {
    navBg: "linear-gradient(180deg, rgba(245,251,255,0.98), rgba(238,246,252,0.98))",
    border: "rgba(83, 126, 157, 0.24)",
    text: "#0f2535",
    muted: "#4f6a7d",
    hover: "rgba(46,125,179,0.08)",
    active: "rgba(79, 154, 207, 0.16)",
    searchBg: "rgba(255,255,255,0.92)",
    panelAlt: "rgba(16, 68, 108, 0.05)",
    accentA: "#3f93c9",
    accentB: "#1ca394",
    activeBorder: "rgba(63, 147, 201, 0.46)",
    shadow: "0 16px 34px rgba(42,85,118,0.14)",
    searchFocusBorder: "#d9692e",
    track: "rgba(83, 126, 157, 0.24)",
    kbdBg: "rgba(16, 68, 108, 0.05)",
    dropdownShadow: "0 16px 30px rgba(42,85,118,0.14)",
  };
}
