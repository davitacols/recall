/**
 * Recall Modern Design System (2025)
 * 
 * Philosophy: Modern = clarity, motion, intention
 * Feel: Linear × Notion × Superhuman
 */

export const colors = {
  // Core Neutrals
  background: '#F9FAFB',
  surface: '#FFFFFF',
  primary: '#0F172A',
  secondary: '#64748B',
  border: '#E2E8F0',
  
  // Brand Accent - Electric Indigo
  accent: '#4F46E5',
  accentLight: '#EEF2FF',
  accentDark: '#3730A3',
  
  // Secondary Accent - Soft Amber
  amber: '#F59E0B',
  amberLight: '#FFFBEB',
  
  // Semantic
  success: '#10B981',
  successLight: '#ECFDF5',
  critical: '#EF4444',
  criticalLight: '#FEE2E2',
  warning: '#F59E0B',
  warningLight: '#FFFBEB',
  info: '#3B82F6',
  infoLight: '#EFF6FF',
};

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  xxl: '32px',
};

export const typography = {
  fontFamily: {
    body: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    header: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    mono: '"Fira Code", "Courier New", monospace',
  },
  sizes: {
    pageTitle: '36px',
    sectionTitle: '22px',
    body: '16px',
    small: '14px',
    meta: '13px',
  },
  weights: {
    bold: 700,
    semibold: 600,
    medium: 500,
    regular: 400,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  }
};

export const shadows = {
  none: 'none',
  sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
  md: '0 4px 12px rgba(0, 0, 0, 0.08)',
  lg: '0 10px 25px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 40px rgba(0, 0, 0, 0.12)',
  focus: '0 0 0 3px rgba(79, 70, 229, 0.1)',
};

export const radius = {
  sm: '4px',
  md: '8px',
  lg: '12px',
  full: '9999px',
};

export const components = {
  button: {
    primary: {
      background: colors.accent,
      text: colors.surface,
      hover: colors.accentDark,
      radius: radius.md,
      padding: '10px 16px',
      fontSize: '14px',
      fontWeight: 500,
      shadow: shadows.sm,
    },
    secondary: {
      background: colors.surface,
      text: colors.primary,
      border: `1px solid ${colors.border}`,
      hover: colors.background,
      radius: radius.md,
      padding: '10px 16px',
      fontSize: '14px',
      fontWeight: 500,
    },
    ghost: {
      background: 'transparent',
      text: colors.secondary,
      hover: colors.background,
      radius: radius.md,
      padding: '8px 12px',
    }
  },
  
  card: {
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    radius: radius.md,
    padding: spacing.lg,
    shadow: shadows.sm,
  },
  
  input: {
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    radius: radius.md,
    padding: '10px 12px',
    fontSize: '14px',
    focusBorder: `2px solid ${colors.accent}`,
    focusShadow: shadows.focus,
  },
  
  sidebar: {
    background: colors.background,
    activeItem: {
      background: colors.accentLight,
      borderLeft: `3px solid ${colors.accent}`,
      color: colors.accent,
    },
    hoverItem: {
      background: '#F1F5F9',
    }
  },
};

export const motion = {
  fast: '150ms ease-out',
  normal: '200ms ease-out',
  slow: '300ms ease-out',
};

export const layout = {
  maxWidth: '1280px',
  sidebarWidth: '256px',
  sidebarCollapsedWidth: '80px',
  headerHeight: '64px',
  contentPadding: spacing.xl,
};

export const breakpoints = {
  mobile: '640px',
  tablet: '1024px',
  desktop: '1280px',
};
