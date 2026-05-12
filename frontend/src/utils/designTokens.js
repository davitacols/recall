/**
 * Knoledgr editorial design system
 *
 * Direction: calm, readable, modern.
 * Influence: the clarity of Notion with the editorial warmth of Medium.
 */

export const colors = {
  background: "#EAF0F8",
  surface: "#FFFFFF",
  surfaceAlt: "#E0E8F3",
  paper: "#F8FBFF",
  primary: "#0F172A",
  secondary: "#526176",
  border: "rgba(21, 42, 74, 0.2)",
  borderStrong: "rgba(21, 42, 74, 0.3)",

  accent: "#1D4ED8",
  accentLight: "rgba(29, 78, 216, 0.13)",
  accentDark: "#1E40AF",

  sage: "#247857",
  sageLight: "rgba(36, 120, 87, 0.12)",
  amber: "#9A5E1E",
  amberLight: "rgba(154, 94, 30, 0.12)",

  success: "#247857",
  successLight: "rgba(36, 120, 87, 0.12)",
  critical: "#B83E54",
  criticalLight: "rgba(184, 62, 84, 0.11)",
  warning: "#9A5E1E",
  warningLight: "rgba(154, 94, 30, 0.12)",
  info: "#1D4ED8",
  infoLight: "rgba(29, 78, 216, 0.13)",
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
  sm: "0 8px 20px rgba(15, 23, 42, 0.1)",
  md: "0 18px 38px rgba(15, 23, 42, 0.12)",
  lg: "0 28px 60px rgba(15, 23, 42, 0.16)",
  xl: "0 36px 84px rgba(15, 23, 42, 0.2)",
  focus: "0 0 0 4px rgba(29, 78, 216, 0.16)",
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
      background: "#E0E8F3",
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
