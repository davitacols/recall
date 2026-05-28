/**
 * Atlas — Knoledgr design tokens
 *
 * Modeled on the Atlassian product UI (Jira / Confluence).
 * Dense, utilitarian, blue-anchored. Subtle shadows, small radii,
 * cool neutrals, Inter for body and headings.
 */

// Neutrals — Atlassian Design System "N" scale (cool grey)
export const N = {
  0: "#FFFFFF",
  10: "#FAFBFC",
  20: "#F4F5F7",
  30: "#EBECF0",
  40: "#DFE1E6",
  50: "#C1C7D0",
  60: "#B3BAC5",
  70: "#A5ADBA",
  80: "#97A0AF",
  90: "#8993A4",
  100: "#7A869A",
  200: "#6B778C",
  300: "#5E6C84",
  400: "#505F79",
  500: "#42526E",
  600: "#344563",
  700: "#253858",
  800: "#172B4D",
  900: "#091E42",
};

// Brand — Atlassian blue ("B" scale)
export const B = {
  50: "#DEEBFF",
  75: "#B3D4FF",
  100: "#4C9AFF",
  200: "#2684FF",
  300: "#0065FF",
  400: "#0052CC", // primary
  500: "#0747A6", // hover
};

// Status palettes
export const G = { 50: "#E3FCEF", 75: "#ABF5D1", 400: "#00875A", 500: "#006644" };
export const R = { 50: "#FFEBE6", 75: "#FFBDAD", 400: "#DE350B", 500: "#BF2600" };
export const Y = { 50: "#FFFAE6", 75: "#FFF0B3", 400: "#FF8B00", 500: "#FF7452" };
export const P = { 50: "#EAE6FF", 75: "#C0B6F2", 400: "#5243AA", 500: "#403294" };
export const T = { 50: "#E6FCFF", 75: "#B3F5FF", 400: "#00A3BF", 500: "#008DA6" };

export const colors = {
  // Surfaces
  background: N[20],
  surface: N[0],
  surfaceHover: N[20],
  surfaceSunken: N[10],
  surfaceOverlay: N[0],

  // Lines
  border: N[40],
  borderSubtle: N[30],
  borderBold: N[50],

  // Text
  text: N[800],
  textSubtle: N[200],
  textDisabled: N[100],
  textInverse: N[0],
  link: B[400],
  linkHover: B[500],

  // Brand / primary action
  primary: B[400],
  primaryHover: B[500],
  primaryPressed: B[500],
  primaryBg: B[50],

  // Status
  success: G[400],
  successBg: G[50],
  successBgBold: G[75],
  successText: G[500],

  danger: R[400],
  dangerBg: R[50],
  dangerBgBold: R[75],
  dangerText: R[500],

  warning: Y[400],
  warningBg: Y[50],
  warningBgBold: Y[75],
  warningText: Y[500],

  discovery: P[400],
  discoveryBg: P[50],
  discoveryBgBold: P[75],
  discoveryText: P[500],

  info: T[400],
  infoBg: T[50],
  infoBgBold: T[75],
  infoText: T[500],

  // Selected/active row
  selected: B[50],
  selectedBold: B[75],

  // Legacy aliases — kept so existing code that imports `accent`/`paper` doesn't explode
  accent: B[400],
  accentLight: B[50],
  accentDark: B[500],
  paper: N[10],
  surfaceAlt: N[20],
  secondary: N[200],
  muted: N[200],
  borderStrong: N[50],
  critical: R[400],
  criticalLight: R[50],
  sage: G[400],
  sageLight: G[50],
  amber: Y[400],
  amberLight: Y[50],
  successLight: G[50],
  warningLight: Y[50],
  infoLight: T[50],
};

