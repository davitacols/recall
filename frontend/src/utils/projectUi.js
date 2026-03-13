export function getProjectPalette(darkMode) {
  if (darkMode) {
    return {
      bg: "#0a121c",
      card: "rgba(16, 25, 38, 0.86)",
      cardAlt: "#162231",
      border: "rgba(148, 163, 184, 0.18)",
      text: "#ebf3ff",
      muted: "#97aac1",
      accent: "#69b7ff",
      accentSoft: "rgba(105,183,255,0.18)",
      buttonText: "#eef5ff",
      ctaGradient: "linear-gradient(135deg, #4f8cff, #78b4ff)",
      success: "#4ec78f",
      warn: "#f2a65a",
      danger: "#ff6b7d",
      info: "#69b7ff",
      link: "#9ec7ff",
      progressTrack: "rgba(148,163,184,0.2)",
    };
  }

  return {
    bg: "#f3f7fb",
    card: "rgba(255,255,255,0.9)",
    cardAlt: "#f8fbff",
    border: "rgba(15, 23, 42, 0.09)",
    text: "#13263c",
    muted: "#61758d",
    accent: "#256dff",
    accentSoft: "rgba(37,109,255,0.12)",
    buttonText: "#eef5ff",
    ctaGradient: "linear-gradient(135deg, #256dff, #68abff)",
    success: "#2a8c67",
    warn: "#b7792e",
    danger: "#cc425a",
    info: "#256dff",
    link: "#1f61d4",
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
      navBg: "linear-gradient(180deg, rgba(8, 17, 28, 0.96), rgba(10, 18, 28, 0.98))",
      border: "rgba(148, 163, 184, 0.16)",
      text: "#e8f2ff",
      muted: "#97aac1",
      hover: "rgba(105, 183, 255, 0.08)",
      active: "rgba(79, 140, 255, 0.14)",
      searchBg: "rgba(15, 25, 38, 0.88)",
      panelAlt: "rgba(118, 167, 255, 0.08)",
      dropdownBg: "#0f1824",
      accentA: "#76a7ff",
      accentB: "#5bc0eb",
      activeBorder: "rgba(118, 167, 255, 0.36)",
      shadow: "0 30px 60px rgba(2, 8, 16, 0.28)",
      searchFocusBorder: "#76a7ff",
      track: "rgba(148,163,184,0.18)",
      kbdBg: "rgba(255,255,255,0.04)",
      dropdownShadow: "0 24px 48px rgba(0,0,0,0.24)",
    };
  }

  return {
    navBg: "linear-gradient(180deg, rgba(250, 252, 255, 0.98), rgba(242, 247, 252, 0.98))",
    border: "rgba(15, 23, 42, 0.08)",
    text: "#13263c",
    muted: "#61758d",
    hover: "rgba(37, 109, 255, 0.06)",
    active: "rgba(37, 109, 255, 0.1)",
    searchBg: "rgba(255,255,255,0.95)",
    panelAlt: "rgba(37, 109, 255, 0.06)",
    dropdownBg: "#ffffff",
    accentA: "#256dff",
    accentB: "#55b7ff",
    activeBorder: "rgba(37, 109, 255, 0.22)",
    shadow: "0 24px 48px rgba(15, 23, 42, 0.08)",
    searchFocusBorder: "#256dff",
    track: "rgba(148, 163, 184, 0.2)",
    kbdBg: "rgba(15, 23, 42, 0.04)",
    dropdownShadow: "0 24px 40px rgba(15, 23, 42, 0.1)",
  };
}
