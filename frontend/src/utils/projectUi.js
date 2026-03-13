export function getProjectPalette(darkMode) {
  if (darkMode) {
    return {
      bg: "#09121c",
      card: "rgba(15, 26, 41, 0.88)",
      cardAlt: "#162739",
      border: "rgba(144, 164, 189, 0.18)",
      text: "#edf4ff",
      muted: "#90a6c0",
      accent: "#63c5ff",
      accentSoft: "rgba(68,153,255,0.18)",
      buttonText: "#eef5ff",
      ctaGradient: "linear-gradient(135deg, #2e7bf5, #33c7ff)",
      success: "#43c18e",
      warn: "#f3b15e",
      danger: "#ff7186",
      info: "#63c5ff",
      link: "#9fd3ff",
      progressTrack: "rgba(144,164,189,0.2)",
    };
  }

  return {
    bg: "#f2f7fc",
    card: "rgba(255,255,255,0.92)",
    cardAlt: "#f6fafe",
    border: "rgba(15, 23, 42, 0.09)",
    text: "#13263d",
    muted: "#5f7690",
    accent: "#2176ff",
    accentSoft: "rgba(33,118,255,0.14)",
    buttonText: "#eef5ff",
    ctaGradient: "linear-gradient(135deg, #2176ff, #39b7ff)",
    success: "#198863",
    warn: "#b77728",
    danger: "#cf4f67",
    info: "#2483ff",
    link: "#155ed7",
    progressTrack: "rgba(148,163,184,0.18)",
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
      borderRadius: 14,
      padding: "10px 14px",
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
      borderRadius: 14,
      padding: "10px 14px",
      fontSize: 13,
      fontWeight: 700,
      cursor: "pointer",
      color: palette.muted,
      background: "transparent",
    },
    input: {
      width: "100%",
      borderRadius: 14,
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
      navBg: "linear-gradient(180deg, rgba(7, 16, 25, 0.96), rgba(9, 18, 28, 0.98))",
      border: "rgba(144, 164, 189, 0.16)",
      text: "#edf4ff",
      muted: "#90a6c0",
      hover: "rgba(99, 197, 255, 0.08)",
      active: "rgba(46, 123, 245, 0.14)",
      searchBg: "rgba(15, 26, 41, 0.9)",
      panelAlt: "rgba(99, 197, 255, 0.08)",
      dropdownBg: "#101b2a",
      accentA: "#63c5ff",
      accentB: "#45d1ff",
      activeBorder: "rgba(99, 197, 255, 0.32)",
      shadow: "0 30px 60px rgba(2, 8, 16, 0.28)",
      searchFocusBorder: "#63c5ff",
      track: "rgba(144,164,189,0.18)",
      kbdBg: "rgba(255,255,255,0.04)",
      dropdownShadow: "0 24px 48px rgba(0,0,0,0.24)",
    };
  }

  return {
    navBg: "linear-gradient(180deg, rgba(251, 253, 255, 0.98), rgba(241, 247, 252, 0.98))",
    border: "rgba(15, 23, 42, 0.08)",
    text: "#13263d",
    muted: "#5f7690",
    hover: "rgba(33, 118, 255, 0.06)",
    active: "rgba(33, 118, 255, 0.1)",
    searchBg: "rgba(255,255,255,0.95)",
    panelAlt: "rgba(33, 118, 255, 0.06)",
    dropdownBg: "#ffffff",
    accentA: "#2176ff",
    accentB: "#39b7ff",
    activeBorder: "rgba(33, 118, 255, 0.22)",
    shadow: "0 24px 48px rgba(15, 23, 42, 0.08)",
    searchFocusBorder: "#2176ff",
    track: "rgba(148, 163, 184, 0.2)",
    kbdBg: "rgba(15, 23, 42, 0.04)",
    dropdownShadow: "0 24px 40px rgba(15, 23, 42, 0.1)",
  };
}
