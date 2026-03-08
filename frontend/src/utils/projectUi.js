export function getProjectPalette(darkMode) {
  if (darkMode) {
    return {
      bg: "#0b1014",
      card: "rgba(16,24,31,0.82)",
      cardAlt: "#111b23",
      border: "rgba(174,210,234,0.2)",
      text: "#e8f0f6",
      muted: "#9fb2c3",
      accent: "#5aaee7",
      accentSoft: "rgba(90,174,231,0.22)",
      buttonText: "#062032",
      ctaGradient: "linear-gradient(135deg,#9bd9ff,#6ab8ec)",
      success: "#49bf8f",
      warn: "#d6aa57",
      danger: "#f87171",
      info: "#5aaee7",
      link: "#9ed5ff",
      progressTrack: "rgba(148,163,184,0.22)",
    };
  }

  return {
    bg: "#e9f1f7",
    card: "rgba(255,255,255,0.82)",
    cardAlt: "#f8fcff",
    border: "rgba(83,126,157,0.24)",
    text: "#0e2434",
    muted: "#4a6578",
    accent: "#2f80b8",
    accentSoft: "rgba(47,128,184,0.16)",
    buttonText: "#eef8ff",
    ctaGradient: "linear-gradient(135deg,#2f80b8,#65aede)",
    success: "#2a8c67",
    warn: "#9b6c2f",
    danger: "#b91c1c",
    info: "#2f80b8",
    link: "#1d4f7d",
    progressTrack: "rgba(83,126,157,0.24)",
  };
}

export function getProjectUi(palette) {
  return {
    container: {
      width: "min(1840px, 100%)",
      margin: "0 auto",
      padding: "clamp(8px,1.4vw,14px)",
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
      dropdownBg: "#13202b",
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
    dropdownBg: "#edf5fb",
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
