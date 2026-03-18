/**
 * The Curated Sanctuary - Design Token System
 * Premium healthcare design system for HomeCare Connect
 */

export const colors = {
  primary: '#002045',
  primaryContainer: '#1A365D',
  secondary: '#006A63',
  secondaryContainer: '#79F7EA',
  onSecondaryContainer: '#007169',
  tertiary: '#321B00',
  tertiaryContainer: '#FFE0B2',

  surface: '#F7FAFC',
  surfaceContainerLow: '#F1F4F6',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerHigh: '#E5E9EB',
  surfaceContainerHighest: '#E0E3E5',

  onSurface: '#181C1E',
  onSurfaceVariant: '#42474E',
  onPrimary: '#FFFFFF',

  outlineVariant: '#C4C6CF',

  success: '#006A63',
  warning: '#321B00',
  error: '#BA1A1A',
  errorContainer: '#FFDAD6',

  // Status specific
  redFlag: {
    yellow: { bg: '#FFF8E1', text: '#321B00', accent: '#F9A825' },
    orange: { bg: '#FFF3E0', text: '#E65100', accent: '#FB8C00' },
    red: { bg: '#FFDAD6', text: '#BA1A1A', accent: '#EF5350' },
  },

  vital: {
    normal: { bg: 'rgba(0, 106, 99, 0.1)', text: '#006A63' },
    warning: { bg: 'rgba(50, 27, 0, 0.1)', text: '#321B00' },
    critical: { bg: 'rgba(186, 26, 26, 0.1)', text: '#BA1A1A' },
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

export const shadows = {
  ambient: {
    shadowColor: '#181C1E',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 40,
    elevation: 3,
  },
  float: {
    shadowColor: '#181C1E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 5,
  },
};

export const typography = {
  heroTitle: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: colors.onSurface,
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  headline: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: colors.onSurface,
    letterSpacing: -0.3,
    lineHeight: 36,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: colors.onSurface,
    letterSpacing: -0.2,
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: colors.onSurface,
    lineHeight: 28,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    color: colors.onSurface,
    lineHeight: 24,
  },
  bodyMedium: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: colors.onSurface,
    lineHeight: 24,
  },
  bodyBold: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.onSurface,
    lineHeight: 24,
  },
  caption: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: colors.onSurfaceVariant,
    lineHeight: 21,
  },
  captionMedium: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: colors.onSurfaceVariant,
    lineHeight: 21,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.onSurface,
    lineHeight: 21,
  },
  small: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: colors.onSurfaceVariant,
    lineHeight: 18,
  },
  // Korean text should have extra line height
  koreanBody: {
    fontSize: 16,
    fontWeight: '400' as const,
    color: colors.onSurface,
    lineHeight: 26, // 150%+
  },
  koreanCaption: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: colors.onSurfaceVariant,
    lineHeight: 22,
  },
};