// Dark mode parity — Atlassian dark uses N tokens inverted with B accent unchanged
export const colorsDark = {
  background: "#1D2125",
  surface: "#22272B",
  surfaceHover: "#282E33",
  surfaceSunken: "#161A1D",
  surfaceOverlay: "#282E33",

  border: "#383E47",
  borderSubtle: "#2C333A",
  borderBold: "#454F59",

  text: "#B6C2CF",
  textSubtle: "#8C9BAB",
  textDisabled: "#5C6B79",
  textInverse: "#1D2125",
  link: "#85B8FF",
  linkHover: "#A6C5FF",

  primary: "#579DFF",
  primaryHover: "#85B8FF",
  primaryPressed: "#A6C5FF",
  primaryBg: "#1C2B41",

  success: "#7EE2B8",
  successBg: "#164B35",
  successBgBold: "#216E4E",
  successText: "#7EE2B8",

  danger: "#FD9891",
  dangerBg: "#5D1F1A",
  dangerBgBold: "#AE2A19",
  dangerText: "#FD9891",

  warning: "#F5CD47",
  warningBg: "#533F04",
  warningBgBold: "#7F5F01",
  warningText: "#F5CD47",

  discovery: "#B8ACF6",
  discoveryBg: "#352C63",
  discoveryBgBold: "#5E4DB2",
  discoveryText: "#B8ACF6",

  info: "#9DD9EE",
  infoBg: "#164555",
  infoBgBold: "#1D7F8C",
  infoText: "#9DD9EE",

  selected: "#1C2B41",
  selectedBold: "#09326C",

  accent: "#579DFF",
  accentLight: "#1C2B41",
  accentDark: "#85B8FF",
  paper: "#22272B",
  surfaceAlt: "#282E33",
  secondary: "#8C9BAB",
  borderStrong: "#454F59",
  critical: "#FD9891",
  criticalLight: "#5D1F1A",
  sage: "#7EE2B8",
  sageLight: "#164B35",
  amber: "#F5CD47",
  amberLight: "#533F04",
  successLight: "#164B35",
  warningLight: "#533F04",
  infoLight: "#164555",
};

// 4px grid
export const spacing = {
  xxs: "2px",
  xs: "4px",
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "20px",
  xxl: "24px",
  xxxl: "32px",
  scale: (n) => `${n * 4}px`,
};

export const typography = {
  fontFamily: {
    body: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    header: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: '"SFMono-Regular", "Consolas", "Liberation Mono", Menlo, monospace',
  },
  sizes: {
    h900: "35px",
    h800: "29px",
    h700: "24px",
    h600: "20px",
    h500: "16px",
    h400: "14px",
    h300: "12px",
    h200: "11px",
    h100: "11px",
    body: "14px",
    bodyLarge: "16px",
    small: "12px",
    meta: "11px",
    pageTitle: "29px",
    sectionTitle: "20px",
  },
  weights: {
    bold: 700,
    semibold: 600,
    medium: 500,
    regular: 400,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.4286, // Atlassian body
    relaxed: 1.5,
  },
};

// Atlassian elevation set — flat with crisp 1px stamp
export const shadows = {
  none: "none",
  // Card-level: barely there, just defines edge
  raised: "0 1px 1px rgba(9,30,66,0.25), 0 0 1px rgba(9,30,66,0.31)",
  // Dropdowns, popovers
  overlay: "0 4px 8px -2px rgba(9,30,66,0.25), 0 0 1px rgba(9,30,66,0.31)",
  // Dialogs/modals
  dialog: "0 8px 16px -4px rgba(9,30,66,0.25), 0 0 1px rgba(9,30,66,0.31)",
  // Focus ring (blue)
  focus: `0 0 0 2px ${B[200]}`,
  // Legacy aliases
  sm: "0 1px 1px rgba(9,30,66,0.25), 0 0 1px rgba(9,30,66,0.31)",
  md: "0 4px 8px -2px rgba(9,30,66,0.25), 0 0 1px rgba(9,30,66,0.31)",
  lg: "0 8px 16px -4px rgba(9,30,66,0.25), 0 0 1px rgba(9,30,66,0.31)",
  xl: "0 12px 24px -6px rgba(9,30,66,0.25), 0 0 1px rgba(9,30,66,0.31)",
};

// Small radii — Atlassian is famously tight (3px on most surfaces)
export const radius = {
  none: "0",
  xs: "3px",
  sm: "3px",
  md: "4px",
  lg: "6px",
  xl: "8px",
  full: "9999px",
};

