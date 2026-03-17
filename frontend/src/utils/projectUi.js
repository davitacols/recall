export function getProjectPalette(darkMode) {
  if (darkMode) {
    return {
      bg: "#14110f",
      card: "rgba(29, 24, 21, 0.9)",
      cardAlt: "#221d19",
      border: "rgba(238, 229, 216, 0.12)",
      text: "#F5EFE6",
      muted: "#B7AB9B",
      accent: "#9AB9FF",
      accentSoft: "rgba(154, 185, 255, 0.14)",
      buttonText: "#111418",
      ctaGradient: "linear-gradient(135deg, #E7EFFD, #9AB9FF)",
      success: "#79C89F",
      warn: "#D2A86A",
      danger: "#EE9299",
      info: "#9AB9FF",
      link: "#C8D8FF",
      progressTrack: "rgba(238, 229, 216, 0.14)",
    };
  }

  return {
    bg: "#F6F1E8",
    card: "rgba(255, 252, 248, 0.94)",
    cardAlt: "#F1E9DD",
    border: "rgba(58, 47, 38, 0.12)",
    text: "#1F1A17",
    muted: "#6E655B",
    accent: "#2E63D0",
    accentSoft: "rgba(46, 99, 208, 0.1)",
    buttonText: "#FBF7F0",
    ctaGradient: "linear-gradient(135deg, #2E63D0, #5E8FE8)",
    success: "#2F7F5F",
    warn: "#A87439",
    danger: "#C8565D",
    info: "#2E63D0",
    link: "#274FB2",
    progressTrack: "rgba(58, 47, 38, 0.12)",
  };
}

export function getProjectUi(palette) {
  return {
    container: {
      width: "min(1680px, 100%)",
      margin: "0 auto",
      padding: "clamp(10px, 1.6vw, 18px)",
    },
    primaryButton: {
      border: "none",
      borderRadius: 999,
      padding: "10px 16px",
      fontSize: 13,
      fontWeight: 700,
      cursor: "pointer",
      color: palette.buttonText,
      background: palette.ctaGradient,
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      boxShadow: "var(--ui-shadow-sm)",
    },
    secondaryButton: {
      border: `1px solid ${palette.border}`,
      borderRadius: 999,
      padding: "10px 16px",
      fontSize: 13,
      fontWeight: 700,
      cursor: "pointer",
      color: palette.text,
      background: palette.card,
    },
    input: {
      width: "100%",
      borderRadius: 16,
      border: `1px solid ${palette.border}`,
      background: palette.cardAlt,
      color: palette.text,
      padding: "11px 14px",
      fontSize: 14,
      fontFamily: "inherit",
      outline: "none",
    },
    twoCol: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
      gap: 10,
    },
    responsiveSplit: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
      gap: 12,
    },
  };
}

export function getUnifiedNavPalette(darkMode) {
  if (darkMode) {
    return {
      navBg: "linear-gradient(180deg, rgba(20, 17, 15, 0.98), rgba(17, 14, 12, 0.98))",
      border: "rgba(238, 229, 216, 0.1)",
      text: "#F5EFE6",
      muted: "#B7AB9B",
      hover: "rgba(154, 185, 255, 0.08)",
      active: "rgba(154, 185, 255, 0.12)",
      searchBg: "rgba(34, 29, 25, 0.92)",
      panelAlt: "rgba(245, 239, 230, 0.04)",
      dropdownBg: "#1C1714",
      accentA: "#9AB9FF",
      accentB: "#D0DEFF",
      activeBorder: "rgba(154, 185, 255, 0.24)",
      shadow: "0 24px 48px rgba(8, 7, 6, 0.24)",
      searchFocusBorder: "#9AB9FF",
      track: "rgba(238, 229, 216, 0.14)",
      kbdBg: "rgba(245, 239, 230, 0.04)",
      dropdownShadow: "0 24px 48px rgba(8, 7, 6, 0.26)",
    };
  }

  return {
    navBg: "linear-gradient(180deg, rgba(250, 246, 239, 0.98), rgba(244, 238, 228, 0.98))",
    border: "rgba(58, 47, 38, 0.1)",
    text: "#1F1A17",
    muted: "#6E655B",
    hover: "rgba(46, 99, 208, 0.06)",
    active: "rgba(46, 99, 208, 0.1)",
    searchBg: "rgba(255, 252, 248, 0.94)",
    panelAlt: "rgba(46, 99, 208, 0.06)",
    dropdownBg: "#FFFCF8",
    accentA: "#2E63D0",
    accentB: "#5E8FE8",
    activeBorder: "rgba(46, 99, 208, 0.18)",
    shadow: "0 24px 42px rgba(44, 34, 27, 0.08)",
    searchFocusBorder: "#2E63D0",
    track: "rgba(58, 47, 38, 0.12)",
    kbdBg: "rgba(58, 47, 38, 0.04)",
    dropdownShadow: "0 24px 40px rgba(44, 34, 27, 0.1)",
  };
}
