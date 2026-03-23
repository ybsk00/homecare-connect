/**
 * The Digital Sanctuary - Unified Design Token System
 * Premium healthcare design for HomeCare Connect Mobile
 */

export const Colors = {
  primary: '#002045',
  primaryContainer: '#1A365D',
  secondary: '#006A63',
  secondaryContainer: '#79F7EA',
  secondaryFixed: '#A0F1E8',
  onSecondaryContainer: '#007169',
  tertiary: '#321B00',
  tertiaryContainer: '#FFE0B2',

  surface: '#F7FAFC',
  surfaceContainerLow: '#F1F4F6',
  surfaceContainer: '#EBEEF0',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerHigh: '#E5E9EB',
  surfaceContainerHighest: '#E0E3E5',

  onSurface: '#181C1E',
  onSurfaceVariant: '#42474E',
  onPrimary: '#FFFFFF',
  onPrimaryContainer: '#B8C5D6',

  outlineVariant: '#C4C6CF',

  success: '#006A63',
  warning: '#321B00',
  error: '#BA1A1A',
  errorContainer: '#FFDAD6',

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

  glass: {
    light: 'rgba(247, 250, 252, 0.7)',
    dark: 'rgba(0, 32, 69, 0.85)',
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

export const Shadows = {
  ambient: {
    shadowColor: '#002045',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 24,
    elevation: 3,
  },
  float: {
    shadowColor: '#002045',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 5,
  },
  hero: {
    shadowColor: '#002045',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 32,
    elevation: 8,
  },
};

export const FontSize = {
  hero: 28,
  title: 24,
  subtitle: 20,
  body: 16,
  bodyLarge: 18,
  caption: 14,
  label: 12,
  overline: 10,
};

export const TouchTarget = {
  min: 48,
  comfortable: 56,
  large: 64,
};
