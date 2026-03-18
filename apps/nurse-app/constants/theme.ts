/**
 * The Curated Sanctuary — Design Token System
 * HomeCare Connect Nurse App
 *
 * High-end, light-filled clinic aesthetic.
 * Spacious, organized, deeply human.
 */

export const Colors = {
  // Core palette
  primary: '#002045',
  primaryContainer: '#1A365D',
  onPrimary: '#FFFFFF',

  secondary: '#006A63',
  secondaryContainer: '#79F7EA',
  onSecondaryContainer: '#007169',

  tertiary: '#321B00',
  tertiaryContainer: '#FFDDB3',

  // Surfaces — tonal layering
  surface: '#F7FAFC',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#F1F4F6',
  surfaceContainer: '#EBF0F2',
  surfaceContainerHigh: '#E5E9EB',
  surfaceContainerHighest: '#E0E3E5',

  // On-colors
  onSurface: '#181C1E',
  onSurfaceVariant: '#42474E',

  // Outline — ghost borders only
  outlineVariant: 'rgba(196, 198, 207, 0.15)',
  outline: '#C4C6CF',

  // Semantic — warm palette (no harsh reds)
  success: '#006A63',
  successContainer: 'rgba(0, 106, 99, 0.10)',
  warning: '#7A5900',
  warningContainer: '#FFF8E1',
  error: '#BA1A1A',
  errorContainer: '#FFDAD6',
  onError: '#FFFFFF',

  // Red flag severity — warm urgency
  redFlag: {
    yellow: '#7A5900',
    yellowBg: '#FFF8E1',
    yellowAccent: '#FFB300',
    orange: '#8B4513',
    orangeBg: '#FFF3E0',
    orangeAccent: '#FF8C00',
    red: '#8B1A1A',
    redBg: '#FFDAD6',
    redAccent: '#D32F2F',
  },

  // Visit status — Curated Sanctuary palette
  visitStatus: {
    scheduled: '#002045',
    scheduledBg: 'rgba(0, 32, 69, 0.10)',
    en_route: '#006A63',
    en_routeBg: 'rgba(0, 106, 99, 0.10)',
    checked_in: '#006A63',
    checked_inBg: '#006A63',
    in_progress: '#002045',
    in_progressBg: '#002045',
    completed: '#006A63',
    completedBg: 'rgba(0, 106, 99, 0.10)',
    cancelled: '#321B00',
    cancelledBg: 'rgba(50, 27, 0, 0.10)',
    no_show: '#8B1A1A',
    no_showBg: 'rgba(139, 26, 26, 0.10)',
  },

  // Offline
  offline: {
    banner: '#321B00',
    bannerText: '#FFDDB3',
  },

  // Gradient endpoints
  gradient: {
    primaryStart: '#002045',
    primaryEnd: '#1A365D',
    tealStart: '#006A63',
    tealEnd: '#00897B',
  },
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
  '4xl': 64,
} as const;

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  display: 48,
} as const;

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

export const Shadow = {
  /** No shadow for most elements — tonal layering instead */
  none: {},
  /** Ambient shadow — floating elements only */
  ambient: {
    shadowColor: '#181C1E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 40,
    elevation: 4,
  },
  /** Elevated — FABs, modals */
  elevated: {
    shadowColor: '#181C1E',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 48,
    elevation: 8,
  },
} as const;

/** Glassmorphism config */
export const Glass = {
  surface: 'rgba(247, 250, 252, 0.80)',
  blur: 20,
} as const;

/** Touch targets — minimum 48px for gloved nurse hands */
export const TouchTarget = {
  minimum: 48,
  comfortable: 56,
  large: 64,
} as const;
