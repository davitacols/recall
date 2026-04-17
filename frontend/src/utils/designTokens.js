/**
 * Knoledgr editorial design system
 *
 * Direction: calm, readable, modern.
 * Influence: the clarity of Notion with the editorial warmth of Medium.
 */

export const colors = {
  background: "#F6F1E8",
  surface: "#FFFCF8",
  surfaceAlt: "#F1E9DD",
  paper: "#FBF7F0",
  primary: "#1F1A17",
  secondary: "#6E655B",
  border: "rgba(58, 47, 38, 0.12)",
  borderStrong: "rgba(58, 47, 38, 0.2)",

  accent: "#2E63D0",
  accentLight: "rgba(46, 99, 208, 0.1)",
  accentDark: "#1F4DAF",

  sage: "#41705D",
  sageLight: "rgba(65, 112, 93, 0.12)",
  amber: "#A87439",
  amberLight: "rgba(168, 116, 57, 0.12)",

  success: "#2F7F5F",
  successLight: "rgba(47, 127, 95, 0.12)",
  critical: "#C8565D",
  criticalLight: "rgba(200, 86, 93, 0.12)",
  warning: "#A87439",
  warningLight: "rgba(168, 116, 57, 0.12)",
  info: "#2E63D0",
  infoLight: "rgba(46, 99, 208, 0.12)",
};

export const spacing = {
  xs: "4px",
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "24px",
  xxl: "32px",
};

export const typography = {
  fontFamily: {
    body: '"League Spartan", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    header: '"League Spartan", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    mono: '"IBM Plex Mono", "Courier New", monospace',
  },
  sizes: {
    pageTitle: "40px",
    sectionTitle: "24px",
    body: "16px",
    small: "14px",
    meta: "12px",
  },
  weights: {
    bold: 700,
    semibold: 600,
    medium: 500,
    regular: 400,
  },
  lineHeight: {
    tight: 1.15,
    normal: 1.55,
    relaxed: 1.75,
  },
};

export const shadows = {
  none: "none",
  sm: "0 8px 20px rgba(40, 31, 24, 0.06)",
  md: "0 18px 38px rgba(40, 31, 24, 0.08)",
  lg: "0 28px 60px rgba(40, 31, 24, 0.1)",
  xl: "0 36px 84px rgba(40, 31, 24, 0.14)",
  focus: "0 0 0 4px rgba(46, 99, 208, 0.14)",
};

export const radius = {
  sm: "10px",
  md: "16px",
  lg: "24px",
  full: "9999px",
};

export const components = {
  button: {
    primary: {
      background: colors.accent,
      text: "#F9F6F0",
      hover: colors.accentDark,
      radius: radius.full,
      padding: "10px 18px",
      fontSize: "14px",
      fontWeight: 600,
      shadow: shadows.sm,
    },
    secondary: {
      background: colors.surface,
      text: colors.primary,
      border: `1px solid ${colors.border}`,
      hover: colors.paper,
      radius: radius.full,
      padding: "10px 18px",
      fontSize: "14px",
      fontWeight: 600,
    },
    ghost: {
      background: "transparent",
      text: colors.secondary,
      hover: colors.accentLight,
      radius: radius.full,
      padding: "8px 12px",
    },
  },

  card: {
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    radius: radius.lg,
    padding: spacing.xl,
    shadow: shadows.sm,
  },

  input: {
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    radius: radius.md,
    padding: "11px 14px",
    fontSize: "14px",
    focusBorder: `1px solid ${colors.accent}`,
    focusShadow: shadows.focus,
  },

  sidebar: {
    background: colors.paper,
    activeItem: {
      background: colors.accentLight,
      borderLeft: `3px solid ${colors.accent}`,
      color: colors.accent,
    },
    hoverItem: {
      background: "#F4EEE4",
    },
  },
};

export const motion = {
  fast: "150ms ease-out",
  normal: "220ms ease-out",
  slow: "320ms ease-out",
};

export const layout = {
  maxWidth: "1320px",
  sidebarWidth: "272px",
  sidebarCollapsedWidth: "84px",
  headerHeight: "72px",
  contentPadding: spacing.xl,
};

export const breakpoints = {
  mobile: "640px",
  tablet: "1024px",
  desktop: "1280px",
};