export const components = {
  button: {
    primary: {
      background: colors.primary,
      text: colors.textInverse,
      hover: colors.primaryHover,
      radius: radius.xs,
      padding: "6px 12px",
      fontSize: "14px",
      fontWeight: 500,
      shadow: shadows.none,
    },
    secondary: {
      background: colors.surface,
      text: colors.text,
      border: `1px solid ${colors.border}`,
      hover: N[30],
      radius: radius.xs,
      padding: "6px 12px",
      fontSize: "14px",
      fontWeight: 500,
    },
    subtle: {
      background: "transparent",
      text: colors.textSubtle,
      hover: N[30],
      radius: radius.xs,
      padding: "6px 8px",
      fontSize: "14px",
      fontWeight: 500,
    },
    danger: {
      background: colors.danger,
      text: colors.textInverse,
      hover: R[500],
      radius: radius.xs,
      padding: "6px 12px",
      fontSize: "14px",
      fontWeight: 500,
    },
  },

  card: {
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    radius: radius.md,
    padding: spacing.lg,
    shadow: shadows.raised,
  },

  input: {
    background: colors.surface,
    border: `2px solid ${colors.border}`,
    radius: radius.xs,
    padding: "6px 8px",
    fontSize: "14px",
    focusBorder: `2px solid ${colors.primary}`,
    focusShadow: "none",
    hoverBackground: N[30],
  },

  sidebar: {
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    activeItem: {
      background: colors.primaryBg,
      borderLeft: `3px solid ${colors.primary}`,
      color: colors.primary,
    },
    hoverItem: {
      background: N[30],
    },
  },

  lozenge: {
    radius: "2px",
    padding: "0 4px",
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.03em",
    textTransform: "uppercase",
    height: "16px",
  },

  tab: {
    underline: `2px solid ${colors.primary}`,
    inactiveColor: colors.textSubtle,
    activeColor: colors.text,
    padding: "8px 4px",
    gap: "20px",
    fontSize: "14px",
    fontWeight: 500,
  },
};

export const motion = {
  fast: "100ms cubic-bezier(0.2, 0, 0, 1)",
  normal: "180ms cubic-bezier(0.2, 0, 0, 1)",
  slow: "240ms cubic-bezier(0.2, 0, 0, 1)",
};

export const layout = {
  maxWidth: "1680px",
  topNavHeight: "56px",
  sidebarWidth: "240px",
  sidebarCollapsedWidth: "56px",
  headerHeight: "56px",
  contentPadding: spacing.xxl,
  readingWidth: "720px", // Confluence-style article column
};

export const breakpoints = {
  mobile: "640px",
  tablet: "1024px",
  desktop: "1280px",
};

// Lozenge variant lookup — pages call lozengeVariant("in_progress") etc.
export const lozengeVariants = {
  default: { bg: N[30], text: N[700] },
  inprogress: { bg: B[50], text: B[500] },
  success: { bg: G[50], text: G[500] },
  removed: { bg: R[50], text: R[500] },
  moved: { bg: Y[50], text: Y[500] },
  new: { bg: P[50], text: P[500] },
  info: { bg: T[50], text: T[500] },
};

export function statusToLozenge(status) {
  const s = String(status || "").toLowerCase().replace(/[\s_-]+/g, "");
  if (["todo", "open", "backlog", "new"].includes(s)) return "default";
  if (["inprogress", "inreview", "review", "testing", "doing"].includes(s)) return "inprogress";
  if (["done", "closed", "resolved", "complete", "completed", "shipped"].includes(s)) return "success";
  if (["blocked", "cancelled", "canceled", "rejected", "failed"].includes(s)) return "removed";
  if (["onhold", "waiting", "deferred", "paused"].includes(s)) return "moved";
  if (["draft", "discovery", "exploring"].includes(s)) return "new";
  return "default";
}

export default {
  colors,
  colorsDark,
  spacing,
  typography,
  shadows,
  radius,
  components,
  motion,
  layout,
  breakpoints,
  lozengeVariants,
  statusToLozenge,
  N,
  B,
  G,
  R,
  Y,
  P,
  T,
};
